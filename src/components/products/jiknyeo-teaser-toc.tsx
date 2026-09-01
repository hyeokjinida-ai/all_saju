"use client";

// 티저 하단 목차 — 청월당 「연애비책」 POINT 4 구간을 1:1로 옮긴 것.
//
// 원본 실측(랜딩/연애비책/14.png):
//   POINT 배지 → 헤드 2줄(한 줄만 색) → 짧은 선 → 서브 2줄 → 한지 카드
//   카드 안: 장 제목(좌측 세로 핑크 바 + 볼드) → 풀이 N. 줄들(줄마다 얇은 회색 밑줄)
//   ★ 장과 장 사이에 **SD 캐릭터 + 개인화 말풍선**이 좌우 번갈아 들어간다.
//     이게 목차를 "남의 상품 설명"이 아니라 "내 얘기"로 만든다 — 베낄 것 중 제일 값어치 있는 장치.
//
// 원본은 6장 × 3~5줄 = 약 30줄을 편다. 우리 기존 목차 5줄의 6배다.
// 「상세 풀이항목은 페이지 맨 아래」로 유도해 **전량 공개**하는 것도 원본 방식 그대로다 —
// 다 보여줘야 분량이 믿기고, 잠글 것은 값이지 목차가 아니다.
import {
  PointBadge,
  BrushHead,
  Rule,
  T,
  Em,
  Cap,
  HanjiCard,
  TocChapter,
  PINK,
  INK,
  LINE,
} from "@/components/products/jiknyeo-teaser-kit";
import { SlotCut } from "@/components/products/jiknyeo-ui";
import type { AssetMap } from "@/lib/jiknyeo-slots";

/** 장별 풀이 줄 — 결과지 outline 10장과 1:1로 맞춘다(없는 걸 적으면 그게 거짓말이 된다). */
const TOC_INYEON: { title: string; items: string[] }[] = [
  { title: "1장. 내 인연 그릇", items: ["내가 타고난 연애 그릇은?", "이성이 느끼는 나의 첫인상은?", "썸 단계에서 내가 지는 지점은?"] },
  { title: "2장. 당신이 걸어온 길", items: ["지난 몇 해, 내 연애가 왜 그랬는지", "그때 그 일이 우연이 아니었던 이유"] },
  { title: "3장. 내가 놓치는 패턴", items: ["인연이 와도 내가 밀어내는 순간", "반복되는 그 패턴, 어디서 오나"] },
  { title: "4장. 만나는 달 세 개", items: ["열두 달 중 인연이 열리는 달은?", "그 달에 어디서 만나게 되나", "그 달을 어떻게 써야 하나"] },
  { title: "5장. 내게 올 사람", items: ["그 사람의 태도와 말투는?", "나이대와 분위기는 어떤가", "어떤 자리에서 만나게 되나"] },
  { title: "6장. 그 사람을 알아보는 신호 셋", items: ["처음 만났을 때 나타나는 신호", "이 사람인지 확인하는 방법", "헷갈릴 때 무엇을 보나"] },
  { title: "7장. 조심할 달", items: ["연애를 시작하면 안 되는 시기는?", "그 시기에 대신 할 일"] },
  { title: "8장. 크게 바뀌는 해", items: ["내 삶이 크게 갈리는 해는?", "그 해에 무엇이 달라지나"] },
  { title: "9장. 내 고민, 정면으로 답해요", items: ["적어주신 물음에 대한 답"] },
  // 제목이 「3가지」인데 줄이 둘이면 그 자리에서 하나가 비어 보인다.
  // prompt.ts 의 이 장 지시는 실제로 셋을 쓰게 하고 「셋 중 하나는 가장 가까운 좋은 달과 연결」이라
  // 못박혀 있다 — 세 번째 줄은 새 약속이 아니라 이미 쓰고 있는 것을 적는 것이다.
  {
    title: "10장. 이번 주에 할 것 3가지",
    items: ["당장 이번 주에 움직일 것", "하지 말아야 할 것", "가장 가까운 달에 맞춰 준비할 것"],
  },
];

const TOC_MARRIAGE: { title: string; items: string[] }[] = [
  { title: "1장. 내 결혼 그릇", items: ["내가 타고난 결혼 그릇은?", "배우자 자리가 말하는 것", "결혼 후 내가 달라지는 부분"] },
  { title: "2장. 당신이 걸어온 길", items: ["지난 몇 해가 왜 그랬는지", "그때 그 선택이 우연이 아니었던 이유"] },
  { title: "3장. 결혼이 늦어지는 이유", items: ["내 사주에서 늦어지는 지점", "그게 흠이 아닌 이유"] },
  { title: "4장. 결혼하는 해", items: ["내가 결혼하는 해는 몇 년도?", "그 해 안에서 서두를 달은?", "그 해에 무엇부터 하나"] },
  { title: "5장. 함께할 사람", items: ["그 사람의 태도와 말투는?", "나이대와 분위기는 어떤가", "어디서 만나게 되나"] },
  { title: "6장. 그 사람을 알아보는 신호 셋", items: ["이 사람인지 확인하는 방법", "헷갈릴 때 무엇을 보나"] },
  { title: "7장. 피해야 할 시기", items: ["결혼을 서두르면 안 되는 시기는?", "그 시기에 대신 할 일"] },
  { title: "8장. 결혼 전에 정리할 것", items: ["결혼 전에 반드시 정리할 것", "미루면 나중에 커지는 것"] },
  { title: "9장. 내 고민, 정면으로 답해요", items: ["적어주신 물음에 대한 답"] },
  // 제목이 「3가지」인데 줄이 둘이면 그 자리에서 하나가 비어 보인다.
  // prompt.ts 의 이 장 지시는 실제로 셋을 쓰게 하고 「셋 중 하나는 가장 가까운 좋은 달과 연결」이라
  // 못박혀 있다 — 세 번째 줄은 새 약속이 아니라 이미 쓰고 있는 것을 적는 것이다.
  {
    title: "10장. 이번 주에 할 것 3가지",
    items: ["당장 이번 주에 움직일 것", "하지 말아야 할 것", "가장 가까운 달에 맞춰 준비할 것"],
  },
];

/** 장 사이 캐릭터 코멘트 — 원본은 좌우를 번갈아 앉힌다.
 *  ⚠ 문장은 **손님 사주에서 나온 것만** 쓴다(coldRead). 지어낸 칭찬을 넣으면 그 줄만 가짜가 된다. */
function SdSay({
  text,
  side,
  assets,
  variant,
}: {
  text: string;
  side: "left" | "right";
  assets?: AssetMap;
  variant: "sdSmile" | "sdThink";
}) {
  // 2등신 캐릭터 그림이 들어오면 그걸 쓰고, 아직 없으면 글자 배지로 자리를 지킨다.
  // 원본은 장마다 SD 캐릭터가 말을 거는데, 그게 목차를 「상품 설명」에서 「내 얘기」로 바꾼다.
  const a = assets?.[variant];
  const face = a?.img ? (
    <img
      src={a.img}
      alt=""
      className="h-12 w-12 shrink-0 rounded-full object-cover"
      style={{ border: `1px solid ${PINK}33` }}
    />
  ) : (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px]"
      style={{ background: "#fdeef2", border: `1px solid ${PINK}44`, color: PINK, letterSpacing: "normal" }}
    >
      직녀
    </span>
  );
  return (
    <div className={`mt-5 flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
      {face}
      <div
        className="bg-white px-3.5 py-2.5 text-[14px] leading-[21px]"
        style={{ border: `1px solid ${LINE}`, borderRadius: 12, color: "#242424" }}
      >
        {text}
      </div>
    </div>
  );
}

export function JiknyeoTeaserToc({
  slug,
  comments,
  assets,
}: {
  slug: string;
  /** 손님 사주에서 나온 문장들(coldRead) — 장 사이에 끼운다. 없으면 그 자리는 비운다. */
  comments: string[];
  assets?: AssetMap;
}) {
  const rows = slug === "marriage-saju" ? TOC_MARRIAGE : TOC_INYEON;
  const isMarriage = slug === "marriage-saju";
  return (
    <section className="mt-14">
      <PointBadge n={4} />
      <div className="mt-3">
        <BrushHead
          lines={isMarriage ? ["상담 두 시간 분량!", "결과지에 다 적혀 있어요"] : ["상담 두 시간 분량!", "결과지에 다 적혀 있어요"]}
          accent={1}
        />
      </div>
      <Rule />
      {/* 손님 속말은 본문, 우리 약속이 정점 — 바로 아래 한지 카드(열 장)의 예고이자 근거다. */}
      <T>&lsquo;이런 것까지 알려줘요?&rsquo;</T>
      <Em>열 장을 다 펴서 보여드릴게요.</Em>

      <div className="mt-7">
        <HanjiCard>
          {/* 두루마리 오브젝트 — 원본도 카드 안에 소품 일러를 하나 놓는다 */}
          <div className="mx-auto mb-5 max-w-[180px]">
            <SlotCut id="w6" assets={assets} ratio="1 / 1" pos="center 45%" />
          </div>

          <div
            className="bg-white px-3 py-2.5 text-center text-[13px]"
            style={{ border: `1px solid ${LINE}`, color: INK, fontWeight: 700 }}
          >
            *전체 풀이 내용이에요. 결제하시면 이 열 장이 다 열려요.
          </div>

          {rows.map((c, i) => (
            // 간격을 여기서 준다 — 장 끝 코멘트(SdSay)까지 한 덩어리로 묶고 다음 장을 떼어 놓는다.
            <div key={c.title} className={i > 0 ? "mt-10" : undefined}>
              <TocChapter title={c.title} items={c.items} />
              {/* 장 사이 개인화 코멘트 — 좌우 번갈아. 손님 문장이 있는 만큼만 */}
              {/* 원본은 장이 끝날 때마다 캐릭터가 한 마디씩 얹고 좌우를 번갈아 앉힌다.
                  우리는 손님 문장(coldRead)이 있는 만큼만 — 없는 자리를 지어내면 그 줄이 가짜가 된다. */}
              {comments[i] && (
                <SdSay
                  text={comments[i]}
                  side={i % 2 === 0 ? "left" : "right"}
                  assets={assets}
                  variant={i % 2 === 0 ? "sdSmile" : "sdThink"}
                />
              )}
            </div>
          ))}
        </HanjiCard>
      </div>

      {/* 실물 한 쪽 — 목차로 「열 장이 있다」고 말한 바로 뒤에 그 장이 어떻게 생겼는지 보여준다.
          경쟁 2사가 같은 자리에서 결과지 스크린샷을 쓴다(청월당 12구간 · 타이트 공통부품 ③).
          그림을 새로 그리지 않았다 — /dev/jiknyeo-result 표본을 폰 390 으로 그대로 찍었다.
          아래는 잘라 페이드로 닫는다: 한 쪽이 다 보이면 「이게 전부」로 읽힌다. */}
      {/* 20px → 44px: 목차 각주에 붙어 「목차 스택의 연장」으로 읽혔다.
          실물은 목차와 다른 물건(증거)이니 한 숨 쉬고 등장한다(칠흑 여백 번역, 컷 눈금 44).
          인라인인 이유: mt-11 은 dev Tailwind 가 생성을 놓친다(SajuWizard 같은 자리 주석). */}
      <div style={{ marginTop: 44 }}>
        <div className="relative overflow-hidden rounded-[12px]" style={{ height: 320, border: "1px solid var(--gold-line)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/products/jiknyeo/sample-page.webp"
            alt="직녀 결과지 한 쪽 — 짝 카드와 첫 장 본문"
            width={780}
            height={2300}
            loading="lazy"
            draggable={false}
            className="w-full select-none object-cover object-top"
            style={{ height: 320 }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: "linear-gradient(180deg, rgba(247,244,251,0) 0%, rgba(247,244,251,0.94) 88%)" }}
          />
        </div>
        {/* 면책 — 값이 든 화면을 예시로 쓰는 자리엔 반드시 붙인다(청월당도 샘플 블록마다 붙인다).
            안 붙이면 「저 얼굴이 내 짝」으로 읽힐 수 있다. */}
        <div className="mt-2">
          <Cap>* 예시 화면이에요. 얼굴도 풀이도 결제 후 내 사주에서 다시 나와요.</Cap>
        </div>
      </div>

      <div className="mt-4">
        {/* 분량(A4·분)은 형님 지시로 걷어냄(2026-09-02) — 보관·재열람만 남긴다. */}
        <Cap>마이페이지에 계속 보관돼요 · 언제든 다시 열어볼 수 있어요</Cap>
      </div>
    </section>
  );
}
