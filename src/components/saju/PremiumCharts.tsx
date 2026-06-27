// 프리미엄/심화 결과지 시각화 — raw_analysis(luckyloveme 16종)에서 십성 분포 + 대운 60년 타임라인.
// 데이터가 없으면(과거 결과 등) 조용히 렌더 생략.

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (v == null ? "" : String(v));

const SIPSEONG = [
  { key: "inseong", label: "인성", desc: "학습·지혜", color: "#7aa6c2" },
  { key: "bigyeop", label: "비겁", desc: "자아·독립", color: "#cda86a" },
  { key: "siksang", label: "식상", desc: "표현·재능", color: "#6fae5e" },
  { key: "jaeseong", label: "재성", desc: "재물·현실", color: "#d4a23d" },
  { key: "gwanseong", label: "관성", desc: "책임·명예", color: "#c8553d" },
] as const;

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
      <h2 className="font-myeongjo text-sm font-semibold text-gold tracking-[0.1em]">{title}</h2>
      <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
    </div>
  );
}

// ── 십성 분포 차트 ──
export function SipseongChart({ analysis }: { analysis: unknown }) {
  const summary = rec(rec(rec(analysis).sipseong).summary);
  const has = SIPSEONG.some((s) => typeof summary[s.key] === "number");
  if (!has) return null;
  const max = Math.max(1, ...SIPSEONG.map((s) => num(summary[s.key])));

  return (
    <section className="mb-11">
      <SectionTitle title="십성 분포 · 十星" />
      <div className="rounded-md border border-gold-line bg-[rgba(36,16,71,0.4)] px-5 py-6 sm:px-7">
        <div className="space-y-3">
          {SIPSEONG.map((s) => {
            const c = num(summary[s.key]);
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="font-myeongjo text-xs w-[92px] shrink-0">
                  <span className="text-bone-soft">{s.label}</span>
                  <span className="text-bone-faint"> · {s.desc}</span>
                </span>
                <div className="flex-1 h-3.5 rounded-sm overflow-hidden bg-[rgba(150,90,255,0.07)]">
                  <div className="h-full rounded-sm" style={{ width: `${(c / max) * 100}%`, background: s.color, opacity: c === 0 ? 0.25 : 0.9 }} />
                </div>
                <span className="font-mono text-xs text-bone-faint w-5 text-right">{c}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-5 pt-4 border-t border-gold-pale text-xs text-bone-soft leading-relaxed">
          십성은 나(일간)와 나머지 글자의 관계예요. 어느 기운이 강하고 약한지가 돈·일·관계의 타고난 결을 보여줍니다.
        </p>
      </div>
    </section>
  );
}

// ── 2026 월별 운 흐름 그래프 ──
// 각 달의 오행을 용신·희신(좋음) / 기신·구신(조심) 과 대조해 좋음·보통·조심 산출(명리 근거).
export function MonthlyLuckChart({ analysis }: { analysis: unknown }) {
  const a = rec(analysis);
  const w = rec(a.weolun);
  const raw = [w.recentWeoluns, [w.currentWeolun], w.upcomingWeoluns].flatMap((x) => (Array.isArray(x) ? x : []));
  const map = new Map<string, Record<string, unknown>>();
  for (const m of raw) {
    const o = rec(m);
    if (o.year && o.month) map.set(`${o.year}-${o.month}`, o);
  }
  const months = [...map.values()].sort((x, y) => num(x.year) * 12 + num(x.month) - (num(y.year) * 12 + num(y.month)));
  if (months.length < 6) return null;

  // 현재 달부터 향후 흐름(최대 12개월)
  const curIdx = months.findIndex((m) => m.isCurrentMonth);
  const window = (curIdx >= 0 ? months.slice(curIdx) : months).slice(0, 12);

  const gg = rec(a.gyeokguk);
  const good = new Set([str(rec(gg.yongsin).오행), str(gg.희신오행)].filter(Boolean));
  const bad = new Set([str(gg.기신오행), str(gg.구신오행)].filter(Boolean));
  const rate = (m: Record<string, unknown>): -1 | 0 | 1 => {
    let s = 0;
    for (const el of [str(m.ganElement), str(m.jiElement)]) {
      if (good.has(el)) s += 1;
      if (bad.has(el)) s -= 1;
    }
    return s > 0 ? 1 : s < 0 ? -1 : 0;
  };
  const STYLE = {
    1: { h: 100, color: "#6fae5e", label: "좋음" },
    0: { h: 52, color: "#cda86a", label: "보통" },
    [-1]: { h: 30, color: "#bd6a52", label: "조심" },
  } as const;

  return (
    <section className="mb-11">
      <SectionTitle title="2026 월별 운 흐름 · 月運" />
      <div className="rounded-md border border-gold-line bg-[rgba(36,16,71,0.4)] p-5 sm:p-6">
        <div className="flex items-end justify-between gap-1.5 h-[120px]">
          {window.map((m, i) => {
            const r = rate(m);
            const s = STYLE[r];
            const now = !!m.isCurrentMonth;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full max-w-[22px] rounded-t-sm"
                  style={{ height: `${s.h}%`, background: s.color, opacity: now ? 1 : 0.78, boxShadow: now ? "0 0 10px rgba(150,90,255,0.5)" : "none" }}
                />
                <span className={`mt-1.5 font-mono text-[9px] ${now ? "text-gold-bright font-bold" : "text-bone-faint"}`}>{str(m.month)}월</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gold-pale flex items-center gap-4 text-[10px] text-bone-faint">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#6fae5e" }} />좋음</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#cda86a" }} />보통</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#bd6a52" }} />조심</span>
          <span className="ml-auto text-bone-soft">큰 결정은 좋은 달에, 무리는 조심할 달을 피해서</span>
        </div>
      </div>
    </section>
  );
}

// ── 대운 60년 타임라인 ──
export function DaeunTimeline({ analysis }: { analysis: unknown }) {
  const daeun = rec(rec(analysis).daeun);
  const all = Array.isArray(daeun.all_daeun) ? (daeun.all_daeun as unknown[]) : [];
  if (all.length === 0) return null;
  const curSeq = num(rec(daeun.current_daeun).sequence);

  return (
    <section className="mb-11">
      <SectionTitle title="대운 60년 흐름 · 大運" />
      <div className="rounded-md border border-gold-line bg-[rgba(36,16,71,0.4)] p-5 sm:p-6">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
          {all.map((d, i) => {
            const o = rec(d);
            const isNow = num(o.sequence) === curSeq;
            const cat = str(rec(o.sipseong).ganCategory).replace("성", "");
            return (
              <div
                key={i}
                className="shrink-0 w-[78px] rounded-md px-2 py-3 text-center"
                style={{
                  border: isNow ? "1.5px solid var(--gold)" : "1px solid var(--gold-pale)",
                  background: isNow ? "rgba(150,90,255,0.14)" : "rgba(36,16,71,0.4)",
                }}
              >
                <div className="font-mono text-[9px] text-bone-faint tracking-[0.05em]">{str(o.age_start)}~{str(o.age_end)}세</div>
                <div className={`font-brush text-[22px] leading-none my-1.5 ${isNow ? "text-gold-bright glow-gold" : "text-bone-soft"}`}>
                  {str(o.ganji_hanja) || str(o.ganji)}
                </div>
                <div className={`font-myeongjo text-[10px] ${isNow ? "text-gold" : "text-bone-faint"}`}>{cat || str(o.ganji)}</div>
                {isNow && <div className="font-mono text-[8px] text-gold-bright mt-1 tracking-[0.1em]">지금</div>}
              </div>
            );
          })}
        </div>
        <p className="mt-4 pt-4 border-t border-gold-pale text-xs text-bone-soft leading-relaxed">
          10년마다 바뀌는 인생의 큰 계절이에요. <b className="text-gold-bright">지금</b> 표시가 현재 대운 — 본문에서 시기별 흐름을 자세히 풀어드립니다. (좌우로 넘겨보세요)
        </p>
      </div>
    </section>
  );
}
