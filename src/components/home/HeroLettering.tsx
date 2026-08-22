// 히어로 카드 위에 얹는 레터링 — 캐릭터명 / 제목 / 한 줄 카피 3층.
//
// 좌표는 청월당 히어로 배너 원본(688×861)을 픽셀 스캔해서 얻은 잉크 박스를
// 카드 좌표(432×540)로 환산한 값이다. 계획서 §2-2 표 그대로:
//   캐릭터명  잉크 top 327 · 높이 24.5 · 가운데
//   제목      잉크 top 370 · 높이 84   · 가운데
//   카피      잉크 top 482 · 높이 10   · 가운데
//
// ── 제목을 그리는 두 가지 방법 ─────────────────────────────────
// ① **레터링 PNG**(최종형): `art.lettering` 이 있으면 그 그림을 얹는다.
//    Black Han Sans 로 뽑은 원본을 ChatGPT 웹에 올려 유리·금박 표면을 입힌 것.
//    만드는 법은 `직녀/레터링/_GPT지시서.md`, 원본 굽기는 `pnpm art:lettering`.
// ② **글자로 그리기**(폴백): PNG 가 아직 없을 때. 같은 글자체(Black Han Sans)를 쓴다.
//
// ⚠ 이전엔 Noto Sans KR 900 을 `textLength` + `lengthAdjust="spacingAndGlyphs"` 로
//    가로 54~66% 까지 눌러 압축체 흉내를 냈다. 원본 청월당 서체가 압축체라 비례는 맞았지만,
//    정체 폰트를 눌러 만든 압축은 **「늘린 폰트」 티**가 난다 — 형님이 2026-08-23 에
//    「밤티 난다」로 잡은 자리다. Black Han Sans 는 처음부터 각지고 꽉 찬 전각체라
//    **누르지 않아도** 그 비례가 나온다. 글자를 누르지 말 것.
//
// ⚠ 강조는 크기가 아니라 대비다(형님 규칙 7): 카피·캐릭터명은 조용히, 제목만 정점.

const W = 432;
const H = 540;

/**
 * 제목 크기 — **카드 폭 안에 자연스럽게 들어가는** 값.
 *
 * ⚠ 원본(청월당)의 잉크 높이 84 를 그대로 맞추려 들면 안 된다. 걔넨 압축 서체라
 *    잉크가 글자폭의 1.12배인데, Black Han Sans 는 정사각 전각체라 0.78배다.
 *    같은 폭에서 같은 잉크 높이는 **구조적으로 불가능**하고, 억지로 맞추려고 글자를 누르면
 *    다시 「늘린 폰트」가 된다(그게 형님이 잡은 그 화면이다).
 *    대신 카드마다 정점이 **확실히 제일 큰가**로 판정한다 — 캐릭터명 잉크의 3배 이상.
 * 목표 폭 = **296**(원본과 같은 폭, 카드 432 의 68.5%, 좌우 여백 68px).
 * 4글자 92 로 실측 폭 298 · 잉크 높이 70 (원본 잉크 84 보다 낮은 건 서체 비례 차이 — 위 설명).
 */
function titleSize(title: string): number {
  const n = [...title.replace(/\s/g, "")].length;
  if (n <= 2) return 164;
  if (n === 3) return 118;
  if (n === 4) return 92;
  if (n <= 6) return 60;
  return 47;
}

export function HeroLettering({
  character,
  title,
  tagline,
  lettering,
}: {
  character: string;
  title: string;
  tagline: string;
  /** 표면까지 입힌 레터링 PNG. 있으면 글자 대신 이 그림을 얹는다. */
  lettering?: string;
}) {
  const size = titleSize(title);
  const id = `hl-${title.replace(/[^가-힣a-zA-Z]/g, "") || "x"}`;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="58%" stopColor="#eef3ff" />
            <stop offset="100%" stopColor="#b9cdf0" />
          </linearGradient>
          <linearGradient id={`${id}-scrim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.42)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.78)" />
          </linearGradient>
        </defs>

        {/* 글자가 앉을 자리를 어둡게 — 원본도 하단이 어둡다. 그림이 밝아도 흰 글자가 산다 */}
        <rect x="0" y={H * 0.44} width={W} height={H * 0.56} fill={`url(#${id}-scrim)`} />

        {/* 캐릭터명 — 명조, 조용히 */}
        <text
          x={W / 2}
          y={346}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-myeongjo-nanum), 'Nanum Myeongjo', serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.08em",
            fill: "#f3f6ff",
          }}
        >
          {character}
        </text>

        {/* 제목 — 이 카드의 정점. 레터링 PNG 가 있으면 아래 <img> 가 대신 선다. */}
        {!lettering && (
          <text
            x={W / 2}
            y={451}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-lettering), 'Black Han Sans', sans-serif",
              fontSize: size,
              letterSpacing: "-0.01em",
              fill: `url(#${id})`,
              stroke: "rgba(10,14,28,0.82)",
              strokeWidth: 8,
              strokeLinejoin: "round",
              paintOrder: "stroke",
            }}
          >
            {title}
          </text>
        )}

        {/* 한 줄 카피 */}
        <text
          x={W / 2}
          y={492}
          textAnchor="middle"
          style={{
            fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            fill: "rgba(255,255,255,0.92)",
          }}
        >
          {`" ${tagline} "`}
        </text>
      </svg>

      {/* 레터링 PNG — 글자가 앉을 자리(잉크 top 370, 높이 84)에 맞춰 얹는다.
          그림에 여백이 조금 있어도 자리가 흔들리지 않게 세로 가운데 정렬. */}
      {lettering && (
        <div
          className="absolute flex items-center justify-center"
          style={{ left: "6%", right: "6%", top: `${(360 / H) * 100}%`, height: `${(104 / H) * 100}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 레터링 그림(고정 자산) */}
          <img src={lettering} alt={title} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

/** TOP 1·2·3 리본 — 원본은 PNG 뱃지(36×46)다. 우리는 같은 크기로 직접 그린다. */
export function RankRibbon({ rank }: { rank: number }) {
  return (
    <svg
      width="36"
      height="46"
      viewBox="0 0 36 46"
      className="absolute right-3 top-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      aria-hidden="true"
    >
      <path d="M0 0h36v46l-18-11L0 46V0z" fill="#FAFAFA" />
      <text
        x="18"
        y="26"
        textAnchor="middle"
        style={{
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          fontSize: 19,
          fontWeight: 800,
          fill: "#111111",
        }}
      >
        {rank}
      </text>
    </svg>
  );
}
