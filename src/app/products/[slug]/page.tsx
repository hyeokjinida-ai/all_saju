import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SajuWizard } from "@/components/saju/SajuWizard";
import { TrustStrip } from "@/components/saju/TrustStrip";
import { StickyBuyBar } from "@/components/saju/StickyBuyBar";
import { PRODUCT_PITCH, SAMPLE_TESTIMONIALS } from "@/config/product-pitch";
import { formatKRW, formatDate } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";

type Product = { id: string; slug: string; name: string; description: string; price: number };
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
    }
    user = await getCurrentUser();
  } else {
    const seed = productsSeed.find((p) => p.slug === slug && p.is_active);
    product = seed ? { id: seed.slug, ...seed } : null;
  }

  if (!product) notFound();

  const pitch = PRODUCT_PITCH[product.slug];
  const eyebrow = pitch?.eyebrow ?? `命 · ${product.name}`;
  const headline = pitch?.headline ?? [product.name];

  // 사실 기반 시의성(가짜 타이머 X) — 오늘(한국 시간) 기준 흐름 반영
  const today = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  const timeliness = ["monthly-luck", "premium-saju"].includes(product.slug)
    ? `오늘 ${today} 기준 — 2026 남은 흐름을 점검하기 좋은 때입니다`
    : `오늘 ${today} 기준 흐름까지 반영해 풀어드려요`;

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

        {/* 신뢰 한 줄 — 여백 주고 또렷하게 */}
        <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-gold-pale px-4 py-2 text-sm text-bone-soft">
          <span className="text-gold-bright">★ 4.96</span>
          <span className="text-bone-faint">·</span>
          <span>누적 <span className="text-bone">11,300명</span></span>
        </div>
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
        <section className="mb-9 rounded-md border border-gold-pale bg-[rgba(14,16,32,0.4)] p-6">
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
              ＋ 오행·십성 균형을 <span className="text-gold-bright">그래프</span>로 한눈에 — 글로만 보던 사주를 시각으로
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
          <p className="mt-4 text-center font-myeongjo text-[11px] text-bone-faint">여기서부터는 당신의 명식으로 채워집니다 — 결제 후 바로 선명하게</p>
        </a>
      </section>

      {/* ── 방법론 (권위·실재성) ── */}
      <section className="mb-9 text-center">
        <span className="font-brush text-gold-soft text-base tracking-[0.2em]">解</span>
        <p className="mt-2 font-myeongjo text-sm text-bone-soft leading-relaxed max-w-md mx-auto">
          수백 년 이어진 <b className="text-gold-bright">정통 만세력</b> 명식 계산에 기반합니다. 진태양시·절기까지 보정해 여덟 글자를 세우고{pitch?.hasCharts ? ", 오행·십성·대운을 데이터로 시각화해" : ""} 풀어드려요.
        </p>
      </section>

      {/* ── 4. 가격 + 입력 시작 ── */}
      <section className="mb-9 rounded-md p-6 sm:p-7 text-center" style={{ border: "1.5px solid var(--gold)", background: "linear-gradient(180deg, rgba(225,193,123,0.10), rgba(7,6,15,0.6))" }}>
        <p className="text-xs text-gold-soft tracking-[0.06em] mb-2">今 · {timeliness}</p>
        <p className="font-myeongjo text-bone text-base mb-1">{product.name}</p>
        <p className="font-serif text-4xl font-bold text-gold-bright mb-1.5">{formatKRW(product.price)}</p>
        <p className="text-[13px] text-bone-soft">생년월일만 입력하면 · 정통 만세력으로 풀어드려요</p>
      </section>

      <section id="start" className="scroll-mt-4">
        <h2 className="font-myeongjo text-lg font-semibold mb-2 text-gold-bright text-center">지금 바로 시작</h2>
        <p className="text-sm text-bone-soft mb-3 text-center">한 번에 하나씩, 차근차근 — 2분이면 충분해요.</p>
        <p className="text-[13px] text-bone-soft mb-4 text-center leading-relaxed">
          <span className="text-gold-bright">✓</span> 태어난 시각 몰라도 돼요&nbsp;&nbsp;<span className="text-gold-bright">✓</span> 음력 생일만 알아도 돼요&nbsp;&nbsp;<span className="text-gold-bright">✓</span> 마이페이지에 보관
        </p>
        <SajuWizard
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          price={product.price}
          isLoggedIn={!!user}
        />

        {/* 안심 — 리스크 역전. 다크 앰버 보증 박스로 결제 직전 신뢰 */}
        <div
          className="mt-6 rounded-md p-5"
          style={{ background: "rgba(225,193,123,0.06)", border: "1px solid #5A4A2E", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
        >
          <p className="font-brush text-base tracking-[0.2em] mb-3 text-center" style={{ color: "var(--gold-bright)" }}>安心</p>
          <ul className="space-y-2.5 text-[13px] leading-relaxed" style={{ color: "var(--bone-soft)" }}>
            <li className="flex gap-2"><span className="shrink-0" style={{ color: "var(--gold-bright)" }}>✓</span>결과가 정상 생성되지 않으면 전액 환불 — 회사 귀책 시</li>
            <li className="flex gap-2"><span className="shrink-0" style={{ color: "var(--gold-bright)" }}>✓</span>구매 후 7일 이내 청약철회 가능 (전자상거래법 기준)</li>
            <li className="flex gap-2"><span className="shrink-0" style={{ color: "var(--gold-bright)" }}>✓</span>입력 정보는 명식 계산에만 사용 · 마이페이지에 보관</li>
          </ul>
          <Link href="/legal/refund-policy" className="mt-3 inline-block text-xs underline underline-offset-2" style={{ color: "var(--gold-soft)" }}>
            환불 안내 자세히 →
          </Link>
        </div>

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
          ).map((r) => {
            const initial = (r.tag || "").trim().charAt(0);
            const avatar = /[가-힣]/.test(initial) ? initial : "命";
            return (
              <li key={r.key} className="rounded-md border border-gold-pale bg-[rgba(14,16,32,0.4)] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-myeongjo text-sm font-bold"
                    style={{ background: "linear-gradient(180deg,#E7C27D,#caa862)", color: "#241a08" }}
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

      {/* 신뢰 절정 재진입 CTA */}
      <div className="mt-10 text-center">
        <p className="text-sm text-bone-soft mb-3">11,300명이 먼저 받아본 그 풀이 — {formatKRW(product.price)}</p>
        <a
          href="#start"
          className="inline-flex items-center gap-2 rounded-md px-7 py-3.5 font-bold text-sm tracking-[0.06em]"
          style={{ background: "linear-gradient(180deg,#E7C27D,#E1C17B)", color: "#241a08", fontFamily: "'Gowun Batang', serif" }}
        >
          나도 지금 받아보기 <span className="font-brush">命</span>
        </a>
      </div>

      {/* ── 6. FAQ(망설임 처리) ── */}
      <section className="mt-12">
        <p className="font-myeongjo text-sm font-semibold text-gold-bright mb-4 text-center">자주 묻는 물음</p>
        <ul className="divide-y divide-gold-pale border-y border-gold-pale">
          {[
            { q: "태어난 시각을 몰라도 되나요?", a: "괜찮습니다. 시(時)를 몰라도 일주 중심으로 충분히 풀이됩니다. 입력 단계에서 ‘시각 몰라요’를 누르면 됩니다." },
            { q: "음력 생일만 알아요.", a: "괜찮습니다. 입력 때 음력을 선택하면 정밀하게 양력으로 환산해 명식을 세웁니다." },
            { q: "결과는 언제 받나요?", a: "결제 직후 수 분 내로 결과지가 생성되어 바로 확인하실 수 있어요. 마이페이지에도 보관됩니다." },
            { q: "결제는 안전한가요?", a: "토스페이먼츠 안전결제로 진행됩니다. 입력 정보는 명식 계산과 결과 생성에만 사용됩니다." },
            { q: "결과가 기대와 다르면요?", a: "구매 후 7일 이내 청약철회가 가능합니다(전자상거래법 기준). 결과가 정상적으로 생성되지 않는 등 회사 귀책 사유는 전액 환불해 드립니다. 자세한 기준은 환불 안내를 참고해 주세요." },
            { q: "전부 자동으로 생성되나요?", a: "정통 만세력 엔진으로 명식을 정밀 산출한 뒤, 그 결과를 바탕으로 풀이를 정리해 드립니다. 같은 생일이라도 시각·성별·고민에 따라 결과가 달라집니다." },
          ].map((f, i) => (
            <li key={i} className="py-4">
              <p className="font-myeongjo text-base font-semibold text-bone mb-1.5">Q. {f.q}</p>
              <p className="text-sm text-bone-soft leading-relaxed">{f.a}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 모바일 상시 결제바 */}
      <StickyBuyBar name={product.name} price={product.price} />
    </div>
  );
}
