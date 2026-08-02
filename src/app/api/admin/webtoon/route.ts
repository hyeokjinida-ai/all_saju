// 웹툰 페이지 저장/불러오기 — 어드민 전용.
// 어드민은 ADMIN_PASSWORD 쿠키 게이트라 RLS로 쓰기를 열 수 없다. 여기서 게이트를 통과시킨 뒤
// secret 키 클라이언트로 직접 쓴다.
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/** 저장 실수로 작업이 날아가지 않게 남겨두는 직전 버전 수 */
const KEEP_VERSIONS = 3;

async function guard() {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const kind = url.searchParams.get("kind") ?? "teaser";
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const db = createServiceClient();
  const { data: page, error } = await db
    .from("webtoon_pages")
    .select("id, slug, name, cuts, updated_at")
    .eq("product_id", productId)
    .eq("kind", kind)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 되돌리기 후보 — 최근 것부터
  const versions = page
    ? (await db
        .from("webtoon_page_versions")
        .select("id, cuts, created_at")
        .eq("page_id", page.id)
        .order("created_at", { ascending: false })
        .limit(KEEP_VERSIONS)).data ?? []
    : [];

  return NextResponse.json({ page, versions });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: { productId?: string; kind?: string; name?: string; cuts?: Json; isPublished?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { productId, kind = "teaser", name = "", cuts, isPublished = false } = body;
  if (!productId || !Array.isArray(cuts)) {
    return NextResponse.json({ error: "productId, cuts required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: product } = await db.from("products").select("slug").eq("id", productId).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const { data: prev } = await db
    .from("webtoon_pages")
    .select("id, cuts")
    .eq("product_id", productId)
    .eq("kind", kind)
    .maybeSingle();

  // 덮어쓰기 전에 직전 내용을 쌓아둔다
  if (prev) {
    await db.from("webtoon_page_versions").insert({ page_id: prev.id, cuts: prev.cuts });
    const { data: old } = await db
      .from("webtoon_page_versions")
      .select("id")
      .eq("page_id", prev.id)
      .order("created_at", { ascending: false })
      .range(KEEP_VERSIONS, 999);
    if (old?.length) await db.from("webtoon_page_versions").delete().in("id", old.map((o) => o.id));
  }

  const { data: saved, error } = await db
    .from("webtoon_pages")
    .upsert(
      {
        ...(prev ? { id: prev.id } : {}),
        product_id: productId,
        kind,
        slug: `${product.slug}-${kind}`,
        name,
        cuts: cuts as Json,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,kind" },
    )
    .select("id, slug, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: saved });
}
