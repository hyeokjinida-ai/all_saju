import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { purchaseReceipt } from "@/lib/purchase-tracking";

// Read-only polling while confirm generates the result. No approval or LLM calls.
export async function POST(request: NextRequest) {
  const parsed = z.object({ orderId: z.string().max(100), paymentKey: z.string().min(1).max(300),
    purchaseTrackingVersion: z.union([z.literal(1), z.literal(2)]).optional() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ purchase: null }, { status: 400 });
  const service = createServiceClient();
  const { data: order } = await service.from("orders").select("id, status, toss_payment_key, exclude_from_pnl")
    .eq("order_id", parsed.data.orderId).maybeSingle();
  if (!order || order.status !== "paid" || order.toss_payment_key !== parsed.data.paymentKey || order.exclude_from_pnl) {
    return NextResponse.json({ purchase: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ purchase: await purchaseReceipt(service, order.id, parsed.data.purchaseTrackingVersion) }, { headers: { "Cache-Control": "no-store" } });
}
