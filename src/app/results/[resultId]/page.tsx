import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ResultScroll } from "@/components/saju/ResultScroll";
import { ResultChapters } from "@/components/saju/ResultChapters";
import { SangunResult } from "@/components/saju/SangunResult";
import { CrossSell, type CrossSellInput, type CrossSellProduct } from "@/components/saju/CrossSell";
import type { Myeongsik } from "@/lib/saju/manseryeok";
import { buildResultView } from "@/lib/saju/result-view";
import { buildChartRows } from "@/lib/saju/teaser";
import { parseProfileTags } from "@/lib/saju/profile-tags";
import {
  computeInyeonFacts,
  computeWealthFacts,
  computeWealthYears,
  computeDaeunTimeline,
  extractCrossSellSignal,
  type SajuAnalysisResponse,
} from "@/lib/saju/saju-api";
import { computePrescription } from "@/lib/saju/prescription";

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
    .select("product_id, paid_at, guest_email, user_id")
    .eq("id", result.order_id)
    .single();

  // 회원 결과지는 본인만 — 다른 로그인 사용자가 uuid로 남의 결과를 열람하는 것 차단.
  // (비회원 게스트 결과는 링크=capability 로 유지. user_id 있는 회원 주문만 검사.)
  const ownerId = (order as { user_id?: string | null } | null)?.user_id ?? null;
  if (ownerId) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (user && user.id !== ownerId) notFound();
  }
  const { data: product } = order
    ? await service.from("products").select("name, slug").eq("id", order.product_id).single()
    : { data: null };

  // 결제 후 크로스셀 + 결과지 개인화에 쓸 저장된 명식 입력
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
  const rawAnalysis = ((result as { raw_analysis?: unknown }).raw_analysis ?? null) as SajuAnalysisResponse | null;
  const slug = (product as { slug?: string } | null)?.slug ?? "";
  const showScores = !!rawAnalysis && !["basic-saju", "today-fortune"].includes(slug);
  const showDaeun = !!rawAnalysis && slug === "premium-saju";
  const crossSellSignal = rawAnalysis ? extractCrossSellSignal(rawAnalysis) : null;

  // ⑨ 종합 결과지 뷰모델 — 명식(항상) + raw_analysis(프리미엄)에서 가공.
  const view = buildResultView({
    myeongsik,
    rawAnalysis,
    name: savedInput?.name ?? null,
    birthDate: savedInput?.birth_date ?? null,
    birthTime: savedInput?.birth_time ?? null,
    timeUnknown: savedInput?.time_unknown ?? null,
    gender: (savedInput?.gender as "male" | "female" | null) ?? null,
    calendar: (savedInput?.calendar as "solar" | "lunar" | null) ?? null,
    concerns: savedInput?.concerns ?? [],
    showScores,
    showDaeun,
  });

  // 산군은 페이지 바탕까지 검정이어야 한다 — 결과지 판(#0a0908)만 검게 하고 페이지가 보라면
  // 검은 판이 보라 위에 떠 있는 이물감이 남는다. 위쪽 촛불빛만 살짝 남긴 어둠으로 깐다.
  const isSangun = slug === "sangun-sinjeom";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: isSangun
          ? "radial-gradient(85% 50% at 50% 0%,#191106,#0a0806 55%,#050403)"
          : "radial-gradient(90% 55% at 50% 0%,#16112c,#0b0816 58%,#070410)",
        padding: "30px 12px 64px",
        color: "#fff",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {isSangun ? (
          /* 산군은 전용 조판 — 결제 직전까지 쌓은 검정+금 세계관을 결과지가 이어받는다.
             달력 표의 값은 프롬프트에 들어간 확정값과 같은 계산에서 온다(본문과 표가 어긋나면 끝). */
          <SangunResult
            view={view}
            markdown={result.interpretation_md}
            name={savedInput?.name ?? null}
            chartRows={rawAnalysis ? buildChartRows(rawAnalysis) : []}
            wealth={rawAnalysis ? computeWealthFacts(rawAnalysis) : null}
            inyeon={
              rawAnalysis
                ? computeInyeonFacts(
                    rawAnalysis,
                    (savedInput?.gender as "male" | "female" | null) ?? "male",
                    parseProfileTags(savedInput?.concerns ?? []).partnerSex,
                  )
                : null
            }
            wealthYears={rawAnalysis ? computeWealthYears(rawAnalysis) : null}
            daeunTimeline={rawAnalysis ? computeDaeunTimeline(rawAnalysis) : null}
            prescription={rawAnalysis ? computePrescription(rawAnalysis) : null}
          />
        ) : (
          <>
            {/* 한눈 요약 — 일간·원국·오행·영역별·대운·조언 + 목차(상세 풀이 포함) */}
            <ResultScroll view={view} embedded extraToc={[{ label: "상세 풀이 전문", href: "#sec-detail" }]} />

            {/* 상세 풀이 — LLM 전문(챕터별 카드) */}
            <div id="sec-detail" className="mt-5" style={{ scrollMarginTop: 14 }}>
              <div className="mb-3 px-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#c9a8ff" }}>
                {product?.name ?? "사주 풀이"} · 상세 풀이
              </div>
              <ResultChapters markdown={result.interpretation_md} />
            </div>
          </>
        )}

        <p className="mt-5 text-center" style={{ fontSize: 11, color: isSangun ? "rgba(232,201,106,0.42)" : "#9a8cd0" }}>
          적어주신 정보는 사주 계산과 결과지 만드는 데만 사용됩니다.
        </p>

        {crossSellInput && crossSellProducts.length > 0 && (
          <CrossSell
            products={crossSellProducts}
            input={crossSellInput}
            signal={crossSellSignal}
            email={(order as { guest_email?: string | null } | null)?.guest_email ?? null}
            tone={isSangun ? "sangun" : "saju"}
          />
        )}
      </div>
    </div>
  );
}
