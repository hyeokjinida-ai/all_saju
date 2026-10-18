import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildMetaEvent } from "@/lib/purchase-tracking";
import { metaAccepted } from "@/lib/purchase-event";
import type { PurchaseTrackingRow } from "@/types/database";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Commission the stored credential without revealing it, charging a customer,
// touching the paid ledger, or sending a synthetic event to normal reporting.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.VERCEL_ENV !== "production" || process.env.META_CAPI_ENABLED === "1") {
    return NextResponse.json({ error: "commissioning_only_while_disabled" }, { status: 409 });
  }
  const body = await request.json().catch(() => null);
  const testCode = body?.testEventCode;
  if (typeof testCode !== "string" || !/^TEST\d{3,20}$/.test(testCode)) {
    return NextResponse.json({ error: "test_event_code_required" }, { status: 400 });
  }
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const version = process.env.META_CAPI_API_VERSION;
  if (!token || !/^\d+$/.test(pixel ?? "") || !/^v\d+\.0$/.test(version ?? "")) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  const row: PurchaseTrackingRow = {
    order_id: id, public_order_id: "TEST_ONLY_NO_ORDER", event_id: `capi_test_${id}`,
    context: { environment: "production", visitor: id, ua: "Myeongunrok CAPI commissioning test" },
    browser_dedup: true, amount: 0, product_slug: "test-only-no-product", paid_at: now,
    recorded_at: now, state: "pending", attempts: 0, next_attempt_at: now,
    lease_token: null, lease_until: null, sent_at: null, last_error: null,
  };
  const event = buildMetaEvent(row)!;
  event.event_source_url = "https://myeongunrok.com/dev/capi-test";
  // An explicitly synthetic identifier: never the caller's cookies/IP or a customer.
  event.user_data.external_id = [createHash("sha256").update(`test:${id}`).digest("hex")];
  const results = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${pixel}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ data: [event], access_token: token, test_event_code: testCode }),
      });
      const result = await response.json().catch(() => null);
      const accepted = metaAccepted(response.ok, result);
      results.push({ accepted, httpStatus: response.status,
        ...(typeof result?.error?.code === "number" ? { errorCode: result.error.code } : {}),
        ...(typeof result?.error?.error_subcode === "number" ? { errorSubcode: result.error.error_subcode } : {}),
      });
      if (!accepted) break;
    } catch {
      results.push({ accepted: false, error: "transport_error" });
      break;
    }
  }
  return NextResponse.json({ testOnly: true, eventId: event.event_id, eventTime: event.event_time,
    pixel, version, results }, { status: results.length === 2 && results.every(r => r.accepted) ? 200 : 502 });
}
