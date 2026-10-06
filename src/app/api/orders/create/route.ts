import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MIN_CHARGE, chargeFor } from "@/lib/pricing";
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
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // 회원이면 계정에, 비회원이면 이메일로 결과를 받는다.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const guestEmail = user ? null : body.email?.trim() || null;

  if (!user && !guestEmail) {
    return NextResponse.json({ error: "로그인 또는 결과 받을 이메일이 필요합니다" }, { status: 400 });
  }

  // 가격은 서버에서만 (클라 변조 방지)
  const service = createServiceClient();
  const { data: product, error: productErr } = await service
    .from("products")
    .select("id, slug, price, is_active")
    .eq("id", body.productId)
    .maybeSingle();

  if (productErr || !product || !product.is_active) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }

  // 회원 1,900원 할인(비회원은 정가). 금액은 서버에서만 산정.
  const amount = chargeFor(product.price, !!user);
  // 토스 최소 결제금액 방어 — 가격/할인 오설정으로 0원 위젯 에러 방지.
  if (amount < MIN_CHARGE) {
    return NextResponse.json({ error: "결제 금액이 올바르지 않습니다" }, { status: 400 });
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
  const { data: existing, error: pendingError } = await pendingQuery.maybeSingle();
  if (pendingError) {
    return NextResponse.json({ error: "기존 주문을 확인하지 못했습니다. 다시 시도해 주세요." }, { status: 503 });
  }

  if (existing) {
    if (!Number.isSafeInteger(existing.amount) || existing.amount < MIN_CHARGE) {
      return NextResponse.json({ error: "기존 주문 금액을 확인해 주세요." }, { status: 409 });
    }
    // 입력이 바뀌었을 수 있으니 명식 정보만 갱신하고 같은 주문 재사용.
    await service.from("saju_inputs").update(inputRow).eq("order_id", existing.id);
    await recordGateOrder(request.cookies.get(GATE_COOKIE)?.value, existing.order_id, product.slug, request.cookies.get(DETAIL_COOKIE)?.value);
    await capturePurchaseContext(service, request, existing.id);
    return NextResponse.json({ orderId: existing.order_id, amount: existing.amount });
  }

  // A quote is a comparison only. Never trust a client-supplied price for billing.
  // Existing pending orders above keep their saved amount even after a price change.
  if (body.displayedAmount !== undefined && body.displayedAmount !== amount) {
    return NextResponse.json({ code: "PRICE_CHANGED", amount,
      error: "가격 또는 회원 할인이 변경되었습니다. 새 금액을 확인한 뒤 다시 눌러 주세요." }, { status: 409 });
  }

  const orderId = `ord_${nanoid(20)}`;
  const { data: order, error: orderErr } = await service
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
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "주문 생성 실패", detail: orderErr?.message }, { status: 500 });
  }

  const { error: inputErr } = await service.from("saju_inputs").insert({ order_id: order.id, ...inputRow });

  if (inputErr) {
    await service.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "사주 정보 저장 실패", detail: inputErr.message }, { status: 500 });
  }

  await recordGateOrder(request.cookies.get(GATE_COOKIE)?.value, orderId, product.slug, request.cookies.get(DETAIL_COOKIE)?.value);
  await capturePurchaseContext(service, request, order.id);
  return NextResponse.json({ orderId, amount });
}
