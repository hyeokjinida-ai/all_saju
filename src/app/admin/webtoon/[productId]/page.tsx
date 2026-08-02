import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { WebtoonEditor, type Cut } from "@/components/webtoon/WebtoonEditor";

export const metadata = { title: "웹툰 편집 · 관리자" };

const KEEP_VERSIONS = 3;

export default async function AdminWebtoonEdit({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  await requireAdminPassword(`/admin/webtoon/${productId}`);

  const db = createServiceClient();
  const { data: product } = await db
    .from("products")
    .select("id, slug, name")
    .eq("id", productId)
    .maybeSingle();
  if (!product) notFound();

  const { data: page } = await db
    .from("webtoon_pages")
    .select("id, cuts, is_published")
    .eq("product_id", productId)
    .eq("kind", "teaser")
    .maybeSingle();

  const { data: versionRows } = page
    ? await db
        .from("webtoon_page_versions")
        .select("id, cuts, created_at")
        .eq("page_id", page.id)
        .order("created_at", { ascending: false })
        .limit(KEEP_VERSIONS)
    : { data: [] };

  const asCuts = (v: unknown): Cut[] => (Array.isArray(v) ? (v as Cut[]) : []);

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 text-bone">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4">
          <Link href="/admin/webtoon" className="text-xs text-bone-faint hover:text-gold">← 웹툰 페이지</Link>
          <h1 className="mt-1 font-myeongjo text-lg text-gold">
            {product.name} <span className="text-xs text-bone-faint">· 결제 직전 티저</span>
          </h1>
        </header>

        <WebtoonEditor
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
          initialCuts={asCuts(page?.cuts)}
          initialPublished={page?.is_published ?? false}
          initialVersions={(versionRows ?? []).map((v) => ({
            id: v.id,
            cuts: asCuts(v.cuts),
            created_at: v.created_at,
          }))}
        />
      </div>
    </div>
  );
}
