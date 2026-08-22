// 상품 목록·생성 — 어드민 전용.
// 어드민은 ADMIN_PASSWORD 쿠키 게이트라 RLS 로 쓰기를 열 수 없다. 게이트를 통과시킨 뒤
// service 키로 직접 쓴다(0009 웹툰 API 와 같은 방식).
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { productFormSchema, priceIssue } from "@/lib/admin-products";
import { hasBuilderColumns, splitForm } from "./_shared";

async function guard() {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const db = createServiceClient();
  const ready = await hasBuilderColumns(db);

  const cols = ready
    ? "id, slug, name, price, compare_at_price, display_order, is_active, is_addon, category, hero_rank"
    : "id, slug, name, price, compare_at_price, display_order, is_active, is_addon";
  const { data, error } = await db.from("products").select(cols).order("display_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ready, products: data ?? [] });
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

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

  const { data, error } = await db.from("products").insert(row).select("id").single();
  if (error) {
    const msg = error.message.includes("duplicate") && error.message.includes("slug")
      ? "이미 있는 주소(slug)입니다"
      : error.message.includes("hero_rank")
        ? "그 TOP 번호는 다른 상품이 쓰고 있습니다"
        : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (ready && style) {
    await db.from("product_styles").upsert({ product_id: data.id, style, updated_at: new Date().toISOString() });
  }

  return NextResponse.json({ id: data.id });
}
