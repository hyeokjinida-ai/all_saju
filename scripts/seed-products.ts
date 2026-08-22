// pnpm seed:products            — 없는 상품만 새로 넣는다(기본)
// pnpm seed:products --force     — 코드 표로 **전부 덮어쓴다**
//
// ⚠ 기본이 insert-only 인 이유: 상품 빌더(/admin/products)가 생기면서 가격·이름·카드 글자를
//    어드민에서 고치게 됐다. 예전처럼 upsert 로 돌면 그 손질이 코드 표 값으로 **조용히
//    되돌아간다** — 그리고 되돌아간 걸 아무도 모른다(다음 결제에서야 가격으로 드러난다).
//    코드 표를 진짜로 밀어 넣어야 할 때만 --force.
//
// src/config/products.seed.ts 의 내용을 DB에 넣습니다.
// .env.local 또는 .env 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 필요.

import { createClient } from "@supabase/supabase-js";
import { productsSeed } from "../src/config/products.seed";

// tsx 는 .env 를 자동으로 안 읽는다 — 없으면 "키가 없습니다"로 죽는다(다른 스크립트와 동일 처리).
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("✗ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 없습니다.");
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const force = process.argv.includes("--force");

  const { data: existing } = await supabase.from("products").select("slug");
  const have = new Set((existing ?? []).map((r) => r.slug as string));

  console.log(force ? "모드: --force (코드 표로 덮어씀)" : "모드: 없는 상품만 추가 (어드민 손질 보존)");

  for (const p of productsSeed) {
    if (!force && have.has(p.slug)) {
      console.log(`· ${p.slug} — 이미 있음, 건너뜀`);
      continue;
    }
    const { error } = force
      ? await supabase.from("products").upsert(p, { onConflict: "slug" })
      : await supabase.from("products").insert(p);
    if (error) {
      console.error(`✗ ${p.slug}: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ ${p.slug}`);
    }
  }
}

main();
