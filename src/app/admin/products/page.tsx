import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/utils";
import { CATEGORIES } from "@/lib/admin-products";

export const metadata = { title: "상품 관리 · 관리자" };

export default async function AdminProductsList() {
  await requireAdminPassword("/admin/products");

  const db = createServiceClient();

  // 0011 이 아직이면 새 컬럼 없이 읽는다 — 어드민이 500 으로 죽으면 안 된다.
  const { data: probe } = await db.from("products").select("category").limit(1);
  const ready = probe !== null;

  const cols = ready
    ? "id, slug, name, price, compare_at_price, display_order, is_active, is_addon, category, hero_rank"
    : "id, slug, name, price, compare_at_price, display_order, is_active, is_addon";
  const { data } = await db.from("products").select(cols).order("display_order", { ascending: true });
  const products = (data ?? []) as unknown as {
    id: string;
    slug: string;
    name: string;
    price: number;
    is_active: boolean;
    is_addon: boolean;
    category?: string | null;
    hero_rank?: number | null;
  }[];

  const catLabel = (k?: string | null) => CATEGORIES.find((c) => c.key === k)?.label ?? "";

  return (
    <div className="container max-w-3xl py-12">
      <header className="mb-6">
        <Link href="/admin" className="text-xs text-mute hover:text-ink">← 관리자</Link>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">상품 관리</h1>
            <p className="mt-2 text-xs leading-relaxed text-body">
              여기서 만든 상품은 코드를 안 고쳐도 홈·목록·상세·결과지에 그대로 섭니다.
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-wine-deep"
          >
            새 상품
          </Link>
        </div>
      </header>

      {!ready && (
        <div
          className="mb-6 rounded-md px-4 py-3 text-xs leading-relaxed text-body"
          style={{ border: "1px solid rgba(228,200,120,.45)", background: "rgba(255,255,255,.03)" }}
        >
          <b className="text-ink">0011 마이그레이션이 아직 안 붙었습니다.</b> 홈 카드·랜딩 카피·결과지 설계 칸은
          잠겨 있습니다. <code className="font-mono text-ink">supabase/migrations/0011_product_builder.sql</code> 을
          Supabase SQL Editor 에 붙여넣고 Run 하면 열립니다.
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-body">상품이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 py-4 hover:opacity-80">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {p.name}
                    {!p.is_active && <span className="ml-2 text-[11px] text-mute">(숨김)</span>}
                    {p.is_addon && <span className="ml-2 text-[11px] text-mute">(퍼널 전용)</span>}
                    {p.hero_rank ? <span className="ml-2 text-[11px] text-gold">TOP {p.hero_rank}</span> : null}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-mute">
                    {p.slug}
                    {ready && p.category ? ` · ${catLabel(p.category)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-body">{formatKRW(p.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
