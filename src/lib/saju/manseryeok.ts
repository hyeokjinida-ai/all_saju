// =====================================================
// 명식 타입
// =====================================================
// 실제 명식 계산은 saju-api(luckyloveme) → ganjiToMyeongsik 로 처리한다.
// 여기엔 결과지 전반에서 공유하는 명식 타입만 둔다.

export type Pillar = {
  cheongan: string; // 천간
  jiji: string; // 지지
};

export type Myeongsik = {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null; // 시 모르는 경우 null
};
