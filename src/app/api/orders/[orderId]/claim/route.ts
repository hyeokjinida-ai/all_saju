/**
 * 게스트 주문을 회원 주문으로 **이관** — 결제 직전 로그인 미끼의 뒷면.
 *
 * 왜 새로 만드나: `orders/create` 는 명식 입력(생일·시각·고민)을 같이 받는다.
 * 로그인하고 돌아온 손님에게 그걸 다시 입력시킬 수 없고, `orders/create` 계약은
 * 건드리지 않기로 한 자리다(불변). 그래서 **같은 order_id 를 유지한 채** 주인만 바꾼다.
 *
 * 바뀌는 것: `user_id` (게스트 → 회원) · `amount` (회원 할인 1,900원 적용)
 * 안 바뀌는 것: `order_id`(토스에 넘어가는 값) · `product_id` · 명식 입력
 *
 * ⚠ 금액은 여기서도 **서버가 산정**한다. 결제 승인(orders/confirm)이 `order.amount` 와
 *    토스가 알려준 금액을 다시 대조하므로, 이 값이 틀리면 결제가 거부된다 — 그게 안전망이다.
 */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MIN_CHARGE, chargeFor } from "@/lib/pricing";

export async function POST(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, order_id, status, user_id, amount, product_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "없는 주문입니다" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 주문입니다" }, { status: 409 });
  }
  if (order.user_id) {
    // 이미 회원 주문 — 남의 주문을 가로채지 못하게 막는다(내 주문이면 그냥 통과시킨다).
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "다른 분의 주문입니다" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, amount: order.amount, changed: false });
  }

  const { data: product } = await service
    .from("products")
    .select("price")
    .eq("id", order.product_id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });

  const amount = chargeFor(product.price as number, true);
  if (amount < MIN_CHARGE) {
    // 할인이 값보다 크면 이관하지 않는다 — 0원 위젯 에러보다 게스트 가격이 낫다.
    return NextResponse.json({ ok: true, amount: order.amount, changed: false });
  }

  const { error } = await service
    .from("orders")
    .update({ user_id: user.id, amount })
    .eq("id", order.id)
    .eq("status", "pending"); // 그 사이 결제됐으면 건드리지 않는다
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, amount, changed: true });
}
