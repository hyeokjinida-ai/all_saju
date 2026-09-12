// 광고비를 손익 표에 넣는다 — 메타 토큰이 없는 동안의 정식 경로.
//
//   npx tsx scripts/pnl-set-adspend.ts <YYYY-MM-DD> <지출> [메타구매수]
//   npx tsx scripts/pnl-set-adspend.ts 2026-09-12 44646 2
//   npx tsx scripts/pnl-set-adspend.ts --show          (최근 7일 확인만)
//
// 날짜는 **KST 기준**이다. 광고 계정이 Asia/Seoul 이라 광고관리자에 보이는 날짜가 곧 이 날짜다
// (2026-09-12 실측 — src/lib/meta-ads.ts 주석 참고).
//
// ⚠ 모르는 날은 **넣지 말 것.** 0 을 넣으면 그날이 흑자로 보인다. 비워 두면 화면이
//    「미수신」으로 붉게 표시하고 순손익을 「미확정」으로 남긴다 — 그게 맞는 동작이다.

import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* 없으면 다음 것 */
  }
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 없음");
    process.exit(1);
  }
  return createClient(url, key);
}

async function show() {
  const { data, error } = await db()
    .from("daily_pnl")
    .select("day, revenue, orders_count, ad_spend, ad_spend_source, meta_purchases")
    .order("day", { ascending: false })
    .limit(7);
  if (error) {
    console.error("✗", error.message);
    process.exit(1);
  }
  console.log("날짜         매출      건수  광고비     출처    메타구매");
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const spend = r.ad_spend == null ? "미수신" : Number(r.ad_spend).toLocaleString();
    console.log(
      `${r.day}  ${String(r.revenue ?? 0).padStart(8)}  ${String(r.orders_count ?? 0).padStart(3)}  ${spend.padStart(8)}  ${String(r.ad_spend_source ?? "-").padEnd(7)} ${r.meta_purchases ?? "-"}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--show" || args.length === 0) return show();

  const [day, spendRaw, purchasesRaw] = args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    console.error("✗ 날짜는 YYYY-MM-DD (KST)");
    process.exit(1);
  }
  const spend = Number(String(spendRaw).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(spend) || spend < 0) {
    console.error("✗ 지출이 숫자가 아니다");
    process.exit(1);
  }
  const purchases = purchasesRaw == null ? null : Number(purchasesRaw);

  const { error } = await db()
    .from("daily_pnl")
    .upsert(
      {
        day,
        ad_spend: spend,
        ad_spend_source: "meta",
        ...(purchases != null && Number.isFinite(purchases) ? { meta_purchases: purchases } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "day" },
    );
  if (error) {
    console.error("✗ 저장 실패:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${day} 광고비 ${spend.toLocaleString()}원${purchases != null ? ` · 메타구매 ${purchases}` : ""}`);
  await show();
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});

export {};
