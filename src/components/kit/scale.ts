// 자(字) — 부품이 쓰는 유일한 글자 크기 목록. (2026-08-23)
//
// 왜 이름을 붙였나: 부품마다 px 를 직접 적으면 상품이 늘 때마다 자가 하나씩 생긴다.
// 실제로 그렇게 됐다 — 화면에 12·14·15.5·14.5·10.5 가 섞여 위계가 0.5px 차로 무너진 자리가 있었다.
// 여기 없는 크기는 **부품에서 못 쓴다.** 필요하면 눈금을 늘리는 게 아니라 역할을 다시 고른다.
//
// 값 자체는 globals.css 의 --fs-* 에 있다(스킨이 바뀌어도 자는 같다).
// ⚠ 0.5px 차이는 안 보인다 — 위계를 만들려면 한 칸을 건너뛴다(본문 15 → 대사 17 → 나레이션 19).
export const FS = {
  cap:  "var(--fs-11)", // 캡션·각주
  aux:  "var(--fs-13)", // 보조 설명·칩
  body: "var(--fs-15)", // 본문
  say:  "var(--fs-17)", // 대사(말풍선)
  narr: "var(--fs-19)", // 나레이션(웹툰 글컷)
  sub:  "var(--fs-23)", // 소제목
  head: "var(--fs-28)", // 섹션 헤드
  big:  "var(--fs-34)", // 큰 숫자
  peak: "var(--fs-44)", // 정점 — 컷마다 한 줄만 (조판 규칙 §7)
} as const;

export const LH = {
  tight: "var(--lh-tight)", // 헤드·정점
  body:  "var(--lh-body)",  // 본문·대사
} as const;

/** 컷 하나 = 그림 자리 하나. 상품마다 `src/config/slots/<slug>.ts` 에 목록을 둔다. */
export type SlotDef = { id: string; label: string; note?: string; video?: boolean };
export type Asset = { img?: string; video?: string };
export type AssetMap = Record<string, Asset | undefined>;
