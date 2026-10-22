import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MIN_CHARGE, chargeFor } from "@/lib/pricing";
import { CTA_COOKIE } from "@/lib/cta-experiment";
import { GATE_COOKIE } from "@/lib/gate-experiment";
import { DETAIL_COOKIE } from "@/lib/detail-experiment";
import { recordGateOrder } from "@/lib/gate-order-attribution";
import { capturePurchaseContext } from "@/lib/purchase-tracking";

const bodySchema = z.object({
  productId: z.string().uuid(),
  displayedAmount: z.number().int().min(MIN_CHARGE).optional(),
  name: z.string().max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(), // HH:mm 또는 DB time 타입의 HH:mm:ss 둘 다 허용
  timeUnknown: z.boolean(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
  concerns: z.array(z.string().max(500)).max(20),
  email: z.string().email().optional(), // 비회원 결과 수령용
});

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const timings: Record<string, number> = {};
  async function timed<Value>(name: string, operation: () => PromiseLike<Value>): Promise<Value> {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      timings[name] = Math.max(0, Date.now() - start);
    }
  }
  const respond = (body: unknown, status = 200) => {
    timings.total = Math.max(0, Date.now() - startedAt);
    return NextResponse.json(body, { status, headers: {
      "Cache-Control": "no-store",
      "Server-Timing": Object.entries(timings).map(([name, duration]) => `${name};dur=${duration}`).join(", "),
    } });
  };
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return respond({ error: "잘못된 요청입니다", details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  // 회원이면 계정에, 비회원이면 이메일로 결과를 받는다.
  const service = createServiceClient();
  const [{ data: { user } }, { data: product, error: productErr }] = await timed("lookup", () => Promise.all([
    createClient().then(supabase => supabase.auth.getUser()),
    service.from("products").select("id, slug, price, is_active").eq("id", body.productId).maybeSingle(),
  ]));
  const guestEmail = user ? null : body.email?.trim() || null;

  if (!user && !guestEmail) {
    return respond({ error: "로그인 또는 결과 받을 이메일이 필요합니다" }, 400);
  }

  // 가격은 서버에서만 (클라 변조 방지)
  if (productErr || !product || !product.is_active) {
    return respond({ error: "상품을 찾을 수 없습니다" }, 404);
  }

  // 회원 1,900원 할인(비회원은 정가). 금액은 서버에서만 산정.
  const amount = chargeFor(product.price, !!user);
  // 토스 최소 결제금액 방어 — 가격/할인 오설정으로 0원 위젯 에러 방지.
  if (amount < MIN_CHARGE) {
    return respond({ error: "결제 금액이 올바르지 않습니다" }, 400);
  }

  const inputRow = {
    name: body.name ?? null,
    birth_date: body.birthDate,
    birth_time: body.birthTime,
    time_unknown: body.timeUnknown,
    gender: body.gender,
    calendar: body.calendar,
    concerns: body.concerns,
  };

  // 이중 결제 방지 — 같은 사용자/게스트 + 상품의 최근(30분) pending 주문이 있으면 재사용(새 주문 X).
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  let pendingQuery = service
    .from("orders")
    .select("id, order_id, amount")
    .eq("product_id", product.id)
    .eq("status", "pending")
    .eq(user ? "user_id" : "guest_email", user ? user.id : (guestEmail as string))
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!user) pendingQuery = pendingQuery.is("user_id", null);
  const { data: existing, error: pendingError } = await timed("pending", () => pendingQuery.maybeSingle());
  if (pendingError) {
    return respond({ error: "기존 주문을 확인하지 못했습니다. 다시 시도해 주세요." }, 503);
  }

  if (existing) {
    if (!Number.isSafeInteger(existing.amount) || existing.amount < MIN_CHARGE) {
      return respond({ error: "기존 주문 금액을 확인해 주세요." }, 409);
    }
    // 입력이 바뀌었을 수 있으니 명식 정보만 갱신하고 같은 주문 재사용.
    const { error: inputError } = await timed("input", () => service.from("saju_inputs").update(inputRow).eq("order_id", existing.id));
    if (inputError) return respond({ error: "사주 정보를 저장하지 못했습니다. 다시 시도해 주세요." }, 503);
    await Promise.all([
      timed("gate", () => recordGateOrder(request.cookies.get(GATE_COOKIE)?.value, existing.order_id, product.slug, request.cookies.get(DETAIL_COOKIE)?.value, request.cookies.get(CTA_COOKIE)?.value)),
      timed("context", () => capturePurchaseContext(service, request, existing.id)),
    ]);
    return respond({ orderId: existing.order_id, amount: existing.amount });
  }

  // A quote is a comparison only. Never trust a client-supplied price for billing.
  // Existing pending orders above keep their saved amount even after a price change.
  if (body.displayedAmount !== undefined && body.displayedAmount !== amount) {
    return respond({ code: "PRICE_CHANGED", amount,
      error: "가격 또는 회원 할인이 변경되었습니다. 새 금액을 확인한 뒤 다시 눌러 주세요." }, 409);
  }

  const orderId = `ord_${nanoid(20)}`;
  const { data: order, error: orderErr } = await timed("order", () => service
    .from("orders")
    .insert({
      order_id: orderId,
      user_id: user?.id ?? null,
      guest_email: guestEmail,
      product_id: product.id,
      amount,
      status: "pending",
    })
    .select("id")
    .single());

  if (orderErr || !order) {
    return respond({ error: "주문 생성 실패", detail: orderErr?.message }, 500);
  }

  const [{ error: inputErr }] = await Promise.all([
    (async () => {
      const result = await timed("input", () => service.from("saju_inputs").insert({ order_id: order.id, ...inputRow }));
      if (!result.error) {
        await timed("gate", () => recordGateOrder(request.cookies.get(GATE_COOKIE)?.value, orderId, product.slug, request.cookies.get(DETAIL_COOKIE)?.value, request.cookies.get(CTA_COOKIE)?.value));
      }
      return result;
    })(),
    timed("context", () => capturePurchaseContext(service, request, order.id, false, { id: order.id, order_id: orderId, status: "pending" })),
  ]);

  if (inputErr) {
    await service.from("orders").delete().eq("id", order.id);
    return respond({ error: "사주 정보 저장 실패", detail: inputErr.message }, 500);
  }

  return respond({ orderId, amount });
}
