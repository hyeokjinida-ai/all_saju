import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  productId: z.string().uuid(),
  name: z.string().max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(), // HH:mm 또는 DB time 타입의 HH:mm:ss 둘 다 허용
  timeUnknown: z.boolean(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
  concerns: z.array(z.string().max(500)).max(20),
  email: z.string().email().optional(), // 비회원 결과 수령용
});

const MEMBER_DISCOUNT = 1900; // 회원(로그인) 할인

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
    .select("id, price, is_active")
    .eq("id", body.productId)
    .maybeSingle();

  if (productErr || !product || !product.is_active) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }

  // 회원 1,900원 할인(비회원은 정가). 금액은 서버에서만 산정.
  const amount = Math.max(0, product.price - (user ? MEMBER_DISCOUNT : 0));
  // 토스 최소 결제금액 방어 — 가격/할인 오설정으로 0원 위젯 에러 방지.
  if (amount < 100) {
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
  const { data: existing } = await service
    .from("orders")
    .select("id, order_id")
    .eq("product_id", product.id)
    .eq("status", "pending")
    .eq(user ? "user_id" : "guest_email", user ? user.id : (guestEmail as string))
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // 입력이 바뀌었을 수 있으니 명식 정보만 갱신하고 같은 주문 재사용.
    await service.from("saju_inputs").update(inputRow).eq("order_id", existing.id);
    return NextResponse.json({ orderId: existing.order_id, amount });
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

  return NextResponse.json({ orderId, amount });
}
