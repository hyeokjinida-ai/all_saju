import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SajuWizard, type Tier } from "@/components/saju/SajuWizard";
import { formatKRW, formatDate } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";

type Product = { id: string; slug: string; name: string; description: string; price: number };
type Review = { id: string; rating: number; content: string; created_at: string };

// 메인 퍼널 티어 (기본 풀이 → 인생 종합 풀이 업셀). 결제 직전 선택지로 노출.
const FUNNEL_TIER_SLUGS = ["basic-saju", "premium-saju"];

function buildTiers(rows: { id: string; slug: string; name: string; price: number }[]): Tier[] {
  return FUNNEL_TIER_SLUGS.map((s) => rows.find((r) => r.slug === s))
    .filter((r): r is { id: string; slug: string; name: string; price: number } => !!r)
    .map((r) => ({ productId: r.id, slug: r.slug, name: r.name, price: r.price }));
}

// 상품별 SEO 메타데이터 — 검색/공유 시 상품명·설명이 그대로 노출되게(기존엔 전부 "명운록")
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let p: { name: string; description: string } | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("name, description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    p = data;
  } else {
    const s = productsSeed.find((x) => x.slug === slug && x.is_active);
    p = s ? { name: s.name, description: s.description } : null;
  }
  if (!p) return { title: "상품" };
  return {
    title: p.name,
    description: p.description,
    openGraph: {
      title: `${p.name} | ${siteConfig.name}`,
      description: p.description,
      type: "website",
      locale: "ko_KR",
    },
    twitter: { card: "summary_large_image", title: p.name, description: p.description },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product: Product | null;
  let reviews: Review[] | null = null;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let tiers: Tier[] | undefined;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("id, slug, name, description, price")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    product = data;

    if (product) {
      const { data: r } = await supabase
        .from("reviews")
        .select("id, rating, content, created_at")
        .eq("product_id", product.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);
      reviews = r;

      if (FUNNEL_TIER_SLUGS.includes(slug)) {
        const { data: tp } = await supabase
          .from("products")
          .select("id, slug, name, price")
          .in("slug", FUNNEL_TIER_SLUGS)
          .eq("is_active", true);
        tiers = buildTiers(tp ?? []);
      }
    }
    user = await getCurrentUser();
  } else {
    const seed = productsSeed.find((p) => p.slug === slug && p.is_active);
    product = seed ? { id: seed.slug, ...seed } : null;

    if (product && FUNNEL_TIER_SLUGS.includes(slug)) {
      const tp = productsSeed
        .filter((p) => FUNNEL_TIER_SLUGS.includes(p.slug) && p.is_active)
        .map((p) => ({ id: p.slug, slug: p.slug, name: p.name, price: p.price }));
      tiers = buildTiers(tp);
    }
  }

  if (!product) notFound();

  const isFreeEntry = product.slug === "basic-saju";

  return (
    <div className="container py-12 max-w-2xl">
      {/* 검색 리치스니펫용 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            brand: { "@type": "Brand", name: siteConfig.name },
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "KRW",
              availability: "https://schema.org/InStock",
              url: `${siteConfig.url}/products/${product.slug}`,
            },
          }),
        }}
      />
      <header className="mb-10">
        <p className="text-xs font-mono text-gold-soft/70 mb-3 tracking-[0.2em]">命 / {product.slug}</p>
        {isFreeEntry ? (
          <>
            <h1 className="font-myeongjo text-3xl font-semibold tracking-[0.04em] text-bone">
              무료로 내 명식 확인하기
            </h1>
            <p className="mt-3 text-sm text-bone-soft leading-relaxed">
              생년월일만 입력하면 내 사주 여덟 글자와 오행 균형, 올해 흐름을 무료로 보여드려요.
              더 자세한 풀이는 결과를 확인한 뒤 선택하실 수 있습니다.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-myeongjo text-3xl font-semibold tracking-[0.04em] text-bone">{product.name}</h1>
            <p className="mt-3 text-sm text-bone-soft leading-relaxed">{product.description}</p>
            <p className="mt-6 text-2xl font-mono font-medium text-gold">{formatKRW(product.price)}</p>
          </>
        )}
        <div className="gold-rule mt-6" />
      </header>

      <section>
        <h2 className="font-myeongjo text-base font-semibold mb-2 text-gold-bright">사주 정보 입력</h2>
        <p className="text-xs text-body mb-4">한 번에 하나씩, 차근차근 입력해 주세요.</p>
        <SajuWizard
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          price={product.price}
          isLoggedIn={!!user}
          flow={product.slug === "basic-saju" ? "free" : "order"}
          tiers={tiers}
        />
      </section>

      {reviews && reviews.length > 0 && (
        <section className="mt-16 pt-10 border-t border-hairline">
          <h2 className="text-sm font-semibold mb-5 text-ink">최근 후기</h2>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex items-center justify-between text-sm">
                  <span aria-label={`${r.rating}점`}>
                    <span className="text-ink">{"★".repeat(r.rating)}</span>
                    <span className="text-hairline-strong">{"★".repeat(5 - r.rating)}</span>
                  </span>
                  <span className="text-xs text-mute font-mono">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-charcoal leading-relaxed">{r.content}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
