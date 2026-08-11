import type { Metadata } from "next";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FunnelProduct } from "@/lib/funnel/types";

export const metadata: Metadata = { title: "무료 사주 분석", robots: { index: false } };

// 결제 옵션 — 엄선한 가격 사다리 4종(표시 순). 전 상품을 다 띄우면 선택 마비로
// 전환이 떨어져서, 입구(기본)→주력(돈 들어오는 달)→프리미엄→신점만 노출한다.
// (관계·월별 등 나머지는 결과지 크로스셀 전용)
// is_active 필터를 같이 타므로 내린 상품은 자동으로 빠진다(2026-08-11 2상품 오픈 시 실측 확인).
// 되살릴 때를 대비해 옛 슬러그는 남겨 둔다 — 목록에 있어도 비활성이면 안 나온다.
const FUNNEL_SLUGS = ["life-saju", "wealth-saju", "inyeon-saju", "premium-saju", "sangun-sinjeom"];

async function resolveProducts(): Promise<FunnelProduct[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, price, name")
    .eq("is_active", true)
    .in("slug", FUNNEL_SLUGS)
    .order("display_order");
  return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, price: p.price, name: p.name }));
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const isAuthed = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;
  const products = await resolveProducts();
  // ?product=슬러그 로 들어오면(광고·상품페이지 직행) 그 상품을 기본 선택으로.
  const { product: requested } = await searchParams;
  // 기본 선택 — 옛 입구였던 life-saju 를 내렸으므로(2026-08-11) 대표 상품인 산군을 먼저 찾는다.
  // 셋 다 못 찾으면 products[0](= display_order 최상단)으로 내려앉는다.
  const base =
    products.find((p) => p.slug === requested) ??
    products.find((p) => p.slug === "sangun-sinjeom") ??
    products[0] ??
    null;
  return <FunnelFlow isAuthed={isAuthed} product={base} products={products} />;
}
