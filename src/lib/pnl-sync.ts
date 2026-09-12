// =====================================================
// 밖에서 오는 값 받아오기 — 광고비 · PG 실수수료 · 환불
// =====================================================
// 크론(그리고 어드민의 「지금 받아오기」)이 부른다. 집계(pnl.ts)는 DB 안의 사실만 다루고,
// 밖에서 오는 셋은 여기서만 건드린다.
//
// 원칙: **못 받으면 아무것도 쓰지 않는다.** 0 으로 덮으면 그날 손익이 거짓말을 한다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDailyAdSpend, isMetaAdsConfigured } from "@/lib/meta-ads";
import { fetchPaymentCancels, fetchSettlementFees, isTossLive } from "@/lib/toss-settlement";
import { kstDayBounds } from "@/lib/pnl";

export type SyncReport = {
  adSpend: "ok" | "no_token" | "failed";
  adSpendDays: number;
  pgFee: "ok" | "not_live" | "failed";
  pgFeeDays: number;
  refunds: "ok" | "not_live" | "failed";
  refundsFound: number;
};

/** 광고비 — 메타에서 받아 daily_pnl 에 적는다. 손으로 넣은 값(ad_spend_manual)은 건드리지 않는다. */
async function syncAdSpend(service: SupabaseClient, from: string, to: string): Promise<[SyncReport["adSpend"], number]> {
  if (!isMetaAdsConfigured()) return ["no_token", 0];
  const byDay = await fetchDailyAdSpend(from, to);
  if (!byDay) return ["failed", 0];

  const rows = [...byDay.entries()].map(([day, v]) => ({
    day,
    ad_spend: Number(v.spend.toFixed(2)),
    ad_spend_source: "meta",
    ad_spend_other: v.otherSpend > 0 ? Number(v.otherSpend.toFixed(2)) : null,
    meta_purchases: v.purchases,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return ["ok", 0];
  const { error } = await service.from("daily_pnl").upsert(rows, { onConflict: "day" });
  return error ? ["failed", 0] : ["ok", rows.length];
}

/** PG 실수수료 — 정산이 끝난 날만 채워진다. 안 온 날은 화면이 요율 추정을 계속 쓴다. */
async function syncPgFees(service: SupabaseClient, from: string, to: string): Promise<[SyncReport["pgFee"], number]> {
  if (!isTossLive()) return ["not_live", 0];
  const fees = await fetchSettlementFees(from, to);
  if (!fees) return ["failed", 0];
  const rows = [...fees.entries()].map(([day, fee]) => ({
    day,
    pg_fee: Number(fee.toFixed(2)),
    pg_fee_source: "toss",
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return ["ok", 0];
  const { error } = await service.from("daily_pnl").upsert(rows, { onConflict: "day" });
  return error ? ["failed", 0] : ["ok", rows.length];
}

/**
 * 환불 — 최근 주문의 결제 취소 내역을 확인해 orders 에 적는다.
 * 정산(D+n)보다 빠르다. 환불이 난 **그날**의 매출에서 빠진다.
 */
async function syncRefunds(service: SupabaseClient, from: string, to: string): Promise<[SyncReport["refunds"], number]> {
  if (!isTossLive()) return ["not_live", 0];
  // 환불은 결제일보다 한참 뒤에도 난다 — 조회 창을 넉넉히 앞으로 연다.
  const since = new Date(new Date(kstDayBounds(from).startUtc).getTime() - 30 * 86_400_000).toISOString();
  const { data, error } = await service
    .from("orders")
    .select("id, toss_payment_key, refunded_amount")
    .eq("status", "paid")
    .gte("created_at", since)
    .lte("created_at", kstDayBounds(to).endUtc)
    .limit(500);
  if (error) return ["failed", 0];

  let found = 0;
  for (const o of (data ?? []) as { id: string; toss_payment_key: string | null; refunded_amount?: number }[]) {
    if (!o.toss_payment_key) continue;
    const cancel = await fetchPaymentCancels(o.toss_payment_key);
    if (!cancel) continue;
    if ((o.refunded_amount ?? 0) === cancel.amount) continue; // 이미 반영됨
    const { error: upErr } = await service
      .from("orders")
      .update({ refunded_amount: cancel.amount, refunded_at: cancel.at })
      .eq("id", o.id);
    if (!upErr) found += 1;
  }
  return ["ok", found];
}

/** 셋을 한 번에. 하나가 실패해도 나머지는 진행한다. */
export async function syncExternal(service: SupabaseClient, from: string, to: string): Promise<SyncReport> {
  const [ad, pg, rf] = await Promise.all([
    syncAdSpend(service, from, to).catch((): [SyncReport["adSpend"], number] => ["failed", 0]),
    syncPgFees(service, from, to).catch((): [SyncReport["pgFee"], number] => ["failed", 0]),
    syncRefunds(service, from, to).catch((): [SyncReport["refunds"], number] => ["failed", 0]),
  ]);
  return {
    adSpend: ad[0],
    adSpendDays: ad[1],
    pgFee: pg[0],
    pgFeeDays: pg[1],
    refunds: rf[0],
    refundsFound: rf[1],
  };
}

