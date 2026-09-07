import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { EXTRA_QUESTION_SLUG, generateResultForOrder } from "@/lib/saju/generate-result";
import { countPendingChapters, hasRealInterpretation } from "@/lib/saju/chapters";

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
  type OrderRow = { id: string; product_id: string; result_attempts: number };
  let orders: OrderRow[] = [];
  let hasAttemptsCol = true;
  const withAttempts = await service
    .from("orders")
    .select("id, product_id, result_attempts")
    .eq("status", "paid")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(200);
  if (withAttempts.error) {
    hasAttemptsCol = false;
    const fallback = await service
      .from("orders")
      .select("id, product_id")
      .eq("status", "paid")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200);
    orders = (fallback.data ?? []).map((o) => ({
      id: o.id as string,
      product_id: o.product_id as string,
      result_attempts: 0,
    }));
  } else {
    orders = (withAttempts.data ?? []).map((o) => ({
      id: o.id as string,
      product_id: o.product_id as string,
      result_attempts: (o.result_attempts as number) ?? 0,
    }));
  }

  const ids = orders.map((o) => o.id);

  // 주문이 결과지를 몇 장 받아야 하는지 — 패키지는 구성품 수만큼이다.
  // 이걸 안 세면 한쪽만 성공한 패키지가 '완료'로 잡혀 나머지 한 장이 영영 안 만들어진다.
  const productIds = [...new Set(orders.map((o) => o.product_id))];
  const { data: products } = productIds.length
    ? await service.from("products").select("id, slug, bundle_slugs").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id as string, p]));
  const expectedFor = (o: OrderRow) => {
    const p = productById.get(o.product_id) as { bundle_slugs?: string[] | null } | undefined;
    return p?.bundle_slugs?.length ? p.bundle_slugs.length : 1;
  };

  const { data: results } = ids.length
    ? await service.from("saju_results").select("order_id, interpretation_md").in("order_id", ids)
    : { data: [] };
  const realCount = new Map<string, number>();
  for (const r of results ?? []) {
    if (!hasRealInterpretation(r.interpretation_md as string)) continue;
    // 자리표시(「준비 중」)가 남은 판은 완성으로 세지 않는다 — 세면 그 장은 영영 안 채워진다.
    // 본문 길이만 보던 옛 판정이 부분 저장분을 '완료'로 잡아 복구 큐에서 빼던 자리다.
    if (countPendingChapters(r.interpretation_md as string)) continue;
    realCount.set(r.order_id as string, (realCount.get(r.order_id as string) ?? 0) + 1);
  }

  // 추가질문권 주문은 결과지를 만들지 않는다 — 답변이 붙었는지로 완료를 판정한다.
  const questionOrderIds = orders
    .filter((o) => (productById.get(o.product_id) as { slug?: string } | undefined)?.slug === EXTRA_QUESTION_SLUG)
    .map((o) => o.id);
  const { data: answered } = questionOrderIds.length
    ? await service.from("extra_questions").select("order_id, status").in("order_id", questionOrderIds)
    : { data: [] };
  const answeredOrders = new Set(
    (answered ?? []).filter((q) => q.status === "answered").map((q) => q.order_id as string),
  );

  const isDone = (o: OrderRow) => {
    const p = productById.get(o.product_id) as { slug?: string } | undefined;
    if (p?.slug === EXTRA_QUESTION_SLUG) return answeredOrders.has(o.id);
    return (realCount.get(o.id) ?? 0) >= expectedFor(o);
  };

  const todo = orders
    .filter((o) => !isDone(o))
    .filter((o) => o.result_attempts < MAX_ATTEMPTS)
    .slice(0, PER_RUN);

  const outcomes: { id: string; ok: boolean; reason?: string }[] = [];
  for (const o of todo) {
    const outcome = await generateResultForOrder(o.id, {
      service,
      allowPartial: o.result_attempts >= PARTIAL_AFTER, // 여러 번 실패하면 부분 결과라도 저장
    });
    // 「저장은 됐는데 아직 채우는 중」은 성공이 아니다 — 다음 회차에 이어 채워야 한다.
    const incomplete = !outcome.ok || !!outcome.pending;
    outcomes.push({
      id: o.id,
      ok: outcome.ok && !outcome.pending,
      reason: outcome.ok ? (outcome.pending ? `미완 ${outcome.pending}장` : undefined) : outcome.reason,
    });
    // 끝나지 않은 건만 시도 횟수 증가(영구 실패 무한루프 차단).
    // ⚠ 미완 저장도 반드시 세야 한다 — 안 세면 결과는 있는데 안 끝난 주문을 크론이 영원히 잡는다.
    if (incomplete && hasAttemptsCol) {
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
