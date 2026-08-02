// 소셜프루프 — 후기·누적 숫자. **형님이 값만 채우는 파일이다.**
//
// 여기 값이 비어 있으면 화면에 아무것도 안 나온다(빈 껍데기가 노출되는 사고 방지).
// 경쟁사 실측: 타이트 "누적 2,001,565 · 카카오 친구 51,676 · 후기 38,200",
//              청월당은 같은 페이지에서 436,597 / 457,953 / 43,524 로 제각각이었다.
//              숫자를 쓸 거면 **한 값으로 통일**해야 한다 — 화면마다 다르면 그게 더 눈에 띈다.

export type SocialReview = {
  /** 마스킹한 아이디. 타이트는 k*** 형식을 쓴다 */
  handle: string;
  /** 한 줄 후기 */
  body: string;
  /** "3일 전" 같은 표기. 비워도 된다 */
  when?: string;
};

export type SocialProof = {
  /** 누적 이용자 수. 0이면 화면에 안 나온다 */
  totalUsers: number;
  /** 후기 수. 0이면 안 나온다 */
  totalReviews: number;
  /** 회전 후기. 빈 배열이면 후기 블록 자체가 안 나온다 */
  reviews: SocialReview[];
};

export const SOCIAL_PROOF: SocialProof = {
  totalUsers: 0,
  totalReviews: 0,
  reviews: [],
};

/** 숫자를 한국식으로 — 2001565 → "2,001,565" */
export const formatCount = (n: number) => n.toLocaleString("ko-KR");

/** 하나라도 채워졌는지. 비어 있으면 호출부가 블록을 통째로 숨긴다. */
export const hasSocialProof = (s: SocialProof = SOCIAL_PROOF) =>
  s.totalUsers > 0 || s.totalReviews > 0 || s.reviews.length > 0;
