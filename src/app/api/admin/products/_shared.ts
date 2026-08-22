// 상품 빌더 API 가 공유하는 것 — 마이그레이션 감지 + 폼 → 두 테이블로 가르기.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { ProductForm } from "@/lib/admin-products";

type DB = SupabaseClient<Database>;

/**
 * 0011 이 붙었는지 **한 번 물어본다.**
 *
 * 왜 필요한가: 이 저장소는 로컬 dev 도 운영 Supabase 를 본다. 코드를 먼저 배포하고
 * SQL 을 나중에 붙이는 순간이 반드시 생기는데, 그때 어드민이 500 으로 죽으면 안 된다.
 * 컬럼이 없으면 빌더는 "기본 항목만" 저장하고 화면이 안내를 띄운다.
 */
export async function hasBuilderColumns(db: DB): Promise<boolean> {
  const { error } = await db.from("products").select("category").limit(1);
  return !error;
}

/** 폼 한 덩어리를 products 행 / product_styles.style 로 가른다 */
export function splitForm(f: ProductForm, ready: boolean) {
  const base = {
    slug: f.slug,
    name: f.name,
    description: f.description,
    price: f.price,
    compare_at_price: f.compare_at_price ?? null,
    display_order: f.display_order,
    is_active: f.is_active,
    is_addon: f.is_addon,
    bundle_slugs: f.bundle_slugs?.length ? f.bundle_slugs : null,
  };

  if (!ready) return { row: base, style: null as Json | null };

  return {
    row: {
      ...base,
      category: f.category || null,
      character_name: f.character_name || null,
      card_title: f.card_title || null,
      tagline: f.tagline || null,
      hero_rank: f.hero_rank ?? null,
      art: (f.art ?? {}) as Json,
      pitch: (f.pitch ?? null) as Json | null,
      updated_at: new Date().toISOString(),
    },
    style: (f.style ?? null) as Json | null,
  };
}
