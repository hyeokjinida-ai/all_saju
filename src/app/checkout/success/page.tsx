import { createServiceClient } from "@/lib/supabase/server";
import { worldOfSlug, type World } from "@/lib/world";
import { SuccessClient } from "./success-client";

// 결제 후 대기 화면의 세계관을 **서버에서** 정한다 (2026-09-07).
//
// 토스 리다이렉트가 주는 건 paymentKey·orderId·amount 뿐이라 상품이 안 실려 온다.
// 그래서 예전엔 결제 시작점이 sessionStorage 에 심어 둔 slug 를 브라우저에서 읽었는데,
// 그 읽기는 하이드레이션 뒤에야 돌아서 **첫 페인트가 무조건 기본 화면**이었다.
// 운영 실측(390px · 4G · CPU 4배): 결제 직후 보라 나경반 + 존댓말이 2.7초.
// 재회·번들은 아예 분기가 없어 대기 내내 그랬다.
//
// 주문은 결제 **전**에 만들어지므로(`/api/orders/create`) 주문번호만 있으면 상품을 알 수 있다.
// 조회가 어떤 이유로든 실패하면 null 로 흘려보낸다 — 클라이언트가 sessionStorage 로 한 번 더
// 시도하고, 그것도 없으면 기본 화면. **결제 승인 자체는 이 조회와 무관하다.**
//
// ⚠ 조인을 쓰지 않는 이유는 confirm 라우트와 같다: 생성 타입의 Relationships 가 비어 있어
//    `products(slug)` 가 타입 단계에서 깨진다. id 로 한 건 더 읽는 편이 싸고 안전하다.
async function worldOfOrder(orderId?: string): Promise<World | null> {
  if (!orderId) return null;
  try {
    const service = createServiceClient();
    const { data: order } = await service
      .from("orders")
      .select("product_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!order?.product_id) return null;
    const { data: product } = await service
      .from("products")
      .select("slug")
      .eq("id", order.product_id)
      .maybeSingle();
    return worldOfSlug(product?.slug);
  } catch {
    // 키 누락·네트워크 등 — 화면은 폴백으로 서고 결제 흐름은 그대로 간다
    return null;
  }
}

// 토스가 준 파라미터도 여기서 읽어 내려 준다.
//
// ⚠ 클라이언트가 useSearchParams() 를 쓰면 <Suspense> 경계가 필요한데, 서버 컴포넌트
//    아래에서는 그 경계가 **끝내 안 닫힌다** — 대기 화면만 뜬 채 결제 승인 요청이 영영
//    안 나갔다(2026-09-07 실측: 10초가 지나도 confirm 0건 · 진행바도 8%에서 멈춤).
//    어차피 여기서 orderId 를 읽고 있으니 셋 다 props 로 넘겨 훅 자체를 없앤다.
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;
  const world = await worldOfOrder(orderId);
  return <SuccessClient world={world} paymentKey={paymentKey} orderId={orderId} amount={amount} />;
}
