"use client";

// 결제수단을 **우리가 직접 그린다** — 카카오페이 · 네이버페이 · 토스페이 · 카드·일반결제 4줄 (2026-09-21).
//
// 레퍼런스: 몽연 현월 결제 화면(형님 지정). 같은 토스인데 결제위젯이 아니라 「자체창」을 쓴다 —
//   간편결제 세 줄은 `flowMode:"DIRECT"` + `easyPay` 로 **그 회사 결제창을 바로** 열고,
//   「카드·일반결제」만 토스 통합결제창(`DEFAULT`)을 연다. 공개 번들에서 확인한 구조 그대로다.
//
// 왜 위젯 설정으로 안 되나: 결제위젯의 결제수단 칸은 **토스가 그린다.** 상점관리자에서 순서·노출은
//   바꿔도 모양은 못 바꾼다. 우리가 그리려면 결제위젯 키가 아니라 「API 개별 연동 키」가 필요하고,
//   그 키가 있을 때만 이 컴포넌트가 쓰인다(ContactFields → directPayEnabled). 없으면 TossWidget 그대로.
//
// 로고는 **각 사 공식 파일만** 쓴다(내가 그리지 않는다):
//   · 카카오페이 — 파트너센터 결제수단 로고 zip 원본(옐로우 배경 확장형, 「카카오페이」 붙여쓰기, 1순위 배치 권장)
//   · 토스페이   — 토스 브랜드 리소스 센터 TossPay_Logo_Primary_White(어두운 바탕용 공식판)
//   · 네이버페이 — 공식 개발자센터가 우리 도구에서 막혀 파일을 못 받았다. 가짜 로고보다 **없는 편**이 낫다.
//                  형님이 공식 파일을 주시면 `public/pay/naverpay.png` 로 넣고 아래 logo 한 줄만 채울 것.
//   · 카드       — 브랜드가 아니라 일반 카드 아이콘(레퍼런스도 같다).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { TossPaymentsPayment } from "@tosspayments/tosspayments-sdk";
import { Button } from "@/components/ui/button";
import { loadPayment } from "@/lib/toss/client";
import { track } from "@/lib/analytics";
import { LAST_ORDER_SLUG_KEY } from "./TossWidget";

type MethodId = "kakaopay" | "naverpay" | "tosspay" | "card";

const METHODS: {
  id: MethodId;
  label: string;
  /** 토스 간편결제 코드 — 있으면 그 회사 창을 바로 연다(DIRECT), null 이면 통합결제창(DEFAULT) */
  easyPay: "KAKAOPAY" | "NAVERPAY" | "TOSSPAY" | null;
  logo: { src: string; w: number; h: number } | null;
}[] = [
  { id: "kakaopay", label: "카카오페이", easyPay: "KAKAOPAY", logo: { src: "/pay/kakaopay.png", w: 58, h: 24 } },
  { id: "naverpay", label: "네이버페이", easyPay: "NAVERPAY", logo: null },
  { id: "tosspay", label: "토스페이", easyPay: "TOSSPAY", logo: { src: "/pay/tosspay.png", w: 78, h: 17 } },
  { id: "card", label: "카드 · 일반결제", easyPay: null, logo: null },
];

type Props = {
  orderId: string;
  amount: number;
  customerKey: string;
  productName: string;
  productSlug?: string | null;
  customerEmail: string | null;
  beforeButton?: React.ReactNode;
  onBeforePay?: () => Promise<boolean>;
  customerMobilePhone?: string | null;
  ctaLabel?: string;
};

export function PayMethods({
  orderId,
  amount,
  customerKey,
  productName,
  productSlug,
  customerEmail,
  beforeButton,
  onBeforePay,
  customerMobilePhone,
  ctaLabel,
}: Props) {
  // 카카오페이가 기본 — 레퍼런스와 같고, 카카오페이 가이드도 1순위 배치를 권한다.
  const [method, setMethod] = useState<MethodId>("kakaopay");
  const [paying, setPaying] = useState(false);
  const sdkRef = useRef<Promise<TossPaymentsPayment> | null>(null);

  // 대기 화면 테마용 slug — TossWidget 과 같은 약속(success 화면이 읽는다)
  useEffect(() => {
    if (!productSlug) return;
    try {
      sessionStorage.setItem(LAST_ORDER_SLUG_KEY, productSlug);
    } catch {
      /* 저장 불가 환경 — 기본 테마 폴백 */
    }
  }, [productSlug]);

  // SDK 는 화면이 뜨자마자 뒤에서 받아 둔다. 누르는 순간 받기 시작하면 그만큼 창이 늦게 열린다.
  // ⚠ 결제위젯과 달리 **버튼을 SDK 에 묶지 않는다.** 위젯은 다 뜰 때까지 버튼이 잠겼고, 뜨다 실패하면
  //    영영 잠겼다. 여기선 눌렀을 때 아직이면 기다렸다 열고, 실패했으면 그 자리에서 다시 받는다.
  useEffect(() => {
    const p = loadPayment(customerKey);
    sdkRef.current = p;
    p.then(
      () => track("checkout_widget_ready", { orderId, variant: "direct" }),
      (e) => {
        if (sdkRef.current === p) sdkRef.current = null;
        track("checkout_widget_fail", {
          orderId,
          variant: "direct",
          reason: e instanceof Error ? e.message.slice(0, 80) : "unknown",
        });
      },
    );
  }, [customerKey, orderId]);

  async function handlePay() {
    const m = METHODS.find((x) => x.id === method) ?? METHODS[0];
    // 누른 사실 + 무엇으로 누르려 했는지 — 수단별로 어디서 돌아서는지 가르는 자
    track("checkout_pay_click", { orderId, amount, method: m.id, ready: !!sdkRef.current });
    setPaying(true);
    try {
      if (onBeforePay && !(await onBeforePay())) {
        setPaying(false);
        return;
      }
      const payment = await (sdkRef.current ?? (sdkRef.current = loadPayment(customerKey)));
      const origin = window.location.origin;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName: productName,
        successUrl: `${origin}/checkout/success`,
        failUrl: `${origin}/checkout/fail`,
        customerEmail: customerEmail ?? undefined,
        customerMobilePhone: customerMobilePhone || undefined,
        card: m.easyPay ? { flowMode: "DIRECT", easyPay: m.easyPay } : { flowMode: "DEFAULT" },
      });
      // 모바일은 여기서 페이지가 넘어간다. PC 는 창이 닫히면 성공 URL 로 넘어간다.
    } catch (err) {
      setPaying(false);
      const code = (err as { code?: string } | null)?.code ?? "";
      // 손님이 창을 닫은 건 오류가 아니다 — 빨간 토스트를 띄우지 않고 기록만 한다.
      if (code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED") {
        track("checkout_pay_cancel", { orderId, method: m.id });
        return;
      }
      track("checkout_pay_error", { orderId, method: m.id, code: code || "unknown" });
      toast.error(err instanceof Error && err.message ? err.message : "결제를 시작하지 못했습니다");
    }
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1 text-[15px] font-bold text-bone">결제수단</legend>
        <div className="divide-y divide-hairline">
          {METHODS.map((m) => (
            <label key={m.id} className="flex min-h-[54px] cursor-pointer items-center gap-3 py-3">
              <input
                type="radio"
                name="pay-method"
                value={m.id}
                checked={method === m.id}
                onChange={() => {
                  setMethod(m.id);
                  track("checkout_method_select", { orderId, method: m.id });
                }}
                disabled={paying}
                className="h-5 w-5 shrink-0 accent-[var(--gold)]"
              />
              {m.logo && (
                // eslint-disable-next-line @next/next/no-img-element -- 3~11KB 공식 로고, 크기 고정
                <img src={m.logo.src} alt="" width={m.logo.w} height={m.logo.h} className="shrink-0" />
              )}
              {m.id === "card" && <CardIcon />}
              <span className="text-[15px] font-semibold text-bone">{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {beforeButton}

      <div>
        <Button onClick={handlePay} disabled={paying} size="lg" className="w-full">
          {paying ? "결제창 여는 중..." : (ctaLabel ?? "결제하기")}
        </Button>
        {/* 위젯이 그리던 약관 동의 칸이 사라진 자리. 새 문장을 짓지 않고 레퍼런스 문장을 옮겼다.
            각 결제사 창 안에서 그 회사 약관 동의는 따로 받는다. */}
        <p className="mt-2.5 text-center text-[12px] leading-relaxed text-bone-faint">
          결제 정보를 확인했으며,{" "}
          <Link href="/legal/privacy" target="_blank" className="underline underline-offset-2">
            개인정보처리방침
          </Link>{" "}
          및 결제 진행 필수 동의에 동의합니다.
        </p>
      </div>
    </div>
  );
}

/** 일반 카드 아이콘 — 브랜드 로고가 아니다(레퍼런스와 같은 사각형 + 선 하나) */
function CardIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#191919" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    </span>
  );
}
