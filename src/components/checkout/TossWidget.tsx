"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadWidgets } from "@/lib/toss/client";

type Props = {
  orderId: string;
  amount: number;
  customerKey: string;
  productName: string;
  customerEmail: string | null;
};

export function TossWidget({ orderId, amount, customerKey, productName, customerEmail }: Props) {
  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef<Awaited<ReturnType<typeof loadWidgets>> | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

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
