import type { Metadata } from "next";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FunnelProduct } from "@/lib/funnel/types";

export const metadata: Metadata = { title: "무료 사주 분석", robots: { index: false } };

// 결제 옵션 — 활성 상품 전체(표시 순). 기본(life-saju)이 기본 선택.
async function resolveProducts(): Promise<FunnelProduct[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, price, name")
    .eq("is_active", true)
    .order("display_order");
  return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, price: p.price, name: p.name }));
}

export default async function FunnelPage() {
  const isAuthed = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;
  const products = await resolveProducts();
  const base = products.find((p) => p.slug === "life-saju") ?? products[0] ?? null;
  return <FunnelFlow isAuthed={isAuthed} product={base} products={products} />;
}
