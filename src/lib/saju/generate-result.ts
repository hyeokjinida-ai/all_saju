// =====================================================
// 결과 생성 — 멱등 공유 함수
// =====================================================
// 결제 완료(paid) 주문 1건에 대해 명식 산출 + LLM 풀이를 생성하고 저장한다.
// confirm(즉시) · 클라 자가복구(/api/orders/generate) · 복구 크론 · 토스 웹훅이
// 모두 이 함수를 호출한다. 따라서 반드시 멱등이어야 한다:
//   - 이미 정상 결과가 있으면 재사용(재생성·중복저장 안 함)
//   - paid 상태가 아니면 생성하지 않음
//   - 부정확한 mock 명식은 절대 저장하지 않음(luckyloveme 정확값만)
//   - LLM 본문이 비면 저장하지 않음(나중에 다시 시도 가능하도록 '미완성'으로 둠)

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import type { Myeongsik } from "@/lib/saju/manseryeok";
import {
  buildChapterPrompts,
  buildExtraQuestionPrompt,
  coreChapterIndexes,
  outlineTitles,
  registerDbStyle,
} from "@/lib/saju/prompt";
import { countPendingChapters, hasRealInterpretation, mergeCompletedChapters } from "@/lib/saju/chapters";
import {
  buildMonthPlan,
  generateBlueprint,
  type ResultBlueprint,
  type MonthAssignment,
} from "@/lib/saju/blueprint";
import { parseProfileTags } from "@/lib/saju/profile-tags";
import { generateByChapters, generateInterpretation } from "@/lib/saju/llm";
import { normalizeResultVoice } from "@/lib/saju/normalize-voice";
import { sendResultEmail } from "@/lib/email";
import {
  isSajuApiConfigured,
  fetchSajuAnalysis,
  formatSajuCompact,
  buildKeyFactsBlock,
  buildWealthFactsBlock,
  buildInyeonFactsBlock,
  computeWealthFacts,
  computeInyeonFacts,
  computeWealthYears,
  ganjiToMyeongsik,
  type BirthInfo,
  type SajuAnalysisResponse,
} from "@/lib/saju/saju-api";
import { computePrescription, buildPrescriptionBlock } from "@/lib/saju/prescription";
import { buildPastBlock } from "@/lib/saju/teaser";

type SajuInputRow = {
  name: string | null;
  birth_date: string; // "YYYY-MM-DD"
  birth_time: string | null; // "HH:mm" | "HH:mm:ss"
  time_unknown: boolean;
  calendar: "solar" | "lunar";
  gender: "male" | "female";
  concerns: string[];
};

/** 설계도가 인생 서사를 지어내지 않게 — 대운 연대와 나이구간만 추려 준다. */
function buildArcHint(analysis: SajuAnalysisResponse): string {
  const daeun = analysis.daeun as Record<string, unknown> | undefined;
  if (!daeun) return "";
  const all = daeun.all_daeun as Array<Record<string, unknown>> | undefined;
  const lines: string[] = [];
  // ⚠ current_age 는 **세는나이**다(실측: 1993-05-15 생 → 34, 같은 날 만나이 33).
  // 라벨 없이 숫자만 주면 모델이 만나이로 읽어 한 살 많게 적는다 — 반드시 라벨을 붙인다.
  if (daeun.current_age != null) lines.push(`- 현재 나이: ${daeun.current_age}세(세는나이)`);
  if (Array.isArray(all)) {
    lines.push(
      ...all.map((d) => `- ${d.age_start}~${d.age_end}세 ${d.ganji ?? ""} 대운${d.start_date ? ` (${String(d.start_date).slice(0, 4)}년 시작)` : ""}`),
    );
  }
  return lines.join("\n");
}

/** 산군 전용 설계도 + 달 배정표 + 장별 확정값. 실패는 전부 null 로 조용히 내려앉는다. */
// 장부 설계도 + 달 배정표. 확정값(달·해)이 여러 장에 걸치는 상품만 태운다.
//  · sangun-sinjeom — 재물+인연 전부. 처방 장까지 있다.
//  · inyeon-saju    — 인연 축만. 10장 개편(2026-08-17)으로 달을 쓰는 장이 4개로 늘어
//                     배정표 없이는 같은 달이 여러 장에 반복된다. 처방 장은 없다.
async function buildChapterPlan(
  slug: string,
  rawAnalysis: unknown,
  input: SajuInputRow,
  keyFacts: string | undefined,
): Promise<{
  blueprint: ResultBlueprint | null;
  monthPlan: MonthAssignment[] | null;
  pastBlock: string | null;
  prescriptionBlock: string | null;
}> {
  const none = { blueprint: null, monthPlan: null, pastBlock: null, prescriptionBlock: null };
  const isSangun = slug === "sangun-sinjeom";
  // ⚠ 결혼사주도 태운다 — 인연과 **같은 계산**을 쓰는 상품이라 설계도·달 배정표가 똑같이 필요하다.
  //    여기서 빠뜨렸더니 결과지 1·2·4장이 통째로 사라지고, 모델이 「확정값을 보내주세요」라는
  //    안내문을 본문에 뱉었다(2026-08-21 실측). 4장이 「결혼하는 해」 — 이 상품의 핵심 장이다.
  const usesPlan = isSangun || slug === "inyeon-saju" || slug === "marriage-saju";
  if (!usesPlan || !rawAnalysis || !keyFacts) return none;
  const analysis = rawAnalysis as SajuAnalysisResponse;
  const titles = outlineTitles(slug);

  // 배정표 + 장별 확정값 — 순수 계산. 이것만 있어도 달 반복은 죽는다.
  let monthPlan: MonthAssignment[] | null = null;
  let pastBlock: string | null = null;
  let prescriptionBlock: string | null = null;
  try {
    const { partnerSex } = parseProfileTags(input.concerns);
    monthPlan = buildMonthPlan(
      titles,
      computeWealthFacts(analysis),
      computeInyeonFacts(analysis, input.gender, partnerSex),
      computeWealthYears(analysis),
    );
    pastBlock = buildPastBlock(analysis) || null;
    // 처방표는 산군 결과지에만 있는 장이다 — 인연에 주면 쓸 장이 없어 버려진다.
    prescriptionBlock = isSangun ? buildPrescriptionBlock(computePrescription(analysis)) || null : null;
  } catch {
    /* 확정값이 없어도 결과지는 나가야 한다 — 그 장들은 예전 방식으로 쓴다 */
  }

  // 설계도 — LLM 1회(기본 꺼짐). 실패하면 null(생성은 계속 간다).
  const concern = input.concerns.filter((c) => !c.startsWith("[프로필]")).join(", ");
  const t0 = Date.now();
  const blueprint = await generateBlueprint({
    keyFacts,
    concern,
    chapterTitles: titles,
    arcHint: buildArcHint(analysis),
  });
  if (blueprint) console.info(`[generate] 설계도 OK · ${Date.now() - t0}ms`);
  return { blueprint, monthPlan, pastBlock, prescriptionBlock };
}

// saju_inputs row → luckyloveme BirthInfo
function toBirthInfo(input: SajuInputRow): BirthInfo {
  const [y, m, d] = input.birth_date.split("-");
  const hasTime = !input.time_unknown && !!input.birth_time;
  const [hh, mm] = hasTime ? input.birth_time!.split(":") : [undefined, undefined];
  return {
    birthYear: y,
    birthMonth: String(parseInt(m, 10)),
    birthDay: String(parseInt(d, 10)),
    ...(hasTime ? { birthHour: String(parseInt(hh!, 10)), birthMinute: String(parseInt(mm!, 10)) } : {}),
    calendarType: input.calendar === "lunar" ? "음력" : "양력",
    gender: input.gender,
  };
}

// 결과지 본문이 '실제로 채워졌는지' 판정하는 자들은 `lib/saju/chapters` 한 곳에 산다 —
// 화면(조판)과 서버(출고 검사)가 같은 파서를 써야 한다.
//
// ⚠ 2026-08-29 수리: 여기 있던 챕터 경계 상수가
//   `new RegExp(String.fromCharCode(10) + "(?=###\s)")` 였다. 문자열 리터럴 안의 `\s` 는
//   이스케이프가 벗겨져 **`s` 글자**가 되므로 실제 정규식은 `/\n(?=###s)/` — 한 번도 안 맞았다.
//   되묻는 장이 몇 개든 asked 가 0~1 로만 세여, 되물음 3장짜리 결과지도 80% 게이트를 통과했다.
//   이제 되물음은 **생성 단계에서 실패로 취급**해 다시 뽑고(llm.ts genWithBackoff),
//   끝내 안 되면 자리표시가 박혀 크론이 이어 채운다.
export { looksLikeDataRequest, hasRealInterpretation } from "@/lib/saju/chapters";

export type GenerateReason =
  | "no_order"
  | "no_input"
  | "not_paid"
  | "saju_api_unconfigured"
  | "manseryeok"
  | "llm"
  | "save"
  | "no_question" // 추가질문권인데 질문 행이 없다(있을 수 없는 상태 — 방어)
  | "no_parent"; // 추가질문의 원 결과지를 못 찾았다

export type GenerateOutcome =
  | {
      ok: true;
      resultId: string;
      reused: boolean;
      /** 저장은 됐지만 아직 자리표시로 남은 장 수. 0 이 아니면 **끝난 게 아니다** —
       *  복구 크론이 이어서 채워야 한다(안 세면 미완 결과지가 완료로 잡혀 영영 안 채워진다). */
      pending?: number;
    }
  | { ok: false; reason: GenerateReason; detail?: string };

// 결과지가 아니라 '답변 한 장'을 파는 상품 — 아래 분기가 이 slug 만 특별 취급한다.
export const EXTRA_QUESTION_SLUG = "extra-question";

/** 만세력 1콜의 산출물. 패키지여도 한 번만 받아 구성품이 나눠 쓴다(API 원가·지연 절약). */
type Chart = {
  myeongsik: Myeongsik;
  manseryeokText?: string;
  baseKeyFacts?: string;
  rawAnalysis: unknown;
};

/** 명식 조회 + 공통 확정값 카드. 상품별 확정값(재물·인연)은 keyFactsFor 가 얹는다. */
async function fetchChart(input: SajuInputRow): Promise<Chart | { error: string }> {
  try {
    const birthInfo = toBirthInfo(input);
    const analysis = await fetchSajuAnalysis(birthInfo, [], { source: "confirm" }); // [] = 16종 전체
    const converted = ganjiToMyeongsik(analysis);
    if (!converted) return { error: "ganji missing" };
    return {
      myeongsik: converted,
      manseryeokText: formatSajuCompact(analysis, birthInfo),
      baseKeyFacts: buildKeyFactsBlock(analysis, birthInfo),
      rawAnalysis: analysis,
    };
  } catch (apiErr) {
    return { error: apiErr instanceof Error ? apiErr.message : String(apiErr) };
  }
}

/** 상품별 확정값 주입 — 챕터들이 병렬이라 서로 못 보는 값을 여기서 떠먹여 준다. */
function keyFactsFor(slug: string, chart: Chart, input: SajuInputRow): string | undefined {
  const base = chart.baseKeyFacts;
  if (!base || !chart.rawAnalysis) return base;
  const analysis = chart.rawAnalysis as SajuAnalysisResponse;
  // 결제 전에 받아둔 인연 방향 — 배우자 십성이 "내 성별"이 아니라 "상대 성별"로 갈린다.
  // 안 물었거나 "아직 모르겠다"면 undefined → 이성 인연으로 계산(예전 동작).
  const { partnerSex } = parseProfileTags(input.concerns);
  const extra: string[] = [];
  // "돈 들어오는 달": 점수·좋은/나쁜 달을 확정값으로 주입(챕터 간 모순 방지)
  if (slug === "wealth-saju") extra.push(buildWealthFactsBlock(analysis));
  // "인연 들어오는 달": 점수·달·해·나이대 확정값 주입
  // ⚠ 결혼사주도 **같은 계산**을 쓴다(크게 바뀌는 해=결혼하는 해, TOP3=서두를 달, shaky=피해야 할 시기).
  //    여기서 빠뜨렸더니 1장·4장이 통째로 사라지고, 모델이 「확정값을 보내주세요」라는
  //    안내문을 본문에 그대로 뱉었다(2026-08-21 샘플 실측). 상품의 핵심 장이 날아가는 자리다.
  if (slug === "inyeon-saju" || slug === "marriage-saju") {
    // 점수 줄 이름을 상품 화법에 맞춘다 — 지시문과 블록의 **글자가 같아야** 모델이 값을 찾는다.
    extra.push(
      buildInyeonFactsBlock(analysis, input.gender, partnerSex, slug === "marriage-saju" ? "결혼 그릇 점수" : "인연 그릇 점수"),
    );
  }
  // "박수무당 사주"(포괄 확장): 재물+인연 확정값을 함께 — 총운인데 달·해까지 확언하는 차별화
  if (slug === "sangun-sinjeom") {
    extra.push(buildWealthFactsBlock(analysis), buildInyeonFactsBlock(analysis, input.gender, partnerSex));
  }
  return [base, ...extra].filter(Boolean).join("\n\n");
}

// paid 주문 1건의 결과지를 생성/저장(멱등). 호출자는 결제 승인 책임만 진다.
// allowPartial: 기본 false → 챕터의 80% 이상 성공해야 저장(부분 결과는 보류 후 재시도).
//   복구 크론이 여러 번 실패한 주문(attempts↑)엔 true 로 호출해, 끝내 부분 결과라도 제공한다.
export async function generateResultForOrder(
  orderUuid: string,
  opts?: { service?: SupabaseClient; allowPartial?: boolean },
): Promise<GenerateOutcome> {
  const service = opts?.service ?? createServiceClient();

  // 1. 주문 — paid 만 생성
  const { data: order } = await service
    .from("orders")
    .select("id, status, product_id, guest_email")
    .eq("id", orderUuid)
    .maybeSingle();
  if (!order) return { ok: false, reason: "no_order" };
  if (order.status !== "paid") return { ok: false, reason: "not_paid" };

  const { data: product } = await service
    .from("products")
    .select("slug, name, bundle_slugs")
    .eq("id", order.product_id)
    .maybeSingle();
  if (!product) return { ok: false, reason: "no_input" };

  // 추가질문권은 결과지를 새로 만들지 않는다 — 원 결과지에 답변 한 장을 붙이고
  // 그 원 결과지로 돌려보낸다(손님은 결제 후 자기 결과지로 돌아가 답을 본다).
  if (product.slug === EXTRA_QUESTION_SLUG) {
    return answerExtraQuestion(service, orderUuid);
  }

  // 패키지면 구성품 수만큼, 단품이면 자기 하나. targets[0] 이 대표(결제 후 이동할 결과지).
  const bundle = (product as { bundle_slugs?: string[] | null }).bundle_slugs;
  const targets = bundle && bundle.length > 0 ? bundle : [product.slug];

  // 2. 멱등 — 이미 완성된 구성품은 건너뛴다(한쪽만 실패한 패키지는 실패분만 다시 만든다).
  const { data: existingRows } = await service
    .from("saju_results")
    .select("id, product_slug, interpretation_md")
    .eq("order_id", orderUuid);
  const done = new Map<string, string>();
  for (const r of existingRows ?? []) {
    if (!hasRealInterpretation(r.interpretation_md)) continue;
    // 자리표시가 남은 판은 **완성이 아니다** — done 에 넣지 않아 아래에서 다시 만든다.
    // 여기서 완성으로 세면 그 장은 영영 안 채워진다(본문 길이만 보던 옛 판정의 구멍:
    // 1장짜리 부분 저장도 '있음'으로 잡혀 복구 큐에서 빠졌다).
    if (countPendingChapters(r.interpretation_md)) continue;
    done.set(r.product_slug, r.id);
  }
  if (targets.every((s) => done.has(s))) {
    return { ok: true, resultId: done.get(targets[0])!, reused: true };
  }

  const { data: input } = await service
    .from("saju_inputs")
    .select("name, birth_date, birth_time, time_unknown, gender, calendar, concerns")
    .eq("order_id", orderUuid)
    .maybeSingle();
  if (!input) return { ok: false, reason: "no_input" };

  // 3. 명식 — luckyloveme(정확)만. 부정확한 mock 폴백은 쓰지 않는다.
  //    패키지여도 여기서 한 번만 받아 구성품이 나눠 쓴다.
  if (!isSajuApiConfigured()) return { ok: false, reason: "saju_api_unconfigured" };
  const chart = await fetchChart(input as SajuInputRow);
  if ("error" in chart) return { ok: false, reason: "manseryeok", detail: chart.error };

  // 구성품 이름(프롬프트 제목용) — 번들 상품 이름이 아니라 각 구성품 이름을 쓴다.
  const { data: targetProducts } = await service.from("products").select("id, slug, name").in("slug", targets);
  const nameBySlug = new Map((targetProducts ?? []).map((p) => [p.slug, p.name]));

  // 상품 빌더(0011)로 만든 상품은 목차·말투가 DB 에 있다. 만들기 직전에 얹는다 —
  // 없으면(마이그레이션 전이거나 코드로 만든 상품이면) 조용히 기존 코드 표를 쓴다.
  try {
    const ids = (targetProducts ?? []).map((p) => p.id as string);
    if (ids.length) {
      const { data: styles } = await service
        .from("product_styles")
        .select("product_id, style")
        .in("product_id", ids);
      const slugById = new Map((targetProducts ?? []).map((p) => [p.id as string, p.slug as string]));
      for (const row of styles ?? []) {
        const slug = slugById.get(row.product_id as string);
        if (slug) registerDbStyle(slug, row.style);
      }
    }
  } catch {
    /* product_styles 가 아직 없다 — 코드 표로 간다 */
  }

  // 4. 구성품별 생성 — **순차**.
  //    예전엔 병렬이었다(결제 후 폴링 창 64초를 아끼려고). 그런데 구성품 하나가 이미 챕터를
  //    나눠 던지는 마당에 구성품까지 겹치면 순간 토큰이 그만큼 배가 되어, 429 로 **둘 다** 죽는다.
  //    confirm 은 300초까지 동기로 기다리고 대기 화면이 그 시간을 받아 준다(폴링은 폴백일 뿐).
  //    번들은 드물고, 늦게 받는 것보다 못 받는 게 나쁘다.
  const outcomes: { slug: string; ok: boolean; resultId?: string; reason?: GenerateReason; detail?: string; pending?: number }[] = [];
  for (const slug of targets) {
    if (done.has(slug)) {
      outcomes.push({ slug, ok: true, resultId: done.get(slug)! });
      continue;
    }
    const r = await buildAndSaveOne({
      service,
      orderUuid,
      slug,
      productName: nameBySlug.get(slug) ?? product.name,
      input: input as SajuInputRow,
      chart,
      allowPartial: opts?.allowPartial,
    });
    outcomes.push({ slug, ...r });
  }

  const failed = outcomes.find((o) => !o.ok);
  if (failed && !failed.ok) {
    return { ok: false, reason: failed.reason ?? "llm", detail: `${failed.slug}: ${failed.detail ?? ""}` };
  }

  const primary = outcomes.find((o) => o.slug === targets[0]);
  if (!primary || !primary.ok || !primary.resultId) return { ok: false, reason: "save", detail: "primary missing" };
  // 구성품 중 하나라도 미완이면 주문 전체가 미완이다 — 크론이 계속 잡아야 한다.
  const pending = outcomes.reduce((n, o) => n + (o.pending ?? 0), 0);

  // 비회원: 결과 링크를 이메일로 발송(베스트 에포트 — 실패해도 결과는 이미 저장됨).
  // 회원은 마이페이지/결제완료 화면에서 바로 확인하므로 메일 생략.
  // 패키지는 대표 결과지 링크 하나만 보낸다 — 그 화면에서 나머지 장부로 넘어갈 수 있다.
  // 아직 채우는 중인 장이 있으면 **부르지 않는다** — 「결과지가 나왔어요」 메일을 받고 들어와
  // 「준비 중」 자리표시를 보면 그게 첫인상이 된다. 다 채워진 뒤 크론이 같은 자리에서 보낸다.
  const guestEmail = (order as { guest_email?: string | null }).guest_email;
  if (guestEmail && !pending) {
    try {
      await sendResultEmail({ to: guestEmail, resultId: primary.resultId, productName: product.name });
    } catch {
      /* 발송 실패는 무시 — 결과 생성은 성공 */
    }
  }

  return { ok: true, resultId: primary.resultId, reused: false, pending };
}

/** 구성품 1개 몫의 결과지를 만들어 저장한다. 명식은 호출자가 한 번 받아 넘긴다. */
async function buildAndSaveOne(args: {
  service: SupabaseClient;
  orderUuid: string;
  slug: string;
  productName: string;
  input: SajuInputRow;
  chart: Chart;
  allowPartial?: boolean;
}): Promise<
  { ok: true; resultId: string; pending?: number } | { ok: false; reason: GenerateReason; detail?: string }
> {
  const { service, orderUuid, slug, productName, input, chart } = args;
  const keyFacts = keyFactsFor(slug, chart, input);

  // 장부 설계도 + 달 배정표 — 챕터들이 병렬이라 서로 못 보는 걸 여기서 조율한다.
  // 산군·인연만 태운다(확정값이 여러 장에 걸치는 상품). 설계도 실패는 결과지를 막지 않는다.
  const plan = await buildChapterPlan(slug, chart.rawAnalysis, input, keyFacts);

  const { title, chapters } = buildChapterPrompts({
    productSlug: slug,
    productName,
    name: input.name,
    myeongsik: chart.myeongsik,
    manseryeokText: chart.manseryeokText,
    birthDate: input.birth_date,
    birthTime: input.birth_time,
    timeUnknown: input.time_unknown,
    gender: input.gender,
    concerns: input.concerns,
    keyFacts,
    blueprint: plan.blueprint,
    monthPlan: plan.monthPlan,
    pastBlock: plan.pastBlock,
    prescriptionBlock: plan.prescriptionBlock,
  });
  const llm = await generateByChapters(title, chapters);

  // 기계적으로 정답이 하나인 위반(문어 명령형·괄호 한자·내부 판정값·2인칭 호칭)은 후처리로 못 박는다.
  // 프롬프트로 부탁해서는 안 지켜진다는 걸 실측으로 확인했다(normalize-voice.ts 주석 참고).
  const norm = normalizeResultVoice(llm.text, { banmal: slug === "sangun-sinjeom", name: input.name });
  if (norm.fixed.length) {
    console.info(`[generate] 문체 교정(${slug}):`, norm.fixed.map((f) => `${f.rule} ${f.before}건`).join(" · "));
  }
  llm.text = norm.text;

  // 완성도 검증 — 빈/부분 결과지를 저장하면 멱등 재시도/복구 큐에서 영구 제외되어
  // 유료 고객이 잘린 풀이를 받는다.
  //
  // 하한이 둘이다:
  //  ① **장 수** — 기본 80%. 최후 상황(allowPartial)에서도 70% 는 지킨다.
  //     ⚠ 2026-08-29 이전에는 allowPartial 이 minOk=1 이었다. 6회 실패한 주문은
  //       **1장짜리 결과지도 저장·출고**됐고, 저장되는 순간 크론 대상에서 빠져 영구히 그 상태였다.
  //  ② **핵심 장** — 티저가 판 장(★·물음)이 비면 장 수를 채워도 안 나간다. 다른 물건이 된다.
  const total = llm.totalCount ?? 1;
  const pendingIdx = llm.pendingIdx ?? [];
  const realSuccess = llm.successCount ?? (llm.provider ? 1 : 0);
  const minOk = Math.ceil(total * (args.allowPartial ? 0.7 : 0.8));
  const coreMissing = coreChapterIndexes(slug).filter((i) => pendingIdx.includes(i));
  if (pendingIdx.length) {
    console.warn(`[generate] 미완 장 ${pendingIdx.length}개(${slug}) — ${pendingIdx.map((i) => i + 1).join(",")}`);
  }
  if (!llm.provider || !hasRealInterpretation(llm.text) || realSuccess < minOk || coreMissing.length) {
    const why = coreMissing.length ? ` (핵심 장 ${coreMissing.map((i) => i + 1).join(",")} 미완)` : "";
    return { ok: false, reason: "llm", detail: `완성도 ${realSuccess}/${total}${why}` };
  }

  // 재생성이 이전 판보다 나빠지지 않게 — 이번에 못 채운 장은 **저장돼 있던 좋은 판**을 남긴다.
  // (미완 장이 없으면 이 함수는 본문을 손대지 않고 그대로 돌려준다)
  if (pendingIdx.length) {
    const { data: prev } = await service
      .from("saju_results")
      .select("interpretation_md")
      .eq("order_id", orderUuid)
      .eq("product_slug", slug)
      .maybeSingle();
    llm.text = mergeCompletedChapters(prev?.interpretation_md as string | null, llm.text);
  }
  const stillPending = countPendingChapters(llm.text);

  // 저장(멱등 upsert — 미완성 행이 있었다면 덮어쓴다).
  // 충돌 키가 (order_id, product_slug) 라 패키지 주문 한 건에 구성품별 행이 나란히 선다.
  const { data: result, error: saveErr } = await service
    .from("saju_results")
    .upsert(
      {
        order_id: orderUuid,
        product_slug: slug,
        myeongsik: chart.myeongsik as never,
        interpretation_md: llm.text,
        llm_provider: llm.provider,
        llm_model: llm.model,
        raw_analysis: chart.rawAnalysis as never,
      },
      { onConflict: "order_id,product_slug" },
    )
    .select("id")
    .single();

  if (saveErr || !result) return { ok: false, reason: "save", detail: saveErr?.message };
  return { ok: true, resultId: result.id, pending: stillPending };
}

/** 추가질문권 — 원 결과지의 명식으로 물어온 것 하나에만 답하고, 원 결과지 id 를 돌려준다. */
async function answerExtraQuestion(service: SupabaseClient, orderUuid: string): Promise<GenerateOutcome> {
  const { data: q } = await service
    .from("extra_questions")
    .select("id, parent_order_id, question, answer_md, status")
    .eq("order_id", orderUuid)
    .maybeSingle();
  if (!q || !q.question) return { ok: false, reason: "no_question" };

  // 원 결과지(대표 1장) — 답변을 붙여 보여줄 화면이자, 결제 후 돌아갈 곳.
  const { data: parentResults } = await service
    .from("saju_results")
    .select("id, product_slug")
    .eq("order_id", q.parent_order_id);
  const parent = parentResults?.[0];
  if (!parent) return { ok: false, reason: "no_parent" };

  // 이미 답했으면 그대로(멱등)
  if (q.status === "answered" && hasRealInterpretation(q.answer_md)) {
    return { ok: true, resultId: parent.id, reused: true };
  }

  const { data: input } = await service
    .from("saju_inputs")
    .select("name, birth_date, birth_time, time_unknown, gender, calendar, concerns")
    .eq("order_id", q.parent_order_id)
    .maybeSingle();
  if (!input) return { ok: false, reason: "no_input" };
  if (!isSajuApiConfigured()) return { ok: false, reason: "saju_api_unconfigured" };

  // 같은 생일이라 만세력 캐시에 이미 있다 — 대개 API 0콜.
  const chart = await fetchChart(input as SajuInputRow);
  if ("error" in chart) return { ok: false, reason: "manseryeok", detail: chart.error };

  const prompt = buildExtraQuestionPrompt({
    parentSlug: parent.product_slug, // 말투는 원 결과지 상품을 따른다(산군에게 물었으면 산군이 답한다)
    question: q.question,
    name: input.name,
    myeongsik: chart.myeongsik,
    manseryeokText: chart.manseryeokText,
    birthDate: input.birth_date,
    birthTime: input.birth_time,
    timeUnknown: input.time_unknown,
    gender: input.gender,
    keyFacts: keyFactsFor(parent.product_slug, chart, input as SajuInputRow),
  });

  let text = "";
  try {
    const llm = await generateInterpretation(prompt);
    text = llm.text;
  } catch (e) {
    return { ok: false, reason: "llm", detail: e instanceof Error ? e.message : String(e) };
  }
  if (!hasRealInterpretation(text)) return { ok: false, reason: "llm", detail: "빈 답변" };

  const norm = normalizeResultVoice(text, {
    banmal: parent.product_slug === "sangun-sinjeom",
    name: input.name,
  });

  const { error: saveErr } = await service
    .from("extra_questions")
    .update({ answer_md: norm.text, status: "answered", answered_at: new Date().toISOString() })
    .eq("id", q.id);
  if (saveErr) return { ok: false, reason: "save", detail: saveErr.message };

  return { ok: true, resultId: parent.id, reused: false };
}
