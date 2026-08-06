import { StoryFooter } from "@/components/products/StoryFooter";

// "돈 들어오는 달" 전용 웹툰 랜딩 v2 — 템플릿 삽입이 아니라 페이지 전체가 웹툰.
// 킵해둔 샘플(먹빛 풀블리드) 재현: 다크 잉크 배경 + 컷 끝까지 채움 + 글자는 스크림 위 오버레이.
// 원칙: 컷당 말풍선 1개, 대사 17px+, 보라 템플릿 요소 배제(이 페이지는 자체 배경을 가짐).

const INK_BG = "linear-gradient(180deg,#0b0f1a 0%,#121a2c 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(7,6,15,0.30) 0%, rgba(7,6,15,0) 28%, rgba(7,6,15,0) 52%, rgba(7,6,15,0.97) 100%)";
const POINT = { color: "#a4552c" };

// 풀블리드 컷 — 테두리·라운드 없이 화면을 가로로 꽉 채운다. priority=첫 컷 즉시 로드(LCP)
function Cut({
  src,
  width,
  height,
  alt,
  priority,
  children,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  priority?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className="block w-full"
      />
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
        style={{ background: "#8f2b1e", color: "#f3e6cf" }}
      >
        {who}
      </span>
      <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">{children}</p>
    </div>
  );
}

// ▓ 잠금 티저 — "계산은 이미 끝나 있다"
function TeaserLock() {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      className="flex items-baseline justify-between gap-3 rounded-[4px] px-4 py-3"
      style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,162,39,0.22)" }}
    >
      <span className="shrink-0 text-[15px]" style={{ color: "#9aa3b8" }}>
        {label}
      </span>
      <span className="font-myeongjo text-[17px] font-bold tracking-[0.06em]" style={{ color: "#e8c96a" }}>
        {value}
      </span>
    </div>
  );
  return (
    <a
      href="#start"
      className="block rounded-md p-6"
      style={{
        background: "linear-gradient(160deg,#151b2e,#10141f)",
        border: "1px solid rgba(201,162,39,0.28)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div className="mb-5 text-center">
        <p className="font-brush text-lg tracking-[0.22em]" style={{ color: "#e8c96a" }}>
          財
        </p>
        <p className="mt-1 font-myeongjo text-[17px] font-bold" style={{ color: "#efe6d2" }}>
          당신의 계산은, 이미 끝나 있습니다
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "#7d8496" }}>
          당신 생년월일로 다시 계산해, 아래 빈칸을 채워드립니다
        </p>
      </div>
      <div className="space-y-2.5">
        <Row label="내 재물그릇 점수" value={<>▓▓점 / 100점</>} />
        <Row label="돈이 들어오는 달" value={<>20▓▓년 ▓월 · ▓월 · ▓월</>} />
        <Row label="돈이 새는 달" value={<>20▓▓년 ▓월</>} />
        <Row label="돈이 가장 크게 움직이는 해" value={<>▓▓▓▓년</>} />
      </div>
      <div className="mt-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-myeongjo text-[13px]"
          style={{ border: "1px solid rgba(201,162,39,0.4)", color: "#e8c96a", background: "rgba(0,0,0,0.3)" }}
        >
          ⌥ 결제 후 전체가 선명하게 열립니다
        </span>
      </div>
    </a>
  );
}

// 받는 것 — 7챕터 목차(받는 양으로 값을 정당화, 인연 랜딩과 같은 패턴)
function WealthToc() {
  const rows: [string, string][] = [
    ["1. 내 재물그릇", "점수와 그 점수가 나온 이유"],
    ["2. 내 돈이 불어나는 방식", "월급형·사업형·투자형"],
    ["3. 돈이 들어오는 달 세 개", "연도·월까지 콕"],
    ["4. 돈이 새는 달", "그 달에 조심할 것까지"],
    ["5. 나를 돈방석에 앉힐 사람", "귀인과 거리 둘 사람"],
    ["6. 내 돈 고민, 사주의 답", "고른 고민 정면 풀이"],
    ["7. 돈이 가장 크게 움직이는 해", "전환점과 그때 할 일"],
  ];
  return (
    <div
      className="rounded-md p-6"
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(201,162,39,0.2)" }}
    >
      <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
        받는 것 — 7개 챕터 · 앞으로 12개월 전부
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
    </div>
  );
}

// 상품 전용 FAQ — 망설임 처리(인연 랜딩과 같은 패턴, 재물 질문으로)
const WFAQ: [string, string][] = [
  [
    "무료 사주랑 뭐가 다른가요?",
    "무료 사주는 \"재물운이 좋으시네요\"에서 끝납니다. 여기서는 연도와 달을 집어드립니다. 앞으로 12개월에서 돈이 들어오는 달 세 개, 돈이 새는 달, 돈이 가장 크게 움직이는 해까지요. 그 달들은 사람이 골라주는 게 아니라 만세력 계산에서 나옵니다.",
  ],
  [
    "월급쟁이인데도 볼 의미가 있나요?",
    "네. 첫 챕터에서 월급형·사업형·투자형 중 어느 쪽으로 돈이 불어나는 사주인지부터 판정합니다. 월급형이면 이직·연봉 협상·큰 지출의 때를, 사업·투자형이면 벌리는 달과 거둬들일 달을 봅니다.",
  ],
  [
    "태어난 시각을 몰라요. 음력 생일만 알아요.",
    "둘 다 괜찮습니다. 시각을 모르시면 '시각 몰라요'를 누르시면 태어난 날을 중심으로 풀어드립니다. 음력을 고르시면 양력으로 정확히 바꿔서 사주를 세웁니다.",
  ],
  [
    "결과는 언제 받고, 나중에 다시 볼 수 있나요?",
    "결제하고 몇 분 안에 만들어져서 바로 읽으실 수 있습니다. 마이페이지에 계속 보관되니 그 달이 실제로 왔을 때 다시 꺼내 보세요.",
  ],
  [
    "결제랑 제 생년월일은 안전한가요?",
    "토스페이먼츠 안전결제로 진행됩니다. 적어주신 생년월일은 사주 계산과 결과지 만드는 데만 쓰고 광고에 쓰지 않습니다. 결과지가 제대로 만들어지지 않으면 전액 돌려드리고, 결과지를 열기 전이면 7일 안에 취소됩니다.",
  ],
];

// 컷 사이 내레이션(스토리 연결부) — 템플릿 섹션 대신 이야기 톤 한 줄
function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-8 text-center">
      <p className="font-myeongjo text-[17px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
        {children}
      </p>
    </div>
  );
}

export function WealthStory({
  priceLabel,
  children,
}: {
  priceLabel: string;
  children: React.ReactNode; // 입력 위저드(#start)·안심·신뢰 스트립 — 페이지에서 주입
}) {
  return (
    <div className="story-immersive min-h-screen w-full" style={{ background: INK_BG }}>
      <div className="mx-auto w-full max-w-[480px]">
        {/* 헤드 — 크롬 없는 몰입형이라 브랜드 줄이 홈 링크를 겸한다 */}
        <header className="px-6 pb-10 pt-8 text-center">
          <a href="/" className="inline-block text-[13px] tracking-[0.22em]" style={{ color: "#c9a227" }}>
            財 · 명운록
          </a>
          <h1 className="mt-3 font-myeongjo text-[26px] font-bold leading-[1.75]" style={{ color: "#efe6d2" }}>
            재물운이 좋다는데
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#e8c96a,#c9a227)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              왜 통장은 그대로일까요
            </span>
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: "#a89f8d" }}>
            &lsquo;좋다&rsquo;는 말은 그만 — 들어오는 달을 콕 집어드립니다
          </p>
          <div className="mx-auto mt-8 h-px w-[46px]" style={{ background: "#c9a227", opacity: 0.6 }} />
        </header>

        {/* 컷1 — 등장: 독자의 물음을 받는 장면 (서재). 첫 화면이므로 즉시 로드 */}
        <Cut src="/products/wealth/cut-study.webp" width={860} height={1290} priority alt="서재에서 만세력 책을 펴고 정면을 바라보는 금두꺼비 선생">
          <Bubble who="금두꺼비 선생">
            &ldquo;재물운이 좋으시네요.&rdquo;
            <br />그 말은 다들 하지요. 정작 궁금한 건{" "}
            <em className="not-italic" style={POINT}>
              언제
            </em>
            인데 말입니다.
          </Bubble>
        </Cut>

        {/* 원리 — 왜 '언제'가 답인지 */}
        <Narration>
          돈은 매달 똑같이 흐르지 않습니다.
          <br />
          <b style={{ color: "#e8c96a" }}>열리는 달</b>과, <b style={{ color: "#e8c96a" }}>새는 달</b>이 있을 뿐입니다.
        </Narration>

        {/* 컷2 — 방법: 달력에 동그라미(그림과 대사가 같은 행동) */}
        <Cut src="/products/wealth/cut-calendar.webp" width={860} height={859} alt="달력의 한 달에 붉은 동그라미를 치는 금두꺼비 선생">
          <Bubble who="금두꺼비 선생">
            그래서 저는 달력에 동그라미를 칩니다.
            <br />
            당신의{" "}
            <em className="not-italic" style={POINT}>
              열리는 달
            </em>
            에.
          </Bubble>
        </Cut>

        {/* ▓ 잠금 티저 */}
        <div className="px-5 py-4">
          <TeaserLock />
        </div>

        {/* 받는 것 — 7챕터 목차 */}
        <div className="px-5 py-4">
          <WealthToc />
        </div>

        {/* 가격 앵커 한 줄 */}
        <p className="px-8 pb-4 pt-4 text-center text-[15px] leading-[1.75]" style={{ color: "#7d8496" }}>
          철학관에서 재물운을 보면 한 번에 5만~30만원 —
          <br />
          같은 사주 계산을 <b style={{ color: "#e8c96a" }}>{priceLabel}</b>에 받아보세요
        </p>

        {/* 컷3 — 클로징 + CTA */}
        <Cut src="/products/wealth/cut-hand.webp" width={860} height={1290} alt="정면으로 손을 내미는 금두꺼비 선생">
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
                style={{ background: "#8f2b1e", color: "#f3e6cf" }}
              >
                금두꺼비 선생
              </span>
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">
                당신의{" "}
                <em className="not-italic" style={POINT}>
                  &lsquo;그 달&rsquo;
                </em>
                이 언제인지,
                <br />
                지금 확인해 보세요.
              </p>
            </div>
            <a
              href="#start"
              className="block rounded-[6px] py-4 text-center font-bold tracking-[0.06em]"
              style={{
                background: "linear-gradient(135deg,#e8c96a,#c9a227 60%,#a9861f)",
                boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
                color: "#241a08",
                fontSize: 16.5,
              }}
            >
              내 돈 들어오는 달 확인하기
              <span className="mt-0.5 block text-[13px] font-normal opacity-80">
                {priceLabel} · 생년월일만 입력하면 끝
              </span>
            </a>
            <p className="mt-2 text-center text-[13px]" style={{ color: "#9aa3b8" }}>
              결과지가 제대로 만들어지지 않으면 전액 환불해 드립니다.
            </p>
          </div>
        </Cut>

        {/* 입력 위저드(#start)·안심·신뢰 — 페이지에서 주입 */}
        <div className="px-5 py-4">{children}</div>

        {/* 상품 전용 FAQ */}
        <section className="px-5 pb-16 pt-4">
          <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
            자주 묻는 물음
          </p>
          <ul className="divide-y" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
            {WFAQ.map(([q, a]) => (
              <li key={q} className="py-4" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
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
