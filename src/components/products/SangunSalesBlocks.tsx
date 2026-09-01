// 박수무당 사주 세일즈 블록 — 세일즈 페이지와 티저 화면이 **같이** 쓴다.
//
// 왜 빼냈나(2026-08-11): 타이트 실측 결과 걔넨 별도 세일즈 페이지가 없다.
// 게이트 → 스토리 → 입력 → 티저 한 장에 무료 티저·가격·목차·예시 결과지·후기가 전부 붙어 있고,
// 스토리 스킵조차 상품 소개가 아니라 **입력**으로 간다(입력을 피하는 길이 없다).
// 우리도 스토리 탈출구를 입력 직행으로 바꾸면서, 세일즈 자료가 유실되지 않게 티저 아래로 옮겼다.
//
// 색은 하드코딩하지 않고 `.world-sangun` 토큰(globals.css:108)을 쓴다 —
// 두 화면이 같은 world 안에 있어 값이 같고, 나중에 톤을 바꿀 때 한 곳만 고치면 된다.
import { StoryFooter } from "@/components/products/StoryFooter";

// 예시 결과지 — 실제 엔진 출력(1993-05-15 여) 그대로. 손으로 다듬지 않는다.
// noTitle: 티저 꼬리에서는 바로 위 표지 컷의 말풍선이 소개를 대신하므로 제목을 뺀다(같은 말 두 번 금지).
export function SampleCard({ noTitle }: { noTitle?: boolean } = {}) {
  return (
    <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-line)" }}>
      {!noTitle && (
        <p className="mb-1 text-center font-myeongjo text-[15px] font-bold" style={{ color: "var(--bone)" }}>
          이렇게 나온다
        </p>
      )}
      <p className="mb-4 text-center text-[13px]" style={{ color: "var(--bone-faint)" }}>
        예시 · 1993년생 여성의 실제 결과지에서
      </p>
      {/* 실물 한 쪽 — 텍스트 발췌만으로는 「분량과 조판」이 안 보인다.
          경쟁 2사가 티저에서 결과지 **스크린샷**을 쓰는 자리다(청월당 12구간·타이트 ③).
          우리는 그림을 새로 그리지 않고 /dev/sangun-result 표본을 그대로 찍어 쓴다 —
          손님이 결제 후 받는 화면과 **같은 픽셀**이라 과장이 성립하지 않는다.
          아래를 잘라 페이드로 닫는다: 한 쪽이 다 보이면 「이게 전부」로 읽힌다. */}
      <div className="relative mb-4 overflow-hidden" style={{ height: 300, border: "1px solid var(--gold-pale)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/sangun/sample-page.webp"
          alt="산군 장부 본문 한 쪽 — 한지에 적힌 풀이와 붉은 표시"
          width={780}
          height={2300}
          loading="lazy"
          draggable={false}
          className="w-full select-none object-cover object-top"
          style={{ height: 300 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(180deg, rgba(7,6,9,0) 0%, rgba(7,6,9,0.92) 88%)" }}
        />
      </div>
      <div className="space-y-3 text-[15px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
        <p className="font-myeongjo text-[15px] font-bold" style={{ color: "var(--gold)" }}>
          3. 돈이 들어오는 달
        </p>
        <p>
          <b style={{ color: "var(--bone)" }}>재물그릇 점수는 65점</b>이다. 특히 <b style={{ color: "var(--bone)" }}>2027년 6월</b>과{" "}
          <b style={{ color: "var(--bone)" }}>2027년 5월</b>이 가장 기대되는 달이더군. 다만 <b style={{ color: "var(--bone)" }}>2027년 1월</b>은
          조심해야 할 달이니, 불필요한 지출을 줄이고 신중히 결정해라.
        </p>
        <div className="pt-1" style={{ borderTop: "1px dashed var(--gold-line)" }}>
          <p className="pt-2 font-myeongjo text-[15px] font-bold" style={{ color: "var(--gold)" }}>
            8. 네 물음에 답한다 — &ldquo;올해 이직해도 될까요&rdquo;
          </p>
          <p>
            <b style={{ color: "var(--bone)" }}>이직해도 좋다.</b> 올해는 변화의 때가 다가오고 있다. 이직 시점으로는…{" "}
            <span style={{ color: "var(--bone-faint)" }}>(결제 후 계속)</span>
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-[13px]" style={{ color: "var(--bone-faint)" }}>
        여기 적힌 달은 예시다. 네 달은 네 사주에서 다시 계산된다.
      </p>
    </div>
  );
}

// 받는 것 — 11챕터 목차 (결과지 outline 과 1:1 — 목차에 있는데 결과지에 없으면 들통)
export function TocCard({ priceLabel }: { priceLabel: string }) {
  const rows: [string, string][] = [
    // 수위는 '중간 — 호기심만'(형님 결정). 타이트처럼 성적 표현·열등감 저격까지는 가지 않는다.
    ["1. 타고난 네 그릇", "남들은 못 보는 네 결 하나"],
    ["2. 네가 걸어온 길", "지나온 해까지 되짚어 맞춘다"],
    ["3. 올해 오는 것, 떠나는 것", "올해 네게서 빠져나갈 것 하나"],
    ["4. 돈이 들어오는 달", "몇 월인지 · 어디로 새는지"],
    ["5. 인연이 들어오는 달", "네 짝이 지나가는 달"],
    ["6. 일과 자리의 시기", "지금 움직일 때인지, 엎드릴 때인지"],
    ["7. 조심할 달", "네가 흔들리는 달 — 미리 알고 넘겨라"],
    ["8. 인생이 크게 바뀌는 해", "몇 살에 갈리는지, 그때 뭐가 달라지는지"],
    ["9. 네 물음의 답", "하라 · 말라로 답을 정해서"],
    ["10. 산군의 처방", "네게 맞는 방향·색·자리까지"],
    ["11. 마지막 당부", "이번 주에 당장 할 것 셋"],
  ];
  return (
    <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-line)" }}>
      <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "var(--bone)" }}>
        받는 것 — 11장 · 확답 일곱 이상 · 앞으로 12개월 전부
      </p>
      {/* 목차만 13px 로 남긴다. 본문 눈금(15px)에 맞춰 올렸더니 9행 중 4행이 두 줄로 넘어갔다 —
          제목과 설명이 한 줄에서 좌우로 맞물려야 훑어지는 목록이라, 키우는 쪽이 오히려 나빴다. */}
      <ul className="space-y-2.5">
        {rows.map(([t, d]) => (
          <li key={t} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span style={{ color: "var(--bone-soft)" }}>{t}</span>
            <span className="text-right" style={{ color: "var(--bone-faint)" }}>
              {d}
            </span>
          </li>
        ))}
      </ul>
      <PriceAnchorLine priceLabel={priceLabel} />
    </div>
  );
}

// 분량 앵커(A4 몇 쪽·몇 자·몇 분)는 형님 지시로 통째로 걷어냈다(2026-09-02).
// 경쟁사는 이 자리를 2~5만 자로 파는데 우리 실측은 8천 자대다 — 숫자를 꺼내는 순간
// 지는 싸움이고, 「일부러 짧게 썼다」는 변명은 파는 문장이 아니다. 분량은 말하지 않고
// 내용물(章·확답·거를 사람)과 실물 스크린샷으로만 판다.

// 상향 앵커 — "점심 한 번 값"은 뺐다(4050 에게 '싸다'는 '부실하다'로 읽힌다, 모의구매 3/3 이 거슬려 함).
// 같은 리포의 재물 랜딩(WealthWebtoon.tsx:269)처럼 철학관 가격으로 위에서 눌러 준다.
function PriceAnchorLine({ priceLabel }: { priceLabel: string }) {
  return (
    <p className="mt-4 text-center text-[13px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
      신당에 몸소 들면 복채가 <b style={{ color: "var(--gold)" }}>5만에서 20만</b>이다. 나는 서고에서 장부를 읽어 주니{" "}
      <b style={{ color: "var(--gold)" }}>{priceLabel}</b>만 받는다 — 몇 분 안에 도착 · 마이페이지에 계속 보관
    </p>
  );
}

// 티저 **본문** 구매 카드 — 4章 카드 바로 뒤, 판 한가운데.
//
// 왜 세웠나(2026-09-01 실측): 산군 티저는 14,007px(16.6화면)인데 클릭 가능한 구매 버튼이
// y=13,865 **딱 하나**였다. 즉 16.4화면을 내려오는 동안 사고 싶어져도 살 자리가 없었다.
// 직녀는 같은 자리에 중반 카드(JiknyeoBuyCard, y=4,629)가 있어 두 번 친다 — 산군만 없었다.
//
// 앵커는 **내부만** 쓴다(정가 취소선 → 지금 값). 외부 앵커(신당 복채 5만~20만)는 꼬리의
// ValueSpecCard 가 이미 들고 있어서, 여기서 또 꺼내면 한 화면에 숫자가 셋(5만·20만·19,900)이
// 겹쳐 어느 것이 값인지 흐려진다. 본문=내부 앵커, 꼬리=외부 앵커로 갈라 둔다.
export function SangunBuyCard({
  priceLabel,
  compareLabel,
  discountPct,
  bundleLine,
  onBuy,
}: {
  priceLabel: string;
  compareLabel?: string;
  discountPct?: number;
  /** 번들 예고 한 줄(청월당 잠금 목록 끝 문법) — 없으면 안 그린다 */
  bundleLine?: string;
  onBuy: () => void;
}) {
  return (
    // mt-5 → mt-16(64px): 판 전체의 전환 정점인데 목차에 20px 로 붙어 있었다(실측).
    // 칠흑 판독 — 정점 앞 큰 숨이 다섯 번뿐이라 정점이 선다. 이 카드가 그 「최대 정점」이라
    // 결과지 간지급 눈금(64px)을 쓴다. 검은 배경이라 여백 자체가 어둠의 숨이 된다.
    <div
      className="mt-16 rounded-md p-6"
      style={{ background: "rgba(0,0,0,0.34)", border: "1px solid var(--gold-line)" }}
    >
      {/* 카피는 쉬운 말만(형님 지시 2026-09-02) — 멋 부린 문장 금지, 운세위키의
          「여기까지가 맛보기 / 진짜 풀이는 지금부터」 문법을 산군 반말로 옮긴 것.
          (「여기까지가 공짜다」는 아래 마감 펀치가 같은 말을 쓰므로 여기선 피한다) */}
      <p className="text-center font-myeongjo text-[19px] font-bold leading-[1.5]" style={{ color: "var(--bone)" }}>
        지금까지는 맛보기다.
      </p>
      <p className="mt-2 text-center text-[15px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
        진짜 풀이는 지금부터다. 몇 분이면 네 장부가 나온다.
      </p>
      {/* ⚠ 「받는 것 — 11장 · 확답 일곱…」은 여기 쓰지 않는다. 꼬리의 ValueSpecCard 가 같은 말을
          하고 있어서, 넣으면 한 페이지에서 같은 문장을 두 번 읽게 된다(실측으로 확인하고 걷어냈다).
          본문 카드의 일은 **지금 살 수 있게 하는 것**이고, 무엇을 받는지는 바로 위 4章 카드가
          이미 章별로 펴 놓았다. */}
      {/* 값 — 40px 숫자 하나가 정점이다. 옆에 취소선·할인율을 붙여 「지금 값」이 어느 것인지 못 박는다. */}
      <div className="mt-6 flex items-end justify-center gap-2.5">
        {compareLabel && (
          <span className="pb-1.5 text-[15px] line-through" style={{ color: "var(--bone-faint)" }}>
            {compareLabel}
          </span>
        )}
        <span className="font-myeongjo text-[40px] font-bold leading-none" style={{ color: "var(--gold-bright)" }}>
          {priceLabel}
        </span>
        {typeof discountPct === "number" && discountPct > 0 && (
          <span
            className="mb-1.5 px-2 py-1 text-[13px] font-bold"
            style={{ background: "#7a2317", color: "#f3e6cf" }}
          >
            {discountPct}% 할인
          </span>
        )}
      </div>
      {/* 버튼 문구는 결제 시트의 확정 문구(「장부 전체 열기」)와 같은 말 — 새 말을 만들지 않는다. */}
      <button
        type="button"
        onClick={onBuy}
        className="mt-5 w-full min-h-[56px] border-none font-bold text-[17px] tracking-[0.12em]"
        style={{
          fontFamily: "var(--font-serif-kr), serif",
          background: "var(--gold-bright)",
          color: "#17120c",
        }}
      >
        내 장부 전체 열기 →
      </button>
      <p className="mt-3 text-center text-[13px]" style={{ color: "var(--bone-faint)" }}>
        한 번만 받는다. 다달이 빠져나가는 것이 아니다.
      </p>
      {bundleLine && (
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--bone-soft)" }}>
          {bundleLine}
        </p>
      )}
    </div>
  );
}

// 티저용 — 목차는 이미 위에 4章 카드로 있으므로 분량 스펙과 가격 앵커만 세운다.
// (같은 화면에 11줄 목차를 또 깔면 방금 본 4章 카드의 재탕이 된다)
export function ValueSpecCard({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="mt-5 rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-line)" }}>
      <p className="text-center font-myeongjo text-[15px] font-bold leading-[1.5]" style={{ color: "var(--bone)" }}>
        받는 것 — 11장 · 확답 일곱 이상
        <br />
        앞으로 12개월 전부
      </p>
      <PriceAnchorLine priceLabel={priceLabel} />
    </div>
  );
}

const FAQ: [string, string][] = [
  [
    "무서운 말이 나오지는 않나요?",
    "겁주는 풀이는 하지 않아요. 산군의 말투는 단호하지만, 조심할 달에는 반드시 대처법을 함께 일러주고 마지막은 해줄 일로 맺어요. 이별·사별 같은 단정은 아예 쓰지 않게 설계돼 있어요.",
  ],
  [
    "무료 사주랑 뭐가 다른가요?",
    "무료 사주는 '올해 좋은 일이 있겠네요'에서 끝나요. 여기서는 연도와 달을 집어서 확답해요. 돈이 들어오는 달, 인연이 들어오는 달, 인생이 크게 바뀌는 해까지 — 그 달들은 사람이 골라주는 게 아니라 만세력 계산에서 나와요.",
  ],
  [
    "왜 반말인가요?",
    "산군은 산신을 받든 박수예요. 신당에서 듣는 것처럼 단호한 반말로 확답하지만, 무례하게 하대하지는 않아요. 편하게 들으시면 돼요.",
  ],
  [
    "태어난 시각을 몰라요. 음력 생일만 알아요.",
    "둘 다 괜찮아요. 시각을 모르시면 '시각 몰라요'를 누르시면 태어난 날을 중심으로 풀어드리고, 음력을 고르시면 양력으로 정확히 바꿔서 사주를 세워요.",
  ],
  [
    "결제랑 제 생년월일은 안전한가요?",
    "토스페이먼츠 안전결제로 진행돼요. 적어주신 생년월일은 사주 계산과 결과지 만드는 데만 쓰고 광고에 쓰지 않아요. 결과지가 제대로 만들어지지 않으면 전액 돌려드리고, 결과지를 열기 전이면 7일 안에 취소돼요.",
  ],
];

export function SangunFaq({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "var(--bone)" }}>
        자주 묻는 물음
      </p>
      <ul className="divide-y" style={{ borderColor: "var(--gold-pale)" }}>
        {FAQ.map(([q, a]) => (
          <li key={q} className="py-4" style={{ borderColor: "var(--gold-pale)" }}>
            <p className="mb-1.5 font-myeongjo text-[15px] font-semibold" style={{ color: "var(--bone)" }}>
              Q. {q}
            </p>
            <p className="text-[15px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
              {a}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 티저 꼬리 전용 컷 — 글카드 사이에 사진을 끼우는 리듬 부품(형님 원칙: 글·사진 교차).
// 위저드 컨테이너의 px-5(20px)를 음수 마진으로 뚫어 컬럼 끝까지 나간다.
// (장부 판의 좌우 패딩은 2026-08-11 에 0 으로 걷었다 — 판·카드가 그림보다 좁아 좌우 끝이
//  세 군데였던 문제. 그래서 본문 TeaserCut 도 지금은 같은 -mx-5 다.)
// 대사 말풍선·스크림은 티저 본문의 CutSay 와 같은 옷 — 화면 안에서 문법이 갈리면 안 된다.
function TailCut({
  src,
  alt,
  pos = "center 30%",
  sayAt = "top",
  say,
}: {
  src: string;
  alt: string;
  pos?: string;
  sayAt?: "top" | "bottom";
  say: React.ReactNode;
}) {
  return (
    <div
      className="relative -mx-5 mt-6 overflow-hidden"
      // containerType — 아래 대사가 이 컷 폭을 기준으로 커진다(티저 본문 TeaserCut 과 같은 규칙)
      style={{ containerType: "inline-size", aspectRatio: "4 / 5" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full select-none object-cover"
        loading="lazy"
        draggable={false}
        style={{ objectPosition: pos }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            sayAt === "top"
              ? "linear-gradient(180deg,rgba(8,7,6,0.62) 0%,rgba(8,7,6,0.15) 38%,rgba(8,7,6,0) 60%)"
              : "linear-gradient(0deg,rgba(8,7,6,0.62) 0%,rgba(8,7,6,0.15) 38%,rgba(8,7,6,0) 60%)",
        }}
      />
      <div className={`absolute inset-x-4 ${sayAt === "top" ? "top-4" : "bottom-4"} z-10`}>
        <div
          className="relative rounded-[5px] px-4 py-3"
          style={{
            background: "linear-gradient(180deg,rgba(243,234,214,0.94),rgba(233,222,194,0.92))",
            border: "1px solid rgba(201,185,142,0.8)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        >
          <span
            className="absolute -top-2.5 right-2.5 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
            style={{ background: "#8f2b1e", color: "#f3e6cf" }}
          >
            산군
          </span>
          {/* 티저 본문 CutSay 와 같은 자(4.9cqw) — 산군 목소리 크기는 화면이 바뀌어도 같아야 한다 */}
          <p
            className="font-myeongjo font-semibold leading-[1.75] text-[#241d10]"
            style={{ fontSize: "min(4.9cqw, 28px)" }}
          >
            {say}
          </p>
        </div>
      </div>
    </div>
  );
}

// 티저 하단 묶음 — 결제 버튼 바로 위에 붙는 설득 구역.
// 타이트 순서를 따랐다: 목차(위의 4章 카드) → 분량·가격 → 예시 결과지 → 신뢰. 걔넨 FAQ 가 없지만
// 우리는 비회원 결제·시각 모름·환불이 실제로 자주 걸리는 질문이라 남긴다.
// 글카드만 4연속으로 쌓았다가 형님 지적(글·사진 교차 리듬)으로 컷 3장을 끼웠다 — 결과지용으로
// 만들어 둔 money(엽전)·cover(표지)·close(낙관) 재활용, 새 발주 0장. 대사는 임시 3줄(교체 쉬움).
export function TeaserSalesTail({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="mt-2">
      <TailCut src="/products/sangun/money.webp" alt="엽전 꾸러미를 든 손과 펼친 장부" sayAt="top" say="받을 것부터 세어 봐라." />
      <ValueSpecCard priceLabel={priceLabel} />
      {/* 예시 앞은 낙관 컷(완성 증표가 찍힌 장부) — "표지" 대사에 전신 사진을 붙였다가
          말과 그림이 어긋나 교체. 전신 정면은 아래 FAQ(물음 받는 자세) 앞이 맞다. */}
      <TailCut
        src="/products/sangun/close.webp"
        alt="장부를 덮고 낙관을 찍는 손"
        sayAt="top"
        say="완성된 장부에서 한 쪽 떼 왔다."
      />
      <div className="mt-5">
        <SampleCard noTitle />
      </div>
      <TailCut
        src="/products/sangun/cover.webp"
        alt="정면으로 선 산군"
        pos="center 24%"
        sayAt="bottom"
        say="궁금한 건 묻고 가라."
      />
      <SangunFaq className="mt-6" />
      <StoryFooter />
    </div>
  );
}
