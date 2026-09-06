// 후기 저장 + **답례로 질문권 한 장**.
//
// 왜 답례를 주나(업셀 실행계획 2026-08-11 §2-2): 후기가 0건인데 우리 주 결제는 비회원이라
// 그냥 두면 영영 안 쌓인다. 강의 노트의 성공 넛지 3개 중 하나가 「후기 → 질문권」이었다.
// 손님은 값을 더 내지 않고 하나 더 묻고, 우리는 랜딩에 세울 증거를 얻는다.
//
// ⚠ 후기 저장이 본 일이고 답례는 곁가지다 — 답례 발급이 실패해도 **후기는 살린다**.
//   (0010 이 안 붙은 DB 에서는 extra_questions 자체가 없다. 그때도 후기는 남아야 한다.)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(5).max(2000),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("id, product_id, status, user_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "본인 주문만 후기 작성 가능합니다" }, { status: 403 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "결제 완료된 주문에만 후기 작성 가능합니다" }, { status: 400 });
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    order_id: order.id,
    product_id: order.product_id,
    rating: parsed.data.rating,
    content: parsed.data.content,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 답례: 질문권 한 장 ──────────────────────────────────────
  // 중복 발급이 원천 차단되는 이유: reviews.order_id 가 unique 라 **한 주문에 후기는 하나뿐**이고,
  // 여기까지 온 것은 방금 그 하나가 처음 저장됐다는 뜻이다. 그래도 옛 데이터·수동 복구를 생각해
  // 같은 주문에 보상 행이 이미 있으면 새로 만들지 않는다.
  let creditGranted = false;
  let resultId: string | null = null;
  try {
    const service = createServiceClient();

    const { data: already } = await service
      .from("extra_questions")
      .select("id")
      .eq("parent_order_id", order.id)
      .eq("source", "review_reward")
      .maybeSingle();

    if (already) {
      creditGranted = true; // 이미 있다 — 손님 입장에선 "질문권이 있다"가 사실이다
    } else {
      const { error: cErr } = await service.from("extra_questions").insert({
        parent_order_id: order.id,
        source: "review_reward",
        status: "credited", // 권리만 있고 아직 질문은 안 썼다
      });
      creditGranted = !cErr;
    }

    // 질문을 쓰러 갈 곳 — 결과지. 여기서 못 찾아도 후기는 이미 저장됐다.
    const { data: res } = await service
      .from("saju_results")
      .select("id")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle();
    resultId = (res?.id as string | undefined) ?? null;
  } catch {
    /* 답례 실패가 후기 저장을 무르지 않는다 */
  }

  return NextResponse.json({ ok: true, creditGranted, resultId });
}
