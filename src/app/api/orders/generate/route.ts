import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateResultForOrder } from "@/lib/saju/generate-result";

// 결제 완료된 '내 주문'의 결과지 생성을 재시도한다(자가복구).
// confirm 직후 결과가 보류(pending)면 결제 성공 페이지가 이 엔드포인트를 몇 차례
// 폴링해 결과를 받아낸다. luckyloveme/LLM 의 일시적 장애를 사용자가 떠나기 전에 흡수.
const bodySchema = z.object({ orderId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  const { orderId } = parsed.data;

  // 로그인 사용자 본인 주문만 재시도 허용
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, user_id, status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ resultId: null, pending: true, reason: "not_paid" });
  }

  const outcome = await generateResultForOrder(order.id, { service });
  if (outcome.ok) return NextResponse.json({ resultId: outcome.resultId });
  return NextResponse.json({ resultId: null, pending: true, reason: outcome.reason });
}
