"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadWidgets } from "@/lib/toss/client";

// 결제 후 success 페이지는 토스 리다이렉트 파라미터(paymentKey·orderId·amount)만 받아서
// 무슨 상품인지 모른다. 주문 조회 API 를 새로 파는 대신, 결제 시작점인 여기서 slug 를
// 심어두고 success 대기 화면이 읽어 테마(산군 등)를 정한다. 토스 결제는 같은 탭의
// 풀 페이지 리다이렉트라 sessionStorage 가 살아남는다.
export const LAST_ORDER_SLUG_KEY = "last-order-slug";

type Props = {
  orderId: string;
  amount: number;
  customerKey: string;
  productName: string;
  productSlug?: string | null;
  customerEmail: string | null;
};

export function TossWidget({ orderId, amount, customerKey, productName, productSlug, customerEmail }: Props) {
  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef<Awaited<ReturnType<typeof loadWidgets>> | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  // 대기 화면 테마용 slug 심기 — 저장이 실패해도(시크릿 모드 등) success 쪽이
  // 기본 테마로 내려앉을 뿐 결제 흐름은 안 깨진다.
  useEffect(() => {
    if (!productSlug) return;
    try {
      sessionStorage.setItem(LAST_ORDER_SLUG_KEY, productSlug);
    } catch {
      // 저장 불가 환경 — 기본 테마 폴백
    }
  }, [productSlug]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const widgets = await loadWidgets(customerKey);
      if (canceled) return;
      widgetsRef.current = widgets;
      await widgets.setAmount({ currency: "KRW", value: amount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#payment-methods", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      setReady(true);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "결제 위젯 로드 실패");
    });
    return () => {
      canceled = true;
    };
  }, [amount, customerKey]);

  async function handlePay() {
    const widgets = widgetsRef.current;
    if (!widgets) return;
    setPaying(true);
    try {
      await widgets.requestPayment({
        orderId,
        orderName: productName,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: customerEmail ?? undefined,
      });
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "결제 요청 실패");
    }
  }

  return (
    <div className="space-y-4">
      <div id="payment-methods" ref={paymentMethodsRef} />
      <div id="agreement" ref={agreementRef} />
      <Button onClick={handlePay} disabled={!ready || paying} size="lg" className="w-full">
        {paying ? "결제 진행 중..." : "결제하기"}
      </Button>
    </div>
  );
}
