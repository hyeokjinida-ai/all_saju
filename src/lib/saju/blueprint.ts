// =====================================================
// 장부 설계도 — 챕터를 쓰기 전에 "누가 무엇을 말할지" 먼저 정한다.
// =====================================================
// 왜 필요한가: 결과지는 9~11챕터를 **병렬로 따로** 호출해 만든다(집중도 때문). 그래서 각 챕터는
// 다른 챕터가 뭘 썼는지 모른다. 실측에서 같은 달이 4개 장에 나오고, 고민은 한 장에만 답하고,
// 할 말이 떨어지면 "건강 챙겨라" 같은 걸 채워 넣었다. 분량을 늘리면 이 병이 그대로 배로 커진다.
//
// 두 갈래로 푼다.
//   ① 달 배정표 — **코드**가 정한다. 어느 장이 어느 달을 말할지는 계산이지 창작이 아니다(공짜·정확).
//   ② 설계도  — **LLM**이 정한다. 고민 판정, 인생 서사, 과거 검증, 장별 주장과 소제목.
//
// 설계도는 실패해도 된다. 결제한 손님을 설계도 에러로 막을 수는 없다 — null 이면 챕터들은
// 배정표만 들고 예전처럼 쓴다(그것만으로도 달 반복은 죽는다).
// env·LLM 은 generateBlueprint 안에서만 lazy 로 부른다 — 이 모듈의 문자열 조립 함수들은
// prompt.ts(→ demo/live 페이지)까지 딸려 가는데, 그 자리에서 env 검증이 터지면 안 된다.
import { z } from "zod";
import type { LlmProvider } from "./llm";
import type { WealthFacts, InyeonFacts } from "./saju-api";

// ── ① 달 배정표 (LLM 0회) ────────────────────────────

export type MonthAssignment = {
  /** 이 장이 말해도 되는 달 라벨("2027년 6월"). 빈 배열이면 달 얘기를 하지 않는 장이다. */
  allow: string[];
  /** 연 단위(대운·크게 바뀌는 해)를 이 장이 독점하는가 */
  ownsYears: boolean;
};

/** 장 제목으로 찾는다 — 장 번호를 박으면 11장 개편에서 통째로 어긋난다. */
function findIdx(titles: string[], re: RegExp): number {
  return titles.findIndex((t) => re.test(t));
}

/**
 * 어느 장이 어느 달을 말할지 코드로 못 박는다.
 *
 * 규칙 하나만 기억하면 된다 — **한 달은 한 장의 것**이다. 두 장이 같은 달을 말하면
 * 손님은 "아까 읽은 얘기"로 받아들이고, 그 순간 분량이 값어치가 아니라 부담이 된다.
 * 예외는 '일과 자리'가 돈 TOP1 을 이직 시점 근거로 한 번 인용하는 것뿐이다.
 */
export function buildMonthPlan(
  chapterTitles: string[],
  wealth: WealthFacts | null,
  inyeon: InyeonFacts | null,
  /** 크게 벌리는 해(computeWealthYears) — 인연 topYears 와 함께 '크게 바뀌는 해' 장이 독점한다 */
  wealthYears?: { label: string }[] | null,
): MonthAssignment[] {
  const plan: MonthAssignment[] = chapterTitles.map(() => ({ allow: [], ownsYears: false }));
  const set = (i: number, allow: string[], ownsYears = false) => {
    if (i >= 0) plan[i] = { allow: allow.filter(Boolean), ownsYears };
  };

  const wTop = wealth?.top.map((m) => m.label) ?? [];
  const wBad = wealth?.bad.map((m) => m.label) ?? [];
  const iTop = inyeon?.top3.map((r) => r.label) ?? [];
  const iShaky = inyeon?.shaky.map((r) => r.label) ?? [];
  // 연 단위는 인연 해 + 재물 해를 한 장에 몰아준다(중복 라벨은 하나로).
  const years = [...new Set([...(inyeon?.topYears.map((r) => r.label) ?? []), ...(wealthYears?.map((r) => r.label) ?? [])])];

  set(findIdx(chapterTitles, /돈이 들어오는/), [...wTop.slice(0, 2), wBad[0]]);
  set(findIdx(chapterTitles, /인연이 들어오는/), iTop.slice(0, 2));
  // 이직·계약 시점은 돈 흐름이 근거다. TOP1 하나만 다시 인용하게 허용하고 나머지는 새 달로 채운다.
  set(findIdx(chapterTitles, /일과 자리/), [wTop[0], ...wBad.slice(1)]);
  set(findIdx(chapterTitles, /조심할 달/), iShaky);
  set(findIdx(chapterTitles, /크게 바뀌는 해/), years, true);
  // 걸어온 길은 과거 전용 — 미래 달을 여기서 말하면 서사가 흐려진다(연도 근거는 pastBlock 이 준다).
  set(findIdx(chapterTitles, /걸어온 길/), []);
  // 처방 장은 생활 지침 전용 — 시기를 말하기 시작하면 달력 장들과 겹친다.
  set(findIdx(chapterTitles, /산군의 처방/), []);
  // 물음 장은 답의 재총합 자리 — 시기로 답해야 하는데 달을 금지하면 지어낸다(실측: 2026-4 환각).
  // 돈 TOP2 + 인연 TOP1 재인용을 허용한다. 달도배(3장 이상)는 린터가 계속 지킨다.
  set(findIdx(chapterTitles, /물음/), [wTop[0], wTop[1], iTop[0]]);
  // 당부는 "가장 가까운 좋은 달"과 연결하라고 시키는 장 — 후보 중 제일 이른 달 하나만 허용.
  const soonest = [...wTop, ...iTop]
    .map((l) => ({ l, m: l.match(/(20\d{2})년\s*(\d{1,2})월/) }))
    .filter((x) => x.m)
    .sort((a, b) => Number(a.m![1]) * 100 + Number(a.m![2]) - (Number(b.m![1]) * 100 + Number(b.m![2])))[0]?.l;
  set(findIdx(chapterTitles, /당부/), soonest ? [soonest] : []);

  return plan;
}

/** 배정표를 프롬프트에 붙일 문장으로. 빈 장에는 "달 얘기 금지"를 명시한다. */
export function monthPlanLine(a: MonthAssignment | undefined): string {
  if (!a) return "";
  if (!a.allow.length) {
    return "\n■ **이 장에서는 특정 달(○○년 ○월)을 언급하지 마세요.** 달을 말하는 장이 따로 있습니다.";
  }
  return `\n■ **이 장이 맡은 달: ${a.allow.join(" · ")}** — 이 달들만 쓰고, 다른 달은 언급하지 마세요.${
    a.ownsYears ? " 연 단위(○○년) 전망도 이 장이 맡습니다." : ""
  }`;
}

// ── ② LLM 설계도 ────────────────────────────────────

const ChapterPlanSchema = z.object({
  claim: z.string().min(5),
  sections: z.array(z.string().min(2)).min(2).max(3),
});
const BlueprintSchema = z.object({
  verdict: z.string().min(5),
  thread: z.string().min(5),
  arc: z.array(z.object({ period: z.string().min(2), line: z.string().min(10) })).min(2).max(5),
  pastEvents: z.array(z.object({ year: z.number().int(), claim: z.string().min(10) })).max(3),
  chapters: z.array(ChapterPlanSchema),
});
export type ResultBlueprint = z.infer<typeof BlueprintSchema>;

const BLUEPRINT_SYSTEM = `너는 사주 결과지의 **편집장**이다. 글을 쓰는 게 아니라, 글쓴이들에게 나눠 줄 설계도를 짠다.

결과지는 여러 장(章)을 **각각 다른 사람이 동시에** 쓴다. 서로 뭘 쓰는지 모른다.
그래서 네 설계도가 유일한 조율 장치다. 설계도가 겹치면 결과지가 같은 말을 세 번 하게 된다.

지켜라:
- 장마다 **주장(claim)이 서로 겹치면 안 된다.** 같은 근거를 두 장이 쓰면 하나를 다른 각도로 바꿔라.
- 소제목(sections)은 장 안을 2~3덩이로 가른다. 밋밋한 이름표("성격 분석") 말고 **읽고 싶어지는 말**로.
  좋은 예: "니가 절대 안 보여주는 얼굴" / "열등감의 정체" / "돈이 새는 구멍"
- 과거 사건(pastEvents)은 **[확정 사실]의 대운·세운 연도에서만** 고른다. 무슨 일이었는지는
  단정하지 말고 두 갈래로 열어 둔다("사람이든 자리든 하나를 정리했다"). 틀리면 결과지 전체가 죽는다.
- 판정(verdict)은 손님 고민에 대한 **한 문장 확답**이다. 얼버무리면 상품이 안 된다.
  글쓴이들이 그대로 받아 적기도 하니 **반말 평서형**으로 써라("~해도 된다", "~은 6월이다").
- 실타래(thread)는 결과지 전체를 꿰는 한 줄이다. 모든 장이 이 줄을 향한다.

JSON 하나만 출력한다. 설명·인사·코드펜스 없이 { 로 시작해 } 로 끝낸다.`;

function blueprintUser(input: {
  keyFacts: string;
  concern: string;
  chapterTitles: string[];
  arcHint: string;
}): string {
  return `${input.keyFacts}

[손님이 물어본 것]
${input.concern || "(고르지 않음 — 이 명식에서 가장 절실해 보이는 물음을 네가 골라라)"}

[대운 흐름 — 서사(arc)와 과거 사건(pastEvents)은 여기 연도에서만 뽑아라]
${input.arcHint || "(대운 정보 없음 — arc 는 나이대로만 쓰고 연도를 지어내지 마라)"}

[장 목록 — chapters 배열을 이 순서·이 개수(${input.chapterTitles.length}개)로 정확히 채워라]
${input.chapterTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

아래 형태로만 답하라:
{
  "verdict": "고민에 대한 한 문장 확답",
  "thread": "결과지 전체를 꿰는 한 줄",
  "arc": [{ "period": "22~31세 임신 대운", "line": "그 10년이 어떤 시기였는지 한 문장" }],
  "pastEvents": [{ "year": 2021, "claim": "그해에 무엇이 있었을지 (두 갈래로 열어서)" }],
  "chapters": [{ "claim": "이 장의 핵심 주장 한 문장", "sections": ["소제목", "소제목"] }]
}`;
}

/**
 * 설계도를 뽑는다. **실패하면 null** — 호출부는 반드시 null 을 견뎌야 한다.
 *
 * 모델은 BLUEPRINT_PROVIDER/BLUEPRINT_MODEL 로 따로 지정할 수 있다(챕터보다 강한 모델을 쓰는 자리).
 * 안 주면 챕터와 같은 모델을 쓴다.
 */
export async function generateBlueprint(input: {
  keyFacts: string;
  concern: string;
  chapterTitles: string[];
  arcHint: string;
}): Promise<ResultBlueprint | null> {
  // 명시적으로 켜야 돈다. 실측(2026-08-08): deepseek-v4-pro 설계도 51초 — 결제 라우트의
  // maxDuration 60초 안에서 챕터 생성과 같이 돌 수 없다. 배정표(코드)만으로도 달 반복은
  // 죽는 걸 확인했으므로, LLM 설계도는 생성을 백그라운드로 분리한 뒤에 켤 실험 기능으로 남긴다.
  if (!process.env.BLUEPRINT_PROVIDER && !process.env.BLUEPRINT_MODEL) return null;
  const { serverEnv } = await import("@/lib/env");
  const { generateWithProvider } = await import("./llm");
  const env = serverEnv();
  const provider = (process.env.BLUEPRINT_PROVIDER ?? env.LLM_PROVIDER) as LlmProvider;
  const model = process.env.BLUEPRINT_MODEL ?? env.LLM_MODEL;

  const parseOnce = async (extra = ""): Promise<ResultBlueprint | null> => {
    const r = await generateWithProvider(
      { system: BLUEPRINT_SYSTEM + extra, user: blueprintUser(input) },
      provider,
      model,
    );
    // 코드펜스로 감싸 오는 모델이 있다 — 벗겨내고 첫 { 부터 마지막 } 까지만 본다.
    const raw = r.text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s < 0 || e <= s) return null;
    const parsed = BlueprintSchema.safeParse(JSON.parse(raw.slice(s, e + 1)));
    if (!parsed.success) return null;
    // 장 개수가 어긋나면 배정이 밀린다 — 모자라면 채우고 넘치면 자른다.
    const chapters = input.chapterTitles.map(
      (_, i) => parsed.data.chapters[i] ?? { claim: "", sections: [] },
    );
    return { ...parsed.data, chapters };
  };

  try {
    return (await parseOnce()) ?? (await parseOnce("\n\n※ 앞선 시도가 JSON 파싱에 실패했다. 오직 JSON 만 출력하라."));
  } catch {
    return null; // 네트워크·파싱·타임아웃 — 결과지는 설계도 없이도 나가야 한다
  }
}

/** 설계도를 챕터 프롬프트에 붙일 블록으로. blueprint 가 없으면 빈 문자열. */
export function blueprintLines(bp: ResultBlueprint | null, chapterIdx: number): string {
  if (!bp) return "";
  const mine = bp.chapters[chapterIdx];
  const lines = [
    `\n[장부 설계도 — 편집장이 미리 짜 둔 것. 이 장의 몫만 쓰고 남의 몫은 건드리지 마세요]`,
    `- 이 결과지 전체를 꿰는 줄: ${bp.thread}`,
    `- 손님 고민에 대한 최종 판정: ${bp.verdict}`,
  ];
  if (mine?.claim) lines.push(`- **이 장이 맡은 주장: ${mine.claim}**`);
  if (mine?.sections?.length) {
    lines.push(
      `- **이 장을 이 소제목들로 나눠 쓰세요(마크다운 굵은 글씨 한 줄로): ${mine.sections.join(" / ")}**`,
    );
  }
  return lines.join("\n");
}

/** 과거 서사 장 전용 — arc 와 pastEvents 를 통째로 넘긴다. */
export function blueprintArcBlock(bp: ResultBlueprint | null): string {
  if (!bp || (!bp.arc.length && !bp.pastEvents.length)) return "";
  const arc = bp.arc.map((a) => `  · ${a.period}: ${a.line}`).join("\n");
  const past = bp.pastEvents.map((p) => `  · ${p.year}년: ${p.claim}`).join("\n");
  return `\n[이 장에서 쓸 인생 서사 — 편집장이 뽑아 둔 것]\n${arc}${past ? `\n[짚어 줄 과거 — 연도를 바꾸지 마세요]\n${past}` : ""}`;
}
