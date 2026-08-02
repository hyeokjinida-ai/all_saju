// 웹툰 컷 = 그림 + 그 위에 얹는 말풍선.
//
// 실측 근거(2026-08-02): 청월당·타이트 둘 다 같은 기법을 쓴다. 그림은 전원 동일한 고정 자산이고,
// 개인화가 필요한 대사만 말풍선을 비워둔 뒤 HTML 텍스트를 절대좌표로 얹는다.
// 청월당 원본 마크업:
//   <div class="relative"><picture>…<img class="block h-auto w-full"></picture>
//     <div class="pointer-events-none absolute inset-0 z-10">
//       <p class="absolute whitespace-nowrap text-center"
//          style="left:49.9%; top:18.8%; transform:translateX(-50%) translateY(-50%)">…</p>
//
// 우리가 다르게 가는 곳 둘.
//  ① 글자 크기 — 청월당은 뷰포트 브레이크포인트로 키운다. 본문이 max-w-md로 캡되니 데스크톱에서
//     그림은 그대로인데 글자만 최대치가 된다. 우리는 컨테이너 쿼리 단위(cqw)로 그림 폭에 정확히 비례.
//  ② 말풍선 — 청월당은 그림에 빈 말풍선을 그려 넣는다. 우리는 코드가 그릴 수 있게 했다(bubble 옵션).
//     그림엔 배경·인물만 있으면 되고, 위치·크기를 나중에 코드로 고칠 수 있다.
//     손그림 질감이 필요하면 bubble:"none"으로 끄고 그림 말풍선을 쓰면 된다.

import { cn } from "@/lib/utils";

/** 말풍선 글씨체 — 웹폰트는 globals.css에서 한 번에 불러온다.
 *  라벨은 편집기 드롭다운에 그대로 뜨는 이름이다. */
export const WEBTOON_FONTS = {
  sans:      { label: "고딕 (기본 대사)",   css: "Pretendard, 'Apple SD Gothic Neo', sans-serif" },
  myeongjo:  { label: "명조 (격식)",        css: "'Gowun Batang', serif" },
  songmyung: { label: "송명조 (묵직)",      css: "'Song Myung', serif" },
  brush:     { label: "붓글씨",             css: "'Nanum Brush Script', cursive" },
  dokdo:     { label: "거친 붓 (공포)",     css: "'East Sea Dokdo', cursive" },
  pen:       { label: "펜 손글씨 (속마음)", css: "'Nanum Pen Script', cursive" },
  gaegu:     { label: "개구 (가벼운)",      css: "Gaegu, cursive" },
  gamja:     { label: "감자꽃 (아기자기)",  css: "'Gamja Flower', cursive" },
  melody:    { label: "여린 손글씨",        css: "'Hi Melody', cursive" },
  poor:      { label: "흔들림 (불안)",      css: "'Poor Story', cursive" },
  jua:       { label: "주아 (둥글둥글)",    css: "Jua, sans-serif" },
  dohyeon:   { label: "도현 (튼튼)",        css: "'Do Hyeon', sans-serif" },
  blackhan:  { label: "임팩트 (외침)",      css: "'Black Han Sans', sans-serif" },
  kirang:    { label: "기랑해랑 (옛날)",    css: "'Kirang Haerang', cursive" },
  gugi:      { label: "구기 (장식)",        css: "Gugi, cursive" },
  yeonsung:  { label: "연성 (물결)",        css: "'Yeon Sung', cursive" },
} as const;

export type WebtoonFont = keyof typeof WEBTOON_FONTS;

export type BubbleShape = "none" | "rect" | "round" | "ellipse" | "thought";
export type BubbleTail =
  | "none"
  | "bottom" | "bottom-left" | "bottom-right"
  | "top" | "top-left" | "top-right"
  | "left" | "right";

export type WebtoonBubble = {
  /** 말풍선 중심 가로 위치 — 그림 폭 대비 % */
  x: number;
  /** 말풍선 중심 세로 위치 — 그림 높이 대비 % */
  y: number;
  /** 대사. 줄바꿈은 \n 으로 직접 통제한다 — 자동 줄바꿈에 맡기면 말풍선 밖으로 샌다 */
  text: string;
  /** 글자 크기 — 그림 폭 대비 %. 기본 4.6(=375px 폭에서 약 17px) */
  size?: number;
  align?: "left" | "center" | "right";
  color?: string;
  weight?: number;
  lineHeight?: number;
  font?: WebtoonFont;
  /** 기울어진 말풍선용 (deg) */
  rotate?: number;
  /** 최대 폭(그림 폭 대비 %). 주면 그 폭에서 자동 줄바꿈을 허용한다 */
  maxWidth?: number;

  /** 말풍선 모양. 기본 none = 그림에 이미 그려진 말풍선 위에 글자만 얹는다 */
  bubble?: BubbleShape;
  tail?: BubbleTail;
  /** 말풍선 안쪽 색 */
  fill?: string;
  /** 테두리 색 */
  stroke?: string;
  /** 테두리 굵기 — 그림 폭 대비 %. 기본 0.42 */
  strokeWidth?: number;
  /** 글자 대비 좌우/상하 여백(em). 모양별 기본값이 있다 */
  padX?: number;
  padY?: number;
};

const fontCss = (f?: WebtoonFont) => (WEBTOON_FONTS[f ?? "sans"] ?? WEBTOON_FONTS.sans).css;

// 모양별 기본 여백 — 타원은 글자가 안쪽으로 들어가야 해서 훨씬 넉넉하게 준다
const PAD: Record<Exclude<BubbleShape, "none">, { x: number; y: number; radius: string }> = {
  rect: { x: 1.0, y: 0.6, radius: "0.45em" },
  round: { x: 1.2, y: 0.7, radius: "999px" },
  ellipse: { x: 2.2, y: 1.3, radius: "50%" },
  thought: { x: 2.2, y: 1.3, radius: "50%" },
};

// 꼬리가 붙는 변과 그 변에서의 위치(%)
const TAIL_AT: Record<Exclude<BubbleTail, "none">, { side: "top" | "bottom" | "left" | "right"; at: number }> = {
  bottom: { side: "bottom", at: 50 },
  "bottom-left": { side: "bottom", at: 26 },
  "bottom-right": { side: "bottom", at: 74 },
  top: { side: "top", at: 50 },
  "top-left": { side: "top", at: 26 },
  "top-right": { side: "top", at: 74 },
  left: { side: "left", at: 62 },
  right: { side: "right", at: 62 },
};

const HAS_EXT = /\.(webp|png|jpe?g|avif|gif|svg)$/i;

/** 말풍선 꼬리 — 아래로 뻗는 삼각형 하나를 그려두고 변에 맞춰 돌린다.
 *  밑변은 긋지 않고(path를 닫지 않음) 채움만 말풍선 테두리 위로 겹쳐서 이음매를 지운다. */
function Tail({
  tail, fill, stroke, sw, w, h,
}: { tail: Exclude<BubbleTail, "none">; fill: string; stroke: string; sw: number; w: number; h: number }) {
  const { side, at } = TAIL_AT[tail];
  // viewBox를 실제 비율과 맞춰 균일 스케일 → 테두리 굵기가 찌그러지지 않는다
  const vw = w * 10, vh = h * 10, vs = sw * 10;
  const overlap = `${sw * 1.6}cqw`; // 말풍선 테두리를 덮어 이음매 제거

  const place: Record<typeof side, React.CSSProperties> = {
    bottom: { left: `${at}%`, top: "100%", transform: `translate(-50%, calc(-1 * ${overlap}))` },
    top: { left: `${at}%`, top: 0, transform: `translate(-50%, calc(-100% + ${overlap})) rotate(180deg)` },
    left: { left: 0, top: `${at}%`, transform: `translate(calc(-100% + ${overlap}), -50%) rotate(90deg)` },
    right: { left: "100%", top: `${at}%`, transform: `translate(calc(-1 * ${overlap}), -50%) rotate(-90deg)` },
  };

  return (
    <svg
      viewBox={`${-vs} ${-vs} ${vw + vs * 2} ${vh + vs * 2}`}
      width={`${w}cqw`}
      height={`${h}cqw`}
      className="absolute"
      style={{ ...place[side], overflow: "visible" }}
      aria-hidden
    >
      <path
        d={`M0,0 L${vw * 0.56},${vh} L${vw},0`}
        fill={fill}
        stroke={stroke}
        strokeWidth={vs}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 생각풍선 꼬리 — 삼각형 대신 점점 작아지는 동그라미 두 개 */
function ThoughtTail({
  tail, fill, stroke, sw, w,
}: { tail: Exclude<BubbleTail, "none">; fill: string; stroke: string; sw: number; w: number }) {
  const { side, at } = TAIL_AT[tail];
  const dir = side === "top" ? -1 : side === "bottom" ? 1 : 0;
  const dirX = side === "left" ? -1 : side === "right" ? 1 : 0;
  return (
    <>
      {[0.42, 0.24].map((k, i) => {
        const d = w * k;
        const off = w * (0.5 + i * 0.75);
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${d}cqw`,
              height: `${d}cqw`,
              background: fill,
              border: `${sw}cqw solid ${stroke}`,
              left: dirX ? `${dirX > 0 ? 100 : 0}%` : `${at}%`,
              top: dir ? `${dir > 0 ? 100 : 0}%` : `${at}%`,
              transform: `translate(calc(-50% + ${dirX * off}cqw), calc(-50% + ${dir * off}cqw))`,
            }}
          />
        );
      })}
    </>
  );
}

export type WebtoonCutProps = {
  /**
   * 그림 경로. 확장자를 빼고 주면 webp를 우선 쓰고 png로 폴백한다("/webtoon/sangun/01").
   * 확장자나 data:/blob: URI를 그대로 주면 그것만 쓴다.
   */
  src: string;
  /** 장면 설명 — 말풍선 대사는 아래 bubbles가 진짜 텍스트로 읽히니 그림 자체만 설명한다 */
  alt: string;
  bubbles?: WebtoonBubble[];
  /** 가로/세로 비율(예: 375/2112). 주면 로딩 전에 자리를 잡아 레이아웃이 안 튄다 */
  ratio?: number;
  /** 첫 화면에 보이는 컷이면 true — 나머지는 lazy */
  priority?: boolean;
  className?: string;
};

export function WebtoonCut({
  src,
  alt,
  bubbles = [],
  ratio,
  priority = false,
  className,
}: WebtoonCutProps) {
  const single = HAS_EXT.test(src) || src.startsWith("data:") || src.startsWith("blob:");
  const imgClass = "block h-auto w-full select-none";

  return (
    <div
      className={cn("relative w-full", className)}
      // cqw의 기준이 되는 컨테이너. 그림이 w-full이므로 컨테이너 폭 = 그림 표시 폭이다.
      style={{ containerType: "inline-size", aspectRatio: ratio ? String(ratio) : undefined }}
    >
      {single ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={imgClass} draggable={false} />
      ) : (
        <picture className="block w-full">
          <source srcSet={`${src}.webp`} type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${src}.png`} alt={alt} loading={priority ? "eager" : "lazy"} className={imgClass} draggable={false} />
        </picture>
      )}

      {bubbles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {bubbles.map((b, i) => {
            const shape = b.bubble ?? "none";
            const size = b.size ?? 4.6;
            const align = b.align ?? "center";

            const textStyle: React.CSSProperties = {
              // pre = \n은 살리고 자동 줄바꿈은 막는다. maxWidth를 준 경우에만 자동 줄바꿈 허용.
              whiteSpace: b.maxWidth ? "pre-line" : "pre",
              lineHeight: b.lineHeight ?? 1.45,
              fontWeight: b.weight ?? 500,
              color: b.color ?? "#111111",
              letterSpacing: "-0.025em",
              margin: 0,
              fontFamily: fontCss(b.font),
            };
            const alignClass = cn(
              align === "center" && "text-center",
              align === "left" && "text-left",
              align === "right" && "text-right",
            );

            // 그림에 이미 말풍선이 있는 경우 — 글자만 얹는다(청월당 방식)
            if (shape === "none") {
              return (
                <p
                  key={i}
                  className={cn("absolute", alignClass)}
                  style={{
                    ...textStyle,
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    transform: `translate(-50%, -50%)${b.rotate ? ` rotate(${b.rotate}deg)` : ""}`,
                    maxWidth: b.maxWidth ? `${b.maxWidth}cqw` : undefined,
                    fontSize: `${size}cqw`,
                  }}
                >
                  {b.text}
                </p>
              );
            }

            // 코드가 말풍선을 그리는 경우
            const pad = PAD[shape];
            const fill = b.fill ?? "#ffffff";
            const stroke = b.stroke ?? "#111111";
            const sw = b.strokeWidth ?? 0.42;
            const tail = b.tail ?? "none";

            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  transform: `translate(-50%, -50%)${b.rotate ? ` rotate(${b.rotate}deg)` : ""}`,
                  fontSize: `${size}cqw`,
                }}
              >
                <div className="relative inline-block">
                  <div
                    className={alignClass}
                    style={{
                      background: fill,
                      border: `${sw}cqw solid ${stroke}`,
                      borderRadius: pad.radius,
                      padding: `${b.padY ?? pad.y}em ${b.padX ?? pad.x}em`,
                      maxWidth: b.maxWidth ? `${b.maxWidth}cqw` : undefined,
                    }}
                  >
                    <p style={textStyle}>{b.text}</p>
                  </div>

                  {tail !== "none" &&
                    (shape === "thought" ? (
                      <ThoughtTail tail={tail} fill={fill} stroke={stroke} sw={sw} w={size * 0.9} />
                    ) : (
                      <Tail tail={tail} fill={fill} stroke={stroke} sw={sw} w={size * 0.78} h={size * 0.72} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
