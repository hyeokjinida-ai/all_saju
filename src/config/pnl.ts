// =====================================================
// 손익 계산 상수 — 일별 손익 트래커(/admin/pnl)
// =====================================================
// 근거: `00_사주_원가마진_분석_2026-09-12.md` (실측).
// 여기 값이 손익 표 전체를 결정한다. 바꿀 일이 생기면 **env 로** 바꾼다(재배포만 하면 된다).

/** 환율 — LLM 단가가 달러라서 필요하다. compare-models.ts 와 같은 값을 쓴다. */
export const USD_KRW = Number(process.env.PNL_USD_KRW) || 1400;

// ── 부가세 ────────────────────────────────
// 표시가(19,900)는 **부가세 포함**이다. 세금은 매출의 10% 가 아니라 10/110 = 9.09% 다.
//   general    일반과세자 — 공급가의 10% = 표시가 × 10/110
//   simplified 간이과세자 — 기타 서비스업 부가율 30% × 10% = 공급대가의 약 3%
//   exempt     간이 납부면제(연매출 4,800만 미만) 또는 면세 — 0
// ⚠ 에이치제이의 과세유형은 2026-09-12 기준 **미확인**이다(홈택스 확인 필요).
//   기본값을 general 로 두는 이유: 모르는 동안은 **손익을 낮게 잡는 쪽**이 안전하다.
export type VatMode = "general" | "simplified" | "exempt";
export const VAT_MODE: VatMode = ((): VatMode => {
  const v = (process.env.PNL_VAT_MODE ?? "").trim();
  return v === "simplified" || v === "exempt" ? v : "general";
})();

/** 표시가(부가세 포함) 매출에서 납부할 부가세. */
export function vatOn(grossRevenue: number): number {
  if (VAT_MODE === "exempt") return 0;
  if (VAT_MODE === "simplified") return grossRevenue * 0.03;
  return (grossRevenue * 10) / 110;
}

export const VAT_LABEL: Record<VatMode, string> = {
  general: "일반과세 (10/110)",
  simplified: "간이과세 (약 3%)",
  exempt: "납부면제·면세 (0)",
};

// ── PG 수수료 ────────────────────────────────
// 토스 공시: 신용카드 일반 3.4% / 영세 0.63% (+VAT 10%).
// 계약 요율은 미확인이라 **일반 3.4%+VAT = 3.74%** 를 기본값으로 둔다(높은 쪽 = 안전한 쪽).
// 토스 정산 API 가 실수수료를 주면 그 값이 이 추정을 덮는다(pg_fee_source='toss').
export const PG_RATE = Number(process.env.PNL_PG_RATE) || 0.0374;

// ── LLM 단가 (USD / 1M 토큰) ────────────────────────────────
// compare-models.ts 의 표와 같은 값. 2026-07-30 OpenAI 인하 반영분.
type ModelPrice = { in: number; out: number; cached?: number };
const MODEL_PRICE: Record<string, ModelPrice> = {
  "gpt-5.6-luna": { in: 0.2, out: 1.2, cached: 0.02 },
  "gpt-5.6-terra": { in: 2.0, out: 12.0, cached: 0.2 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "deepseek-v4-pro": { in: 0.435, out: 0.87, cached: 0.003625 },
  "deepseek-v4-flash": { in: 0.1, out: 0.2, cached: 0.001 },
};
const FALLBACK_PRICE: ModelPrice = { in: 0.2, out: 1.2, cached: 0.02 }; // 모르는 모델은 루나로 친다

/** 실토큰 → 원화 원가. 캐시 히트분은 싼 단가로 계산한다. */
export function llmCostKrw(model: string, tokens: { prompt: number; cached: number; completion: number }): number {
  const p = MODEL_PRICE[model] ?? FALLBACK_PRICE;
  const cachedRate = p.cached ?? p.in;
  const fresh = Math.max(0, tokens.prompt - tokens.cached);
  const usd = (fresh * p.in + tokens.cached * cachedRate + tokens.completion * p.out) / 1e6;
  return usd * USD_KRW;
}

// ── 토큰이 없을 때의 상품별 추정 원가(원) ────────────────────────────────
// 토큰 로깅(0013) 이전에 만들어진 결과지용. 2026-09-12 실측 + 장 수 비례 추정.
const LLM_FALLBACK_BY_SLUG: Record<string, number> = {
  "sangun-sinjeom": 70, // 11장, 실측 ₩68~70
  "inyeon-saju": 65, // 10장
  "marriage-saju": 65,
  "wealth-saju": 60,
  "premium-saju": 60,
  "basic-saju": 35,
  "life-saju": 35,
  "monthly-luck": 45,
  "today-fortune": 6,
  "extra-question": 6, // 1장
};
export const LLM_FALLBACK_DEFAULT = 60;

export function llmFallbackKrw(slug: string): number {
  return LLM_FALLBACK_BY_SLUG[slug] ?? LLM_FALLBACK_DEFAULT;
}

// ── 메타 광고 ────────────────────────────────
/** 손익에 넣을 캠페인 — 이름이 이 접두사로 시작하는 것만 사주 광고비로 친다.
 *  같은 광고 계정에서 다른 사업(모렐르·강의) 캠페인을 돌리는 날 숫자가 섞이는 걸 막는다. */
export const META_CAMPAIGN_PREFIX = (process.env.PNL_META_CAMPAIGN_PREFIX ?? "sangun").trim();
export const META_AD_ACCOUNT_ID = (process.env.META_AD_ACCOUNT_ID ?? "986252444049686").trim();
