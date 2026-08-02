// 손님 호칭 — 결과지·웹툰 말풍선에 이름을 박을 때 쓴다.
//
// 실측 근거(2026-08-02, 청월당 무료 티저 두 표본):
//   제목만 "김지훈님의 사주"이고 본문은 전부 "지훈님"이었다.
//   "지훈님의 대운표" / "지훈님의 오행&용신" / "지훈님에게 찾아올 위기"
//   성을 떼면 거리감이 확 줄어든다. 2글자 이름("19"님)은 그대로 뒀다.

/** 두 글자 성 — 이 목록에 걸리는 네 글자 이름만 두 글자를 뗀다 */
const COMPOUND_SURNAMES = [
  "남궁", "황보", "제갈", "사공", "선우", "서문", "독고", "동방",
];

const HANGUL_ONLY = /^[가-힣]+$/;

/**
 * 말 걸 때 쓸 이름. 한글 이름이면 성을 뗀다.
 *   "김지훈" → "지훈"   "남궁민수" → "민수"   "19" → "19"   "" → fallback
 * 한글이 아니거나(영문·숫자) 두 글자 이하면 손대지 않는다 — 성인지 이름인지 알 수 없다.
 */
export function toGivenName(name?: string | null, fallback = "회원"): string {
  const n = (name ?? "").trim();
  if (!n) return fallback;
  if (!HANGUL_ONLY.test(n)) return n;
  if (n.length === 3) return n.slice(1);
  if (n.length === 4 && COMPOUND_SURNAMES.includes(n.slice(0, 2))) return n.slice(2);
  return n;
}

/** "지훈님" — 말풍선·본문에서 부를 때 */
export function honorific(name?: string | null, fallback = "회원"): string {
  return `${toGivenName(name, fallback)}님`;
}

/** "김지훈님" — 명식표 제목처럼 격식이 필요한 자리에서는 성을 살린다 */
export function fullHonorific(name?: string | null, fallback = "회원"): string {
  const n = (name ?? "").trim();
  return `${n || fallback}님`;
}
