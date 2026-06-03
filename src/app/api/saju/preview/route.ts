import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { computeMyeongsik } from "@/lib/saju/manseryeok";
import { buildFreeReading } from "@/lib/saju/freeReading";

// 결제 전(무료) 결과 — 명식 8글자 + 결정론적 무료 해석(일간/오행/올해/고민 맛보기).
// 비용이 큰 LLM 본문 해설은 결제 후에만 생성됩니다.
const bodySchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  timeUnknown: z.boolean(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
  concern: z.string().max(20).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 요청입니다", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { concern, ...input } = parsed.data;
    const myeongsik = await computeMyeongsik(input);
    const reading = buildFreeReading(myeongsik, concern ?? null);
    return NextResponse.json({ myeongsik, reading });
  } catch {
    return NextResponse.json({ error: "명식 계산에 실패했습니다" }, { status: 502 });
  }
}
