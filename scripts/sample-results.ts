// 결과지 품질 평가/실험용 샘플 생성기(일회성). 실제 파이프라인(luckyloveme + prompt + llm) 그대로.
//   기본:        npx tsx scripts/sample-results.ts
//   모델 바꿔서:  LLM_MODEL=gpt-4o npx tsx scripts/sample-results.ts
// 명식 분석은 캐시(temp)해 luckyloveme 한도를 아끼고, 생성문의 금지어 위반을 자동 채점한다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
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

type BirthInfoLike = {
  birthYear: string; birthMonth: string; birthDay: string;
  birthHour?: string; birthMinute?: string;
  calendarType: "양력" | "음력"; gender: "male" | "female";
};

type Case = {
  slug: string;
  name: string;
  expectAges: number[]; // 만/세는 둘 다 허용
  birthInfo: BirthInfoLike;
  concern?: string;
  /** 파일명 꼬리표 — 같은 사람으로 표본을 둘 이상 뽑을 때(감정만 바꾼 A/B) 서로 안 덮어쓰게 한다 */
  variant?: string;
  /**
   * 「견우의 재회예보」 전용 입력 여섯 가지. 있으면 실제 파이프라인과 같은 순서로
   * ① 상대 명식 1콜 ② computeReunionFacts ③ buildReunionFactsBlock 을 태운다
   * (generate-result.fetchReunionFacts → keyFactsFor 와 같은 재료여야 표본이 거짓말을 안 한다).
   */
  reunion?: import("../src/lib/saju/reunion-input").ReunionInput;
};

// ⚠ expectAges 는 **세는나이** 기준이다(2026-08-21 정정).
// 공급사 current_age 가 세는나이라, 결과지도 세는나이로 쓴다 — 여기 기대값도 같은 자로 잰다.
// 예: 1993-05-15 생 → 2026년 34세 · 2027년 35세.
const CASES: Case[] = [
  // "박수무당 사주"(포괄 확장) 검증 — 인연 검증과 같은 명식(캐시 재사용). 예상: 인연 68점·TOP3 2026-12/2027-05/2027-06 인용 일치 + 재물 점수·달 인용 일치
  // [임시]
  // {
  //   slug: "sangun-sinjeom", name: "지수", concern: "올해 이직해도 될까요", expectAges: [34, 35, 40, 45],
  //   birthInfo: { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // [임시] 광고 v5 「서윤」 — 무성 UGC 광고(vU5)의 카드가 전부 이 결과지 실캡처다.
  // 고민 문구에 「미련」을 넣는 이유: 훅 「나한테 미련 남았냐는데?」의 증거 카드가 9장 [산군의 직언]에서 나와야 한다.
  // 계획서 marketing/소재/산군/광고영상_기획_v5_서윤UGC_2026-08-23.md §3-1
  // [임시]
  // {
  //   slug: "sangun-sinjeom", name: "서윤", concern: "헤어진 지 석 달인데, 아직 미련이 남은 건지 모르겠어요", expectAges: [33, 34, 38, 39, 43, 44],
  //   birthInfo: { birthYear: "1994", birthMonth: "6", birthDay: "6", birthHour: "20", birthMinute: "10", calendarType: "양력", gender: "female" },
  // },

  // ── 「견우의 재회예보」 표본 2건 (2026-09-04) ────────────────────────────────
  // 같은 명식·같은 고민에 **「지금 마음」만** 다르다. 그래야 환승 트랙 스위치(track=moveon)가
  // 9장을 실제로 두껍게 만드는지, 톤이 갈라지지는 않는지를 한 변수로 잰다.
  // 명식은 서윤(기획서 §2 승격 페르소나) — 시각은 안 받는다(가장 흔한 경로).
  // 상대는 준호(1992-03-15 남) — 생일을 받았으므로 만세력이 한 번 더 나간다(2인 풀이).
  {
    // 1994-06-06 → 만 32(오늘) · 세는 33(2026) · 34(2027) · 35(2028). 대운 범위(31~40세)는 measure 가 지운다.
    slug: "reunion-saju", name: "서윤", variant: "재회", expectAges: [32, 33, 34, 35],
    concern: "그 사람이 아직 저를 생각하는지, 연락해도 되는지 알고 싶어요",
    birthInfo: { birthYear: "1994", birthMonth: "6", birthDay: "6", calendarType: "양력", gender: "female" },
    reunion: {
      breakupYear: 2026, breakupMonth: 6,
      datingLength: "2~3년", whoEnded: "그 사람", reason: "잠수·통보", feeling: "재회",
      partner: { name: "준호", gender: "male", birthDate: "1992-03-15" },
    },
  },
  {
    slug: "reunion-saju", name: "서윤", variant: "환승", expectAges: [32, 33, 34, 35],
    concern: "그 사람이 아직 저를 생각하는지, 연락해도 되는지 알고 싶어요",
    birthInfo: { birthYear: "1994", birthMonth: "6", birthDay: "6", calendarType: "양력", gender: "female" },
    reunion: {
      breakupYear: 2026, breakupMonth: 6,
      datingLength: "2~3년", whoEnded: "그 사람", reason: "잠수·통보", feeling: "새사람",
      partner: { name: "준호", gender: "male", birthDate: "1992-03-15" },
    },
  },
  // [임시] 결혼사주 1건만
  // {
  //   slug: "marriage-saju", name: "지수", concern: "결혼 시기가 궁금해요", expectAges: [34, 35],
  //   birthInfo: { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // "인연 들어오는 달" 검증 케이스 — 사양서 실측 명식(예상: 68점, TOP3 2026-12/2027-05/2027-06)
  // 2026-08-17 10장 개편 검증으로 활성화. 산군과 같은 생일이라 명식 캐시를 공유한다(API 0콜).
  // [임시]
  // {
  //   slug: "inyeon-saju", name: "지수", concern: "결혼 시기", expectAges: [34, 35],
  //   birthInfo: { birthYear: "1993", birthMonth: "5", birthDay: "15", birthHour: "14", birthMinute: "30", calendarType: "양력", gender: "female" },
  // },
  // 두 번째 인연 케이스 — 다른 명식으로 10장이 재현되는지(첫 케이스에만 맞춘 게 아닌지) 본다.
  // 명식은 verify-batch 가 깔아 둔 캐시(analysis-batch1 = 1990-05-24 17:00 여)를 재사용한다.
  // 만세력 API 가 죽어 있어도(2026-08-17 새벽 실측: 연결 실패) 샘플을 뽑을 수 있어야 하고,
  // 한도 6,000 도 아낀다. 생일·시각을 캐시와 **정확히** 맞춰야 나이 검사가 거짓말을 안 한다.
  // [임시]
  // {
  //   slug: "inyeon-saju", name: "은비", concern: "지금 만나는 사람과 결혼까지 갈 수 있을까요", expectAges: [37, 38],
  //   birthInfo: { birthYear: "1990", birthMonth: "5", birthDay: "24", birthHour: "17", birthMinute: "0", calendarType: "양력", gender: "female" },
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
  // ⚠ 대운 구간(「27~36세」「37세부터」)과 과거 연도(「2019년(27세)」)는 **정상 표기**다.
  //   그것까지 세면 오탐이 쏟아져 진짜 오류가 묻힌다(실측: 오탐 9건 속에 진짜 1건).
  //   그래서 **범위 표기(N~M세)를 먼저 지우고** 나머지 나이만 검사한다.
  const scrubbed = text.replace(/\d{1,2}\s*~\s*\d{1,2}\s*세/g, "").replace(/\d{4}년\s*\(\s*\d{1,2}\s*세\s*\)/g, "");
  const ages = [...scrubbed.matchAll(/(\d{2})\s*세/g)].map((m) => Number(m[1]));
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
  // 재회 — 확정값 계산과 프롬프트 블록. 운영 경로(generate-result)가 부르는 그 함수들 그대로다.
  const { computeReunionFacts, buildReunionFactsBlock } = await import("../src/lib/saju/reunion");
  const { REUNION_SLUG, reunionTags, hasPartnerChart, partnerBirthInfo } = await import(
    "../src/lib/saju/reunion-input"
  );
  const model = process.env.LLM_MODEL ?? "?";
  const tag = model.replace(/[^a-z0-9]/gi, "");
  console.log(`\n=== 모델: ${process.env.LLM_PROVIDER}/${model} ===\n`);

  for (const c of CASES) {
    // 명식 분석 캐시(모델 바꿔 재실행해도 luckyloveme 재호출 안 함)
    // ⚠ 키는 slug 가 아니라 **생일+성별**이다. slug 로 잡으면 같은 상품의 케이스를 둘 이상
    //   넣었을 때 두 번째가 첫 번째의 명식을 그대로 읽어, 다른 사람인 척하는 가짜 샘플이 나온다.
    //   덤으로 산군·인연이 같은 생일이면 캐시를 공유해 API 호출이 준다(한도 6,000).
    const bk = `${c.birthInfo.birthYear}${c.birthInfo.birthMonth.padStart(2, "0")}${c.birthInfo.birthDay.padStart(2, "0")}`;
    const cacheFile = resolve(tmpdir(), `analysis-${bk}-${c.birthInfo.gender}-${c.birthInfo.birthHour ?? "x"}.json`);
    let analysis: Awaited<ReturnType<typeof saju.fetchSajuAnalysis>>;
    if (existsSync(cacheFile)) {
      analysis = JSON.parse(readFileSync(cacheFile, "utf8"));
      console.log(`[${c.slug}] 명식 캐시 사용`);
    } else {
      console.log(`[${c.slug}] ${c.name} 명식 호출…`);
      try {
        analysis = await saju.fetchSajuAnalysis(c.birthInfo, [], { source: "manual" });
        writeFileSync(cacheFile, JSON.stringify(analysis), "utf8");
      } catch (e) {
        // 한 케이스의 네트워크 실패가 나머지 샘플까지 죽이면 안 된다(무인 실행 대비).
        console.log(`  명식 호출 실패 — 이 케이스만 건너뛴다: ${e instanceof Error ? e.message : e}`);
        continue;
      }
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

    // ── 재회(견우) — 상대 명식 1콜 → computeReunionFacts → 확정값 블록.
    //    운영 경로(generate-result.fetchReunionFacts → keyFactsFor)와 **같은 순서·같은 함수**다.
    //    ⚠ 인연 확정값은 얹지 않는다 — 같은 열두 달을 두 이름으로 주면 모델이 둘 다 쓴다.
    let reunionFacts: ReturnType<typeof computeReunionFacts> | null = null;
    if (c.slug === REUNION_SLUG && c.reunion) {
      let partnerAnalysis: typeof analysis | null = null;
      if (hasPartnerChart(c.reunion)) {
        const pbi = partnerBirthInfo(c.reunion, c.birthInfo.gender)!;
        const pk = `${pbi.birthYear}${pbi.birthMonth.padStart(2, "0")}${pbi.birthDay.padStart(2, "0")}`;
        const pCache = resolve(tmpdir(), `analysis-${pk}-${pbi.gender}-${pbi.birthHour ?? "x"}.json`);
        if (existsSync(pCache)) {
          partnerAnalysis = JSON.parse(readFileSync(pCache, "utf8"));
          console.log("  상대 명식 캐시 사용");
        } else {
          try {
            console.log("  상대 명식 호출…");
            partnerAnalysis = await saju.fetchSajuAnalysis(pbi, [], { source: "manual" });
            writeFileSync(pCache, JSON.stringify(partnerAnalysis), "utf8");
          } catch (e) {
            // 운영도 여기서 안 죽는다 — 상대 없이 「나 혼자 판」으로 계속 간다.
            console.log(`  상대 명식 실패 — 나 혼자 판으로 간다: ${e instanceof Error ? e.message : e}`);
          }
        }
      }
      reunionFacts = computeReunionFacts(analysis, c.birthInfo.gender, c.reunion, { partnerAnalysis });
      keyFacts = [keyFacts, buildReunionFactsBlock(reunionFacts)].filter(Boolean).join("\n\n");
      console.log(
        `  [재회 확정값] 판정=${reunionFacts.odds.grade}(내부 ${reunionFacts.odds.score}) · 트랙=${reunionFacts.track}` +
          ` · 다리 ${reunionFacts.reconnect.length} · 연락가능 ${reunionFacts.contactOk.length} · 연락금지 ${reunionFacts.contactNo.length}` +
          ` · 이별판독 ${reunionFacts.breakup ? (reunionFacts.breakup.bent ? "꺾임" : "안꺾임") : "없음"}` +
          ` · 상대명식 ${reunionFacts.partner ? "있음" : "없음"} · 연적 ${reunionFacts.rival.basis}/${reunionFacts.rival.strength}`,
      );
    }

    // 설계도 + 배정표 + 장별 확정값 — 실제 파이프라인(generate-result.buildPlanForSangun)과 같은 재료.
    // 샘플이 이걸 건너뛰면 개편의 핵심을 안 잰 채 "좋아졌다"고 말하게 된다.
    let blueprint = null, monthPlan = null, pastBlock = null, prescriptionBlock = null;
    // 산군·인연 둘 다 태운다 — generate-result.buildChapterPlan 과 같은 게이트여야 한다.
    // (인연은 2026-08-17 10장 개편으로 달을 쓰는 장이 4개가 되어 배정표가 필요해졌다)
    // 재회도 태운다 — 5장(다리가 놓이는 달)과 6장(연락의 달)이 **같은 열두 달을 다른 이름으로**
    // 부르는 상품이라, 배정표가 없으면 두 장이 같은 달을 두 번 말한다(generate-result 와 같은 게이트).
    if (c.slug === "sangun-sinjeom" || c.slug === "inyeon-saju" || c.slug === REUNION_SLUG) {
      const isSangun = c.slug === "sangun-sinjeom";
      const titles = outlineTitles(c.slug);
      try {
        monthPlan = buildMonthPlan(
          titles,
          saju.computeWealthFacts(analysis),
          saju.computeInyeonFacts(analysis, c.birthInfo.gender, c.reunion?.partner?.gender),
          saju.computeWealthYears(analysis),
          reunionFacts,
        );
        pastBlock = buildPastBlock(analysis) || null;
        // 처방표 장은 산군에만 있다
        prescriptionBlock = isSangun ? buildPrescriptionBlock(computePrescription(analysis)) || null : null;
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
      // 운영과 같은 길로 싣는다 — 재회 여섯 답은 concerns 에 "[프로필] 키: 값" 으로 얹혀 온다.
      // (prompt.ts 가 이 접두사를 알아 「독자 상황」 줄로 새지 않게 걸러 낸다)
      concerns: [...(c.reunion ? reunionTags(c.reunion) : []), ...(c.concern ? [c.concern] : [])],
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
    // cache= 는 린터가 달 검사(지어낸달·표밖의달)를 돌릴 때 쓰는 명식 캐시 파일명이다.
    // 캐시 키가 slug 에서 생일 기준으로 바뀌어 린터가 더는 slug 로 추측할 수 없다.
    const reunionMeta = reunionFacts
      ? ` · 재회판정=${reunionFacts.odds.grade} · 트랙=${reunionFacts.track}`
      : "";
    const header = `<!-- slug=${c.slug} · ${c.name} · birth=${birth} · gender=${bi.gender} · cache=${basename(cacheFile)} · concern=${c.concern ?? ""}${reunionMeta} · ${llm.provider}/${llm.model} · ${chapters.length}챕터 · ${ms}ms · ${text.length}자 · 헷지=${sc.hedge} · 잘못된나이=${JSON.stringify(sc.badAges)} · 가족단정어=${sc.family} -->\n\n`;
    // 파일명에 이름을 넣는다 — slug 만 쓰면 같은 상품의 두 번째 케이스가 첫 번째를 덮어쓴다.
    // variant 는 **같은 사람으로 둘 이상** 뽑을 때(감정만 바꾼 A/B) 필요하다 — 없으면 서로 덮어쓴다.
    const out = resolve(tmpdir(), `sample-${c.slug}-${c.name}${c.variant ? `-${c.variant}` : ""}-${tag}.md`);
    writeFileSync(out, header + text, "utf8");

    console.log(
      `  ▶ [${c.slug}] 헷지 ${sc.hedge}회 · 나이오류 ${sc.badAges.length ? JSON.stringify(sc.badAges) : "없음"} · 가족언급 ${sc.family}${sc.family ? "(" + sc.familyList.join(",") + ")" : ""} · 6/10월 등장챕터 ${sc.timingChapters}/${sc.totalChapters} · ${text.length}자 · ${ms}ms`,
    );
    console.log(`     → ${out}\n`);
  }
  console.log("완료.");
}

main().catch((e) => { console.error(e); process.exit(1); });
