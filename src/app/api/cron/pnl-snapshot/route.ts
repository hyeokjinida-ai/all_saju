import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { kstDaysAgo, kstToday, snapshotFacts } from "@/lib/pnl";
import { syncExternal } from "@/lib/pnl-sync";

// 일별 손익 스냅샷 — 자정 조금 지나 어제까지를 확정해 daily_pnl 에 적는다.
//
// 왜 최근 N일을 다시 계산하나: ①가상계좌는 며칠 뒤 입금된다 ②환불이 나중에 잡힌다
// ③메타 지출·기여는 며칠에 걸쳐 보정된다. 어제 하루만 쓰면 이 셋이 영영 반영되지 않는다.
//
// ⚠ Vercel Hobby 는 **크론 하루 1회**까지다(개수 제한은 2026-01 해제, 빈도 제한은 유지).
//   그래서 00:30 KST 한 번만 돈다. 화면(/admin/pnl)은 크론과 무관하게 항상 DB 에서
//   다시 계산하므로, 크론이 밀려도 형님이 보는 숫자는 최신이다.
//
// 인증: CRON_SECRET (Vercel Cron 이 Authorization: Bearer 로 자동 첨부).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKFILL_DAYS = 7;

async function run(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron disabled (CRON_SECRET 미설정)" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const from = kstDaysAgo(BACKFILL_DAYS);
  const to = kstToday();

  try {
    // 1) 밖에서 오는 것 먼저 — 환불이 orders 에 적혀야 아래 집계가 그걸 반영한다.
    const sync = await syncExternal(service, from, to);
    // 2) DB 안의 사실 집계
    const saved = await snapshotFacts(service, from, to);
    return NextResponse.json({ ok: true, from, to, saved, sync });
  } catch (e) {
    // 테이블이 아직 없으면(0013 미적용) 여기로 온다 — 화면은 그래도 돈다.
    return NextResponse.json({ ok: false, from, to, error: e instanceof Error ? e.message : String(e) });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}
export async function POST(request: NextRequest) {
  return run(request);
}
