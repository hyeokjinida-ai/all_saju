import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { GATE_COOKIE, readGateAssignment } from "@/lib/gate-experiment";
import { DETAIL_COOKIE, detailProps, readDetailAssignment } from "@/lib/detail-experiment";
import { attributionCookie, isRecentPurchase, metaAccepted, metaCookie, metaPurchaseEvent, nextRetryDelay, type PurchaseReceipt } from "@/lib/purchase-event";
import type { Json, PurchaseTrackingRow } from "@/types/database";

type Service = ReturnType<typeof createServiceClient>;
const timeout = () => AbortSignal.timeout(2000);
const contextOf = (row: PurchaseTrackingRow) => (row.context ?? {}) as Record<string, Json | undefined>;

// Called while the order is still pending, before leaving for Toss or approving it.
// Keep matching context private. Never collect saju input, names, emails or payment keys.
export async function capturePurchaseContext(service: Service, request: NextRequest, orderId: string, browserDedup = false) {
  try {
    const { data: order } = await service.from("orders").select("id, order_id, status")
      .eq("id", orderId).abortSignal(timeout()).maybeSingle();
    if (!order || order.status === "paid") return;
    const gate = readGateAssignment(request.cookies.get(GATE_COOKIE)?.value);
    const detail = readDetailAssignment(request.cookies.get(DETAIL_COOKIE)?.value);
    const attribution = attributionCookie(request.cookies.get("mr_purchase_context")?.value);
    const context: Record<string, Json> = {
      ...attribution,
      environment: process.env.VERCEL_ENV ?? "development",
      qa: gate?.qa === true || detail?.qa === true || attribution.qa === true,
      ...(gate ? { subject: gate.subject, variant: gate.variant } : {}),
      ...(detail ? detailProps(detail) : {}),
    };
    const fbp = metaCookie(request.cookies.get("_fbp")?.value, "fbp");
    const fbc = metaCookie(request.cookies.get("_fbc")?.value, "fbc");
    if (fbp) context.fbp = fbp;
    if (fbc) context.fbc = fbc;
    const ua = request.headers.get("user-agent");
    if (ua) context.ua = ua.slice(0, 500);
    const { error } = await service.from("purchase_tracking").upsert({
      order_id: order.id, public_order_id: order.order_id, context,
    }, { onConflict: "order_id", ignoreDuplicates: true }).abortSignal(timeout());
    if (error) console.error("[purchase] context unavailable", error.code);
    if (browserDedup) {
      await service.from("purchase_tracking").update({ browser_dedup: true }).eq("order_id", order.id)
        .eq("state", "checkout").abortSignal(timeout());
    }
    if (context.qa === true) {
      // QA can become true later in checkout; it must never be cleared by a retry.
      await service.from("purchase_tracking").update({ context }).eq("order_id", order.id)
        .eq("state", "checkout").abortSignal(timeout());
    }
  } catch { console.error("[purchase] context unavailable"); }
}

export function receiptFor(row: PurchaseTrackingRow, now = Date.now()): PurchaseReceipt | null {
  const ctx = contextOf(row);
  // CAPI delivery status is independent of the browser fallback. A missing Meta
  // match or activation cutoff must not suppress an otherwise verified purchase.
  if (ctx.environment !== "production" || ctx.qa === true ||
      ["excluded_order", "excluded_or_refunded_order", "qa_order"].includes(row.last_error ?? "") ||
      !row.paid_at || !isRecentPurchase(row.paid_at, now) || !row.amount || row.amount < 0 || !row.product_slug) return null;
  return { eventId: row.event_id, orderId: row.public_order_id, value: row.amount,
    currency: "KRW", slug: row.product_slug, paidAt: row.paid_at };
}

export async function purchaseReceipt(service: Service, orderId: string, trackingVersion = 1): Promise<PurchaseReceipt | null> {
  try {
    const { data, error } = await service.from("purchase_tracking").select("*")
      .eq("order_id", orderId).abortSignal(timeout()).maybeSingle();
    if (error) console.error("[purchase] receipt unavailable", error.code);
    // Cached v1 clients send every receipt as Purchase. Do not give them an extra
    // question receipt; the paid ledger still preserves its revenue in full.
    if (data?.product_slug === "extra-question" && trackingVersion < 2) return null;
    return data ? receiptFor(data) : null;
  } catch { console.error("[purchase] receipt unavailable"); return null; }
}

export function buildMetaEvent(row: PurchaseTrackingRow) {
  const ctx = contextOf(row);
  const fbp = metaCookie(ctx.fbp, "fbp"), fbc = metaCookie(ctx.fbc, "fbc");
  const identifier = ctx.visitor ?? ctx.subject;
  const subject = typeof identifier === "string" && /^[0-9a-f-]{36}$/i.test(identifier) ? identifier : undefined;
  if (!fbp && !fbc && !subject) return null;
  return {
    event_name: metaPurchaseEvent(row.product_slug).name, event_id: row.event_id,
    event_time: Math.floor(Date.parse(row.paid_at!) / 1000), action_source: "website",
    event_source_url: "https://myeongunrok.com/checkout/success",
    user_data: {
      ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}),
      ...(subject ? { external_id: [createHash("sha256").update(subject).digest("hex")] } : {}),
      ...(typeof ctx.ua === "string" ? { client_user_agent: ctx.ua } : {}),
    },
    custom_data: { value: row.amount, currency: "KRW", content_ids: [row.product_slug], content_type: "product" },
  };
}

// Compare-and-swap lease prevents concurrent confirm/webhook/cron sends. Meta's stable
// event_id covers an ambiguous timeout; all automatic retries stop within 24 hours.
export async function dispatchPurchases(service: Service, limit = 5, onlyOrderId?: string) {
  if (process.env.VERCEL_ENV !== "production" || process.env.META_CAPI_ENABLED !== "1") return { state: "disabled" };
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const version = process.env.META_CAPI_API_VERSION;
  const start = Date.parse(process.env.META_CAPI_START_AT ?? "");
  if (!token || !/^\d+$/.test(pixel ?? "") || !/^v\d+\.0$/.test(version ?? "") || !Number.isFinite(start)) {
    console.error("[purchase] CAPI configuration incomplete");
    return { state: "unconfigured" };
  }
  try {
    let query = service.from("purchase_tracking").select("*").eq("state", "pending")
      .lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(Math.min(limit, 10));
    if (onlyOrderId) query = query.eq("order_id", onlyOrderId);
    const { data, error } = await query.abortSignal(timeout());
    if (error) { console.error("[purchase] queue unavailable", error.code); return { state: "unavailable" }; }
    let sent = 0;
    for (const row of data ?? []) {
      if (row.lease_until && Date.parse(row.lease_until) > Date.now()) continue;
      const lease = randomUUID();
      const { data: claimed } = await service.from("purchase_tracking").update({
        lease_token: lease, lease_until: new Date(Date.now() + 60_000).toISOString(), attempts: row.attempts + 1,
      }).eq("order_id", row.order_id).eq("state", "pending").eq("attempts", row.attempts)
        .select("*").abortSignal(timeout()).maybeSingle();
      if (!claimed) continue;
      const finish = async (patch: Partial<PurchaseTrackingRow>) => {
        const { error: finishError } = await service.from("purchase_tracking").update({
          ...patch, lease_token: null, lease_until: null,
        }).eq("order_id", row.order_id).eq("lease_token", lease).abortSignal(timeout());
        if (finishError) console.error("[purchase] delivery status unavailable", finishError.code);
      };
      if (!isRecentPurchase(row.paid_at) || Date.parse(row.paid_at!) < start) {
        await finish({ state: "expired", last_error: "outside_delivery_window" }); continue;
      }
      if (!row.browser_dedup) {
        await finish({ state: "suppressed", last_error: "legacy_browser_without_event_id" }); continue;
      }
      const { data: order, error: orderError } = await service.from("orders")
        .select("status, exclude_from_pnl, refunded_amount, amount").eq("id", row.order_id)
        .abortSignal(timeout()).maybeSingle();
      if (orderError || !order) {
        await finish({ last_error: "order_check_unavailable", next_attempt_at: new Date(Date.now() + 60_000).toISOString() }); continue;
      }
      if (order.status !== "paid" || order.exclude_from_pnl || order.refunded_amount >= order.amount) {
        await finish({ state: "suppressed", last_error: "excluded_or_refunded_order" }); continue;
      }
      const event = buildMetaEvent(row);
      if (!event) { await finish({ state: "suppressed", last_error: "missing_matching_context" }); continue; }
      try {
        const response = await fetch(`https://graph.facebook.com/${version}/${pixel}/events`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(4000),
          body: JSON.stringify({ data: [event], access_token: token }),
        });
        const body = await response.json().catch(() => null);
        if (metaAccepted(response.ok, body)) {
          await finish({ state: "sent", sent_at: new Date().toISOString(), last_error: null }); sent++;
        } else {
          await finish({ last_error: `meta_http_${response.status}`,
            next_attempt_at: new Date(Date.now() + nextRetryDelay(claimed.attempts)).toISOString() });
        }
      } catch {
        await finish({ last_error: "transport_error", next_attempt_at: new Date(Date.now() + nextRetryDelay(claimed.attempts)).toISOString() });
      }
    }
    return { state: "processed", sent };
  } catch { console.error("[purchase] dispatcher unavailable"); return { state: "unavailable" }; }
}
