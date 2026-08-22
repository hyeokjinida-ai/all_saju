// 상품 하나 — 읽기 / 수정 / 삭제. 어드민 전용.
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { productFormSchema, priceIssue } from "@/lib/admin-products";
import { hasBuilderColumns, splitForm } from "../_shared";

async function guard() {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;

  const db = createServiceClient();
  const ready = await hasBuilderColumns(db);
  const cols = ready
    ? "id, slug, name, description, price, compare_at_price, display_order, is_active, is_addon, bundle_slugs, category, character_name, card_title, tagline, hero_rank, art, pitch"
    : "id, slug, name, description, price, compare_at_price, display_order, is_active, is_addon, bundle_slugs";

  const { data, error } = await db.from("products").select(cols).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "없는 상품입니다" }, { status: 404 });

  let style: unknown = null;
  if (ready) {
    const { data: s } = await db.from("product_styles").select("style").eq("product_id", id).maybeSingle();
    style = s?.style ?? null;
  }

  // 이 상품이 팔린 적 있으면 삭제를 막는다(주문·결과지가 참조한다)
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("product_id", id);

  return NextResponse.json({ ready, product: data, style, orderCount: count ?? 0 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = productFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "값이 올바르지 않습니다" }, { status: 400 });
  }
  const issue = priceIssue(parsed.data);
  if (issue) return NextResponse.json({ error: issue }, { status: 400 });

  const db = createServiceClient();
  const ready = await hasBuilderColumns(db);
  const { row, style } = splitForm(parsed.data, ready);

  // slug 는 바꾸지 않는다 — 주문·결과지·광고 링크가 전부 이걸로 상품을 찾는다.
  const { slug: _ignored, ...patch } = row;
  void _ignored;

  const { error } = await db.from("products").update(patch).eq("id", id);
  if (error) {
    const msg = error.message.includes("hero_rank")
      ? "그 TOP 번호는 다른 상품이 쓰고 있습니다"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (ready) {
    if (style) {
      await db.from("product_styles").upsert({ product_id: id, style, updated_at: new Date().toISOString() });
    } else {
      await db.from("product_styles").delete().eq("product_id", id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;

  const db = createServiceClient();
  // ⚠ 주문이 하나라도 있으면 지우지 않는다. orders.product_id 가 이 행을 참조하고,
  //    지우면 그 손님의 결제 이력과 결과지가 어디에도 안 걸린다. 비활성으로 내리면 된다.
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("product_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `이미 ${count}건 팔린 상품입니다. 지우는 대신 '판매중'을 꺼주세요.` },
      { status: 409 },
    );
  }

  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
