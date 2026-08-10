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
  // "박수무당 사주"(포괄 확장) 검증 — 인연 검증과 같은 명식(캐시 재사용). 예상: 인연 68점·TOP3 2026-12/2027-05/2027-06 인용 일치 + 재물 점수·달 인용 일치
  {
    slug: "sangun-sinjeom", name: "지수", concern: "올해 이직해도 될까요", expectAges: [33, 34, 40, 45],
    birthInfo: { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  },
  // "인연 들어오는 달" 검증 케이스 — 사양서 실측 명식(예상: 68점, TOP3 2026-12/2027-05/2027-06)
  // {
  //   slug: "inyeon-saju", name: "지수", concern: "결혼 시기", expectAges: [33, 34],
  //   birthInfo: { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // {
  //   slug: "sangun-sinjeom", name: "김영희", concern: "이직", expectAges: [50, 51, 52],
  //   birthInfo: { birthYear: "1975", birthMonth: "3", birthDay: "22", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // {
  //   slug: "wealth-saju", name: "김영희", concern: "재물", expectAges: [50, 51, 52],
  //   birthInfo: { birthYear: "1975", birthMonth: "3", birthDay: "22", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // {
  //   slug: "basic-saju", name: "김영희", concern: "재물", expectAges: [50, 51, 52],
  //   birthInfo: { birthYear: "1975", birthMonth: "3", birthDay: "22", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // {
  //   slug: "premium-saju", name: "박상철", concern: "직장·사업", expectAges: [53, 54, 55],
  //   birthInfo: { birthYear: "1972", birthMonth: "8", birthDay: "10", birthHour: "9", birthMinute: "0", calendarType: "양력", gender: "male" },
  // },
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
  const { buildChapterPrompts, outlineTitles } = await import("../src/lib/saju/prompt");
  const { generateByChapters } = await import("../src/lib/saju/llm");
  const { normalizeResultVoice } = await import("../src/lib/saju/normalize-voice");
  const { buildMonthPlan, generateBlueprint } = await import("../src/lib/saju/blueprint");
  const { buildPastBlock } = await import("../src/lib/saju/teaser");
  const { computePrescription, buildPrescriptionBlock } = await import("../src/lib/saju/prescription");
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
    let keyFacts = saju.buildKeyFactsBlock(analysis, c.birthInfo);
    if (c.slug === "wealth-saju") {
      keyFacts = [keyFacts, saju.buildWealthFactsBlock(analysis)].filter(Boolean).join("\n\n");
    }
    if (c.slug === "inyeon-saju") {
      keyFacts = [keyFacts, saju.buildInyeonFactsBlock(analysis, c.birthInfo.gender)].filter(Boolean).join("\n\n");
      console.log("  [인연 확정값]\n" + keyFacts.split("[인연 확정값")[1].slice(0, 700));
    }
    // 산군(포괄 확장) — 실제 파이프라인(generate-result)과 동일하게 재물+인연 동시 주입
    if (c.slug === "sangun-sinjeom") {
      keyFacts = [keyFacts, saju.buildWealthFactsBlock(analysis), saju.buildInyeonFactsBlock(analysis, c.birthInfo.gender)]
        .filter(Boolean)
        .join("\n\n");
      console.log("  [확정값 주입]\n" + keyFacts.split("[재물 확정값")[1]?.slice(0, 600));
    }

    // 설계도 + 배정표 + 장별 확정값 — 실제 파이프라인(generate-result.buildPlanForSangun)과 같은 재료.
    // 샘플이 이걸 건너뛰면 개편의 핵심을 안 잰 채 "좋아졌다"고 말하게 된다.
    let blueprint = null, monthPlan = null, pastBlock = null, prescriptionBlock = null;
    if (c.slug === "sangun-sinjeom") {
      const titles = outlineTitles(c.slug);
      try {
        monthPlan = buildMonthPlan(
          titles,
          saju.computeWealthFacts(analysis),
          saju.computeInyeonFacts(analysis, c.birthInfo.gender, undefined),
          saju.computeWealthYears(analysis),
        );
        pastBlock = buildPastBlock(analysis) || null;
        prescriptionBlock = buildPrescriptionBlock(computePrescription(analysis)) || null;
      } catch { /* 확정값 실패 시 예전 방식으로 */ }
      const tBp = Date.now();
      blueprint = await generateBlueprint({
        keyFacts,
        concern: c.concern ?? "",
        chapterTitles: titles,
        arcHint: "", // 스크립트엔 대운 힌트 생략 — 설계도가 연도를 지어내는지도 겸사겸사 본다
      });
      if (blueprint) console.log(`  설계도: OK · ${Date.now() - tBp}ms · 판정="${blueprint.verdict}"`);
    }

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
      blueprint,
      monthPlan,
      pastBlock,
      prescriptionBlock,
    });

    console.log(`  ${chapters.length}개 챕터 생성 중(${model})…`);
    const t0 = Date.now();
    const llm = await generateByChapters(title, chapters);
    const ms = Date.now() - t0;
    // 실제 파이프라인(generate-result.ts)은 여기서 후처리를 한 번 거친다. 샘플이 이걸 건너뛰면
    // 린터가 손님이 절대 보지 않는 문장(하라체·"대흉")을 잡아, 자가 실제보다 나쁜 값을 낸다.
    const text = normalizeResultVoice(llm.text, { banmal: c.slug === "sangun-sinjeom", name: c.name }).text;
    const sc = measure(text, c.expectAges);

    // birth= 는 린터가 현재 나이를 계산하는 근거다(없으면 린터가 생년을 하드코딩하게 된다).
    const birth = `${bi.birthYear}-${bi.birthMonth.padStart(2, "0")}-${bi.birthDay.padStart(2, "0")}`;
    const header = `<!-- slug=${c.slug} · ${c.name} · birth=${birth} · gender=${bi.gender} · concern=${c.concern ?? ""} · ${llm.provider}/${llm.model} · ${chapters.length}챕터 · ${ms}ms · ${text.length}자 · 헷지=${sc.hedge} · 잘못된나이=${JSON.stringify(sc.badAges)} · 가족단정어=${sc.family} -->\n\n`;
    const out = resolve(tmpdir(), `sample-${c.slug}-${tag}.md`);
    writeFileSync(out, header + text, "utf8");

    console.log(
      `  ▶ [${c.slug}] 헷지 ${sc.hedge}회 · 나이오류 ${sc.badAges.length ? JSON.stringify(sc.badAges) : "없음"} · 가족언급 ${sc.family}${sc.family ? "(" + sc.familyList.join(",") + ")" : ""} · 6/10월 등장챕터 ${sc.timingChapters}/${sc.totalChapters} · ${text.length}자 · ${ms}ms`,
    );
    console.log(`     → ${out}\n`);
  }
  console.log("완료.");
}

main().catch((e) => { console.error(e); process.exit(1); });
