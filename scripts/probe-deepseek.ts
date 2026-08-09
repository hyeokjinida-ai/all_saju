// deepseek-v4-pro 추론(reasoning) 조절 프로브 — 끌 수 있으면 속도 2~3배·원가 절반.
//   npx tsx scripts/probe-deepseek.ts
// 실제 챕터 프롬프트(돈 장)로 재야 의미가 있다 — "안녕" 테스트론 추론 거동이 안 나온다.
// 배경(2026-08-09 실측): 본문 11,000자에 출력 토큰 25,000개 — 절반 이상이 안 보이는 추론분.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

async function main() {
  const { buildChapterPrompts, outlineTitles } = await import("../src/lib/saju/prompt");
  const api = await import("../src/lib/saju/saju-api");
  const { buildMonthPlan } = await import("../src/lib/saju/blueprint");
  const { default: OpenAI } = await import("openai");

  const analysis = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), "analysis-sangun-sinjeom.json"), "utf8"));
  const birthInfo = { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" } as never;
  const keyFacts = [
    api.buildKeyFactsBlock(analysis, birthInfo),
    api.buildWealthFactsBlock(analysis),
    api.buildInyeonFactsBlock(analysis, "female", undefined),
  ].filter(Boolean).join("\n\n");
  const monthPlan = buildMonthPlan(
    outlineTitles("sangun-sinjeom"),
    api.computeWealthFacts(analysis),
    api.computeInyeonFacts(analysis, "female", undefined),
    api.computeWealthYears(analysis),
  );
  const { chapters } = buildChapterPrompts({
    productSlug: "sangun-sinjeom", productName: "산군 신점", name: "지수",
    myeongsik: api.ganjiToMyeongsik(analysis)!, manseryeokText: api.formatSajuCompact(analysis, birthInfo),
    birthDate: "1993-05-15", birthTime: "14:30", timeUnknown: false, gender: "female",
    concerns: ["올해 이직해도 될까요"], keyFacts, monthPlan,
  } as never);
  const ch = chapters[3]; // 돈 장 — 시기 데이터가 실려 제일 무거운 축

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
    timeout: 150_000,
    maxRetries: 0,
  });

  const CONFIGS: { name: string; extra: Record<string, unknown> }[] = [
    { name: "기본(현행)", extra: {} },
    { name: "reasoning_effort=low", extra: { reasoning_effort: "low" } },
    { name: "reasoning_effort=none", extra: { reasoning_effort: "none" } },
    { name: "reasoning_effort=minimal", extra: { reasoning_effort: "minimal" } },
    { name: "thinking=disabled", extra: { thinking: { type: "disabled" } } },
  ];

  for (const cfg of CONFIGS) {
    const t0 = Date.now();
    try {
      const r = await client.chat.completions.create({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: ch.system },
          { role: "user", content: ch.user },
        ],
        temperature: 0.7,
        ...cfg.extra,
      } as never);
      const u = (r.usage ?? {}) as Record<string, unknown>;
      const det = (u.completion_tokens_details ?? {}) as Record<string, number>;
      const text = r.choices[0]?.message?.content ?? "";
      console.log(`\n[${cfg.name}] ${((Date.now() - t0) / 1000).toFixed(1)}초 · 출력 ${u.completion_tokens}tok (추론 ${det.reasoning_tokens ?? "?"}tok) · 본문 ${text.length}자`);
      console.log(`  첫 줄: ${text.split("\n").find((l: string) => l.trim())?.slice(0, 60)}`);
    } catch (e) {
      console.log(`\n[${cfg.name}] 거부 — ${(e as Error).message.slice(0, 140)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
