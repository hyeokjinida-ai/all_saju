import { StoryFooter } from "@/components/products/StoryFooter";

// "인연 들어오는 달" 전용 웹툰 랜딩 — 30대 여성 페르소나 3인 검증(22개 지적) 반영판.
// 1호(WealthStory)와 같은 뼈대이되: 달빛 팔레트 / 한자 배제 / 상태 배지 / 예시 결과지 카드 /
// 목차 카드(가격 앵커 대체 — 페르소나 3/3이 철학관 비교를 거부) / 상품 전용 FAQ 포함.
// 이미지가 아직 없어도 페이지가 성립하도록 컷은 src 없이 '달빛 패널'로 렌더된다(이미지 도착 시 src만 채움).

const INK_BG = "linear-gradient(180deg,#0b0f1a 0%,#141026 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(7,6,15,0.30) 0%, rgba(7,6,15,0) 28%, rgba(7,6,15,0) 52%, rgba(7,6,15,0.97) 100%)";
const MOON = "#d9c7e8"; // 달빛(강조)
const RED = "#8f2b1e"; // 홍실(포인트·명패)
const SUB = "#9aa3b8";

// 풀블리드 컷 — src 가 오면 이미지, 없으면 달빛 패널(말풍선이 카피를 다 나른다)
// priority: 첫 화면 컷은 lazy 대신 즉시 로드(LCP — 웹툰 랜딩의 첫인상이 이미지이므로)
function Cut({
  src,
  width,
  height,
  alt,
  minH = 430,
  priority,
  children,
}: {
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
  minH?: number;
  priority?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full overflow-hidden" style={src ? undefined : { minHeight: minH }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className="block w-full"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 22%, #241d3f 0%, transparent 70%), radial-gradient(circle 120px at 50% 20%, rgba(217,199,232,0.28) 0%, transparent 100%), linear-gradient(180deg,#141026,#0b0f1a)",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />
      {children}
    </div>
  );
}

// 한지 말풍선 + 주홍 명패
function Bubble({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-x-4 bottom-5 rounded-[5px] px-5 py-4"
      style={{
        background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
        border: "1px solid #c9b98e",
        boxShadow: "0 10px 30px rgba(0,0,0,0.55), inset 0 0 34px rgba(216,201,163,0.35)",
      }}
    >
      <span
        className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
        style={{ background: RED, color: "#f3e6cf" }}
      >
        {who}
      </span>
      <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">{children}</p>
    </div>
  );
}

const P = { color: "#a4552c" }; // 말풍선 안 포인트

// ▓ 잠금 티저
function TeaserLock() {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      className="flex items-baseline justify-between gap-3 rounded-[4px] px-4 py-3"
      style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(217,199,232,0.22)" }}
    >
      <span className="shrink-0 text-[15px]" style={{ color: SUB }}>
        {label}
      </span>
      <span className="text-right font-myeongjo text-[17px] font-bold tracking-[0.06em]" style={{ color: MOON }}>
        {value}
      </span>
    </div>
  );
  return (
    <a
      href="#start"
      className="relative block rounded-md p-6"
      style={{
        background: "linear-gradient(160deg,#171130,#10101f)",
        border: "1px solid rgba(217,199,232,0.28)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* 緣 낙관 — 봉인된 장부 느낌 */}
      <span
        aria-hidden
        className="absolute -top-3 right-4 flex h-9 w-9 rotate-3 items-center justify-center rounded-[3px] font-myeongjo text-[17px] font-bold"
        style={{ background: RED, color: "#f3e6cf", boxShadow: "0 6px 16px rgba(0,0,0,0.45)" }}
      >
        緣
      </span>
      <div className="mb-5 text-center">
        <p className="font-myeongjo text-[17px] font-bold" style={{ color: "#efe6d2" }}>
          계산은 이미 끝났어요 — 당신 것만 잠겨 있을 뿐이에요
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "#7d8496" }}>
          당신 생년월일로 다시 계산해서, 아래 빈칸을 채워드려요
        </p>
      </div>
      <div className="space-y-2.5">
        <Row label="내 인연 그릇" value={<>▓▓점 / 100점</>} />
        <Row label="만나는 달 세 개" value={<>20▓▓년 ▓월 · ▓월 · ▓월</>} />
        <Row label="내게 올 사람" value={<>▓▓한 사람 · 나이는 ▓▓ 쪽</>} />
        <Row label="조심할 달" value={<>20▓▓년 ▓월</>} />
        <Row label="크게 바뀌는 해" value={<>▓▓▓▓년(▓▓세)</>} />
      </div>
      <div className="mt-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-myeongjo text-[13px] font-semibold"
          style={{ background: RED, color: "#f3e6cf", boxShadow: "0 4px 14px rgba(143,43,30,0.4)" }}
        >
          결제 후 전체가 선명하게 열려요
        </span>
      </div>
    </a>
  );
}

// 예시 결과지 카드 — 실제 엔진 출력(1993-05-15 여) 그대로. 손으로 다듬지 않는다.
function SampleCard() {
  return (
    <div
      className="rounded-md p-6"
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(217,199,232,0.2)" }}
    >
      <p className="mb-1 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
        이렇게 나와요
      </p>
      <p className="mb-4 text-center text-[13px]" style={{ color: "#7d8496" }}>
        예시 · 1993년생 여성의 실제 결과지에서
      </p>
      <div className="space-y-3 text-[15px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
        <p className="font-myeongjo text-[15px] font-bold" style={{ color: MOON }}>
          4. 만나는 달 세 개
        </p>
        <p>
          <b style={{ color: "#efe6d2" }}>2027년 5월</b> (배우자 자리와 찰떡 합) — 이 달은 당신의 배우자
          자리가 강하게 활성화되며 좋은 인연이 들어오는 시기입니다. 이때는 자리를 마련해 소개받는 것이
          좋습니다. 주변에 믿을 수 있는 친구들에게 새롭게 소개해달라고 요청해 보세요.
        </p>
        <p>
          <b style={{ color: "#efe6d2" }}>2026년 12월</b> (짝을 뜻하는 자리가 속에 깔림) — 짝의 기운이
          강하게 작용하는 시점입니다. 마음에 두고 있는 사람에게 먼저 연락해 보세요. 진심이 잘 전달되어
          더 깊은 관계로 나아가는 계기가 될 수 있습니다.
        </p>
        <p>
          <b style={{ color: "#efe6d2" }}>2027년 6월</b> (전체 흐름이 대길) — 미뤄둔 약속이나 만남을
          잡아보세요. 이 기회를 통해 새로운 인연이 생길 가능성이 높습니다.
        </p>
        <div className="pt-1" style={{ borderTop: "1px dashed rgba(217,199,232,0.2)" }}>
          <p className="pt-2 font-myeongjo text-[15px] font-bold" style={{ color: MOON }}>
            5. 내게 올 사람
          </p>
          <p>
            그 사람은 처음 만났을 때 진중하고 차분한 인상을 주며, 말투는 부드럽고 이해심이 깊습니다.
            대화 중 당신의 말을 잘 들어주고… <span style={{ color: "#7d8496" }}>(결제 후 계속)</span>
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-[13px]" style={{ color: "#7d8496" }}>
        여기 적힌 달은 예시예요. 당신 달은 당신 사주에서 다시 계산돼요.
      </p>
    </div>
  );
}

// 목차 카드 — 가격 앵커 자리를 대체(받는 것의 양으로 값을 정당화)
function TocCard({ priceLabel, compareLabel }: { priceLabel: string; compareLabel?: string }) {
  // ⚠ 결과지 outline(prompt.ts STYLE_BY_SLUG["inyeon-saju"])과 **1:1**이어야 한다.
  //    목차에 있는데 결과지에 없으면 그 자리에서 들통난다. 2026-08-17 8장 → 10장.
  const rows: [string, string][] = [
    ["1. 내 인연 그릇", "점수와 그 점수가 나온 이유"],
    ["2. 당신이 걸어온 길", "지나온 해까지 되짚어서"],
    ["3. 내가 놓치는 패턴", "반복되는 어긋남의 구조"],
    ["4. 만나는 달 세 개", "연도·월까지 콕"],
    ["5. 내게 올 사람", "나를 대하는 태도·말투·만나는 자리·나이대"],
    ["6. 그 사람을 알아보는 신호 셋", "처음 몇 번의 만남에서 확인되는 것"],
    ["7. 조심할 달", "피하는 법을 같이 드려요"],
    ["8. 크게 바뀌는 해", "몇 살에 무엇이 달라지는지"],
    ["9. 내 고민, 정면으로 답해요", "고른 고민에 확답부터"],
    ["10. 이번 주에 할 것 3가지", "오늘 밤부터 되는 것"],
  ];
  return (
    <div
      className="rounded-md p-6"
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(217,199,232,0.2)" }}
    >
      <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
        받는 것 — 10개 챕터 · 앞으로 12개월 전부
      </p>
      <ul className="space-y-2.5">
        {rows.map(([t, d]) => (
          <li key={t} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span style={{ color: "#cfd0d8" }}>{t}</span>
            <span className="text-right" style={{ color: "#7d8496" }}>
              {d}
            </span>
          </li>
        ))}
      </ul>
      {/* 분량 앵커 — 산군 카드(SangunSalesBlocks.LengthAnchorLine)와 같은 자리, 다른 말.
          같은 결제 시트에 두 상품이 나란히 서므로 문구가 겹치면 재탕으로 읽힌다.
          숫자 근거: 10장 개편 후 실측 한글 7,805자(산군 7,905자와 동급) → A4 여덟 장·열다섯 분. */}
      <p className="mt-4 border-t pt-4 text-center text-[13px] leading-[1.75]" style={{ borderColor: "rgba(217,199,232,0.2)", color: "#cfd0d8" }}>
        A4 <b style={{ color: MOON }}>여덟 장</b> · 다 읽는 데 <b style={{ color: MOON }}>열다섯 분</b>
        <br />
        길게 늘리지 않았어요. 끝까지 읽고 달을 챙기시라고 이만큼만 썼어요.
      </p>
      {/* 이 카드가 인연 랜딩의 가격 앵커 자리다 — 취소선은 여기서 제일 크게 일한다 */}
      <p className="mt-4 text-center text-[13px]" style={{ color: SUB }}>
        {compareLabel && <s className="mr-1.5 opacity-70">{compareLabel}</s>}
        <b style={{ color: MOON }}>{priceLabel}</b> — 점심 한 번 값 · 몇 분 안에 도착 · 마이페이지에 계속 보관
      </p>
    </div>
  );
}

function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-8 text-center">
      <p className="font-myeongjo text-[17px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
        {children}
      </p>
    </div>
  );
}

// 붉은 실 디바이저 — 섹션 사이를 실 한 가닥이 이어준다(브랜드 모티프)
function ThreadDivider() {
  return (
    <div aria-hidden className="flex justify-center py-1">
      <svg width="12" height="64" viewBox="0 0 12 64" fill="none">
        <path
          d="M6 0 C 7.8 12, 4.2 20, 6 30 C 7.8 40, 4.2 50, 6 64"
          stroke="#a63a2b"
          strokeOpacity="0.75"
          strokeWidth="1.4"
        />
        <circle cx="6" cy="31" r="2.6" fill="#8f2b1e" />
      </svg>
    </div>
  );
}

const FAQ: [string, string][] = [
  [
    "지금 만나는 사람이 있어요 / 최근에 헤어졌어요. 봐도 되나요?",
    "둘 다 보셔도 돼요. 이건 두 사람을 맞춰보는 궁합이 아니라, 당신 쪽에 인연의 문이 열리는 달을 짚는 풀이예요. 그래서 상대방 생년월일이 없어도 되고, 아직 만나지 않은 사람도 나와요. 만나는 분이 있으면 순하게 흐르는 달과 삐걱대는 달이 갈리고, 막 끝나셨다면 마음을 정리할 달과 다음이 열리는 달이 나와요.",
  ],
  [
    "무료 사주랑 뭐가 다른가요?",
    "무료 사주는 \"좋은 인연이 와요\"에서 끝나요. 여기서는 연도와 달을 집어드려요. 앞으로 12개월에서 만나는 달 세 개, 조심할 달, 크게 바뀌는 해까지요. 그 달들은 사람이 골라주는 게 아니라 만세력 계산에서 나와요.",
  ],
  [
    "뭘 얼마나 받나요?",
    "10개 챕터, A4 여덟 장 분량이에요. 점수 / 걸어온 길 / 반복되는 패턴 / 만나는 달 세 개 / 내게 올 사람 / 알아보는 신호 셋 / 조심할 달 / 크게 바뀌는 해 / 내 고민 답 / 이번 주에 할 것 3가지. 위 목차에 그대로 적어뒀어요.",
  ],
  [
    "태어난 시각을 몰라요. 음력 생일만 알아요.",
    "둘 다 괜찮아요. 시각을 모르시면 '시각 몰라요'를 누르시면 태어난 날을 중심으로 풀어드려요. 음력을 고르시면 양력으로 정확히 바꿔서 사주를 세워요.",
  ],
  [
    "결과는 언제 받고, 나중에 다시 볼 수 있나요?",
    "결제하고 몇 분 안에 만들어져서 바로 읽으실 수 있어요. 마이페이지에 계속 보관되니 그 달이 실제로 왔을 때 다시 꺼내 보세요. 캡처해서 친구에게 보내셔도 돼요.",
  ],
  [
    "결제랑 제 생년월일은 안전한가요?",
    "토스페이먼츠 안전결제로 진행돼요. 적어주신 생년월일은 사주 계산과 결과지 만드는 데만 쓰고 광고에 쓰지 않아요. 결과지가 제대로 만들어지지 않으면 전액 돌려드리고, 결과지를 열기 전이면 7일 안에 취소돼요.",
  ],
];

export function InyeonStory({
  priceLabel,
  compareLabel,
  children,
}: {
  priceLabel: string;
  /** 취소선 정가(2026-08-11 신설). 없으면 예전처럼 판매가만 나온다.
   *  결제 시트에 카드가 나란히 서는데 인연 단품만 할인 표기가 없으면 그 카드가 손해처럼 보인다. */
  compareLabel?: string;
  children: React.ReactNode; // 입력 위저드(#start)·안심·신뢰 스트립 — 페이지에서 주입
}) {
  return (
    <div className="story-immersive min-h-screen w-full" style={{ background: INK_BG }}>
      <div className="mx-auto w-full max-w-[480px]">
        {/* 헤드 — 크롬 없는 몰입형이라 브랜드 줄이 홈 링크를 겸한다 */}
        <header className="px-6 pb-5 pt-8 text-center">
          <a href="/" className="inline-block text-[13px] tracking-[0.22em]" style={{ color: MOON }}>
            명운록 · 직녀 연애사주
          </a>
          <h1 className="mt-3 font-myeongjo text-[26px] font-bold leading-[1.75]" style={{ color: "#efe6d2" }}>
            &lsquo;때가 되면 만난다&rsquo;는데
            <br />
            <span
              style={{
                background: `linear-gradient(90deg,#efe6d2,${MOON})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              그 때가 대체 언제인가요
            </span>
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: "#a89f8d" }}>
            &lsquo;곧 온다&rsquo;는 말은 그만 — 인연이 들어오는 달을 콕 집어드려요
          </p>

          <p className="mt-4 text-[13px]" style={{ color: "#7d8496" }}>
            사람이 지어낸 말이 아니라, 만세력 계산에서 나온 달이에요 ·{" "}
            {compareLabel && <s className="mr-1 opacity-70">{compareLabel}</s>}
            {priceLabel}
          </p>
        </header>

        {/* 컷1 — 까치 아씨: 독자의 물음을 받는다. 첫 화면의 얼굴이므로 즉시 로드 */}
        <Cut
          src="/products/inyeon/i1.webp"
          width={860}
          height={1290}
          priority
          alt="기와 처마 끝에 앉아 정면을 바라보는 까치 아씨"
        >
          <Bubble who="까치 아씨">
            &ldquo;좋은 인연이 올 거예요.&rdquo;
            <br />그 말은 다들 하죠. 정작 알고 싶은 건{" "}
            <em className="not-italic" style={P}>
              언제
            </em>
            인데.
          </Bubble>
        </Cut>

        {/* 상태 배지 3종 — 어떤 상황이든 손님을 배제하지 않는다(페르소나 지적 #1·#2) */}
        <div className="px-6 pt-7 text-center">
          <p className="text-[13px]" style={{ color: "#7d8496" }}>
            지금 상황에 제일 가까운 걸 고르면, 거기에 맞춰 풀어드려요
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {[
              ["아직 없어요", "아직 만나는 사람이 없어요"],
              ["만나는 사람이 있어요", "사귀는 사람이 있어요"],
              ["최근에 끝났어요", "최근에 헤어졌어요"],
            ].map(([label, c]) => (
              <a
                key={label}
                href={`?c=${encodeURIComponent(c)}#start`}
                className="rounded-full px-3.5 py-1.5 text-[13px]"
                style={{ border: "1px solid rgba(217,199,232,0.35)", color: "#cfd0d8", background: "rgba(0,0,0,0.25)" }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <Narration>
          사람은 아무 때나 오지 않아요.
          <br />
          <b style={{ color: MOON }}>열리는 달</b>과, <b style={{ color: MOON }}>닫히는 달</b>이 있을
          뿐이에요.
        </Narration>

        <ThreadDivider />

        {/* 컷2 — 방법: 달력에 붉은 실을 매는 행동(그림=대사) */}
        <Cut src="/products/inyeon/i2.webp" width={860} height={1290} alt="한지 달력의 한 칸에 붉은 실로 매듭을 짓는 손">
          <Bubble who="까치 아씨">
            그래서 저는 달력에 붉은 실을 매어 둬요.
            <br />
            당신의{" "}
            <em className="not-italic" style={P}>
              열리는 달
            </em>
            에.
          </Bubble>
        </Cut>

        {/* ▓ 잠금 티저 */}
        <div className="px-5 py-4">
          <TeaserLock />
          <p className="mt-2 text-center">
            <a href="#sample" className="text-[13px] underline underline-offset-2" style={{ color: SUB }}>
              먼저 예시 결과지를 볼게요 →
            </a>
          </p>
        </div>

        {/* 예시 결과지 — 진짜 문장을 보여준다(페르소나 3/3 지적) */}
        <div id="sample" className="scroll-mt-4 px-5 py-4">
          <SampleCard />
        </div>

        <ThreadDivider />

        {/* 목차 카드 — 철학관 가격 앵커 대신 받는 것의 양으로 (페르소나 3/3 거부 반영) */}
        <div className="px-5 py-4">
          <TocCard priceLabel={priceLabel} compareLabel={compareLabel} />
          <p className="mt-3 text-center text-[13px] leading-[1.75]" style={{ color: "#7d8496" }}>
            이번 달이 당신의 &lsquo;열리는 달&rsquo;일 수도 있어요 — 지나간 달은 다음 계산에서 빠져요.
          </p>
        </div>

        <ThreadDivider />

        {/* 컷3 — 클로징 + CTA */}
        <Cut src="/products/inyeon/i3.webp" width={860} height={1290} alt="정면으로 붉은 실 한쪽 끝을 내미는 까치 아씨">
          <div className="absolute inset-x-4 bottom-4">
            <div
              className="relative mb-3 rounded-[5px] px-5 py-4"
              style={{
                background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
                border: "1px solid #c9b98e",
                boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
              }}
            >
              <span
                className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
                style={{ background: RED, color: "#f3e6cf" }}
              >
                까치 아씨
              </span>
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">
                <em className="not-italic" style={P}>
                  조급해하지 않아도 돼요.
                </em>
                <br />
                당신한테 열리는 달, 지금 확인해요.
              </p>
            </div>
            <a
              href="#start"
              className="block rounded-[6px] py-4 text-center font-bold tracking-[0.06em]"
              style={{
                background: `linear-gradient(135deg,#efe6d2,${MOON} 70%,#b9a6cf)`,
                boxShadow: "0 8px 26px rgba(217,199,232,0.3), inset 0 1px 0 #fff",
                color: "#241a33",
                fontSize: 17,
              }}
            >
              내가 만나는 달 확인하기
              <span className="mt-0.5 block text-[13px] font-normal opacity-80">
                {compareLabel && <s className="mr-1 opacity-70">{compareLabel}</s>}
                {priceLabel} · 2분이면 끝 · 태어난 시각·성별·고민까지 반영
              </span>
            </a>
            <p className="mt-2 text-center text-[13px]" style={{ color: SUB }}>
              결과지가 제대로 만들어지지 않으면 전액 환불해요. 결과지를 열기 전이면 7일 안에 취소돼요.
            </p>
          </div>
        </Cut>

        {/* 입력 위저드(#start)·안심 — 페이지에서 주입 */}
        <div className="px-5 py-4">{children}</div>

        {/* 상품 전용 FAQ — 1번이 손님을 자르지 않게 순서 설계(페르소나 지적 #3) */}
        <section className="px-5 pb-10 pt-4">
          <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
            자주 묻는 물음
          </p>
          <ul className="divide-y" style={{ borderColor: "rgba(217,199,232,0.15)" }}>
            {FAQ.map(([q, a]) => (
              <li key={q} className="py-4" style={{ borderColor: "rgba(217,199,232,0.15)" }}>
                <p className="mb-1.5 font-myeongjo text-[15px] font-semibold" style={{ color: "#efe6d2" }}>
                  Q. {q}
                </p>
                <p className="text-[15px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
                  {a}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <StoryFooter />
      </div>
    </div>
  );
}
