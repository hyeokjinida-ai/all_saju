// 히어로 카드 위에 얹는 레터링 — 캐릭터명 / 제목 / 한 줄 카피 3층.
//
// 좌표는 청월당 히어로 배너 원본(688×861)을 픽셀 스캔해서 얻은 잉크 박스를
// 카드 좌표(432×540)로 환산한 값이다. 계획서 §2-2 표 그대로:
//   캐릭터명  잉크 top 327 · 높이 24.5 · 가운데
//   제목      잉크 top 370 · 높이 84   · 폭 296 고정
//   카피      잉크 top 482 · 높이 10   · 가운데
//
// ⚠ 원본 제목은 **잉크 높이가 글자 advance 의 1.12배**인 압축 display 서체다
//    (정통사주: 4글자 472px 폭에 잉크 134px). 우리 고딕은 정체(1em advance)라
//    같은 크기로 쓰면 납작해 보인다 → `textLength` + `lengthAdjust="spacingAndGlyphs"`
//    로 폭을 296 에 못박아 세로로 긴 비례를 만든다. 이게 직녀 가격카드에서 검증된
//    기법(SVG text + stroke + paint-order)과 같은 계열이다.
//
// ⚠ 글자 크기를 키우는 게 아니라 **대비**를 만든다(형님 규칙 7):
//    카피·캐릭터명은 조용히, 제목 한 줄만 정점.

const W = 432;
const H = 540;

/** 글자 수에 따라 제목 크기를 정한다 — 4글자가 기준(청월당 제목은 전부 4글자) */
function titleMetrics(title: string) {
  const n = [...title.replace(/\s/g, "")].length;
  // 크기는 **잉크 높이 84** 를 맞추려고 정한 값이다(원본 정통사주 카드의 제목 잉크).
  // 우리 고딕은 stroke 9 를 포함해 잉크가 대략 0.77em + 9 라서 97 이 84 로 떨어진다.
  // 글자 수가 늘면 크기를 유지한 채 **폭만** 조금 내준다 — 정점 한 줄의 무게는 카드마다
  // 같아야 하기 때문이다(형님 규칙 7). 폭은 좌우 여백 50px 밑으로는 안 내려간다.
  //   4글자 296 = 원본과 같은 폭(카드의 68.5%)
  if (n <= 4) return { size: 97, length: 296 };
  if (n <= 6) return { size: 97, length: 330 };
  return { size: 88, length: 350 };
}

export function HeroLettering({
  character,
  title,
  tagline,
}: {
  character: string;
  title: string;
  tagline: string;
}) {
  const t = titleMetrics(title);
  const titleId = `lg-${title.replace(/[^가-힣a-zA-Z]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={titleId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="62%" stopColor="#eaf1ff" />
          <stop offset="100%" stopColor="#a9c4ef" />
        </linearGradient>
        <linearGradient id={`${titleId}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="55%" stopColor="rgba(0,0,0,0.42)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.78)" />
        </linearGradient>
      </defs>

      {/* 글자가 앉을 자리를 어둡게 — 원본도 하단이 어둡다. 그림이 밝아도 흰 글자가 산다 */}
      <rect x="0" y={H * 0.44} width={W} height={H * 0.56} fill={`url(#${titleId}-scrim)`} />

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

      {/* 제목 — 이 카드의 정점. 외곽선을 먼저 칠하고(paint-order) 그 위에 그라데이션 */}
      <text
        x={W / 2}
        y={452}
        textAnchor="middle"
        textLength={t.length}
        lengthAdjust="spacingAndGlyphs"
        style={{
          fontFamily: "var(--font-gothic), 'Noto Sans KR', sans-serif",
          fontSize: t.size,
          fontWeight: 900,
          fill: `url(#${titleId})`,
          stroke: "rgba(10,14,28,0.85)",
          strokeWidth: 9,
          strokeLinejoin: "round",
          paintOrder: "stroke",
        }}
      >
        {title}
      </text>

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
