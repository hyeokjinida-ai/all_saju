// 결과지 품질 평가/실험용 샘플 생성기(일회성). 실제 파이프라인(luckyloveme + prompt + llm) 그대로.
//   기본:        npx tsx scripts/sample-results.ts
//   모델 바꿔서:  LLM_MODEL=gpt-4o npx tsx scripts/sample-results.ts
// 명식 분석은 캐시(temp)해 luckyloveme 한도를 아끼고, 생성문의 금지어 위반을 자동 채점한다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), f), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = v; // 쉘에서 넘긴 LLM_MODEL 이 우선
      }
    } catch {}
  }
}
loadEnv();

type Case = {
  slug: string;
  name: string;
  expectAges: number[]; // 만/세는 둘 다 허용
  birthInfo: {
    birthYear: string; birthMonth: string; birthDay: string;
    birthHour?: string; birthMinute?: string;
    calendarType: "양력" | "음력"; gender: "male" | "female";
  };
  concern?: string;
};

const CASES: Case[] = [
  {
    slug: "basic-saju", name: "김영희", concern: "재물", expectAges: [50, 51, 52],
    birthInfo: { birthYear: "1975", birthMonth: "3", birthDay: "22", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  },
  {
    slug: "premium-saju", name: "박상철", concern: "직장·사업", expectAges: [53, 54, 55],
    birthInfo: { birthYear: "1972", birthMonth: "8", birthDay: "10", birthHour: "9", birthMinute: "0", calendarType: "양력", gender: "male" },
  },
];

// 프롬프트가 금지한 헷지 표현
const HEDGE = /수도 있습니다|수 있습니다|가능성이 있습니다|가능성을|가능성이 높|할 가능성|경향이 있|보입니다|한 편입니다|일 것입니다|될 것입니다|시사합니다/g;
// 검증 불가 가족/학력 단정 신호어(맥락 무관 단순 카운트 — 참고용)
const FAMILY = /자녀|아들|딸|배우자|남편|아내|결혼|미혼|이혼|학력|대학/g;

function measure(text: string, expectAges: number[]) {
  const hedges = text.match(HEDGE) ?? [];
  const ages = [...text.matchAll(/(\d{2})\s*세/g)].map((m) => Number(m[1]));
  const badAges = ages.filter((a) => a >= 30 && a <= 99 && !expectAges.includes(a));
  const family = text.match(FAMILY) ?? [];
  // 시기 도배 측정: 6월/10월이 몇 챕터(###)에 등장하나
  const chapters = text.split(/\n###\s/).slice(1);
  const timingChapters = chapters.filter((c) => /6월|10월/.test(c)).length;
  return { hedge: hedges.length, hedgeList: hedges, ages, badAges, family: family.length, familyList: [...new Set(family)], timingChapters, totalChapters: chapters.length };
}

async function main() {
  const saju = await import("../src/lib/saju/saju-api");
  const { buildChapterPrompts } = await import("../src/lib/saju/prompt");
  const { generateByChapters } = await import("../src/lib/saju/llm");
  const model = process.env.LLM_MODEL ?? "?";
  const tag = model.replace(/[^a-z0-9]/gi, "");
  console.log(`\n=== 모델: ${process.env.LLM_PROVIDER}/${model} ===\n`);

  for (const c of CASES) {
    // 명식 분석 캐시(모델 바꿔 재실행해도 luckyloveme 재호출 안 함)
    const cacheFile = resolve(tmpdir(), `analysis-${c.slug}.json`);
    let analysis: Awaited<ReturnType<typeof saju.fetchSajuAnalysis>>;
    if (existsSync(cacheFile)) {
      analysis = JSON.parse(readFileSync(cacheFile, "utf8"));
      console.log(`[${c.slug}] 명식 캐시 사용`);
    } else {
      console.log(`[${c.slug}] ${c.name} 명식 호출…`);
      analysis = await saju.fetchSajuAnalysis(c.birthInfo, [], { source: "manual" });
      writeFileSync(cacheFile, JSON.stringify(analysis), "utf8");
    }

    const myeongsik = saju.ganjiToMyeongsik(analysis);
    if (!myeongsik) { console.log("  ganji 누락 — 스킵"); continue; }
    const manseryeokText = saju.formatSajuCompact(analysis, c.birthInfo);
    const keyFacts = saju.buildKeyFactsBlock(analysis, c.birthInfo);

    const bi = c.birthInfo;
    const { title, chapters } = buildChapterPrompts({
      productSlug: c.slug,
      productName: `샘플 — ${c.slug}`,
      name: c.name,
      myeongsik,
      manseryeokText,
      birthDate: `${bi.birthYear}-${bi.birthMonth.padStart(2, "0")}-${bi.birthDay.padStart(2, "0")}`,
      birthTime: bi.birthHour ? `${bi.birthHour.padStart(2, "0")}:${(bi.birthMinute ?? "00").padStart(2, "0")}` : null,
      timeUnknown: !bi.birthHour,
      gender: bi.gender,
      concerns: c.concern ? [c.concern] : [],
      keyFacts,
    });

    console.log(`  ${chapters.length}개 챕터 생성 중(${model})…`);
    const t0 = Date.now();
    const llm = await generateByChapters(title, chapters);
    const ms = Date.now() - t0;
    const sc = measure(llm.text, c.expectAges);

    const header = `<!-- slug=${c.slug} · ${c.name} · ${llm.provider}/${llm.model} · ${chapters.length}챕터 · ${ms}ms · ${llm.text.length}자 · 헷지=${sc.hedge} · 잘못된나이=${JSON.stringify(sc.badAges)} · 가족단정어=${sc.family} -->\n\n`;
    const out = resolve(tmpdir(), `sample-${c.slug}-${tag}.md`);
    writeFileSync(out, header + llm.text, "utf8");

    console.log(
      `  ▶ [${c.slug}] 헷지 ${sc.hedge}회 · 나이오류 ${sc.badAges.length ? JSON.stringify(sc.badAges) : "없음"} · 가족언급 ${sc.family}${sc.family ? "(" + sc.familyList.join(",") + ")" : ""} · 6/10월 등장챕터 ${sc.timingChapters}/${sc.totalChapters} · ${llm.text.length}자 · ${ms}ms`,
    );
    console.log(`     → ${out}\n`);
  }
  console.log("완료.");
}

main().catch((e) => { console.error(e); process.exit(1); });
