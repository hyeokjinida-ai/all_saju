// 직녀 예보판 · 원국 증거표 — 2026-08-22 신설.
//
// 이 두 부품이 직녀 티저의 새 축이다. 하는 일이 다르다:
//   ForecastBoard  : 열두 달을 **달 위상**으로 편다. 계산은 전부 보여주고 이름만 잠근다.
//   ChartEvidence  : "만세력을 직접 계산한다"는 주장을 **실물 명식**으로 증명한다.
//
// 왜 달 위상인가 — 일기예보가 ☀☁☂ 로 말하듯 우리는 보름/반달/초승/구름으로 말한다.
// 상품명(연애예보)·세계관(밤)과 한 몸이고, 사주 시장에서 아무도 안 쓰는 체계라
// 이 부품 하나로 "어디 따라했네"가 성립하지 않는다.
//
// ⚠ 조판 눈금: 이 랜딩은 max-w-520 이다. 디자인 원본(`직녀/디자인시스템/`)은 1125px 캔버스라
//    값을 그대로 옮기면 안 된다 — 기존 랜딩 눈금(11/12/13/15/17/19)에 맞춰 환산해 쓴다.

const MOON = "#d9c7e8";
const SILVER = "#cfd6e6";
const BONE = "#e8e6ef";
const SUB = "#98a0b4";
const PLATE_LINE = "rgba(217,199,232,0.45)";

/* ── 달 위상 4종 ────────────────────────────────────
   보름=크게 열림 / 반달=자리가 생김 / 초승=평 / 구름=결이 엉킴 */
type Phase = "full" | "half" | "cres" | "cloud";

// 티저 B2 의 「열린 달」 카드가 같은 달을 다시 그린다 — 격자에서 본 기호가 카드에 또 나와야
// 「10월 = 저 보름달」이 설명 없이 붙는다. 그래서 내보낸다(정의는 여기 한 곳뿐).
export function Moon({ phase, size = 34 }: { phase: Phase; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 74 74" } as const;
  if (phase === "full")
    return (
      <svg {...common} aria-hidden>
        <defs>
          <radialGradient id="jf-full">
            <stop offset="0%" stopColor="#FFFDF2" />
            <stop offset="100%" stopColor="#EFE3BE" />
          </radialGradient>
        </defs>
        <circle cx="37" cy="37" r="27" fill="url(#jf-full)" stroke="#C9A94E" strokeWidth="2.5" />
        <circle cx="30" cy="30" r="5" fill="#E4D6A8" opacity=".7" />
        <circle cx="45" cy="42" r="7" fill="#E4D6A8" opacity=".55" />
      </svg>
    );
  if (phase === "half")
    return (
      <svg {...common} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#F3EDFA" stroke="#9B8AC4" strokeWidth="2.5" />
        <path d="M37 10a27 27 0 0 1 0 54z" fill="#C7B0EC" />
      </svg>
    );
  if (phase === "cres")
    return (
      <svg {...common} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#E6E2EE" stroke="#B9B2CE" strokeWidth="2.5" />
        <path d="M31 11a27 27 0 1 0 0 52 31 31 0 0 1 0-52z" fill="#FCFAFE" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <circle cx="41" cy="30" r="21" fill="#EFECF6" stroke="#A9A2BE" strokeWidth="2.5" />
      <path d="M20 52h34a12 12 0 0 0 0-24 17 17 0 0 0-32 5 10 10 0 0 0-2 19z" fill="#8F87A8" />
    </svg>
  );
}

const GRADE: Record<Phase, string> = {
  full: "크게 열림",
  half: "자리",
  cres: "평",
  cloud: "엉킴",
};

/** 밤하늘 위에 뜨는 달빛 판 — 정보 밀도가 높은 구간만 이렇게 띄운다(밝기 리듬). */
function Plate({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] px-4 py-6"
      style={{
        background: "linear-gradient(168deg,#F7F4FB 0%,#EDE7F6 58%,#E2D9F0 100%)",
        boxShadow: `0 0 0 1px ${PLATE_LINE}, 0 18px 44px rgba(10,8,26,.55), 0 0 60px rgba(169,139,217,.18)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-14"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0))" }}
      />
      {children}
    </div>
  );
}

function PlateTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <div className="flex items-center justify-center gap-2.5">
        <i className="block h-5 w-[3px] flex-none" style={{ background: "#6B4C9A" }} />
        <p className="text-[17px] font-extrabold" style={{ color: "#1B1729" }}>
          {children}
        </p>
        <i className="block h-5 w-[3px] flex-none" style={{ background: "#6B4C9A" }} />
      </div>
      {sub ? (
        <p className="mt-1.5 text-center text-[12px]" style={{ color: "#6C6483" }}>
          {sub}
        </p>
      ) : null}
    </>
  );
}

/* ── 1. 예보판 ─────────────────────────────────────── */

// 샘플 12칸. 광고 랜딩(/jiknyeo)은 아직 손님 명식이 없으므로 예시로 보여준다.
// 결제 후 결과지에서는 computeInyeonFacts 의 실제 등급으로 이 자리를 채운다.
const SAMPLE: { m: string; p: Phase }[] = [
  { m: "9월", p: "cres" }, { m: "10월", p: "half" }, { m: "11월", p: "full" }, { m: "12월", p: "cres" },
  { m: "1월", p: "cloud" }, { m: "2월", p: "cres" }, { m: "3월", p: "full" }, { m: "4월", p: "cres" },
  { m: "5월", p: "half" }, { m: "6월", p: "cloud" }, { m: "7월", p: "cres" }, { m: "8월", p: "full" },
];

/** 만세력 등급(●◎○△) → 달 위상. 등급 기준은 teaser.ts 한 곳에만 있고 여기선 표시만 옮긴다. */
export const GRADE_TO_PHASE: Record<string, Phase> = { "●": "full", "◎": "half", "○": "cres", "△": "cloud" };

/**
 * 12칸 예보 격자 — 판 없이 쓴다(티저처럼 이미 달빛 판 안인 자리용).
 *
 * ⚠ 2026-08-18 에 격자를 한 번 버렸던 이력이 있다. 이유는 두 개였는데 지금은 둘 다 해소됐다:
 *   ① 「전부 원본(청월당) 그대로」 확정 → 2026-08-22 「따라한 티 지우기」로 형님이 방향을 바꿈
 *   ② 375px 에서 칸이 좁아 달 이름이 감김 → **칸에서 등급 글자를 빼고 아이콘만** 두어 해결.
 *      등급 이름은 아래 범례가 한 번만 설명한다(칸마다 반복하면 좁아지고 시끄럽다).
 */
export function MoonGrid({ months }: { months: { m: string; p: Phase }[] }) {
  return (
    <>
      {/* 읽는 법을 **격자 위**에 둔다. 아래 범례만 있던 시절엔 기호를 모른 채 12칸을 보고,
          다 본 뒤에야 해설을 읽고 다시 올려다봐야 했다 — 순서가 거꾸로였다(형님 지적). */}
      <p className="mb-3 text-center text-[14px] leading-[21px]" style={{ color: "var(--bone-soft)" }}>
        <span style={{ color: "var(--violet-text)", fontWeight: 700 }}>노란 보름달</span>이 크게 열리는 달이에요
      </p>
      <div className="grid grid-cols-4 gap-2">
        {months.map(({ m, p }) => {
          const big = p === "full";
          return (
            // 평월은 판에 **잠기고**(반투명), 열린 달만 종이로 **떠오른다**.
            // 전에는 12칸이 전부 같은 흰 박스에 1px 테두리 색만 달라서, 내 기회가 어디인지
            // 스캔이 안 됐다. 떠오른 칸은 결론 카드(순백+그림자)와 **같은 재질**이라
            // 「저 노란 칸 = 이 카드」가 설명 없이 이어진다.
            <div key={m} className="rounded-[9px] py-2 text-center"
              style={big
                ? { background: "#ffffff", border: "2px solid var(--gold-bright)", boxShadow: "0 4px 12px rgba(107,76,154,.22)" }
                : { background: "rgba(255,255,255,0.42)", border: "1px solid rgba(221,211,236,0.75)" }}>
              <p className="text-[12px] font-bold" style={{ color: big ? "var(--violet-text)" : "var(--bone-faint)" }}>{m}</p>
              <div className="mt-1 flex justify-center"><Moon phase={p} size={30} /></div>
            </div>
          );
        })}
      </div>
      {/* 범례는 **위에서 안 말한 것만**. 보름달은 이미 읽는 법이 설명했고, 「평」은 정보가 없다.
          「결이 엉키는 달」은 남긴다 — POINT 2 의 「나쁜 시기도 같이 적는다」를 눈으로 증명하는 자리다. */}
      <div className="mt-4 flex items-center justify-center gap-5">
        {([["half","자리가 생기는 달"],["cloud","결이 엉키는 달"]] as const).map(([p,label]) => (
          <div key={p} className="flex items-center gap-1.5">
            <Moon phase={p} size={18} />
            <span className="text-[12px]" style={{ color: "var(--bone-soft)" }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ForecastBoard({ months = SAMPLE }: { months?: { m: string; p: Phase }[] }) {
  return (
    <div className="px-4 py-6">
      <Plate>
        <PlateTitle sub="예시 화면 — 생일을 넣으면 내 열두 달로 바뀌어요">인연 예보</PlateTitle>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {months.map(({ m, p }) => {
            const big = p === "full";
            return (
              <div
                key={m}
                className="rounded-[9px] py-2.5 text-center"
                style={{
                  background: "#FCFAFE",
                  border: `1px solid ${big ? "#6B4C9A" : "#DFD6EE"}`,
                  boxShadow: big ? "0 0 0 2px rgba(107,76,154,.16)" : undefined,
                }}
              >
                <p className="text-[12px] font-bold" style={{ color: "#6C6483" }}>
                  {m}
                </p>
                <div className="my-1.5 flex justify-center">
                  <Moon phase={p} />
                </div>
                <p className="text-[11px] font-bold" style={{ color: big ? "#5B3F8F" : "#756E8A" }}>
                  {GRADE[p]}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-4" style={{ borderColor: "#DDD3EC" }}>
          {([["full", "크게 열리는 달"], ["half", "자리가 생기는 달"], ["cres", "평"], ["cloud", "결이 엉키는 달"]] as const).map(
            ([p, label]) => (
              <div key={p} className="flex items-center gap-2">
                <Moon phase={p} size={22} />
                <span className="text-[12px]" style={{ color: "#3B3550" }}>
                  {label}
                </span>
              </div>
            ),
          )}
        </div>
      </Plate>

      {/* 경계 문장 — 무료(계산)/유료(읽기)의 선을 긋는 유일한 문장이라 잠금 **위**에 세운다.
          잠금 밑에 두면 손님이 가려진 줄부터 만나 "무료야 유료야"를 스스로 풀어야 했다(8/24 처음눈 검수 ②). */}
      <p className="mt-6 text-center font-myeongjo text-[15px] leading-relaxed" style={{ color: BONE }}>
        계산은 다 보여드렸어요.
        <br />
        읽어 드리는 건, 여기서부터예요.
      </p>

      {/* 잠금 — 계산은 다 보여줬으니, 가리는 건 명사 하나뿐이다.
          ⚠ 뼈대는 읽혀야 한다: 「██살」이 나이로 읽히던 3번 줄을 신살이 보이게 폈다(원문은 직녀/티저_12블록_전문.md). */}
      <div className="mt-5 space-y-3">
        {[
          <>크게 열리는 달은 <b style={{ color: BONE }}>세 번</b>, 첫 달은 <Mask w={78} /></>,
          <>그 사람은 <Mask w={56} />에서 처음 마주쳐요</>,
          <>자꾸 어긋났던 이유 — 명식에 「<Mask w={34} />살」이 하나 있어요</>,
        ].map((line, i) => (
          <p key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed" style={{ color: "#d8d2e8" }}>
            <i className="mt-2 block h-[5px] w-[5px] flex-none rounded-full" style={{ background: "#8B6FC4" }} />
            <span>{line}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Mask({ w }: { w: number }) {
  return (
    <span
      className="inline-block translate-y-[2px] rounded-[3px]"
      style={{
        width: w,
        height: 17,
        background: "rgba(139,111,196,.30)",
        boxShadow: "inset 0 0 0 1px rgba(199,176,236,.35)",
      }}
    />
  );
}

/* ── 2. 원국 증거표 ────────────────────────────────── */

type El = "wood" | "fire" | "earth" | "metal" | "water";
// 타일 색 — **흰 글자가 서는 명도**로 잡는다.
// 그전에는 그라데이션의 밝은 쪽 끝에서 흰 글자가 무너졌다(2026-08-30 실측: 金 1.90 · 土 2.10 ·
// 木 2.07 — 26px 한자도 11px 독음도 같이 죽는다). 원국표는 「내 여덟 글자」를 증거로 내미는
// 자리라 여기서 안 읽히면 개인화 증명이 통째로 그림이 된다.
// 오행의 색 정체성(목=청 · 화=적 · 토=황 · 금=백 · 수=흑)은 유지하고 명도만 내렸다 —
// 값은 대비를 재서 4.5 를 넘는 첫 지점으로 잡았고, 먹빛 담채 톤과도 오히려 맞는다.
const EL_BG: Record<El, string> = {
  wood: "linear-gradient(150deg,#5D7C68,#456450)",
  fire: "linear-gradient(150deg,#A86072,#8A3F55)",
  earth: "linear-gradient(150deg,#8B704D,#6E5436)",
  metal: "linear-gradient(150deg,#757385,#5C5A6E)",
  water: "linear-gradient(150deg,#6672AB,#3E4A80)",
};

type Cell = { han: string; kor: string; el: El; isDay?: boolean };

const SAMPLE_STEMS: Cell[] = [
  { han: "壬", kor: "임", el: "water" },
  { han: "乙", kor: "을", el: "wood", isDay: true },
  { han: "己", kor: "기", el: "earth" },
  { han: "庚", kor: "경", el: "metal" },
];
const SAMPLE_BRANCHES: Cell[] = [
  { han: "申", kor: "신", el: "metal" },
  { han: "酉", kor: "유", el: "metal" },
  { han: "未", kor: "미", el: "earth" },
  { han: "辰", kor: "진", el: "earth" },
];

function Pillar({ c }: { c: Cell }) {
  return (
    <div
      className="rounded-[9px] py-2.5 text-center text-white"
      style={{ background: EL_BG[c.el], boxShadow: c.isDay ? "0 0 0 2px rgba(107,76,154,.45)" : undefined }}
    >
      <em className="block text-[26px] font-bold not-italic leading-none">{c.han}</em>
      <span className="mt-1 block text-[11px] opacity-90">{c.kor}</span>
    </div>
  );
}

export function ChartEvidence() {
  return (
    <div className="px-4 py-6">
      <Plate>
        <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: "#DDD3EC" }}>
          <div
            className="flex h-16 w-16 flex-none flex-col items-center justify-center rounded-full text-white"
            style={{ background: "linear-gradient(150deg,#3E4A80,#2A3462)" }}
          >
            <em className="text-[26px] font-bold not-italic leading-none">乙</em>
            <span className="mt-0.5 text-[11px] opacity-85">을</span>
          </div>
          <div>
            <p className="text-[15px] font-extrabold" style={{ color: "#1B1729" }}>
              손님 명식 (예시)
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "#6C6483" }}>
              1992.07.14 · 미시 · 여성
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold" style={{ color: "#6C6483" }}>
          <span>편인</span><span>일간(나)</span><span>편재</span><span>정관</span>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {SAMPLE_STEMS.map((c, i) => <Pillar key={i} c={c} />)}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {SAMPLE_BRANCHES.map((c, i) => <Pillar key={i} c={c} />)}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold" style={{ color: "#6C6483" }}>
          <span>정관</span><span>편관</span><span>편재</span><span>정재</span>
        </div>
        <div
          className="mt-3 grid grid-cols-4 gap-1.5 border-t pt-3 text-center text-[11px]"
          style={{ borderColor: "#DDD3EC", color: "#332C4A" }}
        >
          <span>태</span><span>절</span><span>양</span><span>관대</span>
        </div>
      </Plate>

      <p className="mt-5 text-center text-[14px] leading-relaxed" style={{ color: SUB }}>
        절기와 시주까지 코드로 계산해요.
        <br />
        <b style={{ color: MOON }}>신약 · 용신 수(水)</b> — 위 예보의 등급은 전부 여기서 나와요.
      </p>
    </div>
  );
}

export { SILVER, MOON, BONE };
export type { Phase };
