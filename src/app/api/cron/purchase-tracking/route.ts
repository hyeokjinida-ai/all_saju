import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dispatchPurchases } from "@/lib/purchase-tracking";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await dispatchPurchases(createServiceClient(), 5));
}
