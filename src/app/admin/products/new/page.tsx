import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "새 상품 · 관리자" };

export default async function AdminProductNew() {
  await requireAdminPassword("/admin/products/new");

  const db = createServiceClient();
  const { data: probe } = await db.from("products").select("category").limit(1);
  const ready = probe !== null;

  return (
    <div className="container max-w-5xl py-12">
      <header className="mb-8">
        <Link href="/admin/products" className="text-xs text-mute hover:text-ink">← 상품 관리</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">새 상품</h1>
        <p className="mt-2 text-xs leading-relaxed text-body">
          만들 때는 <b className="text-ink">판매중을 꺼 둔 채로</b> 저장하고, 카드와 랜딩을 확인한 뒤 켜는 걸 권합니다.
        </p>
      </header>

      <ProductForm ready={ready} />
    </div>
  );
}
