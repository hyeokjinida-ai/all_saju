// 홈이 읽는 데이터 — 상품 목록 + 실후기.
//
// ⚠ 서버 전용. 두 가지 이유로 **service 키**를 쓴다:
//   1) 후기에 붙일 이름이 profiles 에 있는데 profiles RLS 는 "본인만 select" 다.
//      anon 클라이언트로 join 하면 조용히 0건이 나온다(빈 화면의 원인이 되기 딱 좋다).
//   2) 상품은 public read 라 anon 으로도 되지만, 같은 요청에서 두 클라이언트를 쓸 이유가 없다.
//
// ⚠ 컬럼은 **지금 DB에 있는 것만** 읽는다. 상품 빌더(0011)가 추가할 컬럼은
//    getHomeMeta() 가 따로, 실패하면 조용히 비는 방식으로 읽는다 —
//    마이그레이션 전 배포에서도 홈이 살아 있어야 하기 때문이다.
//    (같은 함정을 상품 상세가 이미 밟아서 select 를 쪼개 놨다: products/[slug]/page.tsx)
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";
import { CATEGORY_FALLBACK, type RowKey } from "@/config/home";

export type HomeProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: RowKey | null;
  /** 빌더가 채우는 값들 — 지금은 전부 null 이고 config/home.ts 폴백이 대신한다 */
  heroRank: number | null;
  characterName: string | null;
  cardTitle: string | null;
  tagline: string | null;
  art: { hero?: string; big?: string; row?: string } | null;
};

export type HomeReview = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  who: string;
  productName: string;
};

/** 0011 이 붙기 전에도 홈이 뜨게 — 새 컬럼은 별도 쿼리로 읽고 실패하면 빈 맵 */
type Meta = Map<string, Partial<HomeProduct>>;

async function getHomeMeta(ids: string[]): Promise<Meta> {
  const empty: Meta = new Map();
  if (!ids.length) return empty;
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("products")
      // 0011 이 아직 안 붙었으면 PostgREST 가 "column does not exist" 로 떨어진다 →
      // 아래 error 분기에서 빈 맵을 돌려주고 홈은 config 폴백으로 정상 렌더된다.
      .select("id, category, character_name, card_title, tagline, hero_rank, art")
      .in("id", ids);
    if (error || !data) return empty;
    const m: Meta = new Map();
    for (const r of data as unknown as Record<string, unknown>[]) {
      m.set(String(r.id), {
        category: (r.category as RowKey | null) ?? null,
        characterName: (r.character_name as string | null) ?? null,
        cardTitle: (r.card_title as string | null) ?? null,
        tagline: (r.tagline as string | null) ?? null,
        heroRank: (r.hero_rank as number | null) ?? null,
        art: (r.art as HomeProduct["art"]) ?? null,
      });
    }
    return m;
  } catch {
    return empty;
  }
}

export async function getHomeProducts(): Promise<HomeProduct[]> {
  const shape = (p: {
    id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
  }): HomeProduct => ({
    ...p,
    category: CATEGORY_FALLBACK[p.slug] ?? null,
    heroRank: null,
    characterName: null,
    cardTitle: null,
    tagline: null,
    art: null,
  });

  if (!isSupabaseConfigured()) {
    return productsSeed
      .filter((p) => p.is_active && !p.is_addon)
      .sort((a, b) => a.display_order - b.display_order)
      .map((p) => shape({ id: p.slug, slug: p.slug, name: p.name, description: p.description, price: p.price }));
  }

  const db = createServiceClient();
  const { data } = await db
    .from("products")
    .select("id, slug, name, description, price")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  let rows = (data ?? []).map(shape);

  // 번들·추가질문권은 홈에 세우지 않는다(전용 랜딩이 없다). 0010 전이면 이 쿼리가 실패 →
  // 그때는 거르지 않고 그냥 둔다(빈 홈보다 낫다).
  try {
    const { data: addons } = await db.from("products").select("id, is_addon").eq("is_addon", true);
    if (addons?.length) {
      const skip = new Set(addons.map((a) => a.id as string));
      rows = rows.filter((r) => !skip.has(r.id));
    }
  } catch {
    /* 0010 미적용 — 거르지 않는다 */
  }

  const meta = await getHomeMeta(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, ...(meta.get(r.id) ?? {}) }));
}

/** 실후기만. 3건 미만이면 홈이 섹션 자체를 안 그린다(샘플 후기 노출 금지 원칙). */
export async function getHomeReviews(): Promise<HomeReview[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const db = createServiceClient();
    const { data } = await db
      .from("reviews")
      .select("id, rating, content, created_at, user_id, product_id")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data?.length) return [];

    const productIds = [...new Set(data.map((r) => r.product_id as string))];
    const userIds = [...new Set(data.map((r) => r.user_id as string).filter(Boolean))];

    const [{ data: products }, { data: profiles }] = await Promise.all([
      db.from("products").select("id, name").in("id", productIds),
      userIds.length
        ? db.from("profiles").select("id, display_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; email: string }[] }),
    ]);

    const nameById = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));
    const whoById = new Map(
      (profiles ?? []).map((p) => {
        const raw = (p.display_name as string | null) || (p.email as string).split("@")[0];
        return [p.id as string, mask(raw)];
      }),
    );

    return data.map((r) => ({
      id: r.id as string,
      rating: r.rating as number,
      content: r.content as string,
      createdAt: r.created_at as string,
      who: whoById.get(r.user_id as string) ?? "손님",
      productName: nameById.get(r.product_id as string) ?? "",
    }));
  } catch {
    return [];
  }
}

/** 김지현 → 김○○ · s3abc → s3**** (이름이 없으면 아이디 앞 2자만) */
function mask(raw: string): string {
  const s = raw.trim();
  if (!s) return "손님";
  if (/^[가-힣]{2,4}$/.test(s)) return s[0] + "○".repeat(s.length - 1);
  return s.slice(0, 2) + "****";
}
