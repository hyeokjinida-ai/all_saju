// =====================================================
// 상품 시드 (scripts/seed-products.ts 에서 사용)
// =====================================================
// 가격대만 다른 단순 라인업. 수강생은 자유롭게 추가/수정 후
// pnpm seed:products 로 DB에 반영합니다.

export type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  price: number;
  display_order: number;
  is_active: boolean;
};

export const productsSeed: ProductSeed[] = [
  // 메인 진입 상품 — 무료 명식에서 이어지는 ₩9,900 종합 1장
  {
    slug: "basic-saju",
    name: "내 사주 기본 풀이",
    description: "내 사주의 핵심과 올해 흐름, 지금 가장 마음 쓰이는 고민까지 풀어주는 기본 해설",
    price: 9900,
    display_order: 10,
    is_active: true,
  },
  // 고민별 심화 ① 재물 (신규)
  {
    slug: "wealth-saju",
    name: "내 재물·돈 흐름 깊이보기",
    description: "돈이 들어오고 새는 구조, 올해 조심해야 할 지출 흐름을 더 깊게 봅니다",
    price: 19900,
    display_order: 20,
    is_active: true,
  },
  // 고민별 심화 ② 관계·가족 (기존 love-saju 개편)
  {
    slug: "love-saju",
    name: "내 관계·가족 깊이보기",
    description: "부부·연애·재혼·자녀 — 반복되는 관계 패턴과 잘 맞는 사람을 깊게 봅니다",
    price: 19900,
    display_order: 30,
    is_active: true,
  },
  // 킬러 상품 — 월별 운 캘린더 (신규)
  {
    slug: "monthly-luck",
    name: "2026 월별 운 캘린더",
    description: "1~12월 좋은 달·조심할 달과 큰 결정하기 좋은 시기를 따로 정리해드립니다",
    price: 24900,
    display_order: 40,
    is_active: true,
  },
  // 끝판왕 — 인생 종합 풀이(대운 60년)
  {
    slug: "premium-saju",
    name: "인생 종합 풀이",
    description: "재물·직업·관계·건강에 대운 60년 흐름까지 통합한 가장 깊은 종합 해설",
    price: 49900,
    display_order: 50,
    is_active: true,
  },
  // 가벼운 재방문용 — 입구에서 강조하지 않고 보조로만 노출
  {
    slug: "today-fortune",
    name: "오늘의 운세 한 줄",
    description: "아침에 가볍게 보는 오늘 하루 흐름 한 문장",
    price: 4900,
    display_order: 60,
    is_active: true,
  },
];
