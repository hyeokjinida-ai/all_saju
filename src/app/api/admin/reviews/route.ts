// 후기 노출 토글 — /admin/reviews 의 스위치 하나가 여기로 온다.
//
// 왜 어드민 전용인가: 0013 이 `is_approved` 기본값을 false 로 내렸다. 손님이 쓴 후기는
// 쌓이기만 하고, **광고 랜딩(산군 티저 구매 카드 뒤)에 세우는 손은 형님이다.**
// 후기를 고치거나 지우지는 않는다 — 켜고 끄는 것뿐이다(원문은 그대로 남는다).
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  id: z.string().uuid(),
  approved: z.boolean(),
});

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db
    .from("reviews")
    .update({ is_approved: parsed.data.approved })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, approved: parsed.data.approved });
}
