import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";

export const metadata = { title: "상품" };

export default async function ProductsPage() {
  let products: { slug: string; name: string; description: string; price: number }[] | null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("slug, name, description, price")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    products = data;
  } else {
    products = productsSeed
      .filter((p) => p.is_active)
      .sort((a, b) => a.display_order - b.display_order)
      .map(({ slug, name, description, price }) => ({ slug, name, description, price }));
  }

  return (
    <div className="container py-12">
      <header className="mb-10 text-center">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">命式</p>
        <h1 className="font-myeongjo text-3xl font-semibold tracking-[0.04em] text-bone">상품</h1>
        <p className="mt-3 text-sm text-bone-soft">가볍게 시작해서 깊이 있게 들어가세요.</p>
        <div className="gold-diamond mx-auto mt-5" />
      </header>

      {!products || products.length === 0 ? (
        <p className="text-sm text-body">상품이 없습니다.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group block rounded-lg border border-hairline bg-wine-2/40 p-6 transition-all hover:border-gold hover:bg-wine-2/70 hover:shadow-gold-glow"
            >
              <p className="font-myeongjo text-base font-semibold text-bone group-hover:text-gold-bright transition-colors">{p.name}</p>
              <p className="mt-2 text-sm text-bone-soft leading-relaxed line-clamp-2">
                {p.description}
              </p>
              <p className="mt-5 text-lg font-mono font-medium text-gold">{formatKRW(p.price)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
