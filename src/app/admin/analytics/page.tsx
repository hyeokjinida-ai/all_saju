import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "관리자 - 방문/행동 분석" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

type Ev = {
  event: string;
  path: string | null;
  referrer: string | null;
  props: Record<string, unknown> | null;
  visitor_id: string | null;
  session_id: string | null;
  created_at: string;
};

const ROW_CAP = 50000;

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

// 일 경계를 한국시간(KST) 기준으로 — created_at(UTC) 을 KST 달력 날짜(YYYY-MM-DD)로.
const KST_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
function kstDay(iso: string): string {
  return KST_FMT.format(new Date(iso));
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPassword("/admin/analytics");
  const { days: daysRaw } = await searchParams;
  const days = [1, 7, 30].includes(Number(daysRaw)) ? Number(daysRaw) : 7;
  const demoMode = !isSupabaseConfigured();

  let events: Ev[] = [];
  let capped = false;
  if (!demoMode) {
    const service = createServiceClient();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await service
      .from("analytics_events")
      .select("event, path, referrer, props, visitor_id, session_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP);
    events = (data ?? []) as Ev[];
    capped = events.length >= ROW_CAP;
  }

  // ── 집계 ──
  const visitors = new Set(events.map((e) => e.visitor_id).filter(Boolean)).size;
  const sessions = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
  const pageviews = events.filter((e) => e.event === "page_view").length;

  // 세션별 위저드 최대 단계 + 결제/로그인벽 플래그
  const maxStep = new Map<string, number>();
  const checkoutSet = new Set<string>();
  const purchaseSet = new Set<string>();
  const loginWallSet = new Set<string>();
  // 세션 → 광고 소재 꼬리표(utm_content). analytics.ts 가 모든 이벤트에 실어 보낸다.
  // 빈 문자열은 「꼬리표 없음」이라 담지 않는다 — 소재 표에서 빠진다.
  const creativeOf = new Map<string, string>();
  const sessionsAll = new Set<string>();
  for (const e of events) {
    const sid = e.session_id;
    if (!sid) continue; // 세션 식별 불가 이벤트는 세션 단위 퍼널 집계에서 제외
    sessionsAll.add(sid);
    const utm = (e.props as { utm?: unknown } | null)?.utm;
    if (typeof utm === "string" && utm && !creativeOf.has(sid)) creativeOf.set(sid, utm);
    if (e.event === "wizard_step") {
      const step = Number((e.props as { step?: unknown })?.step) || 0;
      maxStep.set(sid, Math.max(maxStep.get(sid) ?? 0, step));
    } else if (e.event === "begin_checkout") checkoutSet.add(sid);
    else if (e.event === "purchase") purchaseSet.add(sid);
    else if (e.event === "checkout_login_wall") loginWallSet.add(sid);
  }
  const stepSessions = (n: number) => [...maxStep.values()].filter((v) => v >= n).length;

  // ⚠ 라벨은 SajuWizard 의 STEPS 순서 그대로다(名生時性緣伴業惑覽兆 = 10단계).
  //    예전엕 8칸이었고 5~8번 이름이 실제 질문과 어긋나 있었다(5번을 「양/음력」이라 불렀으나
  //    실제로는 「마음이 가는 쪽」이다). 그대로 두면 「3번에서 빠졌다」를 엉뚟한 질문으로 읽는다.
  //    위저드의 STEPS 를 고치면 여기도 같이 고칠 것.
  // 세션의 **최대** 단계로 세므로, 상품이 안 묻는 질문(伴·業 등)을 건너뛴 세션도
  //    그 칸에 포함된다 — 「여기까지 왔다」는 뜻이라 퍼널 의미로는 맞다.
  const TEASER_STEP = 10; // 마지막 칸(兆) = 결제 직전 개인화 티저
  const FUNNEL = [
    { label: "이름", n: stepSessions(1) },
    { label: "생년월일", n: stepSessions(2) },
    { label: "출생시각", n: stepSessions(3) },
    { label: "성별", n: stepSessions(4) },
    { label: "인연 방향", n: stepSessions(5) },
    { label: "연애 상태", n: stepSessions(6) },
    { label: "직업", n: stepSessions(7) },
    { label: "고민·물음", n: stepSessions(8) },
    { label: "입력 확인", n: stepSessions(9) },
    { label: "무료 티저", n: stepSessions(TEASER_STEP) }, // 여기서 빠지면 티저가 안 먹힌 것
    { label: "결제 시작", n: checkoutSet.size },
    { label: "결제 완료", n: purchaseSet.size },
  ];

  // 소재별 퍼널 — 같은 단계를 꼬리표로 나눴 다시 센다.
  // 이게 있어야 「설화 영상은 위저드는 들어가는데 티저에서 다 빠진다」 같은 진단이 된다.
  const creativeSessions = new Map<string, Set<string>>();
  for (const sid of sessionsAll) {
    const c = creativeOf.get(sid);
    if (!c) continue; // 꼬리표 없는 세션(직접·자연 유입)은 소재 표에서 뺀다
    if (!creativeSessions.has(c)) creativeSessions.set(c, new Set());
    creativeSessions.get(c)!.add(sid);
  }
  const creativeRows = [...creativeSessions.entries()]
    .map(([creative, set]) => {
      const sids = [...set];
      const reached = (n: number) => sids.filter((s) => (maxStep.get(s) ?? 0) >= n).length;
      const buys = sids.filter((s) => purchaseSet.has(s)).length;
      return {
        creative,
        sessions: sids.length,
        wizard: reached(1),
        teaser: reached(TEASER_STEP),
        checkout: sids.filter((s) => checkoutSet.has(s)).length,
        buys,
        cvr: pct(buys, sids.length),
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
  const funnelTop = FUNNEL[0].n || 1;
  const purchases = purchaseSet.size;
  const convRate = pct(purchases, sessions);

  // 일별 방문자
  const byDay = new Map<string, Set<string>>();
  for (const e of events) {
    const d = kstDay(e.created_at);
    if (!byDay.has(d)) byDay.set(d, new Set());
    if (e.visitor_id) byDay.get(d)!.add(e.visitor_id);
  }
  const daily: { date: string; visitors: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = kstDay(new Date(Date.now() - i * 86_400_000).toISOString());
    daily.push({ date: d, visitors: byDay.get(d)?.size ?? 0 });
  }
  const dailyMax = Math.max(1, ...daily.map((d) => d.visitors));

  // 상위 페이지
  const pageCount = new Map<string, number>();
  for (const e of events) {
    if (e.event !== "page_view") continue;
    const p = e.path || "/";
    pageCount.set(p, (pageCount.get(p) ?? 0) + 1);
  }
  const topPages = [...pageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  // 상위 유입원(세션 기준)
  const refSessions = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.referrer || !e.session_id) continue;
    if (!refSessions.has(e.referrer)) refSessions.set(e.referrer, new Set());
    refSessions.get(e.referrer)!.add(e.session_id);
  }
  const topRefs = [...refSessions.entries()]
    .map(([host, set]) => [host, set.size] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const directSessions = sessions - new Set([...refSessions.values()].flatMap((s) => [...s])).size;

  const ranges = [
    { d: 1, label: "오늘" },
    { d: 7, label: "7일" },
    { d: 30, label: "30일" },
  ];

  return (
    <div className="container py-12">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono text-mute mb-2">ADMIN / ANALYTICS</p>
          <h1 className="text-2xl font-semibold tracking-tight">방문/행동 분석</h1>
        </div>
        <div className="flex gap-2">
          {ranges.map((r) => {
            const active = r.d === days;
            return (
              <Link
                key={r.d}
                href={`/admin/analytics?days=${r.d}`}
                className={`px-4 h-8 inline-flex items-center rounded-full text-sm border transition-colors ${active ? "bg-ink text-canvas border-ink" : "border-hairline text-ink hover:border-ink"}`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </header>

      {demoMode ? (
        <div className="rounded-lg border border-hairline bg-canvas p-4 text-xs text-body">
          데모 모드 — DB 미연결. Supabase 연결 후 마이그레이션(0007)을 적용하면 데이터가 쌓입니다.
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-hairline py-16 text-center text-sm text-mute">
          아직 수집된 데이터가 없습니다. 마이그레이션 0007 적용 후 사이트에 방문이 발생하면 표시됩니다.
        </div>
      ) : (
        <>
          {capped && (
            <div className="mb-6 rounded-lg border border-amber-500 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
              이 기간 이벤트가 {ROW_CAP.toLocaleString()}건을 넘어 <strong>최근 {ROW_CAP.toLocaleString()}건만</strong> 집계했습니다.
              오래된 날짜는 데이터가 있어도 0으로 보일 수 있어요. 정확한 장기 집계가 필요하면 별도 집계(DB 사전집계)를 붙여야 합니다.
            </div>
          )}

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { k: "방문자", v: visitors.toLocaleString(), s: "고유" },
              { k: "세션", v: sessions.toLocaleString(), s: "방문 횟수" },
              { k: "페이지뷰", v: pageviews.toLocaleString(), s: "" },
              { k: "결제 완료", v: purchases.toLocaleString(), s: "" },
              { k: "전환율", v: `${convRate}%`, s: "결제/세션" },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-hairline p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-mute">{c.k}</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums">{c.v}</div>
                {c.s && <div className="text-[11px] text-mute mt-0.5">{c.s}</div>}
              </div>
            ))}
          </div>

          {/* 퍼널 */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-1">입력 → 결제 퍼널 (어디서 이탈하나)</h2>
            <p className="text-xs text-mute mb-4">세션 기준. 막대 길이는 첫 단계 대비 비율, 우측은 직전 단계 대비 유지율입니다.</p>
            <div className="space-y-2">
              {FUNNEL.map((f, i) => {
                const prev = i > 0 ? FUNNEL[i - 1].n : f.n;
                const keepFromPrev = i > 0 ? pct(f.n, prev) : 100;
                const drop = i > 0 ? prev - f.n : 0;
                return (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-xs text-body text-right">{f.label}</div>
                    <div className="flex-1 h-7 rounded bg-canvas border border-hairline overflow-hidden relative">
                      <div
                        className="h-full bg-ink/80"
                        style={{ width: `${Math.max(1, pct(f.n, funnelTop))}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-ink">
                        {f.n.toLocaleString()} <span className="text-mute ml-1">({pct(f.n, funnelTop)}%)</span>
                      </span>
                    </div>
                    <div className="w-28 shrink-0 text-xs text-right">
                      {i === 0 ? (
                        <span className="text-mute">시작</span>
                      ) : (
                        <span className={keepFromPrev < 60 ? "text-destructive font-semibold" : "text-mute"}>
                          유지 {keepFromPrev}%{drop > 0 ? ` · -${drop.toLocaleString()}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {loginWallSet.size > 0 && (
              <p className="text-xs text-mute mt-3">
                ※ 비로그인으로 결제 직전에서 막힌 세션: <strong className="text-ink">{loginWallSet.size.toLocaleString()}</strong> — 로그인 마찰로 이탈했을 수 있어요.
              </p>
            )}
          </section>

          {/* 소재별 퍼널 — 광고 링크의 utm_content 로 가른다 */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-1">광고 소재별 퍼널</h2>
            <p className="text-xs text-mute mb-4">
              광고 링크 끝의 <code>utm_content</code> 로 세션을 묶었습니다. 꼬리표가 없는 세션(직접·자연 유입)은 빠집니다.
            </p>
            {creativeRows.length === 0 ? (
              <p className="text-xs text-mute">
                아직 꼬리표가 붙은 유입이 없습니다. 광고를 켜면 여기에 소재별로 나뉘어 쌓입니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-hairline text-mute">
                      <th className="text-left font-medium py-2 pr-3">소재</th>
                      <th className="text-right font-medium py-2 px-2">세션</th>
                      <th className="text-right font-medium py-2 px-2">위저드</th>
                      <th className="text-right font-medium py-2 px-2">무료 티저</th>
                      <th className="text-right font-medium py-2 px-2">결제 시작</th>
                      <th className="text-right font-medium py-2 px-2">구매</th>
                      <th className="text-right font-medium py-2 pl-2">구매율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creativeRows.map((r) => (
                      <tr key={r.creative} className="border-b border-hairline/60">
                        <td className="py-2 pr-3 text-body">{r.creative}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.sessions.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.wizard.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.teaser.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.checkout.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold text-ink">{r.buys.toLocaleString()}</td>
                        <td className="py-2 pl-2 text-right tabular-nums">{r.cvr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 일별 방문자 */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3">일별 방문자</h2>
            <div className="flex items-end gap-1 h-32 border-b border-hairline pb-0">
              {daily.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                  <span className="text-[10px] text-mute opacity-0 group-hover:opacity-100 tabular-nums">{d.visitors}</span>
                  <div
                    className="w-full bg-ink/70 rounded-t"
                    style={{ height: `${Math.max(2, (d.visitors / dailyMax) * 110)}px` }}
                    title={`${d.date}: ${d.visitors}명`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-mute mt-1.5">
              <span>{daily[0]?.date.slice(5)}</span>
              <span>{daily[daily.length - 1]?.date.slice(5)}</span>
            </div>
          </section>

          {/* 상위 페이지 + 유입원 */}
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-sm font-semibold mb-3">상위 페이지 (페이지뷰)</h2>
              <div className="border border-hairline rounded-lg overflow-hidden">
                {topPages.map(([p, n]) => (
                  <div key={p} className="flex items-center justify-between px-3 py-2 border-b border-hairline last:border-0 text-sm">
                    <span className="font-mono text-xs truncate text-body">{p}</span>
                    <span className="tabular-nums shrink-0 ml-2">{n.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold mb-3">유입 경로 (세션)</h2>
              <div className="border border-hairline rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-hairline text-sm">
                  <span className="text-body">직접 방문 / 북마크 · 앱</span>
                  <span className="tabular-nums shrink-0 ml-2">{Math.max(0, directSessions).toLocaleString()}</span>
                </div>
                {topRefs.map(([host, n]) => (
                  <div key={host} className="flex items-center justify-between px-3 py-2 border-b border-hairline last:border-0 text-sm">
                    <span className="font-mono text-xs truncate text-body">{host}</span>
                    <span className="tabular-nums shrink-0 ml-2">{n.toLocaleString()}</span>
                  </div>
                ))}
                {topRefs.length === 0 && (
                  <div className="px-3 py-4 text-xs text-mute text-center">외부 유입 기록이 아직 없습니다.</div>
                )}
              </div>
            </section>
          </div>

        </>
      )}
    </div>
  );
}
