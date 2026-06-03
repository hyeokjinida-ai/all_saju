// 모델/프롬프트 품질 비교용 일회성 스크립트 (임시)
// "mini(떠먹이기 전) vs mini(떠먹이기 후) vs 4o(떠먹이기 후)" 를 같은 챕터로 비교한다.
// 실행: npx tsx scripts/compare-llm.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), f), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = v;
      }
    } catch {}
  }
}
loadEnv();

async function main() {
  const { fetchSajuAnalysis, ganjiToMyeongsik, formatSajuCompact, buildKeyFactsBlock } = await import("../src/lib/saju/saju-api");
  const { buildChapterPrompts } = await import("../src/lib/saju/prompt");

  const birthInfo = {
    birthYear: "1975", birthMonth: "3", birthDay: "22",
    birthHour: "14", birthMinute: "30",
    calendarType: "양력" as const, gender: "male" as const,
  };

  console.log("명식 호출 중...");
  const analysis = await fetchSajuAnalysis(birthInfo, [], { source: "manual" });
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) throw new Error("ganji 누락");
  const manseryeokText = formatSajuCompact(analysis, birthInfo);
  const keyFacts = buildKeyFactsBlock(analysis, birthInfo);

  console.log("\n──────── 떠먹인 [확정 사실] 카드 ────────");
  console.log(keyFacts);

  const common = {
    productSlug: "basic-saju",
    productName: "내 사주 기본 풀이",
    name: "홍길동",
    myeongsik,
    manseryeokText,
    birthDate: "1975-03-22",
    birthTime: "14:30",
    timeUnknown: false,
    gender: "male" as const,
    concerns: ["재물"],
  };
  const withoutFacts = buildChapterPrompts({ ...common, keyFacts: null });
  const withFacts = buildChapterPrompts({ ...common, keyFacts });

  const IDX = 4; // 핵심 고민 챕터
  const chNo = withFacts.chapters[IDX];
  const chPlain = withoutFacts.chapters[IDX];
  console.log(`\n■ 비교 챕터: ${chNo.heading}`);

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  async function call(model: string, system: string, user: string) {
    const t0 = Date.now();
    const c = await openai.chat.completions.create({
      model, temperature: 0.7,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    });
    return { text: c.choices[0]?.message?.content ?? "", ms: Date.now() - t0, out: c.usage?.completion_tokens };
  }

  const a = await call("gpt-4o-mini", chPlain.system, chPlain.user);
  console.log(`\n\n┌─ ① gpt-4o-mini (떠먹이기 X) · ${a.ms}ms/${a.out}tok ─────────`);
  console.log(a.text);

  const b = await call("gpt-4o-mini", chNo.system, chNo.user);
  console.log(`\n\n┌─ ② gpt-4o-mini (떠먹이기 O) · ${b.ms}ms/${b.out}tok ─────────`);
  console.log(b.text);

  const c = await call("gpt-4o", chNo.system, chNo.user);
  console.log(`\n\n┌─ ③ gpt-4o (떠먹이기 O) · ${c.ms}ms/${c.out}tok ─────────`);
  console.log(c.text);

  console.log("\n\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
