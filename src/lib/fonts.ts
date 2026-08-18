// 웹폰트 한 곳 — next/font 로 빌드 때 받아 self-host 한다.
//
// 왜 옮겼나(2026-08-06 실측): globals.css 가 `@import` 4줄로 21개 패밀리를 불렀다.
// CSS 안에서 또 CSS 를 부르는 구조라 요청이 3단으로 밀린다
//   app.css 내려받기 → @import 4개 요청 → 그 안의 @font-face → 실제 폰트 파일
// 그동안 글자는 안 그려진다. 유입이 전부 메타 모바일이라 이 지연이 첫 이탈로 간다.
// next/font 는 빌드 때 받아 같은 도메인에서 서빙하고 <link rel=preload> 를 자동으로 넣는다.
//
// 여기 없는 글씨체(웹툰 말풍선용 12종·송명조)는 일부러 뺐다 — WebtoonCut 이 쓰는 것만
// 그 자리에서 부른다. 전 방문자에게 12개 패밀리를 미리 안겨줄 이유가 없다.
import { Gowun_Batang, Nanum_Brush_Script, Nanum_Myeongjo, Noto_Serif_KR, Noto_Sans_KR, JetBrains_Mono, Ma_Shan_Zheng } from "next/font/google";

// 제목·대사·본문의 축. 이 프로젝트에서 제일 많이 쓰는 글씨체다.
export const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-myeongjo",
  preload: true,
});

// 財 · 緣 · 命 — 티저의 장(章) 글자와 .font-brush
export const nanumBrush = Nanum_Brush_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brush",
  preload: false,
});

// 퍼널 화면 제목(굵은 명조)
export const nanumMyeongjo = Nanum_Myeongjo({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-myeongjo-nanum",
  preload: false,
});

// 위저드 선택지·결제 완료 화면
export const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-kr",
  preload: false,
});

// 직녀 헤드라인 전용 극볼드 고딕.
// 경쟁사(청월당) 1:1 대조에서 나온 것: 걔넨 헤드가 **두꺼운 고딕 + 좁은 자간**인데
// 우리는 명조 + 넓은 자간이라 같은 크기에서도 약해 보였다(형님 「밤티」 판정의 원인 1).
// 본문·대사는 그대로 명조를 쓰고, **헤드라인에서만** 이 글씨체로 무게를 세운다.
export const notoSansKr = Noto_Sans_KR({
  weight: ["700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-gothic",
  preload: false,
});

// 진행 표시(10/10)·생년월일 입력처럼 자릿수가 흔들리면 안 되는 곳
export const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  preload: false,
});

// 한자 장식 전용(命 등). 본문에는 쓰지 않는다.
export const maShanZheng = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanja",
  preload: false,
});

/** <html> 에 얹을 폰트 변수 클래스 — layout.tsx 에서만 쓴다. */
export const fontVariables = [
  gowunBatang.variable,
  nanumBrush.variable,
  nanumMyeongjo.variable,
  notoSerifKr.variable,
  notoSansKr.variable,
  jetbrainsMono.variable,
  maShanZheng.variable,
].join(" ");
