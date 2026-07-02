// =====================================================
// 만세력(luckyloveme) 분석 영속 캐시 — 6000콜 한도 절감
// =====================================================
// 동일 생일(생년월일·시각·성별·달력)의 분석 결과를 saju_analysis_cache 에 저장해,
// 재방문·리트라이·다중 인스턴스·무료→결제 재조회를 전부 0콜로 만든다.
// fetchSajuAnalysis() 내부에서 demo/confirm 호출에만 read-through 로 쓰인다.
// 테이블이 아직 없거나 오류여도 조용히 미스 처리 → 본 흐름(분석)을 절대 막지 않는다.

import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { BirthInfo, AnalysisField, SajuAnalysisResponse } from "./saju-api";

// 안정적 캐시 키 — 무료(chart)·유료(generate)가 각자 toBirthInfo 로 만든 BirthInfo 라도
// 같은 사람이면 동일 문자열이 나오도록 필드를 명시적으로 나열(객체 키 순서에 의존 X).
// ⚠️ 응답에는 원국(불변)뿐 아니라 시점 의존 값(세운 '올해'·월운 12개월창·현재나이·현재대운)이
// 섞여 있다. 그래서 키에 현재 연-월(YYYY-MM)을 넣어 월이 바뀌면 새로 조회한다 —
// 같은 기간의 재방문·무료→결제 재조회는 히트(콜 절감), 해/달 경계에선 신선한 데이터를 받는다.
export function birthCacheKey(b: BirthInfo, fields: AnalysisField[] = []): string {
  const hour =
    b.birthHour != null && b.birthHour !== "" ? `${b.birthHour}:${b.birthMinute ?? "0"}` : "-";
  const f = fields.length ? [...fields].sort().join(",") : "all";
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  return [
    period,
    b.birthYear,
    b.birthMonth,
    b.birthDay,
    hour,
    b.calendarType,
    b.isLeapMonth ? "leap" : "-",
    b.gender,
    f,
  ].join("|");
}

export async function getCachedAnalysis(key: string): Promise<SajuAnalysisResponse | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("saju_analysis_cache")
      .select("analysis")
      .eq("birth_key", key)
      .maybeSingle();
    return (data?.analysis as SajuAnalysisResponse) ?? null;
  } catch {
    return null; // 테이블 부재·오류 → 미스로 폴백(본 흐름 안 막음)
  }
}

export async function putCachedAnalysis(key: string, analysis: SajuAnalysisResponse): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const svc = createServiceClient();
    await svc
      .from("saju_analysis_cache")
      .upsert({ birth_key: key, analysis: analysis as never }, { onConflict: "birth_key" });
  } catch {
    /* 캐시 저장 실패는 무시 — 분석은 이미 성공 */
  }
}
