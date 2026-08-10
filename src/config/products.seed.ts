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
  // 0010 업셀 —
  //  compare_at_price: 취소선 정가(앵커). null/생략이면 할인 표기 없음. price 이상이어야 한다.
  //  bundle_slugs:     패키지 구성품. 결제 1건 → 구성품 수만큼 결과지가 나온다.
  //  is_addon:         홈·상품목록·사이트맵·크로스셀에서 감춘다(퍼널 안에서만 파는 상품).
  compare_at_price?: number | null;
  bundle_slugs?: string[] | null;
  is_addon?: boolean;
};

export const productsSeed: ProductSeed[] = [
  // 자수정 퍼널(/funnel) 종합 상품 — ₩14,900 인생사주 종합 풀이
  {
    slug: "life-saju",
    name: "사주 기본 풀이",
    description: "내 사주 핵심 + 올해 흐름과 가장 큰 고민에 대한 답을 한 번에 풀어드립니다",
    price: 6900,
    display_order: 5,
    is_active: true,
  },
  // (비활성) life-saju(사주 기본 풀이 6,900)와 중복이라 내림 — 혼란 방지. 되살리려면 true.
  {
    slug: "basic-saju",
    name: "내 사주 기본 풀이",
    description: "왜 늘 같은 자리에서 멈출까 — 내 사주의 핵심과 올해 흐름, 지금 가장 큰 고민 하나를 짚어드립니다",
    price: 7900,
    display_order: 10,
    is_active: false,
  },
  // 고민별 심화 ① 재물 — "돈 들어오는 달"로 재출시 (2026-07 경쟁분석 반영: '언제'에 올인)
  {
    slug: "wealth-saju",
    name: "돈 들어오는 달",
    description: "재물운이 '좋다'는 말은 그만 — 내 돈이 실제로 들어오는 달과 새는 달, 다가올 1년을 콕 집어드립니다",
    price: 14900,
    display_order: 20,
    is_active: true,
  },
  // 30대 여성 메인 — "○○ 들어오는 달" 시리즈 2호 (2026-07 신규, 페르소나 검증 반영)
  {
    slug: "inyeon-saju",
    name: "인연 들어오는 달",
    description: "'곧 좋은 사람 만난다'는 말은 그만 — 인연이 들어오는 달과 흔들리는 달, 앞으로 12개월을 콕 집어드려요",
    price: 17900,
    display_order: 22,
    is_active: true,
  },
  // 박수무당 라인 — 포괄 메인 상품 (2026-07-28 확장: 총운+돈 달·인연 달·바뀌는 해 확언, 19,900)
  //
  // 이름 변경 이력(2026-08-10): "산군 신점" → "박수무당 사주".
  //  - "신점"은 3040 여성에게 **대면 상담**으로 읽혀 웹 리포트라는 실물과 기대가 어긋났다.
  //  - "산군"은 호랑이의 옛 별칭이라 일반인이 모른다 — 광고 3초 안에 정체가 전달되지 않았다.
  //  - "박수무당"은 설명이 필요 없고, 경쟁사(웹툰 미남 도령·캐릭터 IP)가 안 쓰는 토속·실사
  //    포지션이라 우리 비주얼(갓 그림자·얼굴 없음·촛불)과 한 몸이다.
  //  - 타이트도 상품명은 카테고리("MZ무당사주")고 캐릭터(범산도령)는 퍼널 안에서 만난다 —
  //    같은 구조로 맞췄다. **산군은 캐릭터로 그대로 살아 있다**(결과지 제목·대사·티저 전부 유지).
  // slug 는 안 바꾼다 — 기존 주문·결과지 링크가 깨진다.
  {
    slug: "sangun-sinjeom",
    name: "박수무당 사주",
    description: "얼굴 없는 박수가 네 운명 장부를 먼저 읽었다 — 타고난 그릇부터 돈 들어오는 달, 인연 오는 달, 인생이 바뀌는 해까지 돌려 말하지 않고 고한다",
    price: 19900,
    // 정가 앵커(2026-08-11) — 경쟁 3사 전부 "정가 인플레 + 큰 할인" 공식을 쓰는데 우리만 없었다.
    // 이 값이 있어야 아래 패키지의 '할인율 역전'(단품 33% vs 패키지 44%)이 성립한다.
    // 기존 구매자가 없는 지금이 정가를 세울 마지막 시점이라 광고 전에 박는다.
    compare_at_price: 29900,
    display_order: 21,
    is_active: true,
  },
  // ─── 패키지(번들) — 결제 시트 업셀. 타이트 실측 공식: 정가 앵커 + 할인율 역전 + '추천' 뱃지 ───
  // 단품 33% ↔ 패키지 44%. 단품만 사면 손해처럼 보이게 만드는 게 이 상품의 일이다.
  // is_addon: 홈·목록에 안 뜬다(전용 랜딩이 없다). 산군 결제 시트에서만 고를 수 있다.
  // 정가 = 구성품 정가 합(29,900 + 17,900 = 47,800). 산수가 화면에서 그대로 검산된다.
  {
    slug: "bundle-sangun-inyeon",
    name: "박수무당 사주 + 인연 들어오는 달",
    description: "네 장부 전체와 인연 장부를 함께 편다 — 박수무당 사주에 '인연 들어오는 달'을 더한 묶음",
    price: 26900,
    compare_at_price: 47800, // 29,900(산군 정가) + 17,900(인연) — 화면에서 검산되는 산수여야 한다
    bundle_slugs: ["sangun-sinjeom", "inyeon-saju"],
    is_addon: true,
    display_order: 23,
    is_active: true,
  },
  {
    slug: "bundle-sangun-wealth",
    name: "박수무당 사주 + 돈 들어오는 달",
    description: "네 장부 전체와 재물 장부를 함께 편다 — 박수무당 사주에 '돈 들어오는 달'을 더한 묶음",
    price: 24900,
    compare_at_price: 44800, // 29,900(산군 정가) + 14,900(재물)
    bundle_slugs: ["sangun-sinjeom", "wealth-saju"],
    is_addon: true,
    display_order: 24,
    is_active: true,
  },
  // ─── 추가질문권 — 결과지를 다 본 자리에서 하나 더 묻는다(운세위키 발명, 무당 컨셉에 네이티브) ───
  // "복채를 더 내고 하나 더 묻는다"라 세계관이 그대로 성립하고, 고민 확답 엔진을 재활용한다.
  // 결제 후 부모 결과지로 돌아가 답변이 붙는다(별도 결과지를 만들지 않는다).
  {
    slug: "extra-question",
    name: "추가 질문 한 가지",
    description: "결과지를 받고 나서 생긴 물음 하나 — 같은 명식으로 그 질문만 정면으로 답해 드립니다",
    price: 5000,
    is_addon: true,
    display_order: 25,
    is_active: true,
  },
  // 고민별 심화 ② 부부·자녀 (연애는 inyeon-saju가 담당 — 카니발 방지로 축소)
  {
    slug: "love-saju",
    name: "부부·자녀 관계 풀이",
    description: "왜 같은 갈등이 반복될까 — 부부 사이와 자녀와의 거리, 우리 가족의 관계 흐름을 깊게 봅니다",
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
  // 2026-07 사다리 복구: 16,900 → 29,900. '끝판왕'이 신점(24,900)보다 싸면 앵커가 무너짐.
  {
    slug: "premium-saju",
    name: "인생 프리미엄 풀이",
    description: "내 인생의 큰 그림 전부 — 재물·직업·관계·건강에 대운 60년 흐름까지, 가장 깊은 종합 풀이",
    price: 29900,
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
  // 오늘의 운세 — 라인업에서 제외(비활성). 되살리려면 is_active: true.
  {
    slug: "today-fortune",
    name: "오늘의 운세 한 줄",
    description: "오늘 무엇을 조심하고 무엇을 잡을까 — 하루 흐름을 한 문장으로",
    price: 4900,
    display_order: 60,
    is_active: false,
  },
];
