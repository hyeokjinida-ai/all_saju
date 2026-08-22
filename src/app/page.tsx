// 홈 — 카탈로그. 청월당 뼈대(치수·순서) × 타이트 색(검정).
//
// 왜 바꿨나: 이전 홈은 자수정 풀스크린 + CTA 하나(→ /funnel)였는데, 그 CTA 가 가리키던
// 상품(life-saju)은 비활성이고 실제로 파는 건 셋(산군·직녀 연애/결혼)이었다.
// 홈은 광고 착지가 아니라 **로고를 눌러 들어오는 손님·결과지에서 넘어온 손님**이 만나는
// 카탈로그다 — 그래서 파는 걸 전부 세운다. 광고 착지는 그대로 /products/* 몰입형.
//
// 이전 랜딩은 지우지 않았다: src/components/landing/saju-lab/SajuLabLanding.tsx.
// 되돌리려면 이 파일을 `return <SajuLabLanding />` 한 줄로.
import type { Metadata } from "next";
import { HomeShell, type ShellTab } from "@/components/home/HomeShell";
import { HeroCarousel, type HeroSlide } from "@/components/home/HeroCarousel";
import { BigRow, ProductRow } from "@/components/home/ProductRow";
import { ReviewRow } from "@/components/home/ReviewRow";
import { TrustBlock } from "@/components/home/TrustBlock";
import { HomeFooter } from "@/components/home/HomeFooter";
import { getHomeProducts, getHomeReviews, type HomeProduct } from "@/lib/home-data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  BIG_ROW_ORDER,
  CATEGORY_FALLBACK,
  HERO_ORDER,
  HOME_COPY,
  HOME_HERO,
  HOME_ROWS,
  T,
  shortDesc,
} from "@/config/home";

export const metadata: Metadata = {
  // layout 의 template(`%s | 명운록`)이 붙으면 "명운록 … | 명운록" 이 된다 → absolute
  title: { absolute: HOME_COPY.metaTitle },
  description: HOME_COPY.metaDescription,
};

/** 히어로에 세울 순서 — 빌더의 hero_rank 가 있으면 그것, 없으면 config 순서 */
function heroSlides(products: HomeProduct[]): HeroSlide[] {
  const ranked = products.filter((p) => p.heroRank != null).sort((a, b) => a.heroRank! - b.heroRank!);
  const chosen = ranked.length
    ? ranked
    : HERO_ORDER.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean as unknown as (p: HomeProduct | undefined) => p is HomeProduct);

  return chosen.map((p) => {
    const fallback = HOME_HERO[p.slug];
    return {
      product: p,
      character: p.characterName ?? fallback?.character ?? "",
      title: p.cardTitle ?? fallback?.title ?? p.name,
      tagline: p.tagline ?? fallback?.tagline ?? shortDesc(p.description),
    };
  });
}

export default async function HomePage() {
  const [products, reviews] = await Promise.all([getHomeProducts(), getHomeReviews()]);
  const isLoggedIn = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;

  const slides = heroSlides(products);

  const bigRow = BIG_ROW_ORDER.map((slug) => products.find((p) => p.slug === slug)).filter(
    Boolean as unknown as (p: HomeProduct | undefined) => p is HomeProduct,
  );

  // 카테고리 행 — 상품이 없는 행은 만들지 않는다(탭도 같이 사라진다)
  const rows = HOME_ROWS.map((row) => ({
    ...row,
    products: products.filter((p) => (p.category ?? CATEGORY_FALLBACK[p.slug]) === row.key),
  })).filter((r) => r.products.length > 0);

  const tabs: ShellTab[] = rows.map((r) => ({ id: r.key, label: r.tab }));

  return (
    <HomeShell tabs={tabs} isLoggedIn={isLoggedIn} active="home">
      <h1 className="sr-only">{HOME_COPY.metaTitle}</h1>

      <HeroCarousel slides={slides} />

      <div className="mb-10 mt-6" style={{ borderBottom: `1px solid ${T.line}` }} />

      {/* 먼저 보고 가는 풀이 — 큰 카드(70%) */}
      <section>
        <h2
          className="mb-2 ml-6 text-[20px] font-bold leading-[130%] tracking-[-0.025em]"
          style={{ color: T.title }}
        >
          {HOME_COPY.bigRowTitle}
        </h2>
        <div
          className="ml-5 w-fit rounded-[0.25rem] p-2 text-xs font-bold leading-[130%] tracking-[-0.025em]"
          style={{ background: "rgba(255,255,255,0.08)", color: T.soft }}
        >
          {HOME_COPY.loginChip}
        </div>
        <BigRow products={bigRow} via="home-big" />
      </section>

      <div className="my-10" style={{ borderBottom: `1px solid ${T.line}` }} />

      <TrustBlock />

      <ReviewRow reviews={reviews} />

      <div className="my-12" style={{ borderBottom: `4px solid ${T.line}` }} />

      <div className="flex flex-col gap-12">
        {rows.map((r) => (
          <ProductRow key={r.key} id={r.key} label={r.label} products={r.products} via={`home-${r.key}`} />
        ))}
      </div>

      <div className="mt-16" />
      <HomeFooter />
    </HomeShell>
  );
}
