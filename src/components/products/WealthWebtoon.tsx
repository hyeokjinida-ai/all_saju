// "돈 들어오는 달" 전용 웹툰 랜딩 섹션 (금두꺼비 선생 v1 — 3컷)
// 상품 상세(/products/wealth-saju)에 컷 단위로 끼워 넣는다.
// 원칙: 그림은 풀블리드, 글자는 코드 오버레이(하단 먹빛 스크림 위, 17px+), 컷당 말풍선 1개.

const SCRIM =
  "linear-gradient(180deg, rgba(7,6,15,0.30) 0%, rgba(7,6,15,0) 28%, rgba(7,6,15,0) 52%, rgba(7,6,15,0.97) 100%)";

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
    <div
      className="relative overflow-hidden rounded-md"
      style={{ border: "1px solid var(--cardline)", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" className="block w-full" />
      <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />
      {children}
    </div>
  );
}

// 한지 말풍선 + 주홍 명패 (샘플 랜딩에서 검증한 스타일 그대로)
function Bubble({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-x-4 bottom-4 rounded-[5px] px-5 py-4"
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

const POINT = { color: "#a4552c" };

// 컷1 — 훅: 달력에 붉은 동그라미
export function WealthCutHook() {
  return (
    <Cut src="/products/wealth/cut-calendar.webp" width={860} height={859} alt="달력의 한 달에 붉은 동그라미를 치는 금두꺼비 선생">
      <div className="absolute inset-x-0 bottom-0 px-6 pb-6 text-center">
        <p className="font-myeongjo text-[17px] leading-[1.9] text-[#e7e2d2]" style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
          &ldquo;재물운이 좋으시네요&rdquo;
          <br />
          …그래서, <b className="text-gold-bright">언제</b>라는 겁니까?
        </p>
      </div>
    </Cut>
  );
}

// 컷2 — 등장: 서재의 금두꺼비 선생
export function WealthCutMaster() {
  return (
    <Cut src="/products/wealth/cut-study.webp" width={860} height={1290} alt="서재에서 만세력 책을 펴고 정면을 바라보는 금두꺼비 선생">
      <Bubble who="금두꺼비 선생">
        돈은 매달 똑같이 흐르지 않아요.
        <br />
        <em className="not-italic" style={POINT}>
          열리는 달
        </em>
        과,{" "}
        <em className="not-italic" style={POINT}>
          새는 달
        </em>
        이 있을 뿐이지.
      </Bubble>
    </Cut>
  );
}

// ▓ 잠금 티저 — "계산은 이미 끝났다" 프레임 (일반 미리보기 대체)
export function WealthTeaserLock() {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      className="flex items-baseline justify-between gap-3 rounded-[4px] px-4 py-3"
      style={{ background: "rgba(7,6,15,0.5)", border: "1px solid var(--cardline)" }}
    >
      <span className="shrink-0 text-[14px] text-bone-soft">{label}</span>
      <span className="font-myeongjo text-[16px] font-bold tracking-[0.08em] text-gold-bright">{value}</span>
    </div>
  );
  return (
    <a
      href="#start"
      className="block rounded-md p-6 sm:p-7"
      style={{
        background: "linear-gradient(160deg,#1B1E38,#181530)",
        border: "1px solid var(--cardline)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
    >
      <div className="mb-5 text-center">
        <p className="font-brush text-lg tracking-[0.2em] text-gold-bright">財 運 錄</p>
        <p className="mt-1 font-myeongjo text-[17px] font-bold text-bone">당신의 계산은, 이미 끝나 있습니다</p>
        <p className="mt-1 text-[13px] text-bone-faint">생년월일을 넣는 순간 아래 빈칸이 선명해집니다</p>
      </div>
      <div className="space-y-2.5">
        <Row label="내 재물그릇 점수" value={<>▓▓점 · 상위 ▓▓%</>} />
        <Row label="돈이 들어오는 달 TOP3" value={<>20▓▓년 ▓월 · ▓월 · ▓월</>} />
        <Row label="돈이 새는(조심할) 달" value={<>20▓▓년 ▓월</>} />
        <Row label="인생 재물 대운의 전환점" value={<>▓▓▓▓년</>} />
      </div>
      <div className="mt-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-wine-deep px-3.5 py-1.5 font-myeongjo text-[12px] text-gold-bright">
          ⌥ 결제 후 전체가 선명하게 열립니다
        </span>
      </div>
    </a>
  );
}

// 컷3 — 클로징: 손 내미는 금두꺼비 + CTA
export function WealthCutClosing({ priceLabel }: { priceLabel: string }) {
  return (
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
            당신의 <em className="not-italic" style={POINT}>&lsquo;그 달&rsquo;</em>이 언제인지,
            <br />
            지금 확인해 보세요.
          </p>
        </div>
        <a
          href="#start"
          className="block rounded-[6px] py-4 text-center font-bold tracking-[0.04em] text-[#241a08]"
          style={{
            background: "linear-gradient(135deg,#e8c96a,#c9a227 60%,#a9861f)",
            boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
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
  );
}
