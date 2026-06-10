import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { generateResultForOrder, hasRealInterpretation } from "@/lib/saju/generate-result";

// 결과 미생성 복구 크론 — 결제는 됐는데(paid) 결과지가 없거나 미완성인 주문을 찾아
// 결과지 생성을 재시도한다. luckyloveme/LLM 의 장애로 confirm·자가복구·웹훅이 모두
// 실패했을 때의 최종 백업.
//
// 인증: CRON_SECRET. Vercel Cron 은 CRON_SECRET 환경변수가 있으면
//   Authorization: Bearer <CRON_SECRET> 헤더를 자동으로 붙여 호출한다.
//   (vercel.json 의 crons 설정 참고)

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_DAYS = 3; // 최근 3일 주문만 자동 복구 대상(그 이전은 어드민 수동 처리)
const PER_RUN = 2; // 한 번 실행에 처리할 최대 건수(maxDuration 60s·API 한도 보호)
const MAX_ATTEMPTS = 12; // 영구 실패 주문의 무한 재시도 방지(API 한도 보호)
const PARTIAL_AFTER = 6; // 이만큼 실패하면 부분 결과라도 저장해 고객에게 제공

async function run(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron disabled (CRON_SECRET 미설정)" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  // 최근 paid 주문 — result_attempts 포함 조회. 컬럼(마이그레이션 0006) 미적용 시 폴백.
  type OrderRow = { id: string; result_attempts: number };
  let orders: OrderRow[] = [];
  let hasAttemptsCol = true;
  const withAttempts = await service
    .from("orders")
    .select("id, result_attempts")
    .eq("status", "paid")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(200);
  if (withAttempts.error) {
    hasAttemptsCol = false;
    const fallback = await service
      .from("orders")
      .select("id")
      .eq("status", "paid")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200);
    orders = (fallback.data ?? []).map((o) => ({ id: o.id as string, result_attempts: 0 }));
  } else {
    orders = (withAttempts.data ?? []).map((o) => ({
      id: o.id as string,
      result_attempts: (o.result_attempts as number) ?? 0,
    }));
  }

  const ids = orders.map((o) => o.id);
  const { data: results } = ids.length
    ? await service.from("saju_results").select("order_id, interpretation_md").in("order_id", ids)
    : { data: [] };
  const done = new Set(
    (results ?? []).filter((r) => hasRealInterpretation(r.interpretation_md as string)).map((r) => r.order_id),
  );

  const todo = orders
    .filter((o) => !done.has(o.id))
    .filter((o) => o.result_attempts < MAX_ATTEMPTS)
    .slice(0, PER_RUN);

  const outcomes: { id: string; ok: boolean; reason?: string }[] = [];
  for (const o of todo) {
    const outcome = await generateResultForOrder(o.id, {
      service,
      allowPartial: o.result_attempts >= PARTIAL_AFTER, // 여러 번 실패하면 부분 결과라도 저장
    });
    outcomes.push({ id: o.id, ok: outcome.ok, reason: outcome.ok ? undefined : outcome.reason });
    // 실패한 건만 시도 횟수 증가(영구 실패 무한루프 차단). 성공은 결과가 생겨 다음 스캔에서 제외됨.
    if (!outcome.ok && hasAttemptsCol) {
      await service
        .from("orders")
        .update({ result_attempts: o.result_attempts + 1, result_last_attempt_at: new Date().toISOString() })
        .eq("id", o.id);
    }
  }

  const recovered = outcomes.filter((o) => o.ok).length;
  return NextResponse.json({ scanned: ids.length, attempted: todo.length, recovered, outcomes });
}

export async function GET(request: NextRequest) {
  return run(request);
}
export async function POST(request: NextRequest) {
  return run(request);
}
