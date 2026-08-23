"use client";

// 결제 직전 로그인 미끼 — 게스트 주문에만 뜬다.
//
// 레퍼런스: 타이트·청월당 결제 시트의 **「쿠폰 적용」 슬롯**. 둘 다 쿠폰이 있는지 없는지도
// 안 알려주고 「확인해보세요」로 로그인만 시킨다(타이트 카카오 채널 친구 57,407명의 출처).
// 결제 직전이 로그인 전환이 가장 잘 되는 순간이라는 게 두 회사가 같이 증명한 것.
//
// ⚠ 우리는 그 방식을 안 쓴다. 우리에겐 쿠폰이 없고 **로그인 할인 1,900원이 진짜로 있다**
//    (api/orders/create 의 MEMBER_DISCOUNT). 빈 쿠폰함을 열어 보이면 미끼가 아니라 실망이 된다.
//    그래서 **실할인 금액을 그대로 말하고** 로그인시킨다 — 같은 자리, 정직한 문장.
//
// ⚠ 로그인 페이지가 받는 쿼리는 `?redirect=` 다(`next` 아님 — /auth/callback 만 next 를 쓴다).
// 로그인하고 돌아오면 `?claim=1` 로 같은 주소에 떨어지고, 결제 페이지가 주문을 이관한다
// (같은 order_id 유지, 금액만 −1,900). 재입력 없음.
import Link from "next/link";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import { formatKRW } from "@/lib/utils";

export function LoginNudge({ orderId, discount }: { orderId: string; discount: number }) {
  const back = `/checkout/${orderId}?claim=1`;
  return (
    <div
      className="mt-6 rounded-lg px-4 py-4"
      style={{ border: "1px solid var(--gold-line)", background: "var(--gold-pale)" }}
    >
      <p className="text-center text-[14px] font-bold text-bone">
        로그인하면 {formatKRW(discount)} 할인돼요
      </p>
      <div className="mt-3">
        <KakaoLoginButton redirect={back} label="카카오로 1초 만에 로그인" />
      </div>
      <p className="mt-2.5 text-center text-[12px]">
        <Link
          href={`/login?redirect=${encodeURIComponent(back)}`}
          className="text-bone-faint underline underline-offset-2"
        >
          이메일로 로그인
        </Link>
      </p>
    </div>
  );
}
