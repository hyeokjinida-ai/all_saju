"use client";

// 결제 직전 연락처 — 휴대폰(선택) + 마케팅 수신 동의(선택).
//
// 레퍼런스: 청월당은 휴대폰을 **필수**로 받고("사주 결과 확인 및 안내메시지 발송에 이용됩니다"),
// 타이트는 마케팅 수신 동의를 **기본 체크**로 받는다. 둘 다 리텐션 채널을 결제 순간에 확보한다.
//
// 우리는 둘 다 낮춰 잡았다(형님 결정 D3·D4):
//   · 휴대폰 = **선택** — 알림톡 채널이 아직 없어 필수로 받을 명분이 약하다. 채널 열리면 필수로.
//   · 동의   = **기본 해제** — 기본 체크는 법적으로 다툼이 있는 자리다. 켜려면 defaultChecked 한 글자.
//
// ⚠ 이 입력 때문에 결제가 막히면 안 된다. 저장 실패는 삼키고 결제를 진행시킨다
//    (형식이 틀린 번호만 막는다 — 그건 손님이 고칠 수 있는 것).
import { useState } from "react";
import { TossWidget } from "./TossWidget";

const fmt = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

export function CheckoutForm({
  orderId,
  amount,
  customerKey,
  productName,
  productSlug,
  customerEmail,
  defaultPhone,
  ctaLabel,
}: {
  orderId: string;
  amount: number;
  customerKey: string;
  productName: string;
  productSlug: string | null;
  customerEmail: string | null;
  defaultPhone: string | null;
  ctaLabel: string;
}) {
  const [phone, setPhone] = useState(fmt(defaultPhone ?? ""));
  const [optIn, setOptIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, "");

  async function beforePay(): Promise<boolean> {
    if (digits && !/^01[016789]\d{7,8}$/.test(digits)) {
      setErr("휴대폰 번호를 다시 확인해 주세요");
      return false;
    }
    setErr(null);
    try {
      await fetch(`/api/orders/${orderId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits || null, marketingOptIn: optIn }),
      });
    } catch {
      /* 저장 실패로 결제를 막지 않는다 */
    }
    return true;
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="checkout-phone" className="mb-1.5 block text-[13px] text-bone-soft">
          휴대폰 번호 <span className="text-bone-faint">(선택)</span>
        </label>
        <input
          id="checkout-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(fmt(e.target.value));
            setErr(null);
          }}
          placeholder="010-0000-0000"
          className="w-full rounded-md border border-hairline px-3 py-2.5 text-[15px] text-ink outline-none focus:border-gold"
        />
        <p className="mt-1.5 text-[12px] text-bone-faint">
          {err ?? "결과지가 준비되면 문자로 알려드려요."}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-[13px] text-bone-soft">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
        />
        <span>
          <span className="text-bone-faint">(선택)</span> 할인·새 풀이 소식 받기
        </span>
      </label>

      <TossWidget
        orderId={orderId}
        amount={amount}
        customerKey={customerKey}
        productName={productName}
        productSlug={productSlug}
        customerEmail={customerEmail}
        customerMobilePhone={digits || null}
        onBeforePay={beforePay}
        ctaLabel={ctaLabel}
      />
    </div>
  );
}
