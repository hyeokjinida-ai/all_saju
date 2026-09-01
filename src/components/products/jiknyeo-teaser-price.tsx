"use client";

// 티저 가격 앵커 — 청월당 「연애비책」 POINT 5 구간(15.png)을 옮긴 것.
//
// 원본 실측 순서:
//   POINT 5 배지 → 헤드 2줄(2줄만 핑크) → 서브 1줄
//   → **가로로 늘어선 비교 카드**(오프라인 사주 5~30만 / 연애 컨설팅 20~400만 / 결정사 200~3000만)
//     각 카드: 핑크 알약 라벨 + 금액을 `~` 로 **세로** 배치
//   → 초대형 **VS** → 우리 가격(숫자만 크게, 「원」은 작게) → ⊕ 로 이어지는 이득 목록
//
// ⚠ 안 베끼는 것: 결정사 200~3000만 같은 **우리와 무관한 업종**은 넣지 않는다.
//    사주 결과지를 파는데 결혼정보회사 가격을 옆에 세우면 파는 물건이 달라 보인다.
//    우리가 실제로 대체하는 것(대면 사주·전화 상담)만 세운다 — 범위도 사실 범위만 쓴다.
import { PointBadge, BrushHead, T, Cap, VsCard, PlusList, PINK, INK, MUTE } from "@/components/products/jiknyeo-teaser-kit";

export function JiknyeoTeaserPrice({
  priceLabel,
  compareLabel,
  isMarriage,
}: {
  priceLabel: string;
  compareLabel?: string;
  isMarriage?: boolean;
}) {
  return (
    <section className="mt-14">
      <PointBadge n={5} />
      <div className="mt-3">
        <BrushHead lines={["그런데도,", "복채는 제일 가볍게"]} accent={1} />
      </div>
      <div className="mt-4">
        <T>같은 답을 다른 데서 들으면 얼마를 쓰게 될까요?</T>
      </div>

      {/* 가로 스크롤 카드열 — 좁은 화면에서 줄바꿈으로 뭉개지지 않게 옆으로 흘린다(원본도 잘려 나간다) */}
      {/* ⚠ 「사주 앱 구독(월 9천원~)」을 뺐다(형님 지시 2026-08-24). 우리 값(17,900원)보다 싼
          숫자를 앵커 옆에 세우면 비교표가 **우리를 비싸 보이게** 만든다. 대면·전화만 남기면
          세 칸이 두 칸이 되어 가로 스크롤도 사라진다(잘려 보이던 세 번째 카드 문제도 같이 해결). */}
      <div className="mt-6 flex justify-center gap-3">
        <VsCard label="철학관·점집 대면" from="10만원" to="30만원" />
        <VsCard label="전화 상담" from="3만원" to="10만원" />
      </div>

      <p className="mt-8 text-center">
        <span className="text-[44px] leading-[44px]" style={{ color: PINK, fontWeight: 800 }}>
          VS
        </span>
      </p>

      <div className="mt-6 text-center">
        <p className="text-[16px] leading-[24px]" style={{ color: INK, fontWeight: 500 }}>
          {isMarriage ? "직녀의 결혼예보" : "직녀의 연애예보"}
        </p>
        <p className="mt-2">
          {compareLabel && (
            <span className="mr-2 text-[17px] line-through" style={{ color: MUTE }}>
              {compareLabel}
            </span>
          )}
          <span className="text-[40px] leading-[44px]" style={{ color: INK, fontWeight: 800 }}>
            {priceLabel.replace("원", "")}
          </span>
          <span className="ml-0.5 text-[16px]" style={{ color: INK, fontWeight: 500 }}>
            원
          </span>
        </p>
      </div>

      <PlusList
        items={[
          <>
            내 사주풀이에 <span style={{ color: PINK, fontWeight: 700 }}>+</span>{" "}
            {isMarriage ? "결혼하는 해와 그 해의 달까지!" : "인연이 열리는 달과 만나는 자리까지!"}
          </>,
          <>
            읽어도 읽어도 끝이 없는 <span style={{ color: PINK, fontWeight: 700 }}>A4 여덟 쪽 분량</span>
          </>,
          <>
            한 번 사면 <span style={{ color: PINK, fontWeight: 700 }}>마이페이지에 계속 보관</span>
          </>,
        ]}
      />

      <div className="mt-6">
        <Cap>* 다른 곳 가격은 공개된 시세 범위예요. 같은 걸 판다는 뜻은 아니에요.</Cap>
      </div>
    </section>
  );
}
