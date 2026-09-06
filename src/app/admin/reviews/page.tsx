// 후기 승인 — 손님이 쓴 후기를 **형님이 켜야** 화면에 선다(0013 게이트).
//
// 왜 있나: 산군 티저 구매 카드 뒤에 후기 블록이 섰다. 승인 없이 바로 공개되면
// 별 하나짜리 후기가 **광고로 들어온 손님이 값을 보는 화면에** 자동으로 걸린다.
// 지우는 화면이 아니다 — 원문은 그대로 두고 노출만 켜고 끈다.
import Link from "next/link";
import { requireAdminPassword } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { ReviewApproveToggle } from "@/components/admin/ReviewApproveToggle";

export const metadata = { title: "관리자 - 후기 승인" };

type SearchParams = Promise<{ filter?: string }>;

type ReviewRow = {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  is_approved: boolean;
  is_public: boolean;
  product_id: string;
  user_id: string | null;
  guest_email: string | null;
};

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPassword("/admin/reviews");

  const { filter } = await searchParams;
  const demoMode = !isSupabaseConfigured();

  let rows: ReviewRow[] = [];
  let productMap = new Map<string, string>();
  let whoMap = new Map<string, string>();
  let pendingCount = 0;
  // 0010/0013 이 아직 안 붙은 DB 에서 화면이 통째로 죽지 않게 — 상품 페이지와 같은 방침.
  let schemaMissing = false;

  if (!demoMode) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("reviews")
      .select("id, rating, content, created_at, is_approved, is_public, product_id, user_id, guest_email")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      schemaMissing = true;
    } else {
      rows = (data ?? []) as ReviewRow[];
      pendingCount = rows.filter((r) => !r.is_approved).length;
      if (filter === "pending") rows = rows.filter((r) => !r.is_approved);
      if (filter === "live") rows = rows.filter((r) => r.is_approved);

      const productIds = [...new Set(rows.map((r) => r.product_id))];
      const { data: products } = productIds.length
        ? await service.from("products").select("id, name").in("id", productIds)
        : { data: [] };
      productMap = new Map((products ?? []).map((p) => [p.id, p.name]));

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length
        ? await service.from("profiles").select("id, display_name, email").in("id", userIds)
        : { data: [] };
      whoMap = new Map(
        (profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) || (p.email as string)]),
      );
    }
  }

  const filters = [
    { key: "", label: "전체" },
    { key: "pending", label: "승인 대기" },
    { key: "live", label: "노출 중" },
  ];

  return (
    <div className="container py-12">
      <header className="mb-8">
        <p className="text-xs font-mono text-mute mb-2">ADMIN / REVIEWS</p>
        <h1 className="text-2xl font-semibold tracking-tight">후기 승인</h1>
        <p className="mt-2 text-sm text-body leading-relaxed">
          손님 후기는 <b className="text-ink">기본이 숨김</b>입니다. 여기서 켠 것만 홈·상품 페이지·산군 티저에
          섭니다. 산군 티저 블록은 <b className="text-ink">승인 3건</b>부터 나옵니다.
        </p>
      </header>

      {demoMode && (
        <div className="mb-6 rounded-lg border border-hairline bg-canvas p-4 text-xs text-body leading-relaxed">
          <p className="font-semibold text-ink mb-1">데모 모드 — DB 미연결</p>
          Supabase 를 연결하면 후기가 보입니다.
        </div>
      )}

      {schemaMissing && (
        <div className="mb-6 rounded-lg border border-hairline bg-canvas p-4 text-xs text-body leading-relaxed">
          <p className="font-semibold text-ink mb-1">마이그레이션이 필요합니다</p>
          <code className="font-mono text-ink">supabase/migrations/0013_review_gate.sql</code> 을 Supabase SQL
          Editor 에 붙여넣고 Run 하세요. (0010 도 안 붙어 있다면 그것부터입니다.)
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        {filters.map((f) => {
          const active = (filter ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/admin/reviews?filter=${f.key}` : "/admin/reviews"}
              className={`px-4 h-8 inline-flex items-center rounded-full text-sm border transition-colors ${active ? "bg-ink text-canvas border-ink" : "border-hairline text-ink hover:border-ink"}`}
            >
              {f.label}
              {f.key === "pending" && pendingCount > 0 ? ` ${pendingCount}` : ""}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-mute font-mono mb-3">{rows.length} ROWS</p>

      <div className="border border-hairline rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-mute">
            아직 후기가 없습니다. 결과지 맨 아래 「후기 남기기」로 들어옵니다.
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                      <span className="text-ink">{"★".repeat(r.rating)}</span>
                      <span>{productMap.get(r.product_id) ?? "-"}</span>
                      <span className="font-mono">{formatDate(r.created_at)}</span>
                      <span className="truncate">
                        {r.user_id ? (whoMap.get(r.user_id) ?? "회원") : (r.guest_email ?? "비회원")}
                      </span>
                      {!r.is_public && <span className="text-ink">· 손님이 비공개로 둠</span>}
                    </div>
                    <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  </div>
                  <ReviewApproveToggle id={r.id} approved={r.is_approved} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
