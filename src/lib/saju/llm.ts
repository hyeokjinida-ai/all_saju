// =====================================================
// LLM 프로바이더 스위치
// =====================================================
// LLM_PROVIDER 환경변수로 openai | anthropic | gemini 선택.
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

export async function generateInterpretation(req: LlmRequest): Promise<LlmResponse> {
  const env = serverEnv();
  switch (env.LLM_PROVIDER) {
    case "openai":
      return callOpenAI(req, env.LLM_MODEL, env.OPENAI_API_KEY);
    case "anthropic":
      return callAnthropic(req, env.LLM_MODEL, env.ANTHROPIC_API_KEY);
    case "gemini":
      return callGemini(req, env.LLM_MODEL, env.GOOGLE_GENERATIVE_AI_API_KEY);
  }
}

// 가족 단정 재생성 지시 — 검출 시 1회만 다시 시도.
const FAMILY_RETRY_NOTE = `

⚠️ 다시 씁니다: 자녀·배우자·결혼·가족의 유무나 상태를 단정하는 문장을 쓰지 마세요. 가족 이야기를 꼭 해야 하면 '자녀가 있으시다면', '배우자가 계시다면'처럼 조건형으로만 쓰세요. 가장 안전한 방법은 가족 대신 본인의 행동·성향으로 풀어 쓰는 것입니다.`;

// 챕터별 병렬 생성 — 각 챕터를 따로 호출(집중도↑)한 뒤 제목 + 본문들을 합쳐 하나의 마크다운으로.
// 한 챕터가 실패해도 나머지로 결과지는 완성되도록 개별 실패를 흡수한다.
// 결정론적 품질 게이트(quality-gate.ts): 가족 단정 문장 검출 → 1회 재생성, 그래도 남으면 문장 제거.
// (나이 정확도는 프롬프트의 [확정 사실] 주입으로 처리 — 출력 후 "NN세" 자동치환은
//  '현재 나이 오기'와 '대운 N세 시점 언급'을 구분 못 해 정당한 값을 망가뜨려서 제거함)
export async function generateByChapters(
  title: string,
  chapters: { system: string; user: string }[],
): Promise<LlmResponse> {
  const genOne = async (c: { system: string; user: string }) => {
    try {
      let r = await generateInterpretation(c);
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
      return { text: r.text, provider: r.provider, model: r.model };
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

async function callOpenAI(req: LlmRequest, model: string, key: string | undefined): Promise<LlmResponse> {
  if (!key) throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: key });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    temperature: 0.7,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return { text, provider: "openai", model };
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
