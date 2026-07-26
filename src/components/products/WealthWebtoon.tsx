// "돈 들어오는 달" 전용 웹툰 랜딩 v2 — 템플릿 삽입이 아니라 페이지 전체가 웹툰.
// 킵해둔 샘플(먹빛 풀블리드) 재현: 다크 잉크 배경 + 컷 끝까지 채움 + 글자는 스크림 위 오버레이.
// 원칙: 컷당 말풍선 1개, 대사 17px+, 보라 템플릿 요소 배제(이 페이지는 자체 배경을 가짐).

const INK_BG = "linear-gradient(180deg,#0b0f1a 0%,#121a2c 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(7,6,15,0.30) 0%, rgba(7,6,15,0) 28%, rgba(7,6,15,0) 52%, rgba(7,6,15,0.97) 100%)";
const POINT = { color: "#a4552c" };

// 풀블리드 컷 — 테두리·라운드 없이 화면을 가로로 꽉 채운다.
function Cut({
  src,
  width,
  height,
  alt,
  children,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" className="block w-full" />
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
      <p className="font-myeongjo text-[17px] font-semibold leading-[1.8] text-[#241d10]">{children}</p>
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
      <span className="shrink-0 text-[14px]" style={{ color: "#9aa3b8" }}>
        {label}
      </span>
      <span className="font-myeongjo text-[16px] font-bold tracking-[0.08em]" style={{ color: "#e8c96a" }}>
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
        <p className="font-brush text-lg tracking-[0.2em]" style={{ color: "#e8c96a" }}>
          財 運 錄
        </p>
        <p className="mt-1 font-myeongjo text-[17px] font-bold" style={{ color: "#efe6d2" }}>
          당신의 계산은, 이미 끝나 있습니다
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "#7d8496" }}>
          생년월일을 넣는 순간 아래 빈칸이 선명해집니다
        </p>
      </div>
      <div className="space-y-2.5">
        <Row label="내 재물그릇 점수" value={<>▓▓점 · 상위 ▓▓%</>} />
        <Row label="돈이 들어오는 달 TOP3" value={<>20▓▓년 ▓월 · ▓월 · ▓월</>} />
        <Row label="돈이 새는(조심할) 달" value={<>20▓▓년 ▓월</>} />
        <Row label="인생 재물 대운의 전환점" value={<>▓▓▓▓년</>} />
      </div>
      <div className="mt-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-myeongjo text-[12px]"
          style={{ border: "1px solid rgba(201,162,39,0.4)", color: "#e8c96a", background: "rgba(0,0,0,0.3)" }}
        >
          ⌥ 결제 후 전체가 선명하게 열립니다
        </span>
      </div>
    </a>
  );
}

// 컷 사이 내레이션(스토리 연결부) — 템플릿 섹션 대신 이야기 톤 한 줄
function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-9 text-center">
      <p className="font-myeongjo text-[16px] leading-[1.9]" style={{ color: "#cfd0d8" }}>
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
    <div className="min-h-screen w-full" style={{ background: INK_BG }}>
      <div className="mx-auto w-full max-w-[480px]">
        {/* 헤드 */}
        <header className="px-6 pb-10 pt-14 text-center">
          <p className="text-[13px] tracking-[0.5em]" style={{ color: "#c9a227" }}>
            財 · 命運錄
          </p>
          <h1 className="mt-3 font-myeongjo text-[27px] font-bold leading-[1.6]" style={{ color: "#efe6d2" }}>
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
          <p className="mt-3 text-[14.5px]" style={{ color: "#a89f8d" }}>
            &lsquo;좋다&rsquo;는 말은 그만 — 들어오는 달을 콕 집어드립니다
          </p>
          <div className="mx-auto mt-8 h-px w-[46px]" style={{ background: "#c9a227", opacity: 0.6 }} />
        </header>

        {/* 컷1 — 등장: 독자의 물음을 받는 장면 (서재) */}
        <Cut src="/products/wealth/cut-study.webp" width={860} height={1290} alt="서재에서 만세력 책을 펴고 정면을 바라보는 금두꺼비 선생">
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
        <div className="px-5 pb-2 pt-10">
          <TeaserLock />
        </div>

        {/* 가격 앵커 한 줄 */}
        <p className="px-8 pb-4 pt-4 text-center text-[13.5px] leading-relaxed" style={{ color: "#7d8496" }}>
          오프라인 철학관 재물 풀이 5만~30만원 —
          <br />
          같은 정통 만세력 계산을 <b style={{ color: "#e8c96a" }}>{priceLabel}</b>에 받아보세요
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
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.8] text-[#241d10]">
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
              className="block rounded-[6px] py-4 text-center font-bold tracking-[0.04em]"
              style={{
                background: "linear-gradient(135deg,#e8c96a,#c9a227 60%,#a9861f)",
                boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
                color: "#241a08",
                fontSize: 16.5,
              }}
            >
              내 돈 들어오는 달 확인하기
              <span className="mt-0.5 block text-[12.5px] font-normal opacity-80">
                {priceLabel} · 생년월일만 입력하면 끝
              </span>
            </a>
          </div>
        </Cut>

        {/* 입력 위저드(#start)·안심·신뢰 — 페이지에서 주입 */}
        <div className="px-5 pb-16 pt-12">{children}</div>
      </div>
    </div>
  );
}
