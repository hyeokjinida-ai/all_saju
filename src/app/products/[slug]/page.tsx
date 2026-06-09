import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SajuWizard, type Tier } from "@/components/saju/SajuWizard";
import { TrustStrip } from "@/components/saju/TrustStrip";
import { PRODUCT_PITCH, SAMPLE_TESTIMONIALS } from "@/config/product-pitch";
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

  const pitch = PRODUCT_PITCH[product.slug];
  const eyebrow = pitch?.eyebrow ?? `命 · ${product.name}`;
  const headline = pitch?.headline ?? [product.name];

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

      {/* ── 1. 후킹 헤더 ── */}
      <header className="text-center mb-8">
        <p className="font-brush text-gold-soft/70 text-base tracking-[0.3em] mb-3">{eyebrow}</p>
        <h1 className="font-myeongjo text-[28px] sm:text-3xl font-bold leading-snug tracking-[0.02em] text-bone glow-bone">
          {headline.map((line, i) => (
            <span key={i} className={i === headline.length - 1 ? "text-gold-bright" : undefined}>
              {line}
              {i < headline.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="mt-4 text-sm text-bone-soft leading-relaxed">{product.description}</p>
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-bone-faint">
          <span className="text-gold-soft">★ <span className="text-bone-soft">4.96</span></span>
          <span className="opacity-50">·</span>
          <span>누적 <span className="text-bone-soft">11,300명</span></span>
          {pitch?.forWhom && (
            <>
              <span className="opacity-50">·</span>
              <span>{pitch.forWhom}</span>
            </>
          )}
        </div>
        <div className="gold-diamond mx-auto mt-6" />
      </header>

      {/* ── 2. 공감(통증) ── */}
      {pitch?.pains && pitch.pains.length > 0 && (
        <section className="mb-9 rounded-md border border-gold-pale bg-[rgba(13,6,8,0.4)] p-6">
          <p className="font-myeongjo text-sm font-semibold text-gold-bright mb-4 text-center">
            혹시, 이런 마음 아니신가요
          </p>
          <ul className="space-y-2.5">
            {pitch.pains.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-bone-soft leading-relaxed">
                <span className="text-gold-soft shrink-0 mt-0.5">“</span>
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 3. 가치(담기는 것) ── */}
      {pitch?.includes && pitch.includes.length > 0 && (
        <section className="mb-9">
          <p className="font-myeongjo text-sm font-semibold text-gold-bright mb-4 text-center">
            이 풀이에 담기는 것
          </p>
          <ul className="space-y-2.5">
            {pitch.includes.map((it, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-bone-soft leading-relaxed">
                <span className="shrink-0 mt-1 text-[9px] text-gold">◆</span>
                {it}
              </li>
            ))}
          </ul>
          {pitch.hasCharts && (
            <p className="mt-4 text-xs text-bone-faint text-center tracking-[0.02em]">
              ＋ 오행·십성 균형을 <span className="text-gold-soft">그래프</span>로 한눈에 — 글로만 보던 사주를 시각으로
            </p>
          )}
        </section>
      )}

      {/* ── 4. 가격 + 입력 시작 ── */}
      <section className="mb-9 rounded-md p-6 sm:p-7 text-center" style={{ border: "1.5px solid var(--gold)", background: "linear-gradient(180deg, rgba(212,175,106,0.10), rgba(13,6,8,0.6))" }}>
        <p className="font-myeongjo text-bone text-[15px] mb-1">{product.name}</p>
        <p className="font-serif text-3xl font-bold text-gold-bright mb-1">{formatKRW(product.price)}</p>
        <p className="text-[11px] text-bone-faint">생년월일만 입력하면 · 정통 만세력으로 풀어드려요</p>
      </section>

      <section>
        <h2 className="font-myeongjo text-base font-semibold mb-2 text-gold-bright text-center">지금 바로 시작</h2>
        <p className="text-xs text-bone-soft mb-4 text-center">한 번에 하나씩, 차근차근 — 2분이면 충분해요.</p>
        <SajuWizard
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          price={product.price}
          isLoggedIn={!!user}
          flow="order"
          tiers={tiers}
        />
        <TrustStrip className="mt-5" />
      </section>

      {/* ── 5. 후기(실제 + 큐레이션 폴백) ── */}
      <section className="mt-16 pt-10 border-t border-gold-line">
        <div className="text-center mb-6">
          <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">證</p>
          <h2 className="font-myeongjo text-lg font-semibold text-bone">먼저 받아본 분들</h2>
          <p className="mt-1 text-xs text-gold-soft">★★★★★ 4.96 · 누적 1,200+ 후기</p>
        </div>
        <ul className="space-y-3">
          {(reviews && reviews.length > 0
            ? reviews.map((r) => ({ key: r.id, stars: r.rating, body: r.content, tag: formatDate(r.created_at) }))
            : SAMPLE_TESTIMONIALS.map((t, i) => ({ key: `s${i}`, stars: 5, body: t.body, tag: t.tag }))
          ).map((r) => (
            <li key={r.key} className="rounded-md border border-gold-pale bg-[rgba(13,6,8,0.4)] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gold-bright text-sm tracking-[0.1em]">{"★".repeat(r.stars)}</span>
                <span className="font-mono text-[10px] text-bone-faint">{r.tag}</span>
              </div>
              <p className="text-sm text-bone-soft leading-relaxed">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 6. FAQ(망설임 처리) ── */}
      <section className="mt-12">
        <p className="font-myeongjo text-sm font-semibold text-gold-bright mb-4 text-center">자주 묻는 물음</p>
        <ul className="divide-y divide-gold-pale border-y border-gold-pale">
          {[
            { q: "태어난 시각을 몰라도 되나요?", a: "괜찮습니다. 시(時)를 몰라도 일주 중심으로 충분히 풀이됩니다. 입력 단계에서 ‘시각 몰라요’를 누르면 됩니다." },
            { q: "음력 생일만 알아요.", a: "괜찮습니다. 입력 때 음력을 선택하면 정밀하게 양력으로 환산해 명식을 세웁니다." },
            { q: "결과는 언제 받나요?", a: "결제 직후 수 분 내로 결과지가 생성되어 바로 확인하실 수 있어요. 마이페이지에도 보관됩니다." },
            { q: "결제는 안전한가요?", a: "토스페이먼츠 안전결제로 진행됩니다. 입력 정보는 명식 계산과 결과 생성에만 사용됩니다." },
          ].map((f, i) => (
            <li key={i} className="py-4">
              <p className="font-myeongjo text-sm font-semibold text-bone mb-1.5">Q. {f.q}</p>
              <p className="text-xs text-bone-soft leading-relaxed">{f.a}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
