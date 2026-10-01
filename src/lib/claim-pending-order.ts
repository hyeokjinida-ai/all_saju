import type { createServiceClient } from "@/lib/supabase/server";
import { chargeFor, MIN_CHARGE } from "@/lib/pricing";

/** Apply the membership discount to the guest's saved quote, never today's price. */
export async function claimPendingOrder(
  service: ReturnType<typeof createServiceClient>,
  order: { id: string; amount: number; status: string; user_id: string | null },
  userId: string,
) {
  if (order.status !== "pending" || order.user_id || !Number.isSafeInteger(order.amount)) return;
  const amount = chargeFor(order.amount, true);
  if (amount < MIN_CHARGE) return;
  // A concurrent claim or payment must not apply the discount twice or reprice a paid order.
  const { error } = await service.from("orders").update({ user_id: userId, amount })
    .eq("id", order.id).eq("status", "pending").is("user_id", null)
    .is("toss_payment_key", null).eq("amount", order.amount);
  if (error) throw new Error("주문을 회원 계정으로 연결하지 못했습니다. 다시 시도해 주세요.");
}
