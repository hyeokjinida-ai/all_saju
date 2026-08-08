import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { confirmTossPayment } from "@/lib/toss/confirm";
import { generateResultForOrder } from "@/lib/saju/generate-result";

// 이 라우트는 결제 승인 + 결과지 생성(사주 API + LLM 9챕터)을 한 번에 태운다.
// Vercel 기본 제한(15초)으로는 못 끝낸다 — 실측 gpt-4o-mini 8~19초,
// deepseek-v4-pro 는 소제목·밀도 프롬프트로 11,000자를 쓰면 125초까지 간다.
// 잘리면 손님은 결제만 되고 결과지가 없는 상태로 떨어진다(자가복구 크론은 하루 1회다).
// 300초는 Fluid Compute 기준 Hobby 플랜에서도 허용되는 상한 — 배포가 이 값에서 실패하면
// 프로젝트에 Fluid 가 꺼져 있다는 뜻이니 60으로 내리고 모델을 다시 논의할 것.
export const maxDuration = 300;

const bodySchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  const { paymentKey, orderId, amount } = parsed.data;

  const service = createServiceClient();

  // 1. DB의 주문과 amount 일치 검증 (위변조 차단)
  const { data: order, error: orderErr } = await service
    .from("orders")
    .select("id, amount, status, product_id, user_id, guest_email")
    .eq("order_id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  // 비회원은 마이페이지에 못 들어간다 — 보류 응답에 이 사실을 실어 보내야
  // 결제 성공 화면이 "마이페이지에서 확인" 같은 못 쓰는 안내를 안 준다.
  const isGuest = !order.user_id;

  if (order.status === "paid") {
    // idempotent: 이미 결제된 주문 — 결과가 있으면 그대로, 없으면 재생성 시도(자가복구)
    const outcome = await generateResultForOrder(order.id, { service });
    if (outcome.ok) return NextResponse.json({ resultId: outcome.resultId, alreadyPaid: true });
    return NextResponse.json({ resultId: null, alreadyPaid: true, pending: true, orderId, guest: isGuest, reason: outcome.reason });
  }
  if (order.amount !== amount) {
    return NextResponse.json({ error: "금액이 일치하지 않습니다" }, { status: 400 });
  }

  // 2. 토스 confirm (결제 승인)
  const toss = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!toss.ok) {
    // status 가드 — 동시 중복 요청이 먼저 써넣은 paid 를 failed 로 덮어쓰지 않도록.
    await service.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
    return NextResponse.json({ error: toss.error.message, code: toss.error.code }, { status: 402 });
  }
  if (toss.data.totalAmount !== amount) {
    await service.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
    return NextResponse.json({ error: "토스 응답 금액 불일치" }, { status: 400 });
  }

  // 가상계좌처럼 status 가 DONE 이 아니면(예: WAITING_FOR_DEPOSIT) 아직 입금 전이다.
  // paid 로 확정하지 않고 결제수단 식별자만 저장 → 입금 완료 웹훅 때 paid 전환.
  // 이 쓰기는 무가드(여기 도달 = 토스 승인 성공) — 패배한 동시요청의 failed 쓰기가
  // 먼저 도착해도 이 paid 쓰기가 항상 이기도록(failed 쪽만 status 가드).
  const isDone = toss.data.status === "DONE";
  await service
    .from("orders")
    .update({
      status: isDone ? "paid" : "pending",
      toss_payment_key: paymentKey,
      paid_at: isDone ? toss.data.approvedAt : null,
    })
    .eq("id", order.id);

  if (!isDone) {
    return NextResponse.json({
      resultId: null,
      pending: true,
      orderId,
      guest: isGuest,
      reason: "awaiting_deposit",
      message: isGuest
        ? "입금이 확인되면 결과지를 만들어 드려요. 이 페이지 주소를 저장해 두시면 다시 열어 확인하실 수 있어요."
        : "입금이 확인되면 결과지를 생성해 드려요. 마이페이지에서 확인하실 수 있습니다.",
    });
  }

  // 3. 결과 생성(멱등 공유 함수). 실패해도 결제는 이미 승인됨 → '보류'로 응답하고
  //    클라 자가복구 폴링 + 복구 크론 + 토스 웹훅이 백업으로 마무리한다.
  const outcome = await generateResultForOrder(order.id, { service });
  if (outcome.ok) {
    return NextResponse.json({ resultId: outcome.resultId });
  }

  console.error("[confirm] 결과 생성 보류:", order.id, outcome.reason, outcome.detail ?? "");
  return NextResponse.json({
    resultId: null,
    pending: true,
    orderId,
    guest: isGuest,
    reason: outcome.reason,
    message: "결제는 완료됐어요. 결과지를 마무리하는 중이에요 — 잠시만 기다려 주세요.",
  });
}
