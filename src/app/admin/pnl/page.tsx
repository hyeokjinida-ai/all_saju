import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatKRW } from "@/lib/utils";
import { buildPnlRows, isPnlSchemaReady, kstDaysAgo, kstToday, totalRow, type PnlRow } from "@/lib/pnl";
import { PG_RATE, VAT_LABEL, VAT_MODE, META_CAMPAIGN_PREFIX } from "@/config/pnl";
import { saveManualAdSpend, toggleExcludeFromPnl } from "./actions";

export const metadata = { title: "관리자 - 일별 손익" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

const won = (n: number) => formatKRW(Math.round(n));
const wonOrDash = (n: number | null) => (n === null ? "—" : won(n));

export default async function AdminPnlPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPassword("/admin/pnl");

  const { days } = await searchParams;
  const span = Math.min(180, Math.max(7, Number(days) || 30));
  const to = kstToday();
  const from = kstDaysAgo(span - 1);

  if (!isSupabaseConfigured()) {
    return (
      <Shell span={span}>
        <p className="text-sm text-body">Supabase 가 설정되지 않았습니다.</p>
      </Shell>
    );
  }

  const service = createServiceClient();

  let rows: PnlRow[] = [];
  let loadError: string | null = null;
  try {
    rows = await buildPnlRows(service, from, to);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const total = rows.length ? totalRow(rows) : null;
  const today = rows[0];

  // 0013 적용 여부 — 적용 전에는 광고비를 저장해도 사라진다. 그 사실을 화면이 먼저 말한다.
  const schemaReady = await isPnlSchemaReady(service);

  // 손익에서 뺀 주문 + 뺄 후보(최근 결제) — 형님 테스트 결제를 골라내는 자리.
  // 0013 전에는 exclude_from_pnl 컬럼이 없어 select 전체가 깨진다 → 컬럼 없이 폴백한다.
  type RecentOrder = {
    id: string;
    amount: number;
    paid_at: string | null;
    created_at: string;
    guest_email: string | null;
    exclude_from_pnl?: boolean;
  };
  const baseCols = "id, amount, paid_at, created_at, guest_email";
  const recent = await service
    .from("orders")
    .select(`${baseCols}, exclude_from_pnl`)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(12);
  let recentOrders: RecentOrder[] = [];
  if (!recent.error) {
    recentOrders = recent.data as unknown as RecentOrder[];
  } else {
    const fb = await service
      .from("orders")
      .select(baseCols)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(12);
    recentOrders = (fb.data ?? []) as unknown as RecentOrder[];
  }

  return (
    <Shell span={span}>
      {!schemaReady && (
        <div className="mb-6 border border-[#e7b2a8] bg-[#fff7f5] px-4 py-3 text-[13px] leading-relaxed text-ink">
          <b>아직 저장이 안 됩니다 — 0013 마이그레이션을 한 번 돌려 주세요.</b>
          <br />
          <span className="text-body">
            지금은 매출·원가만 계산합니다. 광고비 칸에 숫자를 넣어도 <b>저장되지 않습니다</b>(표가 담길 테이블이 없어서
            입니다). Supabase 대시보드 → SQL Editor 에{" "}
            <span className="font-mono">supabase/migrations/0013_daily_pnl.sql</span> 을 붙여넣고 Run 하면, 이 안내가
            사라지고 광고비·환불·토큰 원가가 전부 살아납니다.
          </span>
        </div>
      )}

      {loadError && (
        <div className="mb-6 border border-hairline bg-[#fff7f5] px-4 py-3 text-[13px] text-ink">
          집계를 못 읽었습니다: <span className="font-mono">{loadError}</span>
          <br />
          <span className="text-body">
            0013_daily_pnl.sql 을 Supabase SQL Editor 에서 Run 하면 해결됩니다(마이그레이션 전에도 표는 뜹니다).
          </span>
        </div>
      )}

      {today && (
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="오늘 매출" value={won(today.netRevenue)} sub={`${today.ordersCount}건`} />
          <Kpi
            label="오늘 광고비"
            value={wonOrDash(today.adSpend)}
            sub={today.adSpend === null ? "미수신" : today.adSpendSource === "manual" ? "수동 입력" : "메타"}
            warn={today.adSpend === null}
          />
          <Kpi label="오늘 ROAS" value={today.roas ? today.roas.toFixed(2) : "—"} sub={today.cpa ? `CPA ${won(today.cpa)}` : ""} />
          <Kpi
            label="오늘 순손익"
            value={today.net === null ? "미확정" : won(today.net)}
            sub={today.net === null ? "광고비 미수신" : VAT_LABEL[VAT_MODE]}
            warn={today.net === null}
            good={today.net !== null && today.net > 0}
            bad={today.net !== null && today.net < 0}
          />
        </section>
      )}

      {total && (
        <section className="mb-8 border border-hairline px-4 py-4">
          <p className="text-xs font-mono text-mute mb-2">
            {from} ~ {to} 누적
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            <span>
              매출 <b className="text-ink">{won(total.netRevenue)}</b> ({total.ordersCount}건)
            </span>
            <span>
              광고비 <b className="text-ink">{wonOrDash(total.adSpend)}</b>
            </span>
            <span>
              ROAS <b className="text-ink">{total.roas ? total.roas.toFixed(2) : "—"}</b>
            </span>
            <span>
              CPA <b className="text-ink">{total.cpa ? won(total.cpa) : "—"}</b>
            </span>
            <span>
              객단가 <b className="text-ink">{total.aov ? won(total.aov) : "—"}</b>
            </span>
            <span>
              순손익{" "}
              <b className={total.net === null ? "text-mute" : total.net >= 0 ? "text-ink" : "text-[#c0392b]"}>
                {total.net === null ? "미확정" : won(total.net)}
              </b>
            </span>
          </div>
          {total.adSpendMissingDays > 0 && (
            <p className="mt-2 text-[12px] text-[#c0392b]">
              광고비를 못 받은 날이 {total.adSpendMissingDays}일 있어 누적 순손익을 내지 않았습니다. 아래 표의 광고비 칸에
              직접 넣으면 바로 계산됩니다.
            </p>
          )}
        </section>
      )}

      <div className="overflow-x-auto border border-hairline">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead className="bg-[#fafafa] text-left text-xs text-body">
            <tr>
              <th className="px-3 py-2 font-medium">날짜</th>
              <th className="px-3 py-2 text-right font-medium">건수</th>
              <th className="px-3 py-2 text-right font-medium">매출</th>
              <th className="px-3 py-2 text-right font-medium">광고비</th>
              <th className="px-3 py-2 text-right font-medium">CPA</th>
              <th className="px-3 py-2 text-right font-medium">ROAS</th>
              <th className="px-3 py-2 text-right font-medium">LLM</th>
              <th className="px-3 py-2 text-right font-medium">PG</th>
              <th className="px-3 py-2 text-right font-medium">부가세</th>
              <th className="px-3 py-2 text-right font-medium">순손익</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r) => {
              const quiet = r.ordersCount === 0 && r.adSpend === null;
              return (
                <tr key={r.day} className={quiet ? "text-mute" : ""}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.day}</td>
                  <td className="px-3 py-2 text-right">
                    {r.ordersCount || "—"}
                    {r.refundCount > 0 && <span className="text-[#c0392b]"> −{r.refundCount}</span>}
                    {r.metaPurchases !== null && r.metaPurchases !== r.ordersCount && (
                      <span className="ml-1 text-[11px] text-mute" title="메타가 잡은 구매 수">
                        (메타 {r.metaPurchases})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.netRevenue ? won(r.netRevenue) : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={saveManualAdSpend} className="flex items-center justify-end gap-1">
                      <input type="hidden" name="day" value={r.day} />
                      <input
                        type="text"
                        name="amount"
                        inputMode="numeric"
                        defaultValue={r.adSpend === null ? "" : String(Math.round(r.adSpend))}
                        placeholder="미수신"
                        className={`w-24 border px-2 py-1 text-right font-mono text-xs ${
                          r.adSpend === null ? "border-[#e7b2a8] bg-[#fff7f5] placeholder:text-[#c0392b]" : "border-hairline"
                        }`}
                      />
                      <button type="submit" className="text-[11px] text-body underline underline-offset-2">
                        저장
                      </button>
                    </form>
                    {r.adSpendSource && (
                      <span className="mt-0.5 block text-[10px] text-mute">
                        {r.adSpendSource === "manual" ? "수동" : "메타 API"}
                        {r.adSpendOther ? ` · 기타 ${won(r.adSpendOther)}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.cpa ? won(r.cpa) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.roas ? r.roas.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-mute">
                    {r.llmCost ? won(r.llmCost) : "—"}
                    {r.llmCost > 0 && r.llmCostEstimated && <span title="토큰 기록 전 — 상수 추정">*</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-mute">
                    {r.pgFee ? won(r.pgFee) : "—"}
                    {r.pgFee > 0 && r.pgFeeEstimated && <span title="요율 추정(토스 정산 전)">*</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-mute">{r.vat ? won(r.vat) : "—"}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-semibold ${
                      r.net === null ? "text-mute" : r.net >= 0 ? "text-ink" : "text-[#c0392b]"
                    }`}
                  >
                    {r.net === null ? (r.ordersCount || r.resultsCount ? "미확정" : "—") : won(r.net)}
                  </td>
                </tr>
              );
            })}
            {total && (
              <tr className="bg-[#fafafa] font-semibold">
                <td className="px-3 py-2 font-mono text-xs">합계</td>
                <td className="px-3 py-2 text-right">{total.ordersCount}</td>
                <td className="px-3 py-2 text-right font-mono">{won(total.netRevenue)}</td>
                <td className="px-3 py-2 text-right font-mono">{wonOrDash(total.adSpend)}</td>
                <td className="px-3 py-2 text-right font-mono">{total.cpa ? won(total.cpa) : "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{total.roas ? total.roas.toFixed(2) : "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{won(total.llmCost)}</td>
                <td className="px-3 py-2 text-right font-mono">{won(total.pgFee)}</td>
                <td className="px-3 py-2 text-right font-mono">{won(total.vat)}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    total.net === null ? "text-mute" : total.net >= 0 ? "text-ink" : "text-[#c0392b]"
                  }`}
                >
                  {total.net === null ? "미확정" : won(total.net)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-body leading-relaxed">
        <b>*</b> 는 추정값입니다. LLM 은 토큰 기록 이전 결과지, PG 는 토스 정산 전입니다. 광고비 칸은 직접 고쳐 넣을 수
        있고, 넣은 값이 자동 수신분을 이깁니다. 빈칸으로 저장하면 자동값으로 돌아갑니다.
      </p>

      <section className="mt-10">
        <h2 className="mb-1 text-sm font-semibold text-ink">손익에서 뺄 주문</h2>
        <p className="mb-3 text-[12px] text-body">테스트 결제를 빼 두면 매출·ROAS·CPA 에서 모두 빠집니다.</p>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {recentOrders.map((o) => {
            const excluded = o.exclude_from_pnl === true;
            return (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className={excluded ? "text-mute line-through" : ""}>
                  <span className="font-mono text-xs">
                    {String(o.paid_at ?? o.created_at).slice(0, 16).replace("T", " ")}
                  </span>{" "}
                  · {won(o.amount)}{" "}
                  <span className="text-mute">{(o.guest_email ?? "").split("@")[0] || "회원"}</span>
                </span>
                <form action={toggleExcludeFromPnl}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="next" value={excluded ? "0" : "1"} />
                  <button type="submit" className="text-[12px] text-body underline underline-offset-2 hover:text-ink">
                    {excluded ? "되돌리기" : "손익 제외"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 border-t border-hairline pt-5 text-[12px] text-body leading-relaxed">
        <p className="mb-1 font-semibold text-ink">계산에 쓴 값</p>
        <p>
          부가세 <b>{VAT_LABEL[VAT_MODE]}</b> — 표시가는 부가세 포함이라 매출의 10% 가 아니라 10/110 입니다. 과세유형이
          다르면 <span className="font-mono">PNL_VAT_MODE</span> 를 바꾸세요(general·simplified·exempt).
        </p>
        <p>
          PG 수수료 <b>{(PG_RATE * 100).toFixed(2)}%</b> (토스 정산값이 오면 그 값이 이깁니다) ·{" "}
          <span className="font-mono">PNL_PG_RATE</span>
        </p>
        <p>
          광고비 집계 캠페인 접두사 <b className="font-mono">{META_CAMPAIGN_PREFIX}</b> ·{" "}
          <span className="font-mono">PNL_META_CAMPAIGN_PREFIX</span>
        </p>
        <p className="mt-2">
          메타 광고비는 부가세가 붙지 않습니다(광고 계정에 사업자번호 인증 완료, 2026-09-12 실측). OpenAI·Vercel 도
          해외라 매입세액 공제 대상이 아닙니다.
        </p>
      </section>
    </Shell>
  );
}

function Shell({ children, span }: { children: React.ReactNode; span: number }) {
  return (
    <div className="container max-w-4xl py-12">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="mb-2 font-mono text-xs text-mute">ADMIN</p>
          <h1 className="text-2xl font-semibold tracking-tight">일별 손익</h1>
        </div>
        <Link href="/admin" className="text-xs text-body underline underline-offset-2 hover:text-ink">
          ← 관리자
        </Link>
      </header>

      <nav className="mb-6 flex items-center gap-3 text-[13px]">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/pnl?days=${d}`}
            className={span === d ? "font-semibold text-ink" : "text-body hover:text-ink"}
          >
            {d}일
          </Link>
        ))}
        <a href={`/api/admin/pnl/csv?days=${span}`} className="ml-auto text-body underline underline-offset-2 hover:text-ink">
          CSV 내려받기
        </a>
      </nav>

      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  warn,
  good,
  bad,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  return (
    <div className={`border px-3 py-3 ${warn ? "border-[#e7b2a8] bg-[#fff7f5]" : "border-hairline"}`}>
      <p className="mb-1 text-[11px] text-body">{label}</p>
      <p
        className={`font-mono text-lg font-semibold ${
          warn ? "text-[#c0392b]" : bad ? "text-[#c0392b]" : good ? "text-ink" : "text-ink"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-mute">{sub}</p>}
    </div>
  );
}

