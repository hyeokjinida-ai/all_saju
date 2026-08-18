"use client";

// 티저 차별점 구간 — 청월당 「연애비책」 POINT 1~3 (11~13.png).
//
// 원본 조판(POINT 1 실측):
//   알약 배지 「POINT 1.」 → 헤드 2줄(**아랫줄만 핑크**) → 짧은 선 → 서브 2줄(회색 본문)
//   → 그 아래 근거 블록(카드/목업/대비표)
//
// 그들의 POINT 3 은 「챗gpt로는 볼 수 없는」 — **AI 저격**이다. 우리도 AI 로 쓰지만
// 그들과 다른 건 계산이 먼저라는 점이라, 저격 대신 **무엇이 계산이고 무엇이 문장인지**를 밝힌다.
// 없는 자랑을 만들지 않는 게 이 섹션의 규칙이다.
//
// ⚠ 원본 11.png 의 「누적 고객 457,953명 / 팝업 방문자 13,745명 / 후기 19,793개」 금색 월계관 블록은
//    **안 가져온다**. 우리한테 없는 숫자다. 자리를 비우는 게 지어내는 것보다 낫다.
import { PointBadge, BrushHead, Rule, T, Cap, LINE, PINK, INK, BODY } from "@/components/products/jiknyeo-teaser-kit";

/** 근거 줄 — 좌측에 얇은 핑크 바를 둔 흰 판. POINT 아래 증거를 얹는 규격. */
function Proof({ head, body }: { head: string; body: string }) {
  return (
    <div className="mt-3 bg-white px-4 py-3.5" style={{ borderRadius: 10, border: `1px solid ${LINE}` }}>
      <p className="flex items-center gap-2 text-[15px]" style={{ color: INK, fontWeight: 700 }}>
        <span className="inline-block h-[14px] w-[3px]" style={{ background: PINK }} />
        {head}
      </p>
      <p className="mt-1.5 text-[15px] leading-[22px]" style={{ color: BODY }}>
        {body}
      </p>
    </div>
  );
}

export function JiknyeoTeaserPoints({ isMarriage }: { isMarriage?: boolean }) {
  const subject = isMarriage ? "결혼" : "연애";
  return (
    <>
      {/* POINT 1 — 원본: 「내 연애 이야기가 재미있는 웹툰으로?」(줄글 지루함을 때린다) */}
      <section className="mt-14">
        <PointBadge n={1} />
        <div className="mt-3">
          <BrushHead lines={[`내 ${subject} 이야기를`, "그림으로 읽어요"]} accent={1} />
        </div>
        <Rule />
        <T>
          줄글로 빼곡한 결과지, 끝까지 읽으신 적 있으세요?
          <br />
          직녀가 그림과 함께 짚어 드려요.
        </T>
      </section>

      {/* POINT 2 — 원본: 「다른 연애운 사주와 얼마든지 비교해 보세요」 */}
      <section className="mt-14">
        <PointBadge n={2} />
        <div className="mt-3">
          <BrushHead lines={["다른 사주풀이와", "얼마든지 비교해 보세요"]} accent={1} />
        </div>
        <Rule />
        <T>
          소문만 안 믿으셔도 돼요.
          <br />
          우리가 무엇을 계산하는지 먼저 적어 둘게요.
        </T>
        <Proof
          head="달을 숫자로 세서 골라요"
          body={`앞으로 열두 달을 하나씩 채점해서 ${isMarriage ? "서두를 달" : "인연이 열리는 달"}을 고릅니다. 좋은 말을 고르는 게 아니라 점수가 높은 달을 고르는 거예요.`}
        />
        <Proof
          head="나쁜 시기도 같이 적어요"
          body="좋은 달만 말하는 풀이는 맞았는지 확인할 방법이 없어요. 조심할 시기를 같이 적어야 나중에 대조가 됩니다."
        />
        <Proof
          head="지나간 일로 먼저 검증해요"
          body="앞일을 말하기 전에 지난 몇 해에 있었던 일을 먼저 짚어요. 그게 맞아야 나머지도 믿을 수 있으니까요."
        />
      </section>

      {/* POINT 3 — 원본은 챗GPT 저격. 우리는 저격 대신 **경계를 밝힌다**(우리도 AI 를 쓴다). */}
      <section className="mt-14">
        <PointBadge n={3} />
        <div className="mt-3">
          <BrushHead lines={["어디까지가 계산이고", "어디부터가 풀이인지"]} accent={1} />
        </div>
        <Rule />
        <T>
          챗봇에 생일을 넣으면 그럴듯한 문장은 나와요.
          <br />
          다만 <span style={{ color: PINK, fontWeight: 700 }}>달과 해는 계산에서만</span> 나옵니다.
        </T>
        <Proof
          head="계산이 하는 일"
          body="여덟 글자 세우기, 절입일 기준 대운 나이, 열두 달 월운 채점, 배우자 자리 판정 — 사람이 고르는 게 아니라 만세력에서 나와요."
        />
        <Proof
          head="문장이 하는 일"
          body="그 계산 결과를 읽기 쉬운 말로 풀어 적는 일만 해요. 계산에 없는 달·해를 문장이 만들어내지 않습니다."
        />
        <div className="mt-4">
          <Cap>* 결과지에는 계산에 쓰인 원국(여덟 글자)을 그대로 실어 드려요.</Cap>
        </div>
      </section>
    </>
  );
}
