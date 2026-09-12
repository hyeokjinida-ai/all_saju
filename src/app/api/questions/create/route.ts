import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { EXTRA_QUESTION_SLUG, answerExtraQuestionById } from "@/lib/saju/generate-result";

// 후기 답례 질문은 여기서 **LLM 을 바로 태운다**(결제 왕복이 없으니 기다릴 곳이 여기뿐이다).
// 유료 경로는 예전대로 주문만 만들고 끝나므로 이 값이 놀고 있어도 손해가 없다.
export const maxDuration = 300;

// 추가질문권 — 결과지를 다 본 자리에서 하나 더 묻는다(0010 업셀).
// 유료면 '질문 접수 + 결제 주문 생성'까지만 하고, 답변 생성은 결제 승인 후
// generateResultForOrder → answerExtraQuestion 이 맡는다(다른 상품과 같은 경로).
// **후기 답례 질문권**이 있으면 결제를 건너뛰고 여기서 바로 답을 만든다.
//
// 소유 증명은 결과지 페이지와 **같은 모델**을 쓴다:
//  - 회원 주문: 로그인 사용자와 order.user_id 가 같아야 한다.
//  - 비회원 주문: 결과지 UUID 를 아는 것 자체가 capability(결과 링크 = 열람권)다.
// 그래서 body 에 결제키 같은 비밀을 새로 싣지 않는다(URL·HTML 에 비밀을 늘리지 않는다).

const bodySchema = z.object({
  resultId: z.string().uuid(),
  question: z.string().trim().min(5).max(500),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "질문을 5자 이상 적어 주세요" }, { status: 400 });
  }
  const { resultId, question } = parsed.data;

  const service = createServiceClient();

  const { data: result } = await service
    .from("saju_results")
    .select("id, order_id")
    .eq("id", resultId)
    .maybeSingle();
  if (!result) return NextResponse.json({ error: "결과지를 찾을 수 없습니다" }, { status: 404 });

  const { data: parentOrder } = await service
    .from("orders")
    .select("id, status, user_id, guest_email")
    .eq("id", result.order_id)
    .maybeSingle();
  if (!parentOrder) return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  if (parentOrder.status !== "paid") {
    return NextResponse.json({ error: "결제 완료된 결과지에만 추가 질문을 받습니다" }, { status: 400 });
  }

  // 회원 주문이면 본인만. (비회원 주문은 결과지 링크를 아는 것이 곧 권한 — 결과지 페이지와 동일)
  if (parentOrder.user_id) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user || user.id !== parentOrder.user_id) {
      return NextResponse.json({ error: "본인 결과지에만 질문할 수 있습니다" }, { status: 403 });
    }
  }

  // ── 후기 답례 질문권이 있으면 결제를 건너뛴다 ────────────────────────
  // 여기가 유료 분기보다 **위**에 있어야 한다. 아래로 내려가면 질문권을 가진 손님에게도
  // 결제창이 뜬다(답례를 주고 다시 돈을 받는 꼴). 상품 행이 없거나 내려가 있어도
  // 답례는 유효하다 — 그건 우리가 이미 준 권리지 지금 파는 물건이 아니다.
  const { data: credit } = await service
    .from("extra_questions")
    .select("id")
    .eq("parent_order_id", parentOrder.id)
    .eq("source", "review_reward")
    .eq("status", "credited")
    .limit(1)
    .maybeSingle();

  if (credit) {
    // 질문을 적어 넣고 답을 만든다. 결제 왕복이 없으니 손님은 이 요청 하나를 기다린다.
    await service.from("extra_questions").update({ question, status: "pending" }).eq("id", credit.id);
    const outcome = await answerExtraQuestionById(service, credit.id as string);
    if (!outcome.ok) {
      // ⚠ 반드시 되돌린다 — 안 그러면 **답도 못 받고 질문권도 사라진다**(손님에겐 강탈이다).
      //   question 은 남겨 둔다. 다시 눌렀을 때 적은 것이 살아 있는 편이 낫다.
      await service.from("extra_questions").update({ status: "credited" }).eq("id", credit.id);
      return NextResponse.json(
        { error: "답을 만들지 못했어요. 질문권은 그대로 있으니 잠시 후 다시 눌러 주세요" },
        { status: 503 },
      );
    }
    return NextResponse.json({ free: true, resultId: outcome.resultId });
  }

  const { data: product } = await service
    .from("products")
    .select("id, price, is_active")
    .eq("slug", EXTRA_QUESTION_SLUG)
    .maybeSingle();
  if (!product || !product.is_active) {
    return NextResponse.json({ error: "지금은 추가 질문을 받지 않습니다" }, { status: 404 });
  }

  // 아직 결제 안 한 같은 질문 주문이 있으면 재사용(이중 결제·중복 행 방지).
  const { data: reusable } = await service
    .from("extra_questions")
    .select("id, order_id, orders!inner(order_id, status)")
    .eq("parent_order_id", parentOrder.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  const reusableOrder = (reusable as { orders?: { order_id: string; status: string } } | null)?.orders;
  if (reusable && reusableOrder?.status === "pending") {
    await service.from("extra_questions").update({ question }).eq("id", reusable.id);
    return NextResponse.json({ orderId: reusableOrder.order_id, amount: product.price });
  }

  const orderId = `ord_${nanoid(20)}`;
  const { data: order, error: orderErr } = await service
    .from("orders")
    .insert({
      order_id: orderId,
      user_id: parentOrder.user_id,
      guest_email: parentOrder.guest_email,
      product_id: product.id,
      amount: product.price, // 금액은 서버에서만 — 클라 변조 차단(orders/create 와 같은 방침)
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return NextResponse.json({ error: "주문 생성 실패", detail: orderErr?.message }, { status: 500 });
  }

  const { error: qErr } = await service.from("extra_questions").insert({
    parent_order_id: parentOrder.id,
    order_id: order.id,
    source: "paid",
    status: "pending",
    question,
  });
  if (qErr) {
    await service.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "질문 저장 실패", detail: qErr.message }, { status: 500 });
  }

  return NextResponse.json({ orderId, amount: product.price });
}
