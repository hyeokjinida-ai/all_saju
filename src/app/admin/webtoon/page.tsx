import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "웹툰 페이지 · 관리자" };

// 상품 목록 — 상품마다 티저 웹툰을 따로 세팅한다.
export default async function AdminWebtoonList() {
  await requireAdminPassword("/admin/webtoon");

  const db = createServiceClient();
  const { data: products } = await db
    .from("products")
    .select("id, slug, name, is_active")
    .order("display_order", { ascending: true });

  const { data: pages } = await db
    .from("webtoon_pages")
    .select("product_id, cuts, is_published, updated_at")
    .eq("kind", "teaser");

  const byProduct = new Map((pages ?? []).map((p) => [p.product_id, p]));

  return (
    <div className="container max-w-xl py-12">
      <header className="mb-8">
        <Link href="/admin" className="text-xs text-mute hover:text-ink">← 관리자</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">웹툰 페이지</h1>
        <p className="mt-2 text-xs leading-relaxed text-body">
          상품별로 결제 직전 티저 웹툰을 만듭니다. 사진을 올리고 말풍선을 얹은 뒤 저장하면 바로 반영됩니다.
        </p>
      </header>

      {!products?.length ? (
        <p className="text-sm text-body">상품이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {products.map((p) => {
            const page = byProduct.get(p.id);
            const cutCount = Array.isArray(page?.cuts) ? page.cuts.length : 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/webtoon/${p.id}`}
                  className="flex items-center justify-between gap-3 py-4 hover:opacity-80"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-ink">
                      {p.name}
                      {!p.is_active && <span className="ml-2 text-[11px] text-mute">(비활성)</span>}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-mute">{p.slug}</span>
                  </span>
                  <span className="shrink-0 text-xs text-body">
                    {page ? `컷 ${cutCount}개` : "없음"}
                    {page && (
                      <span className={page.is_published ? "ml-2 text-ink" : "ml-2 text-mute"}>
                        {page.is_published ? "· 노출중" : "· 숨김"}
                      </span>
                    )}
                    <span className="ml-2 text-mute">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
