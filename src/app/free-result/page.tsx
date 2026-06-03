import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { productsSeed } from "@/config/products.seed";
import { FreeResult, type SimpleProduct } from "@/components/saju/FreeResult";

export const metadata = { title: "무료 결과 — 내 명식" };

const FUNNEL_SLUGS = ["basic-saju", "premium-saju"];

export default async function FreeResultPage() {
  let rows: { id: string; slug: string; name: string; price: number }[] = [];
  let isLoggedIn = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("id, slug, name, price")
      .in("slug", FUNNEL_SLUGS)
      .eq("is_active", true);
    rows = data ?? [];
    isLoggedIn = !!(await getCurrentUser());
  } else {
    rows = productsSeed
      .filter((p) => FUNNEL_SLUGS.includes(p.slug) && p.is_active)
      .map((p) => ({ id: p.slug, slug: p.slug, name: p.name, price: p.price }));
  }

  const find = (slug: string): SimpleProduct | null => {
    const r = rows.find((x) => x.slug === slug);
    return r ? { productId: r.id, slug: r.slug, name: r.name, price: r.price } : null;
  };

  const basic = find("basic-saju");
  const premium = find("premium-saju");

  return <FreeResult basic={basic} premium={premium} isLoggedIn={isLoggedIn} />;
}
