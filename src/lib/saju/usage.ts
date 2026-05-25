// =====================================================
// 사주 API (luckyloveme) 누적 사용량 추적
// =====================================================
// fetchSajuAnalysis() 가 성공/실패할 때마다 saju_api_calls 테이블에 1행 insert.
// /admin 홈에서 누적 카운트와 source 별 breakdown 을 표시.
// 데모 모드(Supabase 미설정) 에서는 기록/조회 모두 skip.

import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const TOTAL_LIMIT = 6000;

export type SajuApiSource = "confirm" | "demo" | "manual";

// 호출 결과 1건 기록 (실패해도 silent — 본 흐름을 막지 않음)
export async function recordSajuApiCall(success: boolean, source: SajuApiSource): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const svc = createServiceClient();
    await svc.from("saju_api_calls").insert({ success, source });
  } catch (err) {
    // 카운터 기록 실패가 본 흐름을 막으면 안 됨
    console.error("[usage] recordSajuApiCall failed:", err);
  }
}

export type UsageStat = {
  used: number;
  limit: number;
  bySource: Record<SajuApiSource, number>;
};

// 전체 누적 사용량 + source 별 breakdown
export async function getTotalUsage(): Promise<UsageStat | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const svc = createServiceClient();

    const { count: total } = await svc
      .from("saju_api_calls")
      .select("id", { count: "exact", head: true });

    // source 별 — 행 자체를 가져와서 카운트 (1 만 행 이하라면 가볍게 처리)
    const { data: rows } = await svc
      .from("saju_api_calls")
      .select("source");

    const bySource: Record<SajuApiSource, number> = { confirm: 0, demo: 0, manual: 0 };
    (rows ?? []).forEach((r) => {
      const s = (r.source ?? "manual") as SajuApiSource;
      if (s in bySource) bySource[s] += 1;
    });

    return { used: total ?? 0, limit: TOTAL_LIMIT, bySource };
  } catch (err) {
    console.error("[usage] getTotalUsage failed:", err);
    return null;
  }
}
