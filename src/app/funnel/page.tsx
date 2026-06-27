import type { Metadata } from "next";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FunnelProduct } from "@/lib/funnel/types";

export const metadata: Metadata = { title: "무료 사주 분석", robots: { index: false } };

// 결제 대상 상품 — life-saju(14,900) 우선, 없으면 premium-saju 폴백.
async function resolveProduct(): Promise<FunnelProduct | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const pick = async (slug: string) =>
    (await supabase.from("products").select("id, price, name").eq("slug", slug).eq("is_active", true).maybeSingle()).data;
  const p = (await pick("life-saju")) ?? (await pick("premium-saju"));
  return p ? { id: p.id, price: p.price, name: p.name } : null;
}

export default async function FunnelPage() {
  // 로그인돼 있으면 로그인 단계를 건너뛴다(카카오 OAuth 왕복 복귀 시 루프 방지).
  const isAuthed = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;
  const product = await resolveProduct();
  return <FunnelFlow isAuthed={isAuthed} product={product} />;
}
