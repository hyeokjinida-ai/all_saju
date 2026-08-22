import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SajuWizard, type BundleOption, type DemoPreset } from "@/components/saju/SajuWizard";
import { TrustStrip } from "@/components/saju/TrustStrip";
import { StickyBuyBar } from "@/components/saju/StickyBuyBar";
import { PRODUCT_PITCH, SAMPLE_TESTIMONIALS } from "@/config/product-pitch";
import { SHOW_SOCIAL_PROOF } from "@/config/site";
import { WealthStory } from "@/components/products/WealthWebtoon";
import { InyeonStory } from "@/components/products/InyeonWebtoon";
import { SangunStory } from "@/components/products/SangunWebtoon";
import { JiknyeoStory } from "@/components/products/JiknyeoStory";
import { JiknyeoDetail } from "@/components/products/JiknyeoDetail";
import { readJiknyeoAssets } from "@/lib/jiknyeo-assets";
import { formatKRW, formatDate } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";
import type { WebtoonCutData } from "@/components/webtoon/WebtoonPage";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
};
type Review = { id: string; rating: number; content: string; created_at: string };

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
    const s = productsSeed.find((x) => x.slug === slug && x.is_active && !x.is_addon);
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

/**
 * `?demo=` 값을 티저 미리보기 프리셋으로 바꾼다.
 *
 *   1 · on · yes  →  기본 표본
 *   19940601      →  그 생일, 성별은 기본(여)
 *   19801103.m    →  그 생일 + 남성(`.f` 는 여성)
 *
 * 못 알아먹는 값이면 null — 평소처럼 1단계부터 시작한다(주소 오타로 화면이 깨지면 안 된다).
 * 기본 표본은 티저 계측(scripts/measure-teaser.ts)이 쓰던 생일과 같은 계열이라
 * 만세력 캐시에 이미 올라와 있어 반복 열람의 API 콜이 0이다.
 */
function parseDemo(v?: string): DemoPreset | null {
  if (!v) return null;
  const DEFAULT: DemoPreset = {
    birthDate: "1994-06-01",
    gender: "female", // 타깃이 3040 여성이라 기본 표본도 그쪽에 맞춘다
    calendar: "solar",
    timeUnknown: true, // 시각 모름이 가장 흔한 경로 — 기둥 3개짜리 조판을 먼저 보게 된다
    name: "박지수",
    partner: "남자",
    relationship: "혼자다",
    job: "직장에 다닌다",
  };
  if (["1", "on", "yes", "true"].includes(v)) return DEFAULT;

  const [digits, sex] = v.split(".");
  if (!/^\d{8}$/.test(digits)) return null;
  const y = +digits.slice(0, 4);
  const m = +digits.slice(4, 6);
  const d = +digits.slice(6, 8);
  if (y < 1930 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return {
    ...DEFAULT,
    birthDate: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
    gender: sex === "m" ? "male" : "female",
  };
}

// 전용 웹툰 랜딩을 가진 상품 — 나머지는 공용 템플릿.
// 산군은 풀스크린 스테이지 구조(위저드를 스토리 안에서 소유)라 맵이 아닌 전용 분기로 렌더한다.
const WEBTOON: Record<
  string,
  React.ComponentType<{ priceLabel: string; compareLabel?: string; children: React.ReactNode }>
> = {
  "wealth-saju": WealthStory,
  "inyeon-saju": InyeonStory,
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string; view?: string; demo?: string; from?: string }>;
}) {
  const { slug } = await params;
  const { c: concernPreset, view, demo: demoParam, from } = await searchParams;

  // `?demo=` — 입력 10단계를 건너뛰고 결제 전 티저로 바로 들어간다(화면 확인용).
  //   ?demo=1              기본 표본(1994-06-01 여, 시각 모름)
  //   ?demo=19801103.m     생일·성별 지정 — 다른 나이대에서 조판이 어떻게 보이는지 볼 때
  // 파는 것은 안 건드린다 — 결제·주문·가격 경로는 그대로고, 채워 넣는 건 위저드가 어차피
  // 받는 값들뿐이라 손님이 이 주소를 열어도 무료 티저까지만 보인다.
  const demo = parseDemo(demoParam);

  let product: Product | null;
  let reviews: Review[] | null = null;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let webtoonCuts: WebtoonCutData[] = [];
  let bundles: BundleOption[] = [];
  let dbPitch: unknown = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      // 0010 컬럼(compare_at_price·is_addon)은 여기서 안 읽는다 —
      // 마이그레이션 전 배포에서도 **상품 페이지만은 반드시 살아 있어야** 하기 때문이다.
      // 업셀 정보는 아래에서 따로, 실패해도 조용히 비는 방식으로 읽는다.
      .select("id, slug, name, description, price")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    product = data;

    if (product) {
      // 업셀 정보(정가 앵커 · 애드온 여부) — 0010 미적용이면 error 로 떨어져 null 이 된다.
      const { data: upsell } = await supabase
        .from("products")
        .select("compare_at_price, is_addon")
        .eq("id", product.id)
        .maybeSingle();
      // 상품 빌더(0011)로 채운 랜딩 카피 — 없으면(마이그레이션 전이거나 코드 상품이면)
      // 조용히 null 이 되고 아래에서 PRODUCT_PITCH 코드 표로 내려앉는다.
      const { data: builder } = await supabase
        .from("products")
        .select("pitch")
        .eq("id", product.id)
        .maybeSingle();
      dbPitch = (builder as { pitch?: unknown } | null)?.pitch ?? null;
      // 번들·추가질문권엔 상세 랜딩이 없다 → 없는 페이지로 돌린다.
      if ((upsell as { is_addon?: boolean } | null)?.is_addon) notFound();
      product.compare_at_price = (upsell as { compare_at_price?: number | null } | null)?.compare_at_price ?? null;

      const { data: r } = await supabase
        .from("reviews")
        .select("id, rating, content, created_at")
        .eq("product_id", product.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);
      reviews = r;

      // 결제 직전 티저에 얹을 웹툰 — 어드민에서 "손님에게 보이는 중"으로 켠 것만 내려온다.
      // (webtoon_pages 는 읽기 공개 RLS라 anon 클라이언트로 충분)
      const { data: wt } = await supabase
        .from("webtoon_pages")
        .select("cuts")
        .eq("product_id", product.id)
        .eq("kind", "teaser")
        .eq("is_published", true)
        .maybeSingle();
      if (Array.isArray(wt?.cuts)) webtoonCuts = wt.cuts as WebtoonCutData[];

      // 결제 시트에 함께 세울 패키지 — 이 상품을 구성품으로 포함하는 번들만.
      // 구성품 이름은 카드에 "산군 + 인연"처럼 그대로 찍힌다.
      const { data: bundleRows } = await supabase
        .from("products")
        .select("id, slug, name, price, compare_at_price, bundle_slugs")
        .eq("is_active", true)
        .contains("bundle_slugs", [product.slug])
        .order("display_order", { ascending: true });

      const memberSlugs = [...new Set((bundleRows ?? []).flatMap((b) => b.bundle_slugs ?? []))];
      const { data: memberRows } = memberSlugs.length
        ? await supabase.from("products").select("slug, name").in("slug", memberSlugs)
        : { data: [] };
      const memberName = new Map((memberRows ?? []).map((m) => [m.slug as string, m.name as string]));

      bundles = (bundleRows ?? []).map((b) => ({
        productId: b.id as string,
        slug: b.slug as string,
        name: b.name as string,
        price: b.price as number,
        compareAtPrice: (b.compare_at_price as number | null) ?? null,
        includes: ((b.bundle_slugs as string[] | null) ?? []).map((s) => memberName.get(s) ?? s),
      }));
    }
    user = await getCurrentUser();
  } else {
    const seed = productsSeed.find((p) => p.slug === slug && p.is_active);
    product = seed ? { id: seed.slug, ...seed } : null;
  }

  if (!product) notFound();

  // 어드민에서 채운 카피가 있으면 그것, 없으면 코드 표(config/product-pitch.ts)
  const pitch = (dbPitch as typeof PRODUCT_PITCH[string] | null) ?? PRODUCT_PITCH[product.slug];
  const eyebrow = pitch?.eyebrow ?? `命 · ${product.name}`;
  const headline = pitch?.headline ?? [product.name];
  // 전용 웹툰 랜딩 상품(돈/인연/산군)은 템플릿 대신 스토리 컴포넌트로 렌더
  const Story = WEBTOON[product.slug];
  const isSangunStory = product.slug === "sangun-sinjeom";
  // 직녀 2번째 상품(결혼) — 랜딩은 청월당 시공법 클론. 위저드를 이 페이지가 소유한다.
  const isMarriage = product.slug === "marriage-saju";
  // 풀스크린 랜딩(웹툰·몰입·클론)은 공용 컨테이너(좌우 여백 + max-w-2xl)를 쓰지 않는다 —
  // 감싸면 풀블리드 섹션이 안쪽으로 밀려 카드 여백 규격이 통째로 어긋난다(실측: 20px 설계가 44px).
  const isWealth = !!Story || isSangunStory || isMarriage;

  // 사실 기반 시의성(가짜 타이머 X) — 오늘(한국 시간) 기준 흐름 반영
  const today = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  const timeliness = ["monthly-luck", "premium-saju"].includes(product.slug)
    ? `오늘 ${today} 기준 — 2026 남은 흐름을 점검하기 좋은 때입니다`
    : `오늘 ${today} 기준 흐름까지 반영해 풀어드려요`;

  // 입력 위저드 + 안심 + 신뢰 스트립 — 템플릿·웹툰 양쪽 공유.
  // 웹툰(Story) 페이지에선 보라 템플릿 토큰 대신 먹빛 스킨(상품별 포인트색)으로 톤을 통일한다.
  const storyAccent = Story ? (product.slug === "inyeon-saju" ? "#d9c7e8" : "#e8c96a") : null;
  const isSangun = product.slug === "sangun-sinjeom";
  // 직녀 몰입 랜딩(게이트→스토리→입력). `?view=doc` 이면 기존 문서형(InyeonWebtoon)으로 되돌린다 —
  // 새 구조가 안 맞을 때 배포를 되돌리지 않고 주소 하나로 비교할 수 있는 문이다.
  const isJiknyeoStory = product.slug === "inyeon-saju" && view !== "doc";
  // 그림 슬롯은 매 요청마다 디스크를 본다 — 파일을 넣고 새로고침하면 그 자리가 켜진다(서버 전용).
  const jiknyeoAssets =
    product.slug === "inyeon-saju" || product.slug === "marriage-saju" ? readJiknyeoAssets() : undefined;
  const startSection = (
    <section id="start" className="scroll-mt-4">
      <h2
        className={`font-myeongjo text-lg font-semibold mb-2 text-center ${storyAccent ? "" : "text-gold-bright"}`}
        style={storyAccent ? { color: "#efe6d2" } : undefined}
      >
        {isSangun ? "이제 네 차례다" : "지금 바로 시작"}
      </h2>
      <p className={`text-sm mb-3 text-center ${storyAccent ? "" : "text-bone-soft"}`} style={storyAccent ? { color: "#9aa3b8" } : undefined}>
        {isSangun ? "하나씩만 답해라 — 2분이면 된다." : "한 번에 하나씩, 차근차근 — 2분이면 충분해요."}
      </p>
      <p className={`text-[13px] mb-4 text-center leading-relaxed ${storyAccent ? "" : "text-bone-soft"}`} style={storyAccent ? { color: "#9aa3b8" } : undefined}>
        <span className={storyAccent ? "" : "text-gold-bright"} style={storyAccent ? { color: storyAccent } : undefined}>✓</span> {isSangun ? "시각을 몰라도 된다" : "태어난 시각 몰라도 돼요"}&nbsp;&nbsp;
        <span className={storyAccent ? "" : "text-gold-bright"} style={storyAccent ? { color: storyAccent } : undefined}>✓</span> {isSangun ? "음력이어도 된다" : "음력 생일만 알아도 돼요"}&nbsp;&nbsp;
        <span className={storyAccent ? "" : "text-gold-bright"} style={storyAccent ? { color: storyAccent } : undefined}>✓</span> {isSangun ? "장부는 마이페이지에 보관된다" : "마이페이지에 보관"}
      </p>
      <SajuWizard
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        price={product.price}
        compareAtPrice={product.compare_at_price ?? null}
        bundles={bundles}
        isLoggedIn={!!user}
        initialConcerns={concernPreset ? [concernPreset] : undefined}
        webtoonCuts={webtoonCuts}
        variant={isSangun ? "immersive" : undefined}
        bgImage={isSangun ? "/products/sangun/face.webp" : undefined}
        // ?demo= 는 산군 분기에만 연결돼 있어서 정작 티저를 자주 봐야 하는 직녀에서 안 먹었다.
        // 입력 열 단계를 건너뛰고 티저로 직행 — 화면 확인용.
        demo={demo}
        jiknyeoAssets={jiknyeoAssets}
      />

      {/* 안심 — 리스크 역전. 웹툰에선 먹빛 카드, 템플릿에선 기존 앰버 박스 */}
      <div
        className="mt-6 rounded-md p-5"
        style={
          storyAccent
            ? { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }
            : { background: "rgba(150,90,255,0.06)", border: "1px solid #5A4A2E", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }
        }
      >
        <p className="font-myeongjo text-[15px] font-bold tracking-[0.06em] mb-3 text-center" style={{ color: storyAccent ?? "var(--gold-bright)" }}>
          안심하세요
        </p>
        <ul className="space-y-2.5 text-[13px] leading-relaxed" style={{ color: storyAccent ? "#cfd0d8" : "var(--bone-soft)" }}>
          <li className="flex gap-2"><span className="shrink-0" style={{ color: storyAccent ?? "var(--gold-bright)" }}>✓</span>결과지가 제대로 만들어지지 않으면 전액 돌려드려요</li>
          <li className="flex gap-2"><span className="shrink-0" style={{ color: storyAccent ?? "var(--gold-bright)" }}>✓</span>결과지를 열기 전이면, 구매 후 7일 안에 취소할 수 있어요</li>
          <li className="flex gap-2"><span className="shrink-0" style={{ color: storyAccent ?? "var(--gold-bright)" }}>✓</span>적어주신 정보는 사주 계산에만 쓰고, 마이페이지에 보관돼요</li>
        </ul>
        <Link
          href="/legal/refund-policy"
          className="mt-3 inline-block text-xs underline underline-offset-2"
          style={{ color: storyAccent ? "#9aa3b8" : "var(--gold-soft)" }}
        >
          환불 안내 자세히 →
        </Link>
      </div>

      <TrustStrip className="mt-5" />
    </section>
  );

  return (
    <div className={isWealth ? "" : "container py-12 max-w-2xl"}>
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

      {/* 전용 웹툰 랜딩(페이지 전체) / 나머지: 기존 템플릿 */}
      {isMarriage ? (
        // 결혼: 청월당 상세페이지 시공법(타입 대비·글로우·네온 가림·크림 밴드)을 그대로 옮긴 랜딩.
        // 위저드는 이 페이지 하단(#start)에 있고 CTA 가 거기로 내린다.
        <JiknyeoDetail
          assets={jiknyeoAssets}
          priceLabel={formatKRW(product.price)}
          compareLabel={product.compare_at_price ? formatKRW(product.compare_at_price) : undefined}
        >
          <SajuWizard
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            price={product.price}
            compareAtPrice={product.compare_at_price ?? null}
            bundles={bundles}
            isLoggedIn={!!user}
            initialConcerns={concernPreset ? [concernPreset] : undefined}
            webtoonCuts={webtoonCuts}
            demo={demo}
            jiknyeoAssets={jiknyeoAssets}
          />
        </JiknyeoDetail>
      ) : isJiknyeoStory ? (
        // 직녀: 산군과 같은 풀스크린 스테이지. 랜딩은 웹툰 한 편이고 오퍼는 뒤로 뺀다
        // (청월당 캐릭터 랜딩 두 편 판독의 결론). 그림은 전부 슬롯이라 0장이어도 성립한다.
        <JiknyeoStory
          // `?from=jiknyeo` — 스크롤 랜딩에서 설화를 이미 본 손님이다.
          // 게이트·스토리를 다시 태우면 j3·w1·w2·w4·w7 을 두 번 보여주는 꼴이라 곧장 입력으로 보낸다.
          initialStage={demo || from === "jiknyeo" ? "input" : undefined}
          assets={jiknyeoAssets}
          wizard={
            <SajuWizard
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
              price={product.price}
              compareAtPrice={product.compare_at_price ?? null}
              bundles={bundles}
              isLoggedIn={!!user}
              initialConcerns={concernPreset ? [concernPreset] : undefined}
              webtoonCuts={webtoonCuts}
              demo={demo}
              jiknyeoAssets={jiknyeoAssets}
            />
          }
        />
      ) : isSangunStory ? (
        // 산군: 풀스크린 스테이지(게이트→스토리→입력) — 위저드를 스토리가 소유해 위아래 크롬 없이 몰입 유지
        //
        // `?view=detail` 은 게이트·스토리를 건너뛰고 세일즈 페이지로 바로 들어간다.
        // 광고 진입점 (b)안(목차 직행)을 코드 변경 없이 시험하기 위한 문이다 — 무명 브랜드가
        // 가격도 결과물도 없는 게이트로 광고를 받는 게 위험하다는 판단(광고소재_초안_2026-08.md).
        // 스토리를 탄 손님의 동선에서는 이 화면이 빠졌으므로, 이제 여기가 유일한 입구다.
        <SangunStory
          // demo 는 게이트·스토리도 건너뛴다 — 티저를 보러 온 것이지 신당에 들어오려는 게 아니다
          initialStage={demo ? "input" : view === "detail" ? "main" : undefined}
          priceLabel={formatKRW(product.price)}
          wizard={
            <SajuWizard
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
              price={product.price}
              compareAtPrice={product.compare_at_price ?? null}
              bundles={bundles}
              isLoggedIn={!!user}
              initialConcerns={concernPreset ? [concernPreset] : undefined}
              webtoonCuts={webtoonCuts}
              variant="immersive"
              bgImage="/products/sangun/face.webp"
              demo={demo}
            />
          }
        />
      ) : Story ? (
        <Story
          priceLabel={formatKRW(product.price)}
          compareLabel={product.compare_at_price ? formatKRW(product.compare_at_price) : undefined}
        >
          {startSection}
        </Story>
      ) : (
        <>

      {/* ── 1. 후킹 헤더 ── */}
      <header className="text-center mb-10">
        <p className="font-brush text-gold-soft text-lg tracking-[0.3em] mb-4">{eyebrow}</p>
        <h1 className="font-myeongjo text-[32px] sm:text-[40px] font-bold leading-[1.3] tracking-[0.01em] text-bone glow-bone">
          {headline.map((line, i) => (
            <span key={i} className={i === headline.length - 1 ? "text-gold-bright" : undefined}>
              {line}
              {i < headline.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="mt-5 text-base sm:text-[17px] text-bone-soft leading-relaxed max-w-md mx-auto">{product.description}</p>

        {/* 신뢰 한 줄 — 실측 아닌 예시 수치라 실후기 쌓일 때까지 숨김(SHOW_SOCIAL_PROOF) */}
        {SHOW_SOCIAL_PROOF && (
          <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-gold-pale px-4 py-2 text-sm text-bone-soft">
            <span className="text-gold-bright">★ 4.96</span>
            <span className="text-bone-faint">·</span>
            <span>누적 <span className="text-bone">11,300명</span></span>
          </div>
        )}
        {pitch?.forWhom && <p className="mt-3 text-sm text-bone-soft">{pitch.forWhom}</p>}

        {/* 결과물 칩 — 첫 화면에서 '뭘 받는지' 못박기 */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {["내 사주 8글자", "올해 흐름", pitch?.hasCharts ? "오행 그래프" : "고민 풀이"].map((c) => (
            <span key={c} className="rounded-full border border-gold-line px-3.5 py-1.5 text-[13px] text-bone">
              ✦ {c}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-bone-soft tracking-[0.02em]">
          생년월일만 · <span className="text-gold-bright font-semibold">2분</span> 입력 · <span className="text-gold-bright font-semibold">{formatKRW(product.price)}</span> · 결제 후 수 분 내 도착
        </p>

        <div className="gold-diamond mx-auto mt-7" />
      </header>

      {/* ── 2. 공감(통증) ── */}
      {pitch?.pains && pitch.pains.length > 0 && (
        <section className="mb-9 rounded-md border border-gold-pale bg-[rgba(36,16,71,0.4)] p-6">
          <p className="font-myeongjo text-base font-semibold text-gold-bright mb-4 text-center">
            혹시, 이런 마음 아니신가요
          </p>
          <ul className="space-y-3">
            {pitch.pains.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-bone-soft leading-relaxed">
                <span className="text-gold-bright shrink-0 mt-0.5 text-lg leading-none">“</span>
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 3. 가치(담기는 것) ── */}
      {pitch?.includes && pitch.includes.length > 0 && (
        <section className="mb-9">
          <p className="font-myeongjo text-base font-semibold text-gold-bright mb-4 text-center">
            이 풀이에 담기는 것
          </p>
          <ul className="space-y-3">
            {pitch.includes.map((it, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] text-bone-soft leading-relaxed">
                <span className="shrink-0 mt-1.5 text-[10px] text-gold-bright">◆</span>
                {it}
              </li>
            ))}
          </ul>
          {pitch.hasCharts && (
            <p className="mt-4 text-[13px] text-bone-soft text-center tracking-[0.02em]">
              ＋ 타고난 기운의 균형을 <span className="text-gold-bright">그래프</span>로 한눈에 — 글로만 보던 사주를 그림으로
            </p>
          )}
        </section>
      )}

      {/* ── 결과지 미리보기 (블러 잠금 — 자이가르닉) ── */}
      <section className="mb-9">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="gold-rule flex-1 max-w-[50px] opacity-70" />
          <span className="font-brush text-gold-soft text-sm tracking-[0.2em]">覽</span>
          <span className="gold-rule flex-1 max-w-[50px] opacity-70" />
        </div>
        <a href="#start" className="block relative rounded-md overflow-hidden p-6 sm:p-7" style={{ background: "linear-gradient(160deg,#1B1E38,#181530)", border: "1px solid var(--cardline)", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}>
          <div className="text-center mb-4">
            <p className="font-brush text-gold-bright text-lg tracking-[0.2em]">命 運 錄</p>
            <p className="font-myeongjo text-bone text-sm font-bold mt-1">내 결과지 미리보기</p>
            <p className="font-mono text-[12px] text-bone-faint mt-0.5">성격 · 관계 · 재물 · 애정</p>
          </div>
          <div className="space-y-3 text-bone-soft">
            <p className="text-[13px] leading-relaxed"><b className="text-gold-bright">PART 1 · 성격의 결</b><br />겉으로는 차분해 보여도, 속으로는 자기 기준이 분명한 분입니다. 한번 정하면 끝을 보는 힘이 강합니다.</p>
            <p className="text-[13px] leading-relaxed"><b className="text-gold-bright">PART 2 · 관계의 반복</b><br />빠른 친밀감보다 신뢰가 쌓이는 시간을 더 중요하게 여기는 흐름이 나타납니다.</p>
          </div>
          <div className="relative mt-3">
            <div className="space-y-3 text-bone-soft select-none" style={{ filter: "blur(5px)" }} aria-hidden>
              <p className="text-[13px] leading-relaxed"><b className="text-gold-bright">PART 3 · 재물의 흐름</b><br />돈이 들어오는 순간보다, 머무는 구조를 만드는 것이 더 중요하게 작동합니다. 올해는 특히…</p>
              <p className="text-[13px] leading-relaxed"><b className="text-gold-bright">PART 4 · 애정의 온도</b><br />마음이 열리기까지 시간이 필요하지만, 한 번 깊어진 관계는…</p>
            </div>
            <div className="absolute inset-0 flex items-end justify-center" style={{ background: "linear-gradient(180deg, rgba(24,21,48,0), #181530)" }}>
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-wine-deep px-3 py-1 font-myeongjo text-[11px] text-gold-bright">⌥ 결제 후 전체 열림</span>
            </div>
          </div>
          <p className="mt-4 text-center font-myeongjo text-[11px] text-bone-faint">여기서부터는 당신의 사주로 채워집니다 — 결제 후 바로 선명하게</p>
        </a>
      </section>

      {/* ── 방법론 (권위·실재성) ── */}
      <section className="mb-9 text-center">
        <span className="font-brush text-gold-soft text-base tracking-[0.2em]">解</span>
        <p className="mt-2 font-myeongjo text-sm text-bone-soft leading-relaxed max-w-md mx-auto">
          수백 년 이어온 <b className="text-gold-bright">정통 사주 계산법(만세력)</b>으로 풀어드려요. 태어난 곳의 실제 시각과 절기까지 맞춰 사주 여덟 글자를 세웁니다{pitch?.hasCharts ? <>. 타고난 기운의 균형과 10년 단위 운의 흐름은 <b className="text-gold-bright">그림</b>으로 보여드려요.</> : "."}
        </p>
      </section>

      {/* ── 4. 가격 + 입력 시작 ── */}
      <section className="mb-9 rounded-md p-6 sm:p-7 text-center" style={{ border: "1.5px solid var(--gold)", background: "linear-gradient(180deg, rgba(150,90,255,0.10), rgba(7,6,15,0.6))" }}>
        <p className="text-xs text-gold-soft tracking-[0.06em] mb-2">今 · {timeliness}</p>
        <p className="font-myeongjo text-bone text-base mb-1">{product.name}</p>
        <p className="font-serif text-4xl font-bold text-gold-bright mb-1.5">{formatKRW(product.price)}</p>
        <p className="text-[13px] text-bone-soft">생년월일만 입력하면 · 정통 만세력으로 풀어드려요</p>
      </section>

      {startSection}

      {/* ── 5. 후기 — 실제 후기가 있으면 노출. 샘플 폴백·예시 수치는 SHOW_SOCIAL_PROOF 게이트 ── */}
      {((reviews && reviews.length > 0) || SHOW_SOCIAL_PROOF) && (
      <section className="mt-16 pt-10 border-t border-gold-line">
        <div className="text-center mb-6">
          <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">證</p>
          <h2 className="font-myeongjo text-lg font-semibold text-bone">먼저 받아본 분들</h2>
          {SHOW_SOCIAL_PROOF && (
            <p className="mt-1 text-xs text-gold-soft">★★★★★ 4.96 · 누적 1,200+ 후기</p>
          )}
        </div>
        <ul className="space-y-3">
          {(reviews && reviews.length > 0
            ? reviews.map((r) => ({ key: r.id, stars: r.rating, body: r.content, tag: formatDate(r.created_at) }))
            : SAMPLE_TESTIMONIALS.map((t, i) => ({ key: `s${i}`, stars: 5, body: t.body, tag: t.tag }))
          ).map((r) => {
            const initial = (r.tag || "").trim().charAt(0);
            const avatar = /[가-힣]/.test(initial) ? initial : "命";
            return (
              <li key={r.key} className="rounded-md border border-gold-pale bg-[rgba(36,16,71,0.4)] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-myeongjo text-sm font-bold"
                    style={{ background: "linear-gradient(180deg,#ffffff,#c9a8ff)", color: "#241a08" }}
                    aria-hidden
                  >
                    {avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gold-bright text-sm tracking-[0.1em]">{"★".repeat(r.stars)}</span>
                      <span className="font-mono text-[10px] text-bone-faint">{r.tag}</span>
                    </div>
                    <p className="text-sm text-bone-soft leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      )}

      {/* 신뢰 절정 재진입 CTA */}
      <div className="mt-10 text-center">
        <p className="text-sm text-bone-soft mb-3">
          {SHOW_SOCIAL_PROOF
            ? <>11,300명이 먼저 받아본 그 풀이 — {formatKRW(product.price)}</>
            : <>결제 후 수 분 안에 도착하는 내 풀이 — {formatKRW(product.price)}</>}
        </p>
        <a
          href="#start"
          className="inline-flex items-center gap-2 rounded-md px-7 py-3.5 font-bold text-sm tracking-[0.06em]"
          style={{ background: "linear-gradient(180deg,#ffffff,#f1eaff)", color: "#241a08", fontFamily: "var(--font-myeongjo), serif" }}
        >
          나도 지금 받아보기 <span className="font-brush">命</span>
        </a>
      </div>

      {/* ── 6. FAQ(망설임 처리) ── */}
      <section className="mt-12">
        <p className="font-myeongjo text-sm font-semibold text-gold-bright mb-4 text-center">자주 묻는 물음</p>
        <ul className="divide-y divide-gold-pale border-y border-gold-pale">
          {[
            { q: "태어난 시각을 몰라도 되나요?", a: "괜찮습니다. 시각을 몰라도 태어난 날을 중심으로 충분히 풀이됩니다. 입력할 때 ‘시각 몰라요’를 누르시면 돼요." },
            { q: "음력 생일만 알아요.", a: "괜찮습니다. 입력할 때 음력을 고르시면 양력으로 정확히 바꿔서 사주를 세웁니다." },
            { q: "결과는 언제 받나요?", a: "결제 직후 수 분 내로 결과지가 생성되어 바로 확인하실 수 있어요. 마이페이지에도 보관됩니다." },
            { q: "결제는 안전한가요?", a: "토스페이먼츠 안전결제로 진행됩니다. 적어주신 정보는 사주 계산과 결과지 만드는 데만 사용됩니다." },
            { q: "결과가 기대와 다르면요?", a: "결과지를 열기 전이면 구매 후 7일 안에 취소할 수 있습니다. 결과지가 제대로 만들어지지 않은 것처럼 저희 쪽 문제라면 전액 돌려드립니다. 자세한 기준은 환불 안내를 봐주세요." },
            { q: "전부 자동으로 생성되나요?", a: "정통 사주 계산법으로 여덟 글자를 정확히 뽑은 뒤, 그 결과를 바탕으로 풀이를 정리해 드립니다. 같은 생일이라도 시각·성별·고민에 따라 결과가 달라집니다." },
          ].map((f, i) => (
            <li key={i} className="py-4">
              <p className="font-myeongjo text-base font-semibold text-bone mb-1.5">Q. {f.q}</p>
              <p className="text-sm text-bone-soft leading-relaxed">{f.a}</p>
            </li>
          ))}
        </ul>
      </section>

        </>
      )}

      {/* 모바일 상시 결제바 — 옛 템플릿 상품에만.
          몰입 랜딩(산군·인연·재물)에는 붙이지 않는다: ①사이트 톤(존댓말 "내 사주 풀이 시작")이
          캐릭터 반말 위에 겹쳐 다른 상품처럼 보이고 ②가격이 화면에 두 번 뜨며
          ③위저드 8단계 내내 따라다니다 오탭하면 #start 로 튀어 입력이 날아간다. */}
      {!isWealth && <StickyBuyBar name={product.name} price={product.price} />}
    </div>
  );
}
