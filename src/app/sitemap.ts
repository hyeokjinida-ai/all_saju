import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { productsSeed } from "@/config/products.seed";

// 검색 색인용 사이트맵 — 정적 공개 페이지 + 활성 상품 상세 페이지
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  let slugs: string[] = [];
  try {
    if (isSupabaseConfigured()) {
      const supabase = createServiceClient();
      const { data } = await supabase.from("products").select("slug").eq("is_active", true);
      slugs = (data ?? []).map((d) => d.slug);
    } else {
      slugs = productsSeed.filter((p) => p.is_active).map((p) => p.slug);
    }
  } catch {
    slugs = productsSeed.filter((p) => p.is_active).map((p) => p.slug);
  }

  const productRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/products/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
