"use client";

// 티저 중반 가격 카드 — 청월당 「연애비책」 07.png 하단을 옮긴 것.
//
// ★ 원본은 **가격을 두 번 친다**: 티저 중반(여기)과 맨 끝(POINT 5 VS 판).
//   우리는 마지막 한 번뿐이었다 — 중반에 한 번 더 치는 게 원본 구조다.
//
// 실측 순서(위→아래):
//   상품명 큰 로고 → **분량 리본**(핑크 알약, 카드 위에 걸침) → 흰 카드
//   → 카드 제목 → 얇은 선 → ♥ 불릿 목록(9줄) → 얇은 선
//   → 각주 박스(테두리만, 「상세 풀이항목은 페이지 맨 아래」)
//   → 정산 3줄: 복채(취소선) / 할인 이름 + [%] 배지 + -금액 / **최종 혜택가**(초대형)
//   → 꽉 찬 CTA 버튼(→ 화살표)
//
// ★ 분량 앵커를 가격 **위**에 놓는다 — 「3시간, 책 한 권 분량」. 값을 말하기 전에 양을 먼저 세운다.
// ★ 할인 이름이 「얼리버드」 — 타이머 없이 "지금이 싸다"를 만든다(우리는 가짜 타이머를 안 쓰기로 했다).
// ⚠ 불릿 글리프가 하트(♥)다. 상품 감정에 맞춘 것 — 우리는 달·별 계열로 바꾼다(붉은 하트는 청월당 색).
import { PINK, INK, BODY, MUTE, LINE } from "@/components/products/jiknyeo-teaser-kit";

export function JiknyeoBuyCard({
  title,
  volume,
  bullets,
  priceLabel,
  compareLabel,
  discountPct,
  discountLabel,
  onBuy,
  ctaText,
}: {
  title: string;
  volume: string;
  bullets: string[];
  priceLabel: string;
  compareLabel?: string;
  discountPct?: number;
  discountLabel: string;
  onBuy: () => void;
  ctaText: string;
}) {
  const cut = (s: string) => Number(String(s).replace(/[^\d]/g, ""));
  const save = compareLabel ? cut(compareLabel) - cut(priceLabel) : 0;
  return (
    <section className="mt-14">
      {/* 분량 리본 — 카드 위에 걸치게 겹친다(원본은 카드 상단선을 물고 있다) */}
      <div className="relative z-10 text-center">
        <span
          className="inline-block rounded-[10px] px-4 py-2 text-[14px] leading-[20px]"
          style={{ background: PINK, color: "#fff", fontWeight: 700 }}
        >
          {volume}
        </span>
      </div>

      <div className="-mt-3 bg-white px-5 pb-5 pt-7" style={{ borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <p className="text-center text-[20px] leading-[28px]" style={{ color: INK, fontWeight: 700 }}>
          {title}
        </p>
        <div className="my-4 h-px" style={{ background: LINE }} />

        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px] leading-[22px]" style={{ color: BODY }}>
              {/* 원본은 ♥ 다. 붉은 하트는 청월당 색이라 우리는 달빛 계열 글리프를 쓴다. */}
              <span className="shrink-0 text-[14px] leading-[22px]" style={{ color: PINK }}>
                ✦
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="my-4 h-px" style={{ background: LINE }} />

        <p
          className="px-3 py-2.5 text-center text-[13px] leading-[19px]"
          style={{ border: `1px solid ${PINK}55`, color: INK, fontWeight: 500 }}
        >
          *전체 풀이 항목은 <span style={{ fontWeight: 800 }}>아래 목차</span>에서 확인해 주세요!
        </p>

        {/* 정산 3줄 — 취소선 → 할인 → 최종가. 최종가만 초대형으로 세운다. */}
        <div className="mt-5 space-y-2.5">
          {compareLabel && (
            <div className="flex items-center justify-between">
              <span className="text-[15px]" style={{ color: BODY, fontWeight: 500 }}>
                사주풀이 복채
              </span>
              <span className="text-[15px] line-through" style={{ color: MUTE }}>
                {compareLabel}
              </span>
            </div>
          )}
          {save > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[15px]" style={{ color: PINK, fontWeight: 700 }}>
                {discountLabel}
                {discountPct ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[12px]"
                    style={{ background: "#ffe64d", color: "#3a2f00", letterSpacing: "normal" }}
                  >
                    {discountPct}%
                  </span>
                ) : null}
              </span>
              <span className="text-[15px]" style={{ color: PINK, fontWeight: 700 }}>
                - {save.toLocaleString()}원
              </span>
            </div>
          )}
          <div className="my-2 h-px" style={{ background: LINE }} />
          <div className="flex items-end justify-between">
            <span className="pb-1 text-[15px]" style={{ color: INK, fontWeight: 700 }}>
              최종 혜택가
            </span>
            <span className="text-[30px] leading-[34px]" style={{ color: INK, fontWeight: 800 }}>
              {priceLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onBuy}
          className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 text-[17px]"
          style={{ background: PINK, color: "#fff", borderRadius: 10, fontWeight: 700 }}
        >
          {ctaText} <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}
