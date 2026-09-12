"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

/**
 * 광고비를 손으로 넣는다 — 메타 토큰이 없는 동안의 **정식 경로**다(임시 아님).
 * 빈 값으로 보내면 수동값을 지우고 자동 수신분으로 돌아간다.
 */
export async function saveManualAdSpend(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) return;

  const day = String(formData.get("day") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;

  const raw = String(formData.get("amount") ?? "").replace(/[^\d.-]/g, "").trim();
  const amount = raw === "" ? null : Number(raw);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return;

  const service = createServiceClient();
  await service.from("daily_pnl").upsert(
    {
      day,
      ad_spend_manual: amount,
      ...(amount !== null ? { ad_spend_source: "manual" } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day" },
  );

  revalidatePath("/admin/pnl");
}

/**
 * 광고비·PG 실수수료·환불을 지금 받아온다 — 자정 크론을 기다리지 않고.
 * 토큰이 없거나 실패하면 **아무것도 안 쓴다**(0 으로 덮지 않는다).
 */
export async function syncNow(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) return;

  const span = Math.min(180, Math.max(7, Number(formData.get("days")) || 30));
  const { kstDaysAgo, kstToday } = await import("@/lib/pnl");
  const { syncExternal } = await import("@/lib/pnl-sync");

  const service = createServiceClient();
  try {
    await syncExternal(service, kstDaysAgo(span - 1), kstToday());
  } catch {
    /* 실패는 화면의 「미수신」 상태로 그대로 드러난다 */
  }
  revalidatePath("/admin/pnl");
}

/**
 * 주문 하나를 손익에서 빼거나 되돌린다 — 형님 테스트 결제가 매출·ROAS 를 부풀리는 걸 막는다.
 */
export async function toggleExcludeFromPnl(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const next = String(formData.get("next") ?? "") === "1";

  const service = createServiceClient();
  await service.from("orders").update({ exclude_from_pnl: next }).eq("id", id);

  revalidatePath("/admin/pnl");
  revalidatePath("/admin/orders");
}
