import { z } from "zod";

const serverSchema = z.object({
  // sb_secret_... (구 service_role JWT 도 동작 — 2026 말 deprecated)
  SUPABASE_SECRET_KEY: z.string().min(1),
  TOSS_SECRET_KEY: z.string().min(1),
  SAJU_API_URL: z.string().url().optional().or(z.literal("")),
  SAJU_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(["openai", "anthropic", "gemini"]).default("anthropic"),
  LLM_MODEL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
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
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TOSS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
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
      SAJU_API_URL: process.env.SAJU_API_URL,
      SAJU_API_KEY: process.env.SAJU_API_KEY,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      LLM_MODEL: process.env.LLM_MODEL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      CRON_SECRET: process.env.CRON_SECRET,
    });
  }
  return _serverEnv;
}
