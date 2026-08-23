/**
 * 결제 직전 연락처·마케팅 동의 저장.
 *
 * 결제 버튼을 누르는 순간 한 번 호출된다(TossWidget 의 onBeforePay). 실패하면 결제를 막지 않는다 —
 * 연락처는 **선택**이고, 이것 때문에 결제가 안 되는 게 훨씬 큰 손해다.
 *
 * ⚠ 0012 마이그레이션 전이면 컬럼이 없어 update 가 실패한다 → 조용히 ok 를 돌려준다.
 *    (화면은 이미 그려져 있고 손님은 결제를 계속해야 한다)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  // 010-1234-5678 / 01012345678 둘 다 허용, 저장은 숫자만
  phone: z.string().max(20).optional().nullable(),
  marketingOptIn: z.boolean().default(false),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const digits = (body.phone ?? "").replace(/\D/g, "");
  if (digits && !/^01[016789]\d{7,8}$/.test(digits)) {
    return NextResponse.json({ error: "휴대폰 번호를 다시 확인해 주세요" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, status, user_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "없는 주문입니다" }, { status: 404 });
  // 이미 결제된 주문의 연락처는 바꾸지 않는다(영수증이 굳은 뒤다)
  if (order.status !== "pending") return NextResponse.json({ ok: true, skipped: "not_pending" });

  // 회원 주문이면 본인만. 게스트 주문은 order_id 를 아는 사람 = 그 주문을 만든 브라우저다.
  if (order.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== order.user_id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
  }

  const patch = {
    phone: digits || null,
    marketing_opt_in: body.marketingOptIn,
    marketing_opt_in_at: body.marketingOptIn ? new Date().toISOString() : null,
  };

  const { error } = await service.from("orders").update(patch).eq("id", order.id);
  if (error) {
    // 0012 미적용 등 — 결제를 막지 않는다
    return NextResponse.json({ ok: true, skipped: error.message });
  }
  return NextResponse.json({ ok: true });
}
