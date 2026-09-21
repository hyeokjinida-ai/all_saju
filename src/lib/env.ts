import { z } from "zod";

const serverSchema = z.object({
  // sb_secret_... (구 service_role JWT 도 동작 — 2026 말 deprecated)
  SUPABASE_SECRET_KEY: z.string().min(1),
  TOSS_SECRET_KEY: z.string().min(1),
  // 토스 「API 개별 연동 키」 시크릿(live_sk_…). 결제수단을 직접 그리는 자체창 결제가 이 세트로 승인된다.
  // 비어 있으면 자체창이 꺼지고 위 결제위젯 키만 쓴다 — 아래 NEXT_PUBLIC_TOSS_API_CLIENT_KEY 와 **한 세트**.
  TOSS_API_SECRET_KEY: z.string().optional().default(""),
  SAJU_API_URL: z.string().url().optional().or(z.literal("")),
  SAJU_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(["openai", "anthropic", "gemini", "deepseek"]).default("anthropic"),
  LLM_MODEL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional().default(""),
  // 복구 크론(/api/cron/recover-results) 인증용. 비우면 크론 엔드포인트는 비활성(401).
  CRON_SECRET: z.string().optional().default(""),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  // sb_publishable_... (구 anon JWT 도 동작 — 2026 말 deprecated)
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().min(1),
  // 토스 「API 개별 연동 키」 클라이언트(live_ck_…). **이 값이 있으면 결제 페이지가 결제수단을 직접 그린다**
  // (카카오페이·네이버페이·토스페이·카드 4줄 → 자체창). 없으면 지금 결제위젯 그대로.
  // ⚠ NEXT_PUBLIC_ 이라 빌드 때 박힌다 — 넣거나 뺀 뒤 재배포는 「Use existing Build Cache」 해제.
  NEXT_PUBLIC_TOSS_API_CLIENT_KEY: z.string().optional().default(""),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TOSS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
  NEXT_PUBLIC_TOSS_API_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY,
});

// .env.example 그대로(placeholder)면 false — DB 호출을 우회해 데모 모드로 동작
export function isSupabaseConfigured(): boolean {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  return !url.includes("YOUR_PROJECT") && !url.includes("your-project");
}

let _serverEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must only be called on the server");
  }
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
      TOSS_API_SECRET_KEY: process.env.TOSS_API_SECRET_KEY,
      SAJU_API_URL: process.env.SAJU_API_URL,
      SAJU_API_KEY: process.env.SAJU_API_KEY,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      LLM_MODEL: process.env.LLM_MODEL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      CRON_SECRET: process.env.CRON_SECRET,
    });
  }
  return _serverEnv;
}
