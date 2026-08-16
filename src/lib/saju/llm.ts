// =====================================================
// LLM 프로바이더 스위치
// =====================================================
// LLM_PROVIDER 환경변수로 openai | anthropic | gemini | deepseek 선택.
// 각 SDK는 lazy import 하여 미사용 패키지의 init 비용을 줄임.

import { serverEnv } from "@/lib/env";
import { findFamilyAssertions, stripFamilyAssertions } from "@/lib/saju/quality-gate";

export type LlmRequest = {
  system: string;
  user: string;
};

export type LlmResponse = {
  text: string;
  provider: string;
  model: string;
  successCount?: number; // 성공한 챕터 수 (generateByChapters 에서만 채움)
  totalCount?: number; // 전체 챕터 수
};

export type LlmProvider = "openai" | "deepseek" | "anthropic" | "gemini";

/** 프로바이더·모델을 직접 지정해 부른다. 설계도 패스는 챕터와 다른(더 강한) 모델을 쓸 수 있어야 해서
 *  env 를 읽는 부분과 실제 호출을 갈라 둔다. */
export async function generateWithProvider(
  req: LlmRequest,
  provider: LlmProvider,
  model: string,
): Promise<LlmResponse> {
  const env = serverEnv();
  switch (provider) {
    case "openai":
      return callOpenAICompatible(req, model, env.OPENAI_API_KEY, "openai");
    case "deepseek":
      return callOpenAICompatible(req, model, env.DEEPSEEK_API_KEY, "deepseek");
    case "anthropic":
      return callAnthropic(req, model, env.ANTHROPIC_API_KEY);
    case "gemini":
      return callGemini(req, model, env.GOOGLE_GENERATIVE_AI_API_KEY);
  }
}

export async function generateInterpretation(req: LlmRequest): Promise<LlmResponse> {
  const env = serverEnv();
  return generateWithProvider(req, env.LLM_PROVIDER as LlmProvider, env.LLM_MODEL);
}

// 가족 단정 재생성 지시 — 검출 시 1회만 다시 시도.
const FAMILY_RETRY_NOTE = `

⚠️ 다시 씁니다: 자녀·배우자·결혼·가족의 유무나 상태를 단정하는 문장을 쓰지 마세요. 가족 이야기를 꼭 해야 하면 '자녀가 있으시다면', '배우자가 계시다면'처럼 조건형으로만 쓰세요. 가장 안전한 방법은 가족 대신 본인의 행동·성향으로 풀어 쓰는 것입니다.`;

// 챕터별 병렬 생성 — 각 챕터를 따로 호출(집중도↑)한 뒤 제목 + 본문들을 합쳐 하나의 마크다운으로.
// 한 챕터가 실패해도 나머지로 결과지는 완성되도록 개별 실패를 흡수한다.
// 결정론적 품질 게이트(quality-gate.ts): 가족 단정 문장 검출 → 1회 재생성, 그래도 남으면 문장 제거.
// (나이 정확도는 프롬프트의 [확정 사실] 주입으로 처리 — 출력 후 "NN세" 자동치환은
//  '현재 나이 오기'와 '대운 N세 시점 언급'을 구분 못 해 정당한 값을 망가뜨려서 제거함)
/**
 * 챕터 안의 소제목이 `###` 로 새어나오는 걸 코드로 막는다.
 *
 * 장 제목만 `###` 여야 한다 — 린터·결과지 목차·스크롤 UI 가 전부 `###` 를 '장'으로 센다.
 * 소제목까지 `###` 로 나오면 10장짜리가 14장으로 잡혀 장 수·달 배정·목차가 통째로 어긋난다.
 * 프롬프트에는 이미 "소제목은 ### 대신 굵은 글씨"라고 적혀 있지만 모델이 어긴다(실측:
 * gpt-5.6-luna, 인연 10장 → 14장). 기계적으로 정답이 하나인 건 부탁하지 않고 못 박는다.
 *
 * 각 챕터 응답의 **첫 헤딩만** 장 제목으로 남기고 그 뒤 헤딩은 굵은 글씨로 강등한다.
 */
function demoteInnerHeadings(text: string): string {
  let seenFirst = false;
  return text.replace(/^[ \t]{0,3}#{2,6}[ \t]+(.+?)[ \t]*$/gm, (_m, t: string) => {
    if (!seenFirst) {
      seenFirst = true;
      return `### ${t}`;
    }
    return `**${t}**`;
  });
}

export async function generateByChapters(
  title: string,
  chapters: { system: string; user: string }[],
): Promise<LlmResponse> {
  const genOne = async (c: { system: string; user: string }) => {
    try {
      // 챕터 하나가 죽으면 그 장이 결과지에서 조용히 사라진다 — 티저 목차가 약속한 장이라
      // 빠지면 들통이다(실측: deepseek-v4-pro 9챕터 중 1장이 통째로 실패). 한 번은 다시 던진다.
      let r = await generateInterpretation(c).catch(() => generateInterpretation(c));
      if (!r.text.trim()) r = await generateInterpretation(c);
      if (findFamilyAssertions(r.text).length > 0) {
        try {
          const retry = await generateInterpretation({ system: c.system, user: c.user + FAMILY_RETRY_NOTE });
          if (retry.text.trim()) r = retry;
        } catch {
          /* 재시도 실패 시 원본 유지 → 아래에서 문장 제거 */
        }
        if (findFamilyAssertions(r.text).length > 0) {
          r = { ...r, text: stripFamilyAssertions(r.text) };
        }
      }
      return { text: demoteInnerHeadings(r.text), provider: r.provider, model: r.model };
    } catch {
      return { text: "", provider: "", model: "" };
    }
  };

  const parts = await Promise.all(chapters.map(genOne));
  const body = parts.map((p) => p.text.trim()).filter(Boolean).join("\n\n");
  const succeeded = parts.filter((p) => p.provider);
  const ok = succeeded[0];

  return {
    text: `## ${title}\n\n${body}`,
    provider: ok?.provider ?? "",
    model: ok?.model ?? "",
    successCount: succeeded.length,
    totalCount: chapters.length,
  };
}

// OpenAI · 딥시크 공용 — 딥시크는 OpenAI 호환 API라 baseURL 만 갈아끼우면 같은 SDK 로 돈다.
// 딥시크는 컨텍스트 캐시가 자동이라, 챕터마다 반복되는 [확정 사실]+[사주 풀 명식] 블록이
// 공통 prefix 로 걸리면 입력 단가가 120배 싸진다($0.435 → $0.003625/1M).
// 단, generateByChapters 가 전 챕터를 동시에 쏘면 전부 캐시 미스다 — 캐시를 태우려면
// 첫 챕터를 먼저 보내 캐시를 깐 뒤 나머지를 병렬로 던져야 한다(채택 시 적용).
const OPENAI_COMPAT: Record<string, { baseURL?: string; envKey: string }> = {
  openai: { envKey: "OPENAI_API_KEY" },
  deepseek: { baseURL: "https://api.deepseek.com", envKey: "DEEPSEEK_API_KEY" },
};

async function callOpenAICompatible(
  req: LlmRequest,
  model: string,
  key: string | undefined,
  provider: "openai" | "deepseek",
): Promise<LlmResponse> {
  const cfg = OPENAI_COMPAT[provider];
  if (!key) throw new Error(`${cfg.envKey} is required when LLM_PROVIDER=${provider}`);
  const { default: OpenAI } = await import("openai");
  // 재시도·타임아웃은 프로바이더마다 **정반대 이유**로 갈린다.
  //
  //  deepseek: 꼬리 지연이 문제였다 — 챕터당 30~90초인데 SDK 기본 재시도와 겹쳐 한 번
  //    생성에 633초까지 찍혔다(2026-08-09 실측). 그래서 재시도를 끄고 150초에서 끊는다.
  //  openai(루나): 꼬리가 없다(20~30초). 대신 **429(분당 토큰 한도)** 가 실제 위험이다 —
  //    결과지 1건이 입력 ~20만 토큰이라, 결제가 몰리면 두 번째 손님부터 전 챕터가
  //    즉시 거절된다(배치 검증에서 15명 중 14명이 이걸로 죽었다). 429 는 잠깐 기다리면
  //    풀리는 것이므로 SDK 백오프(retry-after 헤더 존중)에 맡긴다.
  //    최악 시간: 120초 × (1+2회) = 360초지만, 실제로는 첫 시도 20~30초에 끝나고
  //    429 일 때만 대기가 붙는다. 그마저 실패하면 80% 게이트가 부분 저장을 막고
  //    폴링·크론이 이어받는다(generate-result 참고).
  const isDeepseek = provider === "deepseek";
  const client = new OpenAI({
    apiKey: key,
    timeout: isDeepseek ? 150_000 : 120_000,
    maxRetries: isDeepseek ? 0 : 2,
    ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
  });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    // GPT-5.6 계열은 temperature 지정을 400 으로 거부한다(기본 1만 허용) — A/B 실측.
    // 이 분기 없이 LLM_MODEL 만 gpt-5.6-luna 로 바꾸면 결과지 생성이 전부 터진다.
    ...(model.startsWith("gpt-5.6") ? {} : { temperature: 0.7 }),
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return { text, provider, model };
}

async function callAnthropic(req: LlmRequest, model: string, key: string | undefined): Promise<LlmResponse> {
  if (!key) throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: key });
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
  });
  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
  return { text, provider: "anthropic", model };
}

async function callGemini(req: LlmRequest, model: string, key: string | undefined): Promise<LlmResponse> {
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required when LLM_PROVIDER=gemini");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(key);
  const m = client.getGenerativeModel({ model, systemInstruction: req.system });
  const result = await m.generateContent(req.user);
  const text = result.response.text();
  return { text, provider: "gemini", model };
}
