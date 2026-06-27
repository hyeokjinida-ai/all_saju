import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { MyeongsikTable } from "@/components/saju/MyeongsikTable";
import { OhaengChart } from "@/components/saju/OhaengChart";
import { SipseongChart, MonthlyLuckChart, DaeunTimeline } from "@/components/saju/PremiumCharts";
import { ResultBody } from "@/components/saju/ResultBody";
import { CrossSell, type CrossSellInput, type CrossSellProduct } from "@/components/saju/CrossSell";
import type { Myeongsik } from "@/lib/saju/manseryeok";
import { extractCrossSellSignal, type SajuAnalysisResponse } from "@/lib/saju/saju-api";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "결과지" };

export default async function ResultPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  const service = createServiceClient();

  const { data: result } = await service
    .from("saju_results")
    .select("id, myeongsik, interpretation_md, llm_provider, llm_model, created_at, order_id, raw_analysis")
    .eq("id", resultId)
    .maybeSingle();

  if (!result) notFound();

  const { data: order } = await service
    .from("orders")
    .select("product_id, paid_at")
    .eq("id", result.order_id)
    .single();
  const { data: product } = order
    ? await service.from("products").select("name, slug").eq("id", order.product_id).single()
    : { data: null };

  // 결제 후 크로스셀: 저장된 명식 정보 + 방금 산 것 외 다른 활성 상품
  const { data: savedInput } = await service
    .from("saju_inputs")
    .select("name, birth_date, birth_time, time_unknown, gender, calendar, concerns")
    .eq("order_id", result.order_id)
    .maybeSingle();

  let crossSellProducts: CrossSellProduct[] = [];
  if (savedInput && order) {
    const { data: others } = await service
      .from("products")
      .select("id, slug, name, description, price")
      .eq("is_active", true)
      .neq("id", order.product_id)
      .order("display_order", { ascending: true });
    crossSellProducts = (others ?? []).map((p) => ({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
    }));
  }

  const crossSellInput: CrossSellInput | null = savedInput
    ? {
        name: savedInput.name,
        birthDate: savedInput.birth_date,
        birthTime: savedInput.birth_time,
        timeUnknown: savedInput.time_unknown,
        gender: savedInput.gender,
        calendar: savedInput.calendar,
        concerns: savedInput.concerns ?? [],
      }
    : null;

  const myeongsik = result.myeongsik as unknown as Myeongsik;

  // 차트/크로스셀용 원본 분석(있으면). 상품 티어별로 보여줄 차트 차등.
  const rawAnalysis = (result as { raw_analysis?: unknown }).raw_analysis ?? null;
  const slug = (product as { slug?: string } | null)?.slug ?? "";
  const showSipseong = !!rawAnalysis && !["basic-saju", "today-fortune"].includes(slug); // 심화·종합
  const showMonthly = !!rawAnalysis && ["monthly-luck", "premium-saju"].includes(slug); // 월별 캘린더·종합
  const showDaeun = !!rawAnalysis && slug === "premium-saju"; // 인생 종합 끝판왕
  const crossSellSignal = rawAnalysis
    ? extractCrossSellSignal(rawAnalysis as SajuAnalysisResponse)
    : null;

  return (
    <div className="container py-12 max-w-2xl">
      {/* 증서 헤더 */}
      <header className="mb-9 text-center">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">命運錄</p>
        <h1 className="font-myeongjo text-3xl font-semibold tracking-[0.04em] text-bone glow-bone">
          {product?.name ?? "사주 풀이"}
        </h1>
        <p className="mt-3 text-xs text-bone-faint tracking-[0.06em]">발행일 · {formatDate(result.created_at)}</p>
        <div className="gold-diamond mx-auto mt-5" />
      </header>

      {/* 명식 — 골드 프레임 증서 */}
      <section className="mb-11">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
          <h2 className="font-myeongjo text-sm font-semibold text-gold tracking-[0.1em]">사주 명식 · 命式</h2>
          <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
        </div>
        <div className="gold-frame">
          <MyeongsikTable myeongsik={myeongsik} />
        </div>
      </section>

      {/* 오행 균형 차트 — 명식 8글자로 계산한 시각화 (모든 결과지) */}
      <OhaengChart myeongsik={myeongsik} />

      {/* 심화/종합 전용 차트 — 십성 분포 + 대운 60년 타임라인 */}
      {showSipseong && <SipseongChart analysis={rawAnalysis} />}
      {showMonthly && <MonthlyLuckChart analysis={rawAnalysis} />}
      {showDaeun && <DaeunTimeline analysis={rawAnalysis} />}

      {/* 본문 — 한지/와인 카드로 감싼 결과지 */}
      <article
        className="relative rounded-md px-6 py-7 sm:px-8 sm:py-9"
        style={{
          border: "1px solid var(--gold-line)",
          background: "linear-gradient(180deg, rgba(150,90,255,0.05) 0%, rgba(36,16,71,0.35) 100%)",
        }}
      >
        {/* 낙관 */}
        <div
          className="seal absolute -top-3.5 right-5 w-12 h-12 text-base flex items-center justify-center"
          style={{ transform: "rotate(-6deg)" }}
        >
          <span className="relative z-[2]">推</span>
        </div>
        <ResultBody markdown={result.interpretation_md} />
      </article>

      <p className="mt-6 text-center text-[11px] text-bone-faint tracking-[0.04em]">
        입력하신 정보는 명식 계산과 결과 생성에만 사용됩니다.
      </p>

      {crossSellInput && crossSellProducts.length > 0 && (
        <CrossSell products={crossSellProducts} input={crossSellInput} signal={crossSellSignal} />
      )}
    </div>
  );
}
