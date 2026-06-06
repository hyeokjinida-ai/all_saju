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
    description: "왜 늘 같은 자리에서 멈출까 — 내 사주의 핵심과 올해 흐름, 지금 가장 큰 고민 하나를 짚어드립니다",
    price: 9900,
    display_order: 10,
    is_active: true,
  },
  // 고민별 심화 ① 재물 (신규)
  {
    slug: "wealth-saju",
    name: "내 재물·돈 흐름 깊이보기",
    description: "버는데 왜 안 모일까 — 돈이 들어오는 길과 새는 구멍, 큰돈 들어올 시기까지 깊게 봅니다",
    price: 19900,
    display_order: 20,
    is_active: true,
  },
  // 고민별 심화 ② 관계·가족 (기존 love-saju 개편)
  {
    slug: "love-saju",
    name: "내 관계·가족 깊이보기",
    description: "왜 늘 비슷한 사람에게 끌릴까 — 부부·연애·재혼·자녀, 반복되는 관계 패턴과 내게 맞는 인연을 봅니다",
    price: 19900,
    display_order: 30,
    is_active: true,
  },
  // 킬러 상품 — 월별 운 캘린더 (신규)
  {
    slug: "monthly-luck",
    name: "2026 월별 운 캘린더",
    description: "언제 움직이고 언제 멈출까 — 2026년 1~12월 좋은 달·위험한 달과 큰 결정의 때를 콕 집어드립니다",
    price: 24900,
    display_order: 40,
    is_active: true,
  },
  // 끝판왕 — 인생 종합 풀이(대운 60년)
  {
    slug: "premium-saju",
    name: "인생 종합 풀이",
    description: "내 인생의 큰 그림 전부 — 재물·직업·관계·건강에 대운 60년 흐름까지, 가장 깊은 종합 풀이",
    price: 49900,
    display_order: 50,
    is_active: true,
  },
  // 끝판왕 위 앵커 — 인생 VIP 정밀 풀이 (검증 후 is_active true 로 전환)
  {
    slug: "vip-saju",
    name: "인생 VIP 정밀 풀이",
    description: "내 인생 전부를 한 권으로 — 대운 60년 연표와 향후 10년 해마다의 로드맵, 결정적 시기 3가지까지 가장 깊게",
    price: 99000,
    display_order: 55,
    is_active: false,
  },
  // 가벼운 재방문용 — 입구에서 강조하지 않고 보조로만 노출
  {
    slug: "today-fortune",
    name: "오늘의 운세 한 줄",
    description: "오늘 무엇을 조심하고 무엇을 잡을까 — 하루 흐름을 한 문장으로",
    price: 4900,
    display_order: 60,
    is_active: true,
  },
];
