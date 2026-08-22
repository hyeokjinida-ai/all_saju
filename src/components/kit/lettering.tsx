"use client";

// 제호 레터링 — 상품 이름을 **그림처럼** 세우는 부품. (2026-08-23 신설)
//
// 왜 SVG 인가 (직녀 가격카드 복제에서 배운 것):
//   CSS text-shadow 로 외곽선을 흉내내면 **8방향뿐**이라 모서리가 계단으로 각진다.
//   `stroke` + `paint-order="stroke"` 는 획을 따라 진짜 테두리를 그린다 — 확대해도 안 깨진다.
//   `textLength` 로 폭을 못박으면 글자 수가 달라져도(4글자 「연애예보」 vs 6글자 「박수무당 사주」)
//   같은 자리에 같은 폭으로 앉는다. 이게 없으면 상품마다 자리를 다시 잡아야 한다.
//
// 쓰는 곳: 가격카드 제호 · 홈 히어로 카드 제목. (두 곳이 같은 부품을 써야 화풍이 안 갈린다)
// ⚠ 그림자 층은 **먼저** 그린다 — 뒤에 그리면 본체를 덮는다.
import { useId } from "react";

export function Lettering({
  text,
  width = 1125,
  height = 300,
  /** 글자 잉크가 차지할 가로 폭(px, viewBox 기준) — 글자 수와 무관하게 이 폭에 맞춘다 */
  inkWidth,
  x,
  y,
  /** 세로로 늘리는 배율 — 제호는 보통 1.1~1.2 (원본 실측 1.148) */
  stretch = 1,
  /** 아래로 깔리는 그림자 오프셋 [x, y]. null 이면 그림자 없음 */
  shadow = [9, 12],
  shadowColor = "var(--wine-deep)",
  strokeColor = "var(--gold-bright)",
  strokeWidth = 11,
  /** 본체 색 — 두 색을 주면 위→아래 그라데이션 */
  fill = ["var(--gold-bright)", "var(--gold-soft)"],
  fontFamily = "var(--font-head-brush), serif",
  className = "",
}: {
  text: string;
  width?: number;
  height?: number;
  inkWidth?: number;
  x?: number;
  y?: number;
  stretch?: number;
  shadow?: [number, number] | null;
  shadowColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fill?: string | [string, string];
  fontFamily?: string;
  className?: string;
}) {
  // 같은 페이지에 레터링이 둘 이상이면 그라데이션 id 가 충돌해 뒤엣것이 앞엣것 색을 쓴다(실측 함정).
  const gid = useId().replace(/:/g, "");
  const ink = inkWidth ?? Math.round(width * 0.73);
  const cx = x ?? Math.round((width - ink) / 2);
  const cy = y ?? Math.round(height * 0.72);
  const grad = Array.isArray(fill);
  const body = grad ? `url(#${gid})` : (fill as string);
  // 글자 크기는 높이에서 역산한다 — 자(FS)는 글줄용이고, 제호는 그림이라 캔버스가 크기를 정한다.
  const fontSize = Math.round(height * 0.62);

  const common = {
    x: cx,
    y: cy,
    textLength: ink,
    lengthAdjust: "spacing" as const,
    fontSize,
    fontFamily,
    fontWeight: 700,
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`block w-full ${className}`} role="img" aria-label={text}>
      {grad && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={(fill as [string, string])[0]} />
            <stop offset="100%" stopColor={(fill as [string, string])[1]} />
          </linearGradient>
        </defs>
      )}
      <g transform={stretch === 1 ? undefined : `translate(0,${cy}) scale(1,${stretch}) translate(0,${-cy})`}>
        {shadow && (
          <text {...common} fill={shadowColor} transform={`translate(${shadow[0]},${shadow[1]})`}>
            {text}
          </text>
        )}
        <text {...common} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" paintOrder="stroke" fill={body}>
          {text}
        </text>
      </g>
    </svg>
  );
}
