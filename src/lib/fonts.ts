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
import { Gowun_Batang, Nanum_Brush_Script, Nanum_Myeongjo, Noto_Serif_KR, Noto_Sans_KR, Black_Han_Sans, JetBrains_Mono, Ma_Shan_Zheng } from "next/font/google";
import localFont from "next/font/local";

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

// 상품 카드 레터링 전용 — **Black Han Sans**.
//
// 왜 따로 두나: 카드 제목은 그 카드의 정점 한 줄이라 **글자 자체가 그림**이어야 한다.
// 처음엔 Noto Sans KR 900 을 `textLength` 로 가로 압축해 썼는데(원본 청월당 서체가 압축체라),
// 정체 폰트를 눌러 만든 가짜 압축은 「늘린 폰트」 티가 난다 — 형님 「밤티」 판정(2026-08-23).
// Black Han Sans 는 **처음부터 각지고 꽉 찬 전각 디스플레이체**라 누르지 않아도 그 비례가 나온다.
// 직녀 「연애예보」 레터링 원본을 만든 글자체와 같다(직녀/가격카드/연애예보_레터링원본.png).
//
// ⚠ 최종형은 이 글자체가 아니라 **이 글자체로 뽑은 원본을 ChatGPT 웹에 올려 표면을 입힌 PNG** 다.
//    PNG 가 들어오면 코드가 자동으로 그걸 쓴다(HeroLettering). 이건 그 전까지의 모습이자 폴백.
export const blackHanSans = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lettering",
  preload: false,
});

// 밝은 티저의 섹션 헤드 — **가평한석봉**(서예체). 경쟁사가 헤드에 쓰는 바로 그 글씨체다.
//
// 청월당 실측: 걔넨 본문만 고딕이고 **헤드는 서예체**다. 한 벌로 끝까지 가지 않는 게
// 「AI 티」를 지우는 축이다. 처음엔 배포처를 못 찾아 송명조로 뒀는데, 송명조는 명조지 서예체가
// 아니라 붓 맛이 안 났다 — fonts-archive 저장소에서 원본 woff2 를 찾아 갈아끼웠다.
//
// ⚠ 서브셋(파일 축소)을 하지 않는다. 라이선스가 「원형 그대로 사용」을 요구한다.
//    헤드 전용이라 preload 도 걸지 않는다 — 첫 화면(게이트)은 이 글씨체를 안 쓴다.
// 라이선스: 가평군 공공서체 · 무료 사용 · 원형 유지 · 출처 표기(푸터에 표기함).
// 헤드는 24px 로 **작게** 쓰고 위계는 굵기·색으로 만든다 — 크기로 밀면 그게 밤티가 된다.
export const gapyeongHanseokbong = localFont({
  src: [
    { path: "../app/fonts/GapyeongHanseokbong-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/GapyeongHanseokbong-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-head-brush",
  preload: false,
});

// 웹툰 효과음 전용 — **손글씨체**(김중철손글씨).
//
// 청월당 웹툰 컷을 열어 보면 「멈칫」「갸웃」「어라?」 같은 의성어가 **그림 안에 손으로 쓰여** 있다.
// 그게 웹툰 질감의 절반이다. 우리는 그림에 글자를 굽지 않으므로(손님마다 값이 다르다)
// 같은 손글씨체를 얹어 코드로 흉내낸다 — 걔네가 실제로 쓰는 폰트가 이거다(실측).
// 라이선스: 정림건축 배포 · 상업 이용 및 웹폰트 임베딩 허용 · 폰트 자체 판매만 금지.
export const kimjungchul = localFont({
  src: [
    { path: "../app/fonts/KimjungchulScript-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/KimjungchulScript-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-hand",
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
  blackHanSans.variable,
  gapyeongHanseokbong.variable,
  kimjungchul.variable,
  jetbrainsMono.variable,
  maShanZheng.variable,
].join(" ");
