// pnpm compare:models
//
// 같은 명식으로 여러 모델의 결과지를 통째로 뽑아 나란히 놓고 고르기 위한 스크립트.
// (챕터 1개만 비교하는 compare-llm.ts 와 달리, 결과지 1건 전체를 뽑아 원가·어투까지 잰다)
//
// "어느 모델을 쓸까"는 벤치마크로 못 정한다 — 우리 프롬프트(산군 반말·사극어미 금지·
// 확정값 인용)를 지키는지가 전부라, 실제 결과지를 뽑아 사람이 읽고 정해야 한다.
//
// - 만세력은 measure-teaser 가 채워둔 캐시를 재사용 → 공급사 API 콜 0
// - 모델별 토큰·비용·소요시간 + 기계로 셀 수 있는 어투 위반 수를 같이 찍는다
// - 결과지 전문은 docs-private/llm-ab-<STAMP>/ 에 md 로 저장(gitignore 대상)

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

const STAMP = "2026-08";
const OUT_DIR = `docs-private/llm-ab-${STAMP}`;
const SLUG = "sangun-sinjeom"; // 메인 상품 — 어투 제약이 가장 빡세서 변별력이 제일 크다
const USD_KRW = 1400;

type Candidate = {
  label: string;
  model: string;
  baseURL?: string;
  envKey: string;
  /** $/1M 토큰 */
  price: { in: number; out: number; cacheHit?: number };
  /** GPT-5.6 계열은 temperature 지정을 거부한다(기본 1만 허용) — true 면 안 보낸다 */
  noTemp?: boolean;
  /** 어투 실험용 — 챕터 system 뒤에 덧붙는 지시. 프로덕션 프롬프트는 안 건드리고 A/B 만 한다 */
  voiceBoost?: string;
};

// 무당 보정(2026-08-09 A/B 승인) — **prompt.ts 산군 voice 의 [문장의 결] 블록으로 편입됨.**
// 이제 모든 후보가 프롬프트를 통해 보정을 받으므로 voiceBoost 후보는 지웠다(이중 적용 방지).
// 새 어투 실험을 할 땐 voiceBoost 필드에 실험 지시만 얹어 A/B 하면 된다.

const CANDIDATES: Candidate[] = [
  {
    label: "gpt-4o-mini (현재)",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    price: { in: 0.15, out: 0.6 },
  },
  {
    // 신형 최저가 도전자 — pro 의 1/4 가격(₩44/건 추정). 자를 통과하면 env 한 줄로 갈아탄다.
    // (flash 는 2026-08-09 A/B 에서 탈락: 존댓말·나이오류 치명 + 80~109초 — 후보에서 뺌)
    label: "gpt-5.6-luna",
    model: "gpt-5.6-luna",
    envKey: "OPENAI_API_KEY",
    price: { in: 0.2, out: 1.2, cacheHit: 0.02 },
    noTemp: true,
  },
  {
    // 업그레이드 대기 후보 — 루나 대비 문장 순간 포착이 한 수 위(₩650/건). 후기 반응 보고 올릴 자리.
    label: "gpt-5.6-terra",
    model: "gpt-5.6-terra",
    envKey: "OPENAI_API_KEY",
    price: { in: 2.0, out: 12.0, cacheHit: 0.2 },
    noTemp: true,
  },
  {
    label: "deepseek-v4-pro",
    model: "deepseek-v4-pro",
    baseURL: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    price: { in: 0.435, out: 0.87, cacheHit: 0.003625 },
  },
];

// ── 기계로 거를 수 있는 것 — 사람이 읽기 전에 먼저 센다 ──
// 산군은 반말 하대체 + 사극 어미 전면 금지가 캐릭터의 전부라, 여기서 깨지면 읽을 것도 없다.
const SAGEUK = /하거라|이니라|느니라|하였도다|듣거라|할지어다|하시게|하노라/g;
const JONDAE = /(습니다|입니다|해요|하세요|됩니다|드려요|이에요|예요)/g;

function checkText(text: string, familyHits: number) {
  return {
    chars: text.replace(/^#{1,3}\s.*$/gm, "").replace(/\s/g, "").length,
    sageuk: (text.match(SAGEUK) ?? []).length,
    jondae: (text.match(JONDAE) ?? []).length,
    jikeon: (text.match(/\[산군의 직언\]/g) ?? []).length,
    family: familyHits,
  };
}

async function main() {
  const api = await import("../src/lib/saju/saju-api");
  const { buildChapterPrompts, outlineTitles } = await import("../src/lib/saju/prompt");
  const { findFamilyAssertions } = await import("../src/lib/saju/quality-gate");
  const { normalizeResultVoice } = await import("../src/lib/saju/normalize-voice");
  const { buildMonthPlan } = await import("../src/lib/saju/blueprint");
  const { buildPastBlock } = await import("../src/lib/saju/teaser");
  const { computePrescription, buildPrescriptionBlock } = await import("../src/lib/saju/prescription");
  const { default: OpenAI } = await import("openai");

  mkdirSync(OUT_DIR, { recursive: true });

  const rows = JSON.parse(readFileSync(`docs-private/teaser-sample-${STAMP}.json`, "utf8"));
  // 시간 아는 손님 / 모르는 손님 각 1명 — 시주가 비면 프롬프트가 달라져서 둘 다 본다
  // SAMPLE_OFFSET: 캐시 측정을 다시 할 땐 반드시 올려서 '처음 보는 명식'으로 돌린다.
  // 같은 프롬프트를 두 번 돌리면 앞 실행이 채운 캐시에 걸려 히트율이 부풀려진다.
  const OFFSET = Number(process.env.SAMPLE_OFFSET ?? 0);
  const ok = rows.filter((r: { ok: boolean }) => r.ok);
  const withTime = ok.filter((r: { sample: { birthTime: string | null } }) => r.sample.birthTime);
  const noTime = ok.filter((r: { sample: { birthTime: string | null } }) => !r.sample.birthTime);
  const samples = [withTime[OFFSET]?.sample, noTime[OFFSET]?.sample].filter(Boolean);

  const summary: string[] = [];
  const say = (s: string) => { summary.push(s); console.log(s); };

  say(`# 모델 A/B — ${SLUG} (${STAMP})\n`);

  for (const [si, s] of samples.entries()) {
    const [y, m, d] = s.birthDate.split("-");
    const [hh, mm] = s.birthTime ? s.birthTime.split(":") : [undefined, undefined];
    const birthInfo = {
      birthYear: y,
      birthMonth: String(parseInt(m, 10)),
      birthDay: String(parseInt(d, 10)),
      ...(s.birthTime ? { birthHour: String(parseInt(hh, 10)), birthMinute: String(parseInt(mm, 10)) } : {}),
      calendarType: s.calendar === "lunar" ? "음력" : "양력",
      gender: s.gender,
    } as Parameters<typeof api.fetchSajuAnalysis>[0];

    const analysis = await api.fetchSajuAnalysis(birthInfo, [], { source: "demo" });
    const myeongsik = api.ganjiToMyeongsik(analysis);
    if (!myeongsik) { console.log(`표본 ${si + 1} 명식 변환 실패 — 건너뜀`); continue; }

    // 린터가 이 표본의 확정값을 다시 계산할 수 있게 명식을 옆에 깔아 둔다.
    // (lint-result.ts 는 헤더의 slug 로 temp/analysis-<slug>.json 을 찾는다)
    const sampleSlug = `cmp${si + 1}`;
    writeFileSync(resolve(tmpdir(), `analysis-${sampleSlug}.json`), JSON.stringify(analysis), "utf8");

    const keyFacts = [
      api.buildKeyFactsBlock(analysis, birthInfo),
      api.buildWealthFactsBlock(analysis),
      api.buildInyeonFactsBlock(analysis, s.gender, undefined),
    ].filter(Boolean).join("\n\n");

    // 배정표 + 장별 확정값 — 실서비스(generate-result.buildPlanForSangun)와 같은 재료.
    // 이거 없이 재면 걸어온 길·처방 장이 확정값 없이 돌아 실제와 다른 결과지를 비교하게 된다.
    let monthPlan = null, pastBlock = null, prescriptionBlock = null;
    try {
      monthPlan = buildMonthPlan(
        outlineTitles(SLUG),
        api.computeWealthFacts(analysis),
        api.computeInyeonFacts(analysis, s.gender, undefined),
        api.computeWealthYears(analysis),
      );
      pastBlock = buildPastBlock(analysis) || null;
      prescriptionBlock = buildPrescriptionBlock(computePrescription(analysis)) || null;
    } catch { /* 확정값 실패 시 예전 방식 그대로 */ }

    const { title, chapters } = buildChapterPrompts({
      productSlug: SLUG,
      productName: "산군 신점",
      name: "김지영",
      myeongsik,
      manseryeokText: api.formatSajuCompact(analysis, birthInfo),
      birthDate: s.birthDate,
      birthTime: s.birthTime,
      timeUnknown: !s.birthTime,
      gender: s.gender,
      concerns: ["돈", "인연"],
      keyFacts,
      monthPlan,
      pastBlock,
      prescriptionBlock,
    });

    const label = `표본${si + 1} ${s.birthDate} ${s.gender === "female" ? "여" : "남"} ${s.birthTime ?? "시간모름"}`;
    say(`\n## ${label} — 챕터 ${chapters.length}개\n`);
    say(`| 모델 | 소요 | 입력토큰 | 캐시히트 | 출력토큰 | 원가 | 글자수 | 사극어미 | 존댓말 | 직언 | 가족단정 |`);
    say(`|---|---|---|---|---|---|---|---|---|---|---|`);

    for (const c of CANDIDATES) {
      // CANDIDATE_FILTER=보정 처럼 라벨 부분일치로 골라 돌린다 — 전 후보 재실행은 돈·시간 낭비.
      const filter = process.env.CANDIDATE_FILTER;
      if (filter && !c.label.includes(filter)) continue;
      const key = process.env[c.envKey];
      if (!key) { say(`| ${c.label} | ${c.envKey} 없음 — 건너뜀 | | | | | | | | | |`); continue; }
      // timeout: pro 꼬리 지연이 스크립트 전체를 물고 늘어진다(실측 600초 킬) — llm.ts 와 같은 150초 컷.
      const client = new OpenAI({ apiKey: key, timeout: 150_000, maxRetries: 0, ...(c.baseURL ? { baseURL: c.baseURL } : {}) });

      const t0 = Date.now();
      const parts = await Promise.all(chapters.map(async (ch) => {
        try {
          const r = await client.chat.completions.create({
            model: c.model,
            messages: [
              { role: "system", content: ch.system + (c.voiceBoost ?? "") },
              { role: "user", content: ch.user },
            ],
            ...(c.noTemp ? {} : { temperature: 0.7 }),
          });
          const u = (r.usage ?? {}) as unknown as Record<string, unknown>;
          const details = (u.prompt_tokens_details ?? {}) as Record<string, number>;
          return {
            text: r.choices[0]?.message?.content ?? "",
            inTok: (u.prompt_tokens as number) ?? 0,
            outTok: (u.completion_tokens as number) ?? 0,
            // 캐시 히트 토큰 — 필드명이 갈린다(딥시크: prompt_cache_hit_tokens / OpenAI: prompt_tokens_details.cached_tokens).
            // 챕터를 동시에 쏘면 전부 미스로 찍힌다 → 이 값이 0이면 캐시 워밍업 구조가 필요하다는 증거다.
            hit: ((u.prompt_cache_hit_tokens as number) ?? 0) || (details.cached_tokens ?? 0),
          };
        } catch (e) {
          console.log(`    챕터 실패(${c.label}): ${(e as Error).message}`);
          return { text: "", inTok: 0, outTok: 0, hit: 0 };
        }
      }));
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      const body = parts.map((p) => p.text.trim()).filter(Boolean).join("\n\n");
      const md = `## ${title}\n\n${body}`;
      const inTok = parts.reduce((a, p) => a + p.inTok, 0);
      const outTok = parts.reduce((a, p) => a + p.outTok, 0);
      const hit = parts.reduce((a, p) => a + p.hit, 0);

      const usd =
        ((inTok - hit) * c.price.in + hit * (c.price.cacheHit ?? c.price.in) + outTok * c.price.out) / 1e6;
      // 실제 파이프라인은 여기서 후처리를 거친다. 안 거치고 재면 손님이 보지도 않을 문장으로
      // 모델을 떨어뜨리게 된다(하라체·"대흉"은 코드가 잡는다). 모델의 소질은 raw 로,
      // 서비스 품질은 후처리본으로 — 표에는 후처리본을 쓴다.
      const norm = normalizeResultVoice(md, { banmal: true, name: "김지영" }).text;
      const chk = checkText(norm, findFamilyAssertions(norm).length);

      // 라벨 기준 — 같은 모델을 보정 전/후로 두 번 돌릴 때 파일이 덮어써지지 않게.
      const slugName = c.label.replace(/[^\w.가-힣-]/g, "");
      // lint-result.ts 가 읽는 헤더 — slug 로 temp/analysis-<slug>.json 을 찾아 달 검사를 돈다.
      const header = `<!-- slug=${sampleSlug} · 김지영 · birth=${s.birthDate} · gender=${s.gender} · concern=돈·인연 · ${c.model} · ${chapters.length}챕터 -->\n\n`;
      writeFileSync(`${OUT_DIR}/표본${si + 1}_${slugName}.md`, header + norm, "utf8");

      say(
        `| ${c.label} | ${secs}초 | ${inTok.toLocaleString()} | ${hit.toLocaleString()} | ${outTok.toLocaleString()} ` +
          `| ₩${Math.round(usd * USD_KRW)} | ${chk.chars.toLocaleString()}자 | ${chk.sageuk} | ${chk.jondae} | ${chk.jikeon} | ${chk.family} |`,
      );
    }
  }

  say(`\n- 사극어미·존댓말·가족단정은 **0이 정상**(산군은 반말 하대체 + 가족 단정 금지)`);
  say(`- 직언은 돈·인연 챕터에서 나와야 하므로 보통 4개 이상`);
  say(`- 목표 분량 2,600~3,200자`);
  say(`- 원가는 $1=${USD_KRW}원 기준, 결과지 1건(${SLUG}) 전체`);
  say(`- 결과지 전문: ${OUT_DIR}/`);

  writeFileSync(`${OUT_DIR}/00_요약.md`, summary.join("\n") + "\n", "utf8");
}

main().catch((e) => { console.error("실패:", e); process.exit(1); });
