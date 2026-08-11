// npx tsx scripts/check-upsell-db.ts
// 0010 업셀 마이그레이션이 적용됐는지, 시드가 들어갔는지 한 번에 점검한다.
// (Claude 는 DDL 을 못 돌린다 — 형님이 Supabase SQL Editor 에서 0010_upsell.sql 을 Run 한 뒤 확인용)

import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* 없으면 다음 것 */
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY 없음");
  process.exit(1);
}
const db = createClient(url, key);

async function check(label: string, fn: () => Promise<{ error: unknown; note?: string }>) {
  const { error, note } = await fn();
  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    console.log(`✗ ${label} — ${msg}`);
    return false;
  }
  console.log(`✓ ${label}${note ? ` — ${note}` : ""}`);
  return true;
}

async function main() {
  console.log("── 0010 마이그레이션 ──");
  await check("products.compare_at_price", async () =>
    await db.from("products").select("compare_at_price").limit(1),
  );
  await check("products.bundle_slugs", async () => await db.from("products").select("bundle_slugs").limit(1));
  await check("products.is_addon", async () => await db.from("products").select("is_addon").limit(1));
  await check("saju_results.product_slug", async () =>
    await db.from("saju_results").select("product_slug").limit(1),
  );
  await check("extra_questions 테이블", async () => await db.from("extra_questions").select("id").limit(1));
  await check("reviews.guest_email", async () => await db.from("reviews").select("guest_email").limit(1));

  console.log("\n── 시드(npm run seed:products) ──");
  const { data: rows, error } = await db
    .from("products")
    .select("slug, name, price, compare_at_price, bundle_slugs, is_addon, is_active")
    .in("slug", ["sangun-sinjeom", "bundle-sangun-inyeon", "bundle-sangun-wealth", "extra-question"]);
  if (error) {
    console.log(`✗ 상품 조회 실패 — ${error.message}`);
    return;
  }
  for (const slug of ["sangun-sinjeom", "bundle-sangun-inyeon", "bundle-sangun-wealth", "extra-question"]) {
    const r = rows?.find((x) => x.slug === slug);
    if (!r) {
      console.log(`✗ ${slug} — 없음(시드 필요)`);
      continue;
    }
    const anchor = r.compare_at_price ? ` 정가 ${r.compare_at_price}` : "";
    const bundle = r.bundle_slugs?.length ? ` [${r.bundle_slugs.join(" + ")}]` : "";
    const addon = r.is_addon ? " (숨김상품)" : "";
    console.log(`✓ ${slug} — ${r.price}원${anchor}${bundle}${addon}${r.is_active ? "" : " ※비활성"}`);
  }

  // 백필 확인 — 기존 결과지에 product_slug 가 비어 있으면 결과지 화면이 슬러그를 못 찾는다.
  const { count, error: cErr } = await db
    .from("saju_results")
    .select("id", { count: "exact", head: true })
    .or("product_slug.is.null,product_slug.eq.");
  if (!cErr) console.log(`\n백필 안 된 결과지: ${count ?? 0}건 (0 이어야 정상)`);
}

main();
