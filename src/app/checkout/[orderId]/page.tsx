import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { TossWidget } from "@/components/checkout/TossWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustStrip } from "@/components/saju/TrustStrip";
import { formatKRW } from "@/lib/utils";

export const metadata = { title: "결제" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id, order_id, amount, status, user_id, guest_email, product_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) notFound();
  if (order.status === "paid") {
    // 패키지 주문은 결과지가 여러 장이라 maybeSingle() 이 터진다 — 먼저 만들어진 것으로 보낸다.
    const { data: results } = await service
      .from("saju_results")
      .select("id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (results?.[0]) redirect(`/results/${results[0].id}`);
  }

  // slug: 결제 후 success 대기 화면 테마(산군 등) 판별용 — TossWidget 이 sessionStorage 에 심는다.
  const { data: product } = await service
    .from("products")
    .select("name, slug")
    .eq("id", order.product_id)
    .single();

  const customerKey = order.user_id ?? `guest_${order.id}`;
  const email = order.guest_email;

  const widget = (extra?: { beforeButton?: React.ReactNode; ctaLabel?: string }) => (
    <TossWidget
      orderId={order.order_id}
      amount={order.amount}
      customerKey={customerKey}
      productName={product?.name ?? "사주 상품"}
      productSlug={product?.slug ?? null}
      customerEmail={email}
      {...extra}
    />
  );

  // 산군은 게이트부터 티저까지 검정+금 세계관으로 끌고 오는데, 결제만 공용 보라 화면이라
  // 마지막 한 발짝에서 딴 사이트로 넘어간 것처럼 끊겼다. 직전 화면에서 산군이
  // "이제 복채 얘기를 하자"고 말해 놓고 다음 장 제목이 「결제」였다.
  if (product?.slug === "sangun-sinjeom") {
    return (
      <div className="world-sangun min-h-screen" style={{ background: "#0a0908" }}>
        <div className="mx-auto max-w-[480px] px-5 py-10">
          <p className="font-myeongjo text-center text-[11px] tracking-[0.22em]" style={{ color: "var(--gold-soft)" }}>
            산군
          </p>
          <h1 className="font-myeongjo mt-2 text-center text-[23px] font-bold leading-[1.4] text-bone">
            이제 복채 얘기를 하자
          </h1>

          {/* 받을 것 — 티저에서 본 목차를 결제 직전에 한 번 더 세운다.
              전에는 이 화면 글자가 통틀어 43자였고 재확신 요소가 하나도 없었다. */}
          <div className="mt-6 border border-gold-pale px-5 py-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="font-myeongjo text-center text-[15px] font-bold" style={{ color: "#efe6d2" }}>
              네 장부 열한 장
            </p>
            <p className="font-myeongjo mt-1.5 text-center text-[13px] leading-[1.75] text-bone-soft">
              확답 일곱 이상 · 앞으로 12개월 전부
            </p>
          </div>

          {/* 가격 앵커 — 상세·티저에서 쓰는 것과 같은 문장(철학관 5만~20만). 여기서 끊기면 앵커가 풀린다. */}
          <p className="font-myeongjo mt-4 text-center text-[13px] leading-[1.75] text-bone-faint">
            신당에 몸소 들면 복채가 <b style={{ color: "var(--gold-bright)" }}>5만에서 20만</b>이다.
            <br />
            나는 서고에서 장부를 읽어 주니 <b style={{ color: "var(--gold-bright)" }}>{formatKRW(order.amount)}</b>.
          </p>

          <div className="mt-7">
            {widget({
              ctaLabel: `${formatKRW(order.amount)} 결제하기`,
              beforeButton: (
                <p className="font-myeongjo text-center text-[13px] leading-[1.75]" style={{ color: "var(--gold-soft)" }}>
                  장부가 제대로 서지 않으면 복채는 도로 돌려준다
                </p>
              ),
            })}
          </div>

          <TrustStrip className="mt-5" />
        </div>
      </div>
    );
  }

  // 직녀(연애·결혼예보)도 같은 이유로 전용 화면을 쓴다.
  // 산군은 위처럼 세계관을 결제까지 끌고 오는데 직녀만 공용 카드였다 —
  // 달빛 아래에서 직녀가 말을 걸어 놓고 다음 장 제목이 「결제」였다(2026-08-23 형님 지적).
  // 값·앵커는 랜딩(JiknyeoDetail §9)이 쓰는 것과 **같은 숫자**다. 여기서 달라지면 앵커가 풀린다.
  if (product?.slug === "inyeon-saju" || product?.slug === "marriage-saju") {
    const marriage = product.slug === "marriage-saju";
    return (
      <div className="world-jiknyeo min-h-screen" style={{ background: "#0b0f1a" }}>
        <div className="mx-auto max-w-md px-5 py-10">
          <p className="font-myeongjo text-center text-[11px] tracking-[0.22em]" style={{ color: "var(--gold-soft)" }}>
            직녀
          </p>
          <h1 className="font-myeongjo mt-2 text-center text-[23px] font-bold leading-[1.4] text-bone">
            이제 값 이야기를 할게요
          </h1>

          {/* 받을 것 — 티저에서 본 목차를 결제 직전에 한 번 더. 분량 표기는 티저·랜딩과 같은 「여덟 장」 */}
          <div className="mt-6 border border-gold-pale px-5 py-4" style={{ background: "rgba(255,255,255,0.035)" }}>
            <p className="font-myeongjo text-center text-[15px] font-bold" style={{ color: "#e8e6ef" }}>
              당신의 예보 여덟 장
            </p>
            <p className="font-myeongjo mt-1.5 text-center text-[13px] leading-[1.75] text-bone-soft">
              {marriage
                ? "결혼하는 해와 그 안에서 서두를 달"
                : "열두 달 전부 · 만나는 달과 조심할 달"}
            </p>
          </div>

          {/* 가격 앵커 — 랜딩과 같은 값(철학관 5만~30만 · 전화 회당 3만~10만) */}
          <p className="font-myeongjo mt-4 text-center text-[13px] leading-[1.75] text-bone-faint">
            같은 답을 철학관에서 들으면 <b style={{ color: "var(--gold-bright)" }}>5만에서 30만원</b>,
            <br />
            전화 상담은 회당 3만에서 10만원이에요.
            <br />
            저는 {marriage ? "그 해와 달을" : "열두 달을"} 적어 드리고{" "}
            <b style={{ color: "var(--gold-bright)" }}>{formatKRW(order.amount)}</b>.
          </p>

          <div className="mt-7">
            {widget({
              ctaLabel: `${formatKRW(order.amount)} 결제하기`,
              beforeButton: (
                <p className="font-myeongjo text-center text-[13px] leading-[1.75]" style={{ color: "var(--gold-soft)" }}>
                  예보가 제대로 서지 않으면 값은 돌려드려요
                </p>
              ),
            })}
          </div>

          <TrustStrip className="mt-5" />
        </div>
      </div>
    );
  }

  // 공용 — 전용 화면이 없는 상품. 폭은 앱셸(max-w-md)에 맞춘다.
  return (
    <div className="container py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>결제</CardTitle>
          <CardDescription>
            {product?.name ?? "사주 상품"} · <span className="font-semibold text-foreground">{formatKRW(order.amount)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>{widget()}</CardContent>
      </Card>
      <TrustStrip className="mt-5" />
    </div>
  );
}
