import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/env";
import { buildPnlRows, kstDaysAgo, kstToday } from "@/lib/pnl";

// 손익 표를 CSV 로 — 형님이 시트에서 따로 보고 싶을 때.
// 화면과 같은 계산을 쓰므로 숫자가 갈리지 않는다.

export const dynamic = "force-dynamic";

const HEADER = [
  "날짜",
  "결제건수",
  "매출",
  "환불",
  "광고비",
  "광고비출처",
  "CPA",
  "ROAS",
  "LLM원가",
  "PG수수료",
  "부가세",
  "순손익",
  "결과지수",
  "만세력호출",
];

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase 미설정" }, { status: 500 });
  }

  const span = Math.min(365, Math.max(7, Number(request.nextUrl.searchParams.get("days")) || 30));
  const to = kstToday();
  const from = kstDaysAgo(span - 1);

  const rows = await buildPnlRows(createServiceClient(), from, to);
  const num = (n: number | null) => (n === null ? "" : String(Math.round(n)));

  const lines = [
    HEADER.join(","),
    ...rows.map((r) =>
      [
        r.day,
        r.ordersCount,
        r.revenue,
        r.refundAmount,
        num(r.adSpend),
        r.adSpendSource ?? "미수신",
        num(r.cpa),
        r.roas ? r.roas.toFixed(2) : "",
        num(r.llmCost),
        num(r.pgFee),
        num(r.vat),
        num(r.net),
        r.resultsCount,
        r.manseryeokCalls,
      ].join(","),
    ),
  ];

  // 엑셀이 UTF-8 을 알아보게 BOM 을 붙인다(없으면 한글 헤더가 깨진다).
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pnl_${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
