// =====================================================
// POST /api/generate-manseryeok
// =====================================================
// 사주 명식표 생성 라우트.
// Body: { birthInfo: BirthInfo }
// Response (success): { status: "success", manseryeok: string }
// Response (error):   { status: "error",   error: string, details?: any }
//
// 내부 동작:
//   fetchSajuAnalysis(birthInfo, []) → formatSajuToManseryeok(...) → 텍스트 반환
// SAJU_API_URL / SAJU_API_KEY 가 미설정이면 503 을 돌려줍니다.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  generateManseryeok,
  isSajuApiConfigured,
  SajuApiError,
} from "@/lib/saju/saju-api";

const birthInfoSchema = z.object({
  birthYear: z.string().regex(/^\d{4}$/, "birthYear 는 YYYY 형식이어야 합니다"),
  birthMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/, "birthMonth 는 1~12 사이"),
  birthDay: z.string().regex(/^(0?[1-9]|[12]\d|3[01])$/, "birthDay 는 1~31 사이"),
  birthHour: z.string().regex(/^(0?\d|1\d|2[0-3])$/, "birthHour 는 0~23 사이").optional(),
  birthMinute: z.string().regex(/^(0?\d|[1-5]\d)$/, "birthMinute 는 0~59 사이").optional(),
  calendarType: z.enum(["양력", "음력"]),
  gender: z.enum(["male", "female"]),
  isLeapMonth: z.boolean().optional(),
  useYajasiRule: z.boolean().optional(),
});

const bodySchema = z.object({
  birthInfo: birthInfoSchema,
});

export async function POST(request: NextRequest) {
  // 무인증 공개 프록시 — 운영에선 차단(개발/데모 전용). 만세력 유료 한도 어뷰즈 방지.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ status: "error" as const, error: "not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error" as const,
        error: "잘못된 요청입니다",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!isSajuApiConfigured()) {
    return NextResponse.json(
      {
        status: "error" as const,
        error: "사주 API 가 설정되지 않았습니다. .env.local 의 SAJU_API_URL / SAJU_API_KEY 를 확인하세요.",
      },
      { status: 503 },
    );
  }

  try {
    const manseryeok = await generateManseryeok(parsed.data.birthInfo, { source: "manual" });
    return NextResponse.json({ status: "success" as const, manseryeok });
  } catch (err) {
    const upstreamStatus = err instanceof SajuApiError ? err.status : undefined;
    const status = upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 502;
    return NextResponse.json(
      {
        status: "error" as const,
        error: err instanceof Error ? err.message : "사주 명식 생성에 실패했습니다.",
      },
      { status },
    );
  }
}
