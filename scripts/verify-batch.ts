// 결과지 배치 검증 — 페르소나 여럿에게 **실제 운영 경로 그대로** 결과지를 뽑고 통계로 잰다.
//
//   npx tsx scripts/verify-batch.ts            선별 규칙대로 15명
//   npx tsx scripts/verify-batch.ts --n=5      앞에서 N명만(연습용)
//
// 왜: 지금까지 품질 판정이 표본 1~2명이었다. 한 명이 통과한 걸로 "괜찮다"고 말하면
// 나머지 49명에서 뭐가 터지는지 모른 채 광고를 켜게 된다. 특히 결손 명식(시간 모름·
// 배우자성 0)에서 표·컷·달 배정이 어떻게 되는지가 이 스크립트의 본 목적이다.
//
// 선별 규칙(고정): ①시각 모름 전원 ②남성 전원 ③나머지는 여·시각있음에서 순서대로 보충.
// 생성은 **순차** — 장 단위는 이미 병렬이라 페르소나까지 겹치면 레이트리밋에 걸린다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

const STAMP = "2026-08";
const OUT_DIR = `docs-private/batch-${STAMP}`;
const SLUG = "sangun-sinjeom";
const TARGET = Number(process.argv.find((a) => a.startsWith("--n="))?.split("=")[1]) || 15;
/** 페르소나 사이 대기(초) — 결과지 1건이 입력 ~20만 토큰이라 쉼 없이 쏘면 분당 한도에 걸린다.
 *  실측(2026-08-10): 대기 0초로 15명을 돌렸더니 1명 성공, 14명이 429 로 즉사했다. */
const GAP_SEC = Number(process.argv.find((a) => a.startsWith("--gap="))?.split("=")[1]) || 45;
const sleep = (sec: number) => new Promise((r) => setTimeout(r, sec * 1000));
/** 고민은 실제 손님이 가장 많이 고르는 것으로 고정 — 고민관통 검사가 의미를 가지려면 있어야 한다 */
const CONCERN = "올해 이직해도 될까요";

type Persona = { birthDate: string; birthTime: string | null; gender: "male" | "female"; calendar: string };

type Result = {
  no: number;
  who: string;
  chars: number;
  chapters: number;
  secs: number;
  fails: string[];   // 치명(FAIL) 규칙 id
  warns: string[];   // 경고 규칙 id (건수 포함)
  pastYear: string;  // 티저 과거연도
  pastInText: boolean; // 그 연도가 '걸어온 길' 장에 실제로 박혔나
  placeMatch: string; // 카드의 만나는 자리 ↔ 본문 정합 (O/△/-)
};

async function main() {
  const api = await import("../src/lib/saju/saju-api");
  const { buildChapterPrompts, outlineTitles } = await import("../src/lib/saju/prompt");
  const { generateByChapters } = await import("../src/lib/saju/llm");
  const { normalizeResultVoice } = await import("../src/lib/saju/normalize-voice");
  const { buildMonthPlan } = await import("../src/lib/saju/blueprint");
  const { buildPastBlock, computePastEvent } = await import("../src/lib/saju/teaser");
  const { computePrescription, buildPrescriptionBlock } = await import("../src/lib/saju/prescription");
  const { buildPartnerFace } = await import("../src/lib/saju/partner-face");
  // 린터 규칙을 그대로 재사용한다 — 배치가 다른 잣대를 쓰면 단건 검사와 숫자가 안 맞는다.
  const { RULES, loadMonthSets } = await import("./lint-result");
  type Ctx = Parameters<(typeof RULES)[number]["find"]>[1];

  mkdirSync(OUT_DIR, { recursive: true });
  const titles = outlineTitles(SLUG);
  const model = process.env.LLM_MODEL ?? "?";

  // ── 선별 ──
  const raw = JSON.parse(readFileSync(`docs-private/teaser-sample-${STAMP}.json`, "utf8"));
  const all: Persona[] = raw.filter((r: { ok: boolean }) => r.ok).map((r: { sample: Persona }) => r.sample);
  const noTime = all.filter((p) => !p.birthTime);
  const male = all.filter((p) => p.gender === "male" && p.birthTime);
  const rest = all.filter((p) => p.birthTime && p.gender === "female");
  const picked: Persona[] = [];
  const seen = new Set<string>();
  for (const p of [...noTime, ...male, ...rest]) {
    const key = `${p.birthDate}|${p.birthTime ?? ""}|${p.gender}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(p);
    if (picked.length >= TARGET) break;
  }
  console.log(`선별 ${picked.length}명 (시각모름 ${picked.filter((p) => !p.birthTime).length} · 남 ${picked.filter((p) => p.gender === "male").length}) · 모델 ${model}\n`);

  const results: Result[] = [];
  for (const [i, s] of picked.entries()) {
    const no = i + 1;
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
    const who = `${s.birthDate} ${s.gender === "female" ? "여" : "남"} ${s.birthTime ?? "시간모름"}`;

    const analysis = await api.fetchSajuAnalysis(birthInfo, [], { source: "demo" });
    const myeongsik = api.ganjiToMyeongsik(analysis);
    if (!myeongsik) { console.log(`  ${no}. ${who} — 명식 변환 실패, 건너뜀`); continue; }

    // 린터가 확정값을 다시 계산할 수 있게 명식을 캐시 이름으로 깔아 둔다(슬러그=batch<N>)
    const slug = `batch${no}`;
    writeFileSync(resolve(tmpdir(), `analysis-${slug}.json`), JSON.stringify(analysis), "utf8");

    const keyFacts = [
      api.buildKeyFactsBlock(analysis, birthInfo),
      api.buildWealthFactsBlock(analysis),
      api.buildInyeonFactsBlock(analysis, s.gender, undefined),
    ].filter(Boolean).join("\n\n");

    const iy = api.computeInyeonFacts(analysis, s.gender, undefined);
    const face = buildPartnerFace(iy);
    const monthPlan = buildMonthPlan(titles, api.computeWealthFacts(analysis), iy, api.computeWealthYears(analysis));
    const pastBlock = buildPastBlock(analysis) || null;
    const prescriptionBlock = buildPrescriptionBlock(computePrescription(analysis)) || null;
    const past = computePastEvent(analysis);

    const { title, chapters } = buildChapterPrompts({
      productSlug: SLUG,
      productName: "박수무당 사주",
      name: "지영",
      myeongsik,
      manseryeokText: api.formatSajuCompact(analysis, birthInfo),
      birthDate: s.birthDate,
      birthTime: s.birthTime,
      timeUnknown: !s.birthTime,
      gender: s.gender,
      concerns: [CONCERN],
      keyFacts,
      monthPlan,
      pastBlock,
      prescriptionBlock,
    });

    // 생성 — 장이 다 안 서면(429 등) 쿨다운 후 그 사람만 1회 다시. 실서비스는 80% 게이트가
    // 부분 결과를 막아 주지만, 배치는 raw 로 저장하므로 여기서 직접 재시도해야 통계가 산다.
    const t0 = Date.now();
    let llm = await generateByChapters(title, chapters);
    if ((llm.successCount ?? 0) < chapters.length) {
      console.log(`     ↻ ${llm.successCount ?? 0}/${chapters.length}장만 성공 — ${GAP_SEC * 2}초 쉬고 1회 재시도`);
      await sleep(GAP_SEC * 2);
      const retry = await generateByChapters(title, chapters);
      if ((retry.successCount ?? 0) > (llm.successCount ?? 0)) llm = retry;
    }
    const secs = Math.round((Date.now() - t0) / 1000);
    const text = normalizeResultVoice(llm.text, { banmal: true, name: "지영" }).text;

    const header = `<!-- slug=${slug} · 지영 · birth=${s.birthDate} · gender=${s.gender} · concern=${CONCERN} · ${llm.provider}/${llm.model} · ${chapters.length}챕터 -->\n\n`;
    const file = `${OUT_DIR}/p${String(no).padStart(2, "0")}_${s.birthDate}_${s.gender === "female" ? "F" : "M"}${s.birthTime ? "" : "_notime"}.md`;
    writeFileSync(file, header + text, "utf8");

    // ── 린터 규칙 그대로 적용 ──
    const months = await loadMonthSets(slug, s.gender);
    const ctx: Ctx = {
      name: "지영",
      birthYear: Number(y),
      thisYear: new Date().getFullYear(),
      concern: CONCERN,
      tableMonths: months?.table ?? null,
      dataMonths: months?.data ?? null,
    };
    const fails: string[] = [];
    const warns: string[] = [];
    for (const r of RULES) {
      const hits = r.find(text, ctx);
      if (!hits.length) continue;
      (r.severity === "FAIL" ? fails : warns).push(`${r.id}(${hits.length})`);
    }

    // ── 배치 전용 추가 검사 두 가지 ──
    // ① 티저가 짚은 과거 연도가 '걸어온 길' 장에 실제로 박혔나 (결제 전후 정합)
    const walked = text.split(/\n###\s+/).find((c) => /걸어온 길/.test(c.split("\n")[0] ?? "")) ?? "";
    const pastInText = !!past && walked.includes(String(past.year));
    // ② 얼굴 카드의 '만나는 자리'와 본문 인연 장이 같은 곳을 가리키나
    //    (1단계에서 42%가 오행 폴백이었다 — 그 경우 본문이 딴 곳을 말할 여지가 있다)
    const inyeonCh = text.split(/\n###\s+/).find((c) => /인연이 들어오는/.test(c.split("\n")[0] ?? "")) ?? "";
    const placeKey = (face.place.match(/직장|조직|회사|업무|거래|모임|동호회|학교|학원|공부|소개|온라인|여행|물가|종교|봉사|취미/g) ?? [])[0];
    const placeMatch = !placeKey ? "-" : inyeonCh.includes(placeKey) ? "O" : "△";

    results.push({
      no, who, chars: text.length, chapters: (text.match(/^### /gm) ?? []).length, secs,
      fails, warns, pastYear: past ? String(past.year) : "-", pastInText, placeMatch,
    });
    console.log(`  ${String(no).padStart(2)}. ${who.padEnd(24)} ${text.length}자 · ${(text.match(/^### /gm) ?? []).length}장 · ${secs}초 ${fails.length ? "✗ " + fails.join(",") : "✓"}`);

    // 다음 사람 전에 토큰 창을 비운다(마지막 사람 뒤엔 필요 없다)
    if (no < picked.length) await sleep(GAP_SEC);
  }

  // ── 집계 ──
  const n = results.length;
  const pct = (c: number) => `${c}/${n} (${Math.round((c / n) * 100)}%)`;
  const chars = results.map((r) => r.chars).sort((a, b) => a - b);
  const md: string[] = [];
  md.push(`# LLM 표본 배치 검증 — ${n}명 · ${model} (${STAMP})\n`);
  md.push(`선별: 시각모름 ${picked.filter((p) => !p.birthTime).length} · 남 ${picked.filter((p) => p.gender === "male").length} · 고민 "${CONCERN}" 고정\n`);
  md.push(`## 종합\n`);
  md.push(`| 지표 | 값 |`);
  md.push(`|---|---|`);
  md.push(`| 11챕터 성립 | ${pct(results.filter((r) => r.chapters === 11).length)} |`);
  md.push(`| 치명 위반 0 | ${pct(results.filter((r) => r.fails.length === 0).length)} |`);
  md.push(`| 지어낸달 0 | ${pct(results.filter((r) => !r.fails.some((f) => f.startsWith("지어낸달"))).length)} |`);
  md.push(`| 표밖의달 0 | ${pct(results.filter((r) => !r.warns.some((w) => w.startsWith("표밖의달"))).length)} |`);
  md.push(`| 달도배 0 | ${pct(results.filter((r) => !r.warns.some((w) => w.startsWith("달도배"))).length)} |`);
  md.push(`| 분량 9,000자 이상 | ${pct(results.filter((r) => r.chars >= 9000).length)} |`);
  md.push(`| 분량 min/중앙/max | ${chars[0]?.toLocaleString()} / ${chars[Math.floor(n / 2)]?.toLocaleString()} / ${chars[n - 1]?.toLocaleString()} |`);
  md.push(`| 티저 과거연도가 본문에 | ${pct(results.filter((r) => r.pastInText).length)} |`);
  md.push(`| 카드↔본문 만나는 자리 일치 | ${pct(results.filter((r) => r.placeMatch === "O").length)} (판정불가 ${results.filter((r) => r.placeMatch === "-").length}) |`);
  md.push(`| 평균 소요 | ${Math.round(results.reduce((a, r) => a + r.secs, 0) / n)}초 |`);

  md.push(`\n## 페르소나별\n`);
  md.push(`| # | 페르소나 | 자수 | 장 | 초 | 치명 | 경고 | 과거연도 | 자리 |`);
  md.push(`|---|---|---|---|---|---|---|---|---|`);
  for (const r of results) {
    md.push(`| ${r.no} | ${r.who} | ${r.chars.toLocaleString()} | ${r.chapters} | ${r.secs} | ${r.fails.join(", ") || "-"} | ${r.warns.join(", ") || "-"} | ${r.pastYear}${r.pastInText ? "✓" : r.pastYear === "-" ? "" : "✗"} | ${r.placeMatch} |`);
  }
  const out = `${OUT_DIR}/01_LLM_표본.md`;
  writeFileSync(out, md.join("\n") + "\n", "utf8");
  console.log(`\n${md.slice(3, 16).join("\n")}`);
  console.log(`\n→ ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
