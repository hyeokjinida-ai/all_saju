// 홈(카탈로그) 설정 — 카드에 무엇을 어떤 순서로 세울지.
//
// 여기 값들은 전부 **폴백**이다. 상품 빌더(Part B)가 붙으면 products 테이블의
// hero_rank·card_title·tagline·category·art 가 우선하고, 비어 있을 때만 이 파일이 답한다.
// 그래서 상품을 늘릴 때 이 파일을 고치지 않아도 되고, 빌더가 아직 없는 지금도 홈이 찬다.

export type RowKey = "love" | "sinjeom" | "wealth" | "life" | "family" | "career";

/** 카드 그림 — public/home/<slug>-<slot>.webp (scripts/make-home-art.ts 가 굽는다) */
export const homeArt = (slug: string, slot: "hero" | "big" | "row") =>
  `/home/${slug}-${slot}.webp`;

/**
 * 히어로 제목 레터링 그림 — public/home/lettering/<slug>.webp
 *
 * ChatGPT 웹에서 표면을 입혀 온 PNG 를 이 경로에 두면 히어로가 글자 대신 그 그림을 쓴다.
 * 파일이 없으면 폴백(Black Han Sans 로 그린 글자)이 그대로 선다 — 그래서 한 상품씩 갈아끼울 수 있다.
 * ⚠ 있는 것만 여기 등록한다. 없는 경로를 넘기면 카드에 깨진 그림 자리가 생긴다.
 */
export const LETTERING: Record<string, string> = {
  "sangun-sinjeom": "/home/lettering/sangun-sinjeom.webp",
  "inyeon-saju": "/home/lettering/inyeon-saju.webp",
  "marriage-saju": "/home/lettering/marriage-saju.webp",
};

/** 히어로 순서(TOP 1·2·3) + 레터링에 얹을 글자. 없는 상품은 그냥 빠진다. */
export const HOME_HERO: Record<string, { character: string; title: string; tagline: string }> = {
  // ⚠ 카드 제목은 **4글자**로 맞춘다. 청월당 카드 제목이 전부 4글자인 게 우연이 아니다
  //    (정통사주·재회비책·연애비책·신점사주) — 4글자여야 카드 폭 안에서 글자가 커질 수 있고,
  //    커져야 그 줄이 카드의 정점이 된다. 상품 전체 이름(박수무당 사주)은 캐릭터 줄과
  //    아래 부제, 그리고 상세 페이지가 이미 말하고 있다.
  "sangun-sinjeom": {
    character: "얼굴 없는 박수 · 산군",
    title: "박수무당",
    tagline: "돌려 말하지 않고 고한다",
  },
  "inyeon-saju": {
    character: "직녀",
    title: "연애예보",
    tagline: "만나는 달과 조심할 달, 열두 달",
  },
  "marriage-saju": {
    character: "직녀",
    title: "결혼예보",
    tagline: "결혼하는 해와 서두를 달",
  },
};

/** 히어로에 세울 순서. 배열 앞이 TOP 1. */
export const HERO_ORDER = ["sangun-sinjeom", "inyeon-saju", "marriage-saju"];

/** 큰 카드(70%) 행에 세울 상품 — 히어로와 같은 상품이지만 그림이 다르다(같은 컷 두 번 금지). */
export const BIG_ROW_ORDER = ["sangun-sinjeom", "inyeon-saju", "marriage-saju"];

/** 카테고리 행 — 상품이 0개면 행도 탭도 사라진다. */
export const HOME_ROWS: { key: RowKey; label: string; tab: string }[] = [
  { key: "love", label: "💍 만나는 달, 결혼하는 해", tab: "연애·결혼" },
  { key: "sinjeom", label: "🕯 돌려 말하지 않는 신점", tab: "신점" },
  { key: "wealth", label: "💰 돈 들어오는 달", tab: "재물" },
  { key: "life", label: "✧ 내 사주 전체를 한 번에", tab: "종합" },
  { key: "family", label: "🏠 부부와 아이, 우리 집 흐름", tab: "가족" },
  { key: "career", label: "📈 일과 자리, 움직일 때", tab: "직장" },
];

/** 빌더 이전 상품들의 카테고리 — products.category 가 비었을 때만 쓴다. */
export const CATEGORY_FALLBACK: Record<string, RowKey> = {
  "inyeon-saju": "love",
  "marriage-saju": "love",
  "sangun-sinjeom": "sinjeom",
  "wealth-saju": "wealth",
  "life-saju": "life",
  "basic-saju": "life",
  "premium-saju": "life",
  "vip-saju": "life",
  "today-fortune": "life",
  "monthly-luck": "life",
  "love-saju": "family",
};

export const HOME_COPY = {
  bigRowTitle: "✦ 먼저 보고 가는 풀이",
  loginChip: "💡 로그인하면 받은 결과지를 보관함에서 다시 볼 수 있어요",
  trustPill: "정통 만세력 · 실측 검증",
  // 근거: scripts/verify-daeun.ts — 다른 만세력 앱과 대운 간지를 실제로 대조했다.
  trustHeadline: "다른 만세력과 대운 간지를 대조해 검증한 계산으로 풉니다",
  reviewTitle: "먼저 받아본 분들",
  metaTitle: "명운록 — 박수무당 사주 · 직녀의 연애예보",
  metaDescription:
    "얼굴 없는 박수의 신점, 직녀의 연애·결혼 예보. 정통 만세력으로 세운 사주를 이야기로 읽어드립니다.",
};

/** 타이트 다크 토큰 — 색은 여기 한 곳에서만 정한다(계획서 §2-3/§2-4 실측). */
export const T = {
  canvas: "#18191A", // 컨테이너 바깥
  page: "#000000", // 페이지 기둥
  footer: "#141414",
  cardBg: "#18181B",
  title: "#FAFAFA",
  sub: "#A1A1AA",
  dim: "#71717A",
  soft: "#D4D4D8",
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.20)",
} as const;

/** description 에서 카드용 한 줄만 뽑는다 — "'곧 만난다'는 말은 그만 — 만나는 달과…" → 앞부분 */
export function shortDesc(description: string): string {
  const head = description.split(" — ")[0]?.trim() ?? description;
  return head.length > 30 ? head.slice(0, 29) + "…" : head;
}

/**
 * 카드에 찍을 상품 이름.
 *
 * ⚠ 운영 DB 의 이름에는 설명이 붙어 있는 것들이 있다(실측: "직녀 연애사주 — 만나는 달").
 *    그대로 카드에 넣으면 한 줄에 안 들어가 "직녀 결혼사주 — 결혼하…" 로 잘린다.
 *    카드에서는 **줄표 앞까지만** 쓴다 — 설명은 바로 아래 부제 줄이 이미 맡고 있다.
 */
export function cardName(name: string): string {
  return name.split(/\s—\s|\s-\s/)[0]?.trim() || name;
}
