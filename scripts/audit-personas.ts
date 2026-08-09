// 결정론 레이어 전수 감사 — 페르소나 50인의 **계산값만** 훑는다 (LLM 0원).
//
//   npx tsx scripts/audit-personas.ts
//   npx tsx scripts/audit-personas.ts --limit=10     앞에서 N명만
//
// 왜: 지금까지 결과지 품질 판정이 표본 1~2명이었다. 우리가 만든 표·카드·배정표는 전부
// "데이터가 있을 때"를 전제하는데, 위험한 건 **없을 때**다 — 용신이 없으면 처방표가 통째로
// 비고, 배우자성이 0이면 얼굴 카드가 폴백을 타고, 과거 사건이 안 잡히면 '걸어온 길'의
// 검증 문장이 못 선다. 50명 중 한 명만 이래도 그 손님은 반쪽 결과지를 받는다.
//
// LLM 을 안 태우므로 공짜고, 명식은 DB 캐시(티저 계측 때 전원 조회됨)를 타므로 사주 API
// 신규 콜도 ~0 이다. 시작·끝 사용량을 찍어 실소모를 증명한다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

const STAMP = "2026-08";
const OUT_DIR = `docs-private/batch-${STAMP}`;
const SLUG = "sangun-sinjeom";
/** 신규 사주 API 콜 상한 — 넘으면 중단한다(한도 6000 보호) */
const MAX_NEW_CALLS = 30;

type Row = {
  no: number;
  birth: string;
  sex: string;
  time: string;
  wTop: number; wBad: number; wYears: number;
  iTop: number; iShaky: number; iYears: number;
  spouseOh: string; spouseCount: number;
  presc: boolean;
  daeun: number; past: string;
  planEmpty: string[];
  hintUsed: boolean;
  fails: string[];
};

async function main() {
  const api = await import("../src/lib/saju/saju-api");
  const { buildMonthPlan } = await import("../src/lib/saju/blueprint");
  const { computePrescription } = await import("../src/lib/saju/prescription");
  const { computePastEvent } = await import("../src/lib/saju/teaser");
  const { buildPartnerFace } = await import("../src/lib/saju/partner-face");
  const { outlineTitles } = await import("../src/lib/saju/prompt");
  const { getUsageCount } = await import("../src/lib/saju/usage");

  mkdirSync(OUT_DIR, { recursive: true });
  const titles = outlineTitles(SLUG);

  const raw = JSON.parse(readFileSync(`docs-private/teaser-sample-${STAMP}.json`, "utf8"));
  const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 0;
  const all = raw.filter((r: { ok: boolean }) => r.ok).map((r: { sample: Record<string, string> }) => r.sample);
  const people = limit ? all.slice(0, limit) : all;

  const usageStart = await getUsageCount();
  console.log(`페르소나 ${people.length}명 · 사주 API 시작 ${usageStart}/6000\n`);

  const rows: Row[] = [];
  for (const [i, s] of people.entries()) {
    const [y, m, d] = s.birthDate.split("-");
    const [hh, mm] = s.birthTime ? s.birthTime.split(":") : [undefined, undefined];
    const birthInfo = {
      birthYear: y,
      birthMonth: String(parseInt(m, 10)),
      birthDay: String(parseInt(d, 10)),
      ...(s.birthTime ? { birthHour: String(parseInt(hh!, 10)), birthMinute: String(parseInt(mm!, 10)) } : {}),
      calendarType: s.calendar === "lunar" ? "음력" : "양력",
      gender: s.gender,
    } as Parameters<typeof api.fetchSajuAnalysis>[0];

    // 캐시 초과 방지 — 신규 콜이 상한을 넘으면 즉시 멈춘다(한도는 광고보다 비싸다)
    const used = (await getUsageCount()) - usageStart;
    if (used > MAX_NEW_CALLS) {
      console.log(`\n⚠ 신규 콜 ${used} — 상한 ${MAX_NEW_CALLS} 초과라 중단한다(${i}명까지 처리)`);
      break;
    }

    let analysis;
    try {
      analysis = await api.fetchSajuAnalysis(birthInfo, [], { source: "demo" });
    } catch (e) {
      console.log(`  ${i + 1}. ${s.birthDate} — 명식 실패: ${(e as Error).message.slice(0, 60)}`);
      continue;
    }

    const fails: string[] = [];
    const w = api.computeWealthFacts(analysis);
    const wYears = api.computeWealthYears(analysis);
    // 상대 성별을 안 물은 경우(이성 인연)로 계산 — 실제 손님 대부분의 기본값이다
    const iy = api.computeInyeonFacts(analysis, s.gender as "male" | "female", undefined);
    const presc = computePrescription(analysis);
    const daeun = api.computeDaeunTimeline(analysis).filter((r) => r.when !== "future");
    const past = computePastEvent(analysis);
    const plan = buildMonthPlan(titles, w, iy, wYears);
    const face = buildPartnerFace(iy);

    if (w.top.length < 2) fails.push("돈달력 빈약");
    if (iy.top3.length < 2) fails.push("인연달력 빈약");
    if (iy.topYears.length === 0 && wYears.length === 0) fails.push("바뀌는해 소재0");
    if (!iy.spouseOh) fails.push("짝의결 없음");
    if (!presc) fails.push("처방 null");
    if (daeun.length === 0) fails.push("대운연대기 0");

    // 배정표에서 달을 못 받은 핵심 장 — 본문이 달을 지어낼 유인이 된다
    const planEmpty: string[] = [];
    for (const key of ["돈이 들어오는", "인연이 들어오는", "물음"]) {
      const idx = titles.findIndex((t) => t.includes(key));
      if (idx >= 0 && (plan[idx]?.allow.length ?? 0) === 0) planEmpty.push(key);
    }
    if (planEmpty.length) fails.push(`배정0:${planEmpty.join("/")}`);

    rows.push({
      no: i + 1,
      birth: s.birthDate,
      sex: s.gender === "female" ? "여" : "남",
      time: s.birthTime ?? "모름",
      wTop: w.top.length, wBad: w.bad.length, wYears: wYears.length,
      iTop: iy.top3.length, iShaky: iy.shaky.length, iYears: iy.topYears.length,
      spouseOh: iy.spouseOh || "-", spouseCount: iy.spouseCount,
      presc: !!presc,
      daeun: daeun.length,
      past: past ? String(past.year) : "-",
      planEmpty,
      // 도화 해석에서 장소를 못 뽑으면 오행 조견표로 폴백된다(카드↔본문 근거가 갈릴 수 있음)
      hintUsed: !!iy.meetHint && face.place !== "" && !/^(배우는 자리|사람이 모이는|오래 머문|일로 엮이는|물가나 늦은)/.test(face.place),
      fails,
    });
    const mark = fails.length ? "✗ " + fails.join(",") : "✓";
    console.log(`  ${String(i + 1).padStart(2)}. ${s.birthDate} ${s.gender === "female" ? "여" : "남"} ${(s.birthTime ?? "시간모름").padEnd(6)} ${mark}`);
  }

  const usageEnd = await getUsageCount();

  // ── 집계 ──
  const n = rows.length;
  const pct = (c: number) => `${c}/${n} (${Math.round((c / n) * 100)}%)`;
  const cnt = (f: (r: Row) => boolean) => rows.filter(f).length;
  const sum: string[] = [];
  sum.push(`# 결정론 레이어 전수 감사 — 페르소나 ${n}명 (${STAMP})\n`);
  sum.push(`LLM 0원. 사주 API ${usageStart} → ${usageEnd} (**신규 ${usageEnd - usageStart}콜**)\n`);
  sum.push(`## 결손 요약\n`);
  sum.push(`| 항목 | 결손 | 뜻 |`);
  sum.push(`|---|---|---|`);
  sum.push(`| 처방표 null | ${pct(cnt((r) => !r.presc))} | 처방표+10장이 통째로 빈다 |`);
  sum.push(`| 짝의 결 없음 | ${pct(cnt((r) => r.spouseOh === "-"))} | 얼굴 카드 근거 줄이 깨진다 |`);
  sum.push(`| 배우자성 0개 | ${pct(cnt((r) => r.spouseCount === 0))} | 일지 폴백을 탄다 |`);
  sum.push(`| 돈달력 빈약(top<2) | ${pct(cnt((r) => r.wTop < 2))} | 돈 章 표가 앙상하다 |`);
  sum.push(`| 인연달력 빈약(top3<2) | ${pct(cnt((r) => r.iTop < 2))} | 인연 章 표가 앙상하다 |`);
  sum.push(`| 바뀌는 해 소재 0 | ${pct(cnt((r) => r.iYears === 0 && r.wYears === 0))} | 7장이 쓸 해가 없다 |`);
  sum.push(`| 과거 검증 사건 없음 | ${pct(cnt((r) => r.past === "-"))} | 걸어온 길의 "그때 이랬다"가 못 선다 |`);
  sum.push(`| 대운 연대기 0줄 | ${pct(cnt((r) => r.daeun === 0))} | 걸어온 길 표가 안 뜬다 |`);
  sum.push(`| 배정표 빈 장 있음 | ${pct(cnt((r) => r.planEmpty.length > 0))} | 그 장이 달을 지어낼 유인 |`);
  sum.push(`| 만나는 자리 오행 폴백 | ${pct(cnt((r) => !r.hintUsed))} | 도화 해석에서 장소를 못 뽑음 |`);
  sum.push(`\n**FAIL 있는 페르소나: ${pct(cnt((r) => r.fails.length > 0))}**\n`);

  sum.push(`## 전수 표\n`);
  sum.push(`| # | 생일 | 성 | 시각 | 돈top/bad/해 | 인연top/흔들/해 | 짝의결(개수) | 처방 | 대운 | 과거 | 결손 |`);
  sum.push(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of rows) {
    sum.push(
      `| ${r.no} | ${r.birth} | ${r.sex} | ${r.time} | ${r.wTop}/${r.wBad}/${r.wYears} | ${r.iTop}/${r.iShaky}/${r.iYears} | ${r.spouseOh}(${r.spouseCount}) | ${r.presc ? "O" : "**X**"} | ${r.daeun} | ${r.past} | ${r.fails.join(", ") || "-"} |`,
    );
  }
  const out = `${OUT_DIR}/00_결정론_전수.md`;
  writeFileSync(out, sum.join("\n") + "\n", "utf8");
  console.log(`\n${sum.slice(2, 20).join("\n")}`);
  console.log(`\n→ ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
