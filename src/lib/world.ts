// 상품 slug → 세계관 한 곳 (2026-09-07)
//
// 왜 파일로 빼나: 같은 판정이 결제 화면과 결제 후 대기 화면 두 군데에 따로 적혀 있었고,
// 그래서 **한쪽만 상품을 알아보는** 병이 났다. 결제 화면은 재회를 알아봤는데(밤 무대 색)
// 대기 화면은 못 알아봐서, 재회 손님이 결제하는 순간 세계관 밖(보라 나경반 + 존댓말)으로
// 떨어졌다. 번들도 같다 — 산군 번들을 사면 산군이 아닌 화면이 떴다.
// 규칙이 두 벌이면 반드시 또 갈라진다. 여기 한 벌만 둔다.

/** 그림·문장이 갈리는 단위. 결제 화면의 색 토큰은 산군 / 그 외 밤 무대 둘로만 갈린다. */
export type World = "sangun" | "inyeon" | "reunion";

/**
 * 판정 순서가 곧 규칙이다 — 번들에는 상품 이름이 여럿 들어 있다.
 * `bundle-sangun-inyeon-reunion` 은 셋 다 걸리는데, 손님이 결제 직전까지 본 화면이
 * 산군이므로(번들 진입점이 산군 랜딩) 산군을 먼저 집는다.
 * 결제 화면이 예전부터 쓰던 `includes("sangun")` 우선 규칙과 같은 순서다.
 */
export function worldOfSlug(slug?: string | null): World | null {
  if (!slug) return null;
  if (slug.includes("sangun")) return "sangun";
  if (slug.includes("reunion")) return "reunion";
  if (slug.includes("inyeon") || slug === "marriage-saju") return "inyeon";
  return null;
}

/**
 * 세계관 → 결제 화면이 쓰는 색 스킨 클래스.
 * 재회(견우)도 직녀와 같은 밤 무대를 쓴다 — `world-jiknyeo` 는 그림이 아니라 **색 토큰**이다.
 */
export function worldClass(world: World | null): string {
  if (world === "sangun") return "world-sangun";
  if (world === "inyeon" || world === "reunion") return "world-jiknyeo";
  return "";
}

/** 세계관 → 화면 바닥색. 스킨 클래스와 짝이며, 세계관이 없으면 검정. */
export function worldBg(world: World | null): string {
  if (world === "sangun") return "#0a0908";
  if (world === "inyeon" || world === "reunion") return "#0b0f1a";
  return "#000000";
}
