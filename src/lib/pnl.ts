// =====================================================
// 일별 손익 집계 — /admin/pnl 과 스냅샷 크론이 함께 쓴다
// =====================================================
// 사실(매출·결과지·토큰·만세력 호출)은 여기서 DB 로부터 **매번 다시 계산**한다.
// daily_pnl 테이블에는 밖에서 온 것(광고비·PG 실수수료)과 스냅샷만 둔다.
//
// 왜 파생값을 저장하지 않나: 과세유형(PNL_VAT_MODE)·PG 요율이 확정되면 지난 날짜까지
// 전부 다시 계산돼야 한다. 저장해 두면 그날 백필을 또 돌려야 하고, 백필을 잊으면
// 화면이 조용히 틀린 숫자를 보여준다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PG_RATE, VAT_MODE, llmCostKrw, llmFallbackKrw, vatOn } from "@/config/pnl";

// ── KST 날짜 유틸 ────────────────────────────────
// 한국은 서머타임이 없어 UTC+9 고정이다. KST 하루 D = UTC [D-1 15:00, D 15:00).
const KST_OFFSET_MS = 9 * 3600_000;

export function kstDayOf(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(t.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function kstToday(): string {
  return kstDayOf(new Date());
}

/** KST 날짜 하루의 UTC 경계. end 는 미포함(exclusive). */
export function kstDayBounds(day: string): { startUtc: string; endUtc: string } {
  const start = new Date(`${day}T00:00:00.000Z`).getTime() - KST_OFFSET_MS;
  return {
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(start + 86_400_000).toISOString(),
  };
}

/** from~to(KST, 양끝 포함) 날짜 목록. 최신이 앞. */
export function kstDayList(from: string, to: string): string[] {
  const out: string[] = [];
  let t = new Date(`${to}T00:00:00.000Z`).getTime();
  const min = new Date(`${from}T00:00:00.000Z`).getTime();
  while (t >= min) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t -= 86_400_000;
  }
  return out;
}

export function kstDaysAgo(n: number): string {
  return kstDayOf(new Date(Date.now() - n * 86_400_000));
}

// ── 타입 ────────────────────────────────
/** DB 에서 매번 다시 계산하는 사실들. */
export type DayFacts = {
  day: string;
  ordersCount: number;
  revenue: number;
  refundCount: number;
  refundAmount: number;
  resultsCount: number;
  llmCost: number;
  llmCostEstimated: boolean;
  manseryeokCalls: number;
};

/** daily_pnl 에 저장된, 밖에서 온 값들. */
export type DaySnapshot = {
  day: string;
  adSpend: number | null;
  adSpendSource: string | null;
  adSpendManual: number | null;
  adSpendOther: number | null;
  metaPurchases: number | null;
  pgFee: number | null;
  pgFeeSource: string | null;
  note: string | null;
};

export type PnlRow = DayFacts & {
  /** 실제로 쓸 광고비. null 이면 **미수신**이다 — 0 이 아니다. */
  adSpend: number | null;
  adSpendSource: "meta" | "manual" | null;
  adSpendOther: number | null;
  metaPurchases: number | null;
  pgFee: number;
  pgFeeEstimated: boolean;
  vat: number;
  netRevenue: number; // 매출 − 환불
  /** 순손익. 광고비를 못 받은 날은 null — 모르는 걸 흑자로 보이게 하지 않는다. */
  net: number | null;
  roas: number | null;
  cpa: number | null;
  aov: number | null;
};

// ── 집계 ────────────────────────────────
type OrderRow = {
  amount: number;
  paid_at: string | null;
  created_at: string;
  product_id: string;
  refunded_amount?: number | null;
  refunded_at?: string | null;
  exclude_from_pnl?: boolean | null;
};

/**
 * orders 를 읽는다. 0013 미적용이면 새 컬럼 없이 폴백한다 —
 * 마이그레이션 전에도 화면이 뜨게(숫자는 환불·제외 반영만 빠진다).
 */
async function readOrders(service: SupabaseClient, startUtc: string, endUtcExclusive: string) {
  const cols = "amount, paid_at, created_at, product_id, refunded_amount, refunded_at, exclude_from_pnl";
  const base = () =>
    service.from("orders").select(cols).eq("status", "paid").gte("created_at", startUtc).lt("created_at", endUtcExclusive);
  const full = await base();
  if (!full.error) return { rows: (full.data ?? []) as unknown as OrderRow[], hasPnlCols: true };
  const fallback = await service
    .from("orders")
    .select("amount, paid_at, created_at, product_id")
    .eq("status", "paid")
    .gte("created_at", startUtc)
    .lt("created_at", endUtcExclusive);
  return { rows: (fallback.data ?? []) as unknown as OrderRow[], hasPnlCols: false };
}

type ResultRow = {
  created_at: string;
  product_slug: string;
  llm_model: string | null;
  prompt_tokens?: number | null;
  cached_tokens?: number | null;
  completion_tokens?: number | null;
};

async function readResults(service: SupabaseClient, startUtc: string, endUtcExclusive: string) {
  const cols = "created_at, product_slug, llm_model, prompt_tokens, cached_tokens, completion_tokens";
  const full = await service
    .from("saju_results")
    .select(cols)
    .gte("created_at", startUtc)
    .lt("created_at", endUtcExclusive);
  if (!full.error) return (full.data ?? []) as unknown as ResultRow[];
  const fallback = await service
    .from("saju_results")
    .select("created_at, product_slug, llm_model")
    .gte("created_at", startUtc)
    .lt("created_at", endUtcExclusive);
  return (fallback.data ?? []) as unknown as ResultRow[];
}

/**
 * from~to(KST) 구간의 사실을 날짜별로 모은다.
 *
 * ⚠ 주문은 `created_at` 으로 읽고 `paid_at ?? created_at` 으로 날짜를 가른다.
 *   결제는 보통 생성 직후라 두 값이 같은 날이지만, 가상계좌는 며칠 뒤 입금된다 —
 *   그런 건은 **입금된 날**의 매출이다.
 */
export async function collectFacts(service: SupabaseClient, from: string, to: string): Promise<Map<string, DayFacts>> {
  const startUtc = kstDayBounds(from).startUtc;
  const endUtc = kstDayBounds(to).endUtc;
  // 가상계좌 입금 지연을 감안해 조회 창을 앞뒤로 3일 넓힌다(날짜 배정은 아래에서 다시 한다).
  const wideStart = new Date(new Date(startUtc).getTime() - 3 * 86_400_000).toISOString();

  const [{ rows: orders }, results, apiCalls, products] = await Promise.all([
    readOrders(service, wideStart, endUtc),
    readResults(service, startUtc, endUtc),
    service.from("saju_api_calls").select("called_at").gte("called_at", startUtc).lt("called_at", endUtc),
    service.from("products").select("id, slug"),
  ]);

  const slugById = new Map(((products.data ?? []) as { id: string; slug: string }[]).map((p) => [p.id, p.slug]));
  const days = new Map<string, DayFacts>();
  const blank = (day: string): DayFacts => ({
    day,
    ordersCount: 0,
    revenue: 0,
    refundCount: 0,
    refundAmount: 0,
    resultsCount: 0,
    llmCost: 0,
    llmCostEstimated: false,
    manseryeokCalls: 0,
  });
  const get = (day: string) => {
    let d = days.get(day);
    if (!d) days.set(day, (d = blank(day)));
    return d;
  };
  for (const day of kstDayList(from, to)) get(day);

  for (const o of orders) {
    if (o.exclude_from_pnl) continue; // 형님 테스트 결제 등
    const day = kstDayOf(o.paid_at ?? o.created_at);
    const d = days.get(day);
    if (d) {
      d.ordersCount += 1;
      d.revenue += o.amount;
    }
    const refunded = o.refunded_amount ?? 0;
    if (refunded > 0 && o.refunded_at) {
      const rDay = days.get(kstDayOf(o.refunded_at));
      if (rDay) {
        rDay.refundCount += 1;
        rDay.refundAmount += refunded;
      }
    }
  }

  for (const r of results) {
    const d = days.get(kstDayOf(r.created_at));
    if (!d) continue;
    d.resultsCount += 1;
    const prompt = r.prompt_tokens ?? 0;
    const completion = r.completion_tokens ?? 0;
    if (prompt > 0 || completion > 0) {
      d.llmCost += llmCostKrw(r.llm_model ?? "", {
        prompt,
        cached: r.cached_tokens ?? 0,
        completion,
      });
    } else {
      // 토큰 로깅(0013) 이전 데이터 — 상품별 상수로 추정한다.
      d.llmCost += llmFallbackKrw(r.product_slug ?? "");
      d.llmCostEstimated = true;
    }
  }

  for (const c of (apiCalls.data ?? []) as { called_at: string }[]) {
    const d = days.get(kstDayOf(c.called_at));
    if (d) d.manseryeokCalls += 1;
  }

  void slugById; // 상품 슬러그는 현재 결과지 행에 이미 있다(향후 상품별 분해용으로 남겨 둠)
  return days;
}

/**
 * 0013 이 운영에 적용됐는지. 적용 전이면 광고비를 저장해도 조용히 사라지므로,
 * 화면이 그 사실을 **먼저** 말해야 한다(저장 버튼을 눌렀는데 아무 일도 안 일어나는 게 최악이다).
 */
export async function isPnlSchemaReady(service: SupabaseClient): Promise<boolean> {
  const { error } = await service.from("daily_pnl").select("day").limit(1);
  return !error;
}

/** daily_pnl 에서 밖에서 온 값(광고비·PG)을 읽는다. 테이블이 없으면 빈 맵. */
export async function loadSnapshots(service: SupabaseClient, from: string, to: string): Promise<Map<string, DaySnapshot>> {
  const { data, error } = await service.from("daily_pnl").select("*").gte("day", from).lte("day", to);
  const out = new Map<string, DaySnapshot>();
  if (error) return out;
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    out.set(r.day as string, {
      day: r.day as string,
      adSpend: r.ad_spend === null || r.ad_spend === undefined ? null : Number(r.ad_spend),
      adSpendSource: (r.ad_spend_source as string) ?? null,
      adSpendManual: r.ad_spend_manual === null || r.ad_spend_manual === undefined ? null : Number(r.ad_spend_manual),
      adSpendOther: r.ad_spend_other === null || r.ad_spend_other === undefined ? null : Number(r.ad_spend_other),
      metaPurchases: r.meta_purchases === null || r.meta_purchases === undefined ? null : Number(r.meta_purchases),
      pgFee: r.pg_fee === null || r.pg_fee === undefined ? null : Number(r.pg_fee),
      pgFeeSource: (r.pg_fee_source as string) ?? null,
      note: (r.note as string) ?? null,
    });
  }
  return out;
}

/** 사실 + 스냅샷 → 화면에 뿌릴 한 줄. 파생값은 전부 여기서 계산한다. */
export function computeRow(facts: DayFacts, snap: DaySnapshot | undefined): PnlRow {
  // 손으로 넣은 값이 자동 수신분을 이긴다 — 형님이 고쳐 넣었다면 그게 맞는 값이다.
  const manual = snap?.adSpendManual ?? null;
  const auto = snap?.adSpend ?? null;
  const adSpend = manual !== null ? manual : auto;
  const adSpendSource: "meta" | "manual" | null =
    manual !== null ? "manual" : auto !== null ? ((snap?.adSpendSource as "meta") ?? "meta") : null;

  const netRevenue = facts.revenue - facts.refundAmount;
  const pgFeeReal = snap?.pgFee ?? null;
  const pgFee = pgFeeReal ?? netRevenue * PG_RATE;
  const vat = vatOn(netRevenue);

  // 광고비를 못 받은 날은 순손익을 만들지 않는다(계획서 §0-B ①).
  const net = adSpend === null ? null : netRevenue - adSpend - facts.llmCost - pgFee - vat;

  return {
    ...facts,
    adSpend,
    adSpendSource,
    adSpendOther: snap?.adSpendOther ?? null,
    metaPurchases: snap?.metaPurchases ?? null,
    pgFee,
    pgFeeEstimated: pgFeeReal === null,
    vat,
    netRevenue,
    net,
    roas: adSpend && adSpend > 0 ? netRevenue / adSpend : null,
    cpa: adSpend !== null && facts.ordersCount > 0 ? adSpend / facts.ordersCount : null,
    aov: facts.ordersCount > 0 ? netRevenue / facts.ordersCount : null,
  };
}

/** 구간 전체를 한 번에. 최신 날짜가 앞. */
export async function buildPnlRows(service: SupabaseClient, from: string, to: string): Promise<PnlRow[]> {
  const [facts, snaps] = await Promise.all([collectFacts(service, from, to), loadSnapshots(service, from, to)]);
  return kstDayList(from, to).map((day) => {
    const f = facts.get(day)!;
    return computeRow(f, snaps.get(day));
  });
}

/** 여러 날을 합친 누적 줄. 광고비는 **받은 날만** 더하고, 하루라도 빠지면 순손익을 비운다. */
export function totalRow(rows: PnlRow[]): PnlRow & { adSpendMissingDays: number } {
  const sum = (f: (r: PnlRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  const withAd = rows.filter((r) => r.adSpend !== null);
  const missing = rows.filter((r) => r.adSpend === null && (r.ordersCount > 0 || r.resultsCount > 0)).length;
  const adSpend = withAd.length ? withAd.reduce((a, r) => a + (r.adSpend ?? 0), 0) : null;
  const revenue = sum((r) => r.revenue);
  const refundAmount = sum((r) => r.refundAmount);
  const netRevenue = revenue - refundAmount;
  const llmCost = sum((r) => r.llmCost);
  const pgFee = sum((r) => r.pgFee);
  const vat = sum((r) => r.vat);
  const ordersCount = sum((r) => r.ordersCount);
  return {
    day: "합계",
    ordersCount,
    revenue,
    refundCount: sum((r) => r.refundCount),
    refundAmount,
    resultsCount: sum((r) => r.resultsCount),
    llmCost,
    llmCostEstimated: rows.some((r) => r.llmCostEstimated),
    manseryeokCalls: sum((r) => r.manseryeokCalls),
    adSpend,
    adSpendSource: null,
    adSpendOther: null,
    metaPurchases: rows.some((r) => r.metaPurchases !== null) ? sum((r) => r.metaPurchases ?? 0) : null,
    pgFee,
    pgFeeEstimated: rows.some((r) => r.pgFeeEstimated),
    vat,
    netRevenue,
    net: adSpend === null || missing > 0 ? null : netRevenue - adSpend - llmCost - pgFee - vat,
    roas: adSpend && adSpend > 0 ? netRevenue / adSpend : null,
    cpa: adSpend !== null && ordersCount > 0 ? adSpend / ordersCount : null,
    aov: ordersCount > 0 ? netRevenue / ordersCount : null,
    adSpendMissingDays: missing,
  };
}

/** 크론이 쓰는 저장 — 사실만 upsert 한다. 광고비·PG 칸은 건드리지 않는다(밖에서 오는 값). */
export async function snapshotFacts(service: SupabaseClient, from: string, to: string): Promise<number> {
  const facts = await collectFacts(service, from, to);
  const rows = [...facts.values()].map((f) => ({
    day: f.day,
    orders_count: f.ordersCount,
    revenue: f.revenue,
    refund_count: f.refundCount,
    refund_amount: f.refundAmount,
    results_count: f.resultsCount,
    llm_cost: Number(f.llmCost.toFixed(2)),
    llm_cost_estimated: f.llmCostEstimated,
    manseryeok_calls: f.manseryeokCalls,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return 0;
  const { error } = await service.from("daily_pnl").upsert(rows, { onConflict: "day" });
  if (error) throw new Error(`daily_pnl upsert 실패: ${error.message}`);
  return rows.length;
}

export const PNL_CONSTANTS = { VAT_MODE, PG_RATE };
