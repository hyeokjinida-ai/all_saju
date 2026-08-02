// 글 컷 — 그림 없이 글만 있는 칸. 컷과 컷 사이에 끼우는 나레이션이다.
//
// 왜 따로 두나: 말풍선은 "그림 위 좌표"에 얹히는 거라 그림이 없으면 놓을 자리가 없다.
// 웹툰에서 장면 전환·독백·시간 경과를 알리는 문장은 칸 자체가 글이어야 한다.
// 글자 크기는 그림 컷과 같은 컨테이너 쿼리 단위(cqw)를 써서 폭이 바뀌어도 비율이 안 깨진다.

import { WEBTOON_FONTS, type WebtoonFont } from "./WebtoonCut";

export type WebtoonTextStyle = {
  /** 본문. 줄바꿈은 \n 으로 직접 통제한다 */
  text: string;
  /** 칸 배경 */
  bg?: string;
  color?: string;
  /** 글자 크기 — 컷 폭 대비 %. 기본 4.2(=375px 폭에서 약 16px) */
  size?: number;
  align?: "left" | "center" | "right";
  font?: WebtoonFont;
  /** 위아래 여백 — 컷 폭 대비 %. 크게 줄수록 "쉬어가는 칸"이 된다 */
  padY?: number;
  lineHeight?: number;
};

export const TEXT_CUT_DEFAULTS = {
  bg: "#0a0908",
  color: "#e8ded0",
  size: 4.2,
  align: "center" as const,
  font: "myeongjo" as WebtoonFont,
  padY: 9,
  lineHeight: 1.75,
};

export function WebtoonTextCut({ text, bg, color, size, align, font, padY, lineHeight }: WebtoonTextStyle) {
  const d = TEXT_CUT_DEFAULTS;
  return (
    // cqw 의 기준이 되는 컨테이너 — 그림 컷과 폭이 같으므로 글자 크기가 같은 잣대로 맞는다
    <div style={{ containerType: "inline-size", background: bg ?? d.bg }}>
      <p
        style={{
          margin: 0,
          padding: `${padY ?? d.padY}cqw 7cqw`,
          color: color ?? d.color,
          fontSize: `${size ?? d.size}cqw`,
          lineHeight: lineHeight ?? d.lineHeight,
          textAlign: align ?? d.align,
          fontFamily: WEBTOON_FONTS[font ?? d.font].css,
          whiteSpace: "pre-wrap", // 편집기에서 넣은 줄바꿈을 그대로 살린다
          wordBreak: "keep-all",  // 한국어는 어절 단위로 끊어야 읽힌다
        }}
      >
        {text}
      </p>
    </div>
  );
}
