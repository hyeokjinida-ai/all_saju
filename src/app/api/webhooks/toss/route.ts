import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchTossPayment } from "@/lib/toss/confirm";

// 토스페이먼츠 웹훅 — 결제 완료의 '서버 간' 백업 신호.
// 두 종류를 처리한다:
//   (1) PAYMENT_STATUS_CHANGED (카드/계좌이체): { eventType, data: { orderId, status, paymentKey } }
//   (2) 가상계좌 입금 완료 (가상계좌 활성화 시): 평면 구조 { orderId, status, ... } — paymentKey 없음.
//       이때는 confirm 단계에서 저장해 둔 orders.toss_payment_key 로 결제를 재조회·검증한다.
//
// 보안: 웹훅 바디는 위조 가능 → 절대 신뢰하지 않는다. 항상 토스 API
//   (GET /v1/payments/{paymentKey})로 결제 진위·금액·상태(DONE)를 재확인한 뒤에만
//   주문을 paid 로 바꾼다.
// 응답: 토스는 10초 내 2xx 가 없으면 최대 7회 재전송한다. 결과지 생성(luckyloveme+LLM,
//   보통 10초 초과)은 await 하지 않고, 주문을 paid 로 확정한 뒤 즉시 200을 반환한다.
//   실제 생성은 15분 주기 복구 크론(/api/cron/recover-results)이 paid·미생성 주문을
//   스캔해 마무리한다. (모든 처리는 멱등 — 재전송돼도 안전)
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const p = (payload ?? {}) as Record<string, unknown>;
  // PAYMENT_STATUS_CHANGED 는 data 래퍼가 있고, 가상계좌 입금 콜백은 평면 구조다.
  const data = (p.data && typeof p.data === "object" ? (p.data as Record<string, unknown>) : p) as Record<
    string,
    unknown
  >;
  const orderId = typeof data.orderId === "string" ? data.orderId : null;
  const status = typeof data.status === "string" ? data.status : null;
  const bodyPaymentKey = typeof data.paymentKey === "string" ? data.paymentKey : null;

  // 결제 완료(DONE) 이벤트만 관심. 그 외는 200으로 무시(토스 재전송 방지).
  if (!orderId || status !== "DONE") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, status, amount, toss_payment_key")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ ok: true, unknownOrder: true });
  }

  // 검증용 결제키: 웹훅 바디의 paymentKey(카드) → 없으면 confirm 때 저장한 키(가상계좌).
  const paymentKey = bodyPaymentKey ?? order.toss_payment_key;
  if (!paymentKey) {
    // 가상계좌 입금인데 저장된 결제키가 없음(= confirm 미수행). 검증 불가 → 무시.
    return NextResponse.json({ ok: true, unverifiable: true });
  }

  // 토스 API 로 진위 재확인 — 바디만 믿지 않는다.
  const verify = await fetchTossPayment(paymentKey);
  if (!verify.ok || verify.data.status !== "DONE" || verify.data.totalAmount !== order.amount) {
    return NextResponse.json({ ok: true, verified: false });
  }

  // paid 로 확정(아직 아니면). 생성은 await 하지 않고 복구 크론에 위임 → 즉시 200.
  if (order.status !== "paid") {
    await service
      .from("orders")
      .update({ status: "paid", toss_payment_key: paymentKey, paid_at: verify.data.approvedAt })
      .eq("id", order.id);
  }

  return NextResponse.json({ ok: true, paid: true });
}
