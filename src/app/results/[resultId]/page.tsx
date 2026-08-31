import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ExtraQuestions } from "@/components/saju/ExtraQuestions";
import { EXTRA_QUESTION_SLUG } from "@/lib/saju/generate-result";
import { ResultScroll } from "@/components/saju/ResultScroll";
import { ResultChapters } from "@/components/saju/ResultChapters";
import { SangunResult } from "@/components/saju/SangunResult";
import { JiknyeoResult } from "@/components/saju/JiknyeoResult";
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
    .select("id, myeongsik, interpretation_md, llm_provider, llm_model, created_at, order_id, raw_analysis, product_slug")
    .eq("id", resultId)
    .maybeSingle();

  if (!result) notFound();

  const { data: order } = await service
    .from("orders")
    .select("product_id, paid_at, guest_email, user_id, toss_payment_key")
    .eq("id", result.order_id)
    .single();

  // 회원 결과지는 본인만 — 다른 로그인 사용자가 uuid로 남의 결과를 열람하는 것 차단.
  // (비회원 게스트 결과는 링크=capability 로 유지. user_id 있는 회원 주문만 검사.)
  const ownerId = (order as { user_id?: string | null } | null)?.user_id ?? null;
  if (ownerId) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (user && user.id !== ownerId) notFound();
  }
  // 패키지 주문은 한 주문에 결과지가 여러 장이다 — 이 결과지가 '어느 상품의 것인지'는
  // 주문의 상품(=패키지)이 아니라 결과지 행의 product_slug 가 정답이다.
  const { data: siblings } = await service
    .from("saju_results")
    .select("id, product_slug")
    .eq("order_id", result.order_id)
    .order("created_at", { ascending: true });

  const resultSlug = (result as { product_slug?: string | null }).product_slug || "";
  const slugsInOrder = (siblings ?? []).map((s) => s.product_slug).filter(Boolean);
  const { data: slugProducts } = slugsInOrder.length
    ? await service.from("products").select("slug, name").in("slug", slugsInOrder)
    : { data: [] };
  const nameBySlug = new Map((slugProducts ?? []).map((p) => [p.slug as string, p.name as string]));

  const { data: product } = order
    ? await service.from("products").select("name, slug").eq("id", order.product_id).single()
    : { data: null };

  // 추가질문권으로 산 답변들 — 결과지 맨 아래에 붙는다(원 주문 기준).
  const { data: extraQuestions } = await service
    .from("extra_questions")
    .select("id, question, answer_md, status, created_at")
    .eq("parent_order_id", result.order_id)
    .eq("status", "answered")
    .order("created_at", { ascending: true });

  // 값이 없으면(시드 전·비활성) 블록을 통째로 렌더하지 않는다 — 가격 없는 CTA 는 내보내지 않는다.
  const { data: questionProduct } = await service
    .from("products")
    .select("price, is_active")
    .eq("slug", EXTRA_QUESTION_SLUG)
    .maybeSingle();
  const questionPrice = questionProduct?.is_active ? (questionProduct.price as number) : null;

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
      .eq("is_addon", false) // 번들·추가질문권은 크로스셀 목록에 섞이면 안 된다
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
  // 패키지면 구성품 slug 가, 단품이면 주문 상품 slug 가 이 결과지의 정체다.
  const slug = resultSlug || (product as { slug?: string } | null)?.slug || "";
  const displayName = nameBySlug.get(slug) ?? product?.name ?? "사주 풀이";
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
  // 직녀(연애예보·결혼예보) — 산군처럼 **전용 결과지**로 간다.
  // 공용 템플릿은 보라 세계관에 재물·직업·건강까지 실어서, 밤하늘 티저에서 넘어온 손님에게
  // 다른 상품처럼 보였다(안 판 것을 보여주면 상품이 흐려진다).
  const isJiknyeo = slug === "inyeon-saju" || slug === "marriage-saju";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: isJiknyeo
          ? "radial-gradient(ellipse 120% 42% at 50% 0%,rgba(36,28,70,.10) 0%,rgba(36,28,70,0) 60%)," +
            "linear-gradient(180deg,#F7F3EA 0%,#FBF8F1 40%,#F4EFE4 100%)"
          : isSangun
          ? "radial-gradient(85% 50% at 50% 0%,#191106,#0a0806 55%,#050403)"
          : "radial-gradient(90% 55% at 50% 0%,#16112c,#0b0816 58%,#070410)",
        padding: "30px 12px 64px",
        color: isJiknyeo ? "#2A2434" : "#fff",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* 패키지로 산 사람은 결과지가 두 장이다 — 한 장만 보고 나가지 않게 위에서 먼저 보여준다.
            (단품이면 형제가 1개라 이 줄은 렌더되지 않는다) */}
        {(siblings?.length ?? 0) > 1 && (
          <nav aria-label="장부 고르기" className="mb-4 flex gap-2">
            {(siblings ?? []).map((s) => {
              const active = s.id === result.id;
              return (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  className="font-myeongjo flex-1 border px-3 py-2.5 text-center text-[13px] font-bold leading-[1.4]"
                  style={{
                    borderColor: active
                      ? isSangun
                        ? "var(--gold-bright, #e8c96a)"
                        : "#c9a8ff"
                      : isSangun
                        ? "rgba(232,201,106,0.22)"
                        : "rgba(150,90,255,0.28)",
                    color: active
                      ? isSangun ? "var(--gold-bright, #e8c96a)" : isJiknyeo ? "#d9c7e8" : "#c9a8ff"
                      : isSangun ? "rgba(232,201,106,0.55)" : isJiknyeo ? "rgba(217,199,232,0.55)" : "#9a8cd0",
                    background: active ? (isSangun ? "rgba(232,201,106,0.08)" : isJiknyeo ? "rgba(199,176,236,0.12)" : "rgba(150,90,255,0.12)") : "transparent",
                  }}
                >
                  {nameBySlug.get(s.product_slug) ?? "풀이"}
                </Link>
              );
            })}
          </nav>
        )}

        {isJiknyeo ? (
          /* 직녀 전용 조판 — 티저에서 잠근 12칸 달력을 여기서 전부 연다.
             등급은 gradeMonths 한 곳에서만 나와 티저와 절대 어긋나지 않는다. */
          <JiknyeoResult
            view={view}
            markdown={result.interpretation_md}
            name={savedInput?.name ?? null}
            chartRows={rawAnalysis ? buildChartRows(rawAnalysis) : []}
            inyeon={
              rawAnalysis
                ? computeInyeonFacts(
                    rawAnalysis,
                    (savedInput?.gender as "male" | "female" | null) ?? "female",
                    parseProfileTags(savedInput?.concerns ?? []).partnerSex,
                  )
                : null
            }
            isMarriage={slug === "marriage-saju"}
            reviewOrderId={ownerId ? result.order_id : null}
            recordedAt={result.created_at as string | null}
          />
        ) : isSangun ? (
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
            reviewOrderId={ownerId ? result.order_id : null}
            recordedAt={result.created_at as string | null}
            /* 손님이 적어 온 물음 — 프롤로그 차례에서 되비춘다(「내 고민 어디서 답하나」를 먼저 없앤다).
               [프로필] 태그는 고민이 아니라 상황 정보(스토리 선택지 수집)라 걸러 낸다. */
            concern={
              (savedInput?.concerns ?? []).filter((c: string) => !c.startsWith("[프로필]")).join(", ") || null
            }
          />
        ) : (
          <>
            {/* 한눈 요약 — 일간·원국·오행·영역별·대운·조언 + 목차(상세 풀이 포함) */}
            <ResultScroll view={view} embedded extraToc={[{ label: "상세 풀이 전문", href: "#sec-detail" }]} recordedAt={result.created_at as string | null} />

            {/* 상세 풀이 — LLM 전문(챕터별 카드) */}
            <div id="sec-detail" className="mt-5" style={{ scrollMarginTop: 14 }}>
              <div className="mb-3 px-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#c9a8ff" }}>
                {displayName} · 상세 풀이
              </div>
              <ResultChapters markdown={result.interpretation_md} />
            </div>
          </>
        )}

        <p className="mt-5 text-center" style={{ fontSize: 11, color: isSangun ? "rgba(232,201,106,0.42)" : isJiknyeo ? "rgba(217,199,232,0.45)" : "#9a8cd0" }}>
          적어주신 정보는 사주 계산과 결과지 만드는 데만 사용됩니다.
        </p>

        {/* 추가질문권 — 다른 상품으로 넘기기 전에 '같은 상담을 이어가는' 업셀을 먼저 둔다.
            문턱이 제일 낮고(5,000원), 무당 컨셉에서는 '복채를 더 내고 하나 더 묻는' 것이라 세계관 그대로다. */}
        {questionPrice != null && (
          <ExtraQuestions
            resultId={result.id}
            price={questionPrice}
            answered={(extraQuestions ?? []).map((q) => ({
              id: q.id as string,
              question: (q.question as string) ?? "",
              answer_md: (q.answer_md as string) ?? null,
            }))}
            tone={isSangun ? "sangun" : "saju"}
          />
        )}

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
