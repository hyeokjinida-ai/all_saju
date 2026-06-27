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
import { buildChapterPrompts } from "@/lib/saju/prompt";
import { generateByChapters } from "@/lib/saju/llm";
import {
  isSajuApiConfigured,
  fetchSajuAnalysis,
  formatSajuCompact,
  buildKeyFactsBlock,
  ganjiToMyeongsik,
  type BirthInfo,
} from "@/lib/saju/saju-api";

type SajuInputRow = {
  name: string | null;
  birth_date: string; // "YYYY-MM-DD"
  birth_time: string | null; // "HH:mm" | "HH:mm:ss"
  time_unknown: boolean;
  calendar: "solar" | "lunar";
  gender: "male" | "female";
  concerns: string[];
};

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

// 결과지 본문이 '실제로 채워졌는지' 판정.
// generateByChapters 는 전 챕터 실패 시 "## 제목\n\n" 만 반환 → 미완성으로 본다.
export function hasRealInterpretation(md: string | null | undefined): boolean {
  if (!md) return false;
  const body = md.replace(/^#{1,3}\s.*$/gm, "").trim(); // 헤딩 줄 제거 후 본문만
  return body.length >= 40;
}

export type GenerateReason =
  | "no_order"
  | "no_input"
  | "not_paid"
  | "saju_api_unconfigured"
  | "manseryeok"
  | "llm"
  | "save";

export type GenerateOutcome =
  | { ok: true; resultId: string; reused: boolean }
  | { ok: false; reason: GenerateReason; detail?: string };

// paid 주문 1건의 결과지를 생성/저장(멱등). 호출자는 결제 승인 책임만 진다.
// allowPartial: 기본 false → 챕터의 80% 이상 성공해야 저장(부분 결과는 보류 후 재시도).
//   복구 크론이 여러 번 실패한 주문(attempts↑)엔 true 로 호출해, 끝내 부분 결과라도 제공한다.
export async function generateResultForOrder(
  orderUuid: string,
  opts?: { service?: SupabaseClient; allowPartial?: boolean },
): Promise<GenerateOutcome> {
  const service = opts?.service ?? createServiceClient();

  // 0. 이미 정상 결과가 있으면 재사용(멱등)
  const { data: existing } = await service
    .from("saju_results")
    .select("id, interpretation_md")
    .eq("order_id", orderUuid)
    .maybeSingle();
  if (existing && hasRealInterpretation(existing.interpretation_md)) {
    return { ok: true, resultId: existing.id, reused: true };
  }

  // 1. 주문 — paid 만 생성
  const { data: order } = await service
    .from("orders")
    .select("id, status, product_id")
    .eq("id", orderUuid)
    .maybeSingle();
  if (!order) return { ok: false, reason: "no_order" };
  if (order.status !== "paid") return { ok: false, reason: "not_paid" };

  const { data: input } = await service
    .from("saju_inputs")
    .select("name, birth_date, birth_time, time_unknown, gender, calendar, concerns")
    .eq("order_id", orderUuid)
    .maybeSingle();
  const { data: product } = await service
    .from("products")
    .select("slug, name")
    .eq("id", order.product_id)
    .maybeSingle();
  if (!input || !product) return { ok: false, reason: "no_input" };

  // 2. 명식 — luckyloveme(정확)만. 부정확한 mock 폴백은 쓰지 않는다.
  if (!isSajuApiConfigured()) return { ok: false, reason: "saju_api_unconfigured" };

  let myeongsik: Myeongsik | null = null;
  let manseryeokText: string | undefined;
  let keyFacts: string | undefined;
  let rawAnalysis: unknown = null;
  try {
    const birthInfo = toBirthInfo(input as SajuInputRow);
    const analysis = await fetchSajuAnalysis(birthInfo, [], { source: "confirm" }); // [] = 16종 전체
    rawAnalysis = analysis;
    const converted = ganjiToMyeongsik(analysis);
    if (converted) {
      myeongsik = converted;
      manseryeokText = formatSajuCompact(analysis, birthInfo);
      keyFacts = buildKeyFactsBlock(analysis, birthInfo);
    }
  } catch (apiErr) {
    return { ok: false, reason: "manseryeok", detail: apiErr instanceof Error ? apiErr.message : String(apiErr) };
  }
  if (!myeongsik) return { ok: false, reason: "manseryeok", detail: "ganji missing" };

  // 3. LLM 풀이
  const { title, chapters } = buildChapterPrompts({
    productSlug: product.slug,
    productName: product.name,
    name: input.name,
    myeongsik,
    manseryeokText,
    birthDate: input.birth_date,
    birthTime: input.birth_time,
    timeUnknown: input.time_unknown,
    gender: input.gender,
    concerns: input.concerns,
    keyFacts,
  });
  const llm = await generateByChapters(title, chapters);

  // 완성도 검증 — 빈/부분 결과지를 저장하면 멱등 재시도/복구 큐에서 영구 제외되어
  // 유료 고객이 잘린 풀이를 받는다. 기본은 80% 이상 챕터 성공을 요구하고,
  // 부분이라도 저장해야 하는 최후 상황(allowPartial)에선 본문만 있으면 통과.
  const total = llm.totalCount ?? 1;
  const success = llm.successCount ?? (llm.provider ? 1 : 0);
  const minOk = opts?.allowPartial ? 1 : Math.ceil(total * 0.8);
  if (!llm.provider || !hasRealInterpretation(llm.text) || success < minOk) {
    return { ok: false, reason: "llm", detail: `완성도 ${success}/${total}` };
  }

  // 4. 저장(멱등 upsert — 미완성 행이 있었다면 덮어쓴다)
  const { data: result, error: saveErr } = await service
    .from("saju_results")
    .upsert(
      {
        order_id: orderUuid,
        myeongsik: myeongsik as never,
        interpretation_md: llm.text,
        llm_provider: llm.provider,
        llm_model: llm.model,
        raw_analysis: rawAnalysis as never,
      },
      { onConflict: "order_id" },
    )
    .select("id")
    .single();

  if (saveErr || !result) return { ok: false, reason: "save", detail: saveErr?.message };
  return { ok: true, resultId: result.id, reused: false };
}
