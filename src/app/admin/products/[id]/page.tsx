import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ProductForm as FormValues } from "@/lib/admin-products";

export const metadata = { title: "상품 편집 · 관리자" };

export default async function AdminProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPassword(`/admin/products/${id}`);

  const db = createServiceClient();
  const { data: probe } = await db.from("products").select("category").limit(1);
  const ready = probe !== null;

  const cols = ready
    ? "id, slug, name, description, price, compare_at_price, display_order, is_active, is_addon, bundle_slugs, category, character_name, card_title, tagline, hero_rank, art, pitch"
    : "id, slug, name, description, price, compare_at_price, display_order, is_active, is_addon, bundle_slugs";

  const { data } = await db.from("products").select(cols).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Record<string, unknown>;

  const style = ready
    ? (await db.from("product_styles").select("style").eq("product_id", id).maybeSingle()).data?.style ?? null
    : null;

  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("product_id", id);

  const initial: Partial<FormValues> = {
    slug: String(p.slug),
    name: String(p.name),
    description: String(p.description),
    price: Number(p.price),
    compare_at_price: (p.compare_at_price as number | null) ?? null,
    display_order: Number(p.display_order ?? 0),
    is_active: !!p.is_active,
    is_addon: !!p.is_addon,
    bundle_slugs: (p.bundle_slugs as string[] | null) ?? null,
    category: (p.category as string | null) ?? null,
    character_name: (p.character_name as string | null) ?? null,
    card_title: (p.card_title as string | null) ?? null,
    tagline: (p.tagline as string | null) ?? null,
    hero_rank: (p.hero_rank as number | null) ?? null,
    art: (p.art as FormValues["art"]) ?? {},
    pitch: (p.pitch as FormValues["pitch"]) ?? null,
    style: (style as FormValues["style"]) ?? null,
  };

  return (
    <div className="container max-w-5xl py-12">
      <header className="mb-8">
        <Link href="/admin/products" className="text-xs text-mute hover:text-ink">← 상품 관리</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{String(p.name)}</h1>
        <p className="mt-2 font-mono text-[11px] text-mute">
          {String(p.slug)}
          {(count ?? 0) > 0 ? ` · 주문 ${count}건` : " · 주문 없음"}
        </p>
      </header>

      <ProductForm id={id} initial={initial} ready={ready} orderCount={count ?? 0} />
    </div>
  );
}
