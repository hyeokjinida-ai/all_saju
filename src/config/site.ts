// =====================================================
// 사이트 메타 / 사업자 정보
// =====================================================
// 운영 전 본인 정보로 반드시 교체하세요. 아래는 모두 더미 데이터입니다.

// PG(전자결제) 심사는 사주 카테고리의 '운명' 표현에 민감하다.
// 심사 동안 true(순화), 통과 후 false 로 바꾸면 원래 '운명' 카피가 그대로 돌아온다.
export const PG_REVIEW_MODE = true;

export const copy = {
  tagline: PG_REVIEW_MODE ? "사주를 기록하다" : "운명을 기록하다",
  heroSubLead: PG_REVIEW_MODE ? "타고난 여덟 글자에," : "별과 운명이 만나는 자리,",
  landingCta: PG_REVIEW_MODE ? "내 사주 보러가기" : "내 운명 보러가기",
};

export const siteConfig = {
  name: "명운록",
  nameHanja: "命運錄",
  tagline: copy.tagline,
  description: "정통 만세력과 AI 해석이 만나, 내 사주의 핵심부터 깊이 있는 인생 종합 풀이까지.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "kwonhyeokjin4@gmail.com",
};

// 통신판매업 / 사업자 정보 — 법적 페이지 및 푸터에 노출됩니다.
// ※ 아래 값은 모두 더미입니다. 운영 전 본인 사업자 정보로 반드시 교체하세요.
export const businessInfo = {
  companyName: "에이치제이",
  representative: "권혁진",
  businessNumber: "271-13-02065",
  mailOrderNumber: "2022-서울마포-2340",
  address: "서울특별시 마포구 희우정로16길 43-5, 303호 (망원동, 하늘드리움)",
  phone: "", // 전화 없음 — 푸터에서 자동 숨김(생기면 "010-..." 넣기)
  phoneNote: "",
  email: "kwonhyeokjin4@gmail.com",
  privacyOfficer: "권혁진",
  // 호스팅 / 주요 처리 위탁 업체 — 개인정보처리방침에 노출
  hostingProvider: "Vercel Inc.",
  // 시행일 — 약관 / 개인정보처리방침 / 환불정책에 공통 노출
  effectiveDate: "2026-01-01",
};
