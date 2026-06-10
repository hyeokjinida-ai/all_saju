// =====================================================
// LLM 프로바이더 스위치
// =====================================================
// LLM_PROVIDER 환경변수로 openai | anthropic | gemini 선택.
// 각 SDK는 lazy import 하여 미사용 패키지의 init 비용을 줄임.

import { serverEnv } from "@/lib/env";

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

// 챕터별 병렬 생성 — 각 챕터를 따로 호출(집중도↑)한 뒤 제목 + 본문들을 합쳐 하나의 마크다운으로.
// 한 챕터가 실패해도 나머지로 결과지는 완성되도록 개별 실패를 흡수한다.
export async function generateByChapters(
  title: string,
  chapters: { system: string; user: string }[],
): Promise<LlmResponse> {
  const parts = await Promise.all(
    chapters.map((c) =>
      generateInterpretation(c)
        .then((r) => ({ text: r.text, provider: r.provider, model: r.model }))
        .catch(() => ({ text: "", provider: "", model: "" })),
    ),
  );
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
