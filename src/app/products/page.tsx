// 전체 풀이 목록 — 홈 하단 탭바가 여기로 온다.
//
// 왜 다시 짰나: 이전 목록은 전역 헤더(자수정·금색) + 와인색 카드였다. 검정 홈에서
// 탭 하나 눌렀는데 색이 통째로 바뀌면 손님은 딴 사이트로 넘어온 줄 안다.
// 홈과 **같은 셸·같은 카드**를 쓰고 배치만 2열 격자로 바꾼다.
import type { Metadata } from "next";
import { HomeShell } from "@/components/home/HomeShell";
import { ProductCard } from "@/components/home/ProductCard";
import { HomeFooter } from "@/components/home/HomeFooter";
import { getHomeProducts } from "@/lib/home-data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { CATEGORY_FALLBACK, HOME_ROWS, T } from "@/config/home";

export const metadata: Metadata = { title: "전체 풀이" };

export default async function ProductsPage() {
  const products = await getHomeProducts();
  const isLoggedIn = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;

  const groups = HOME_ROWS.map((row) => ({
    ...row,
    products: products.filter((p) => (p.category ?? CATEGORY_FALLBACK[p.slug]) === row.key),
  })).filter((g) => g.products.length > 0);

  // 어느 카테고리에도 안 걸린 상품은 버리지 않고 맨 아래 모은다
  const grouped = new Set(groups.flatMap((g) => g.products.map((p) => p.id)));
  const rest = products.filter((p) => !grouped.has(p.id));

  return (
    <HomeShell tabs={[]} isLoggedIn={isLoggedIn} active="products">
      <div className="px-5 pb-2 pt-6">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]" style={{ color: T.title }}>
          전체 풀이
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: T.sub }}>
          가볍게 시작해서 깊이 들어가세요. 모두 정통 만세력으로 세운 사주를 바탕으로 풀어드립니다.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="px-5 py-12 text-sm" style={{ color: T.sub }}>
          지금은 준비된 풀이가 없습니다.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-10 px-5 pb-6">
          {groups.map((g) => (
            <section key={g.key} id={g.key} className="scroll-mt-[100px]">
              <h2
                className="mb-4 text-[18px] font-bold leading-[130%] tracking-[-0.025em]"
                style={{ color: T.title }}
              >
                {g.label}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {g.products.map((p) => (
                  <ProductCard key={p.id} product={p} variant="grid" via={`list-${g.key}`} />
                ))}
              </div>
            </section>
          ))}

          {rest.length > 0 && (
            <section>
              <h2
                className="mb-4 text-[18px] font-bold leading-[130%] tracking-[-0.025em]"
                style={{ color: T.title }}
              >
                그 밖의 풀이
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {rest.map((p) => (
                  <ProductCard key={p.id} product={p} variant="grid" via="list-etc" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-10" />
      <HomeFooter />
    </HomeShell>
  );
}
