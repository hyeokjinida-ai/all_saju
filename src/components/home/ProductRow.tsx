// 가로 스크롤 상품 행 — 청월당 실측: 제목 mb-4 px-5 18px bold, 스크롤러 pl-5 pr-5 gap-3.
// 상품이 0개면 아예 그리지 않는다(빈 제목만 남는 게 제일 나쁘다).
//
// ⚠ 앵커로 뛰어올 때 고정 헤더(60+44=104)에 제목이 가리지 않게 scroll-mt 를 준다.
import { ProductCard } from "./ProductCard";
import type { HomeProduct } from "@/lib/home-data";

export function ProductRow({
  id,
  label,
  products,
  via,
}: {
  id?: string;
  label: string;
  products: HomeProduct[];
  via: string;
}) {
  if (!products.length) return null;
  return (
    <section id={id} className="scroll-mt-[120px]">
      <h3 className="mb-4 flex items-end justify-between gap-2 px-5">
        <span
          className="min-w-0 truncate text-[18px] font-bold leading-[130%] tracking-[-0.025em]"
          style={{ color: "#FAFAFA" }}
        >
          {label}
        </span>
      </h3>
      <div className="no-scrollbar w-full overflow-x-auto overflow-y-hidden pl-5 pr-5">
        <div className="flex gap-3 after:h-px after:w-2 after:flex-none after:content-['']">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} variant="row" via={via} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** 큰 카드(70%) 한 줄 — 홈 상단 "먼저 보고 가는 풀이" 자리 */
export function BigRow({ products, via }: { products: HomeProduct[]; via: string }) {
  if (!products.length) return null;
  return (
    <div className="no-scrollbar mt-4 w-full overflow-x-auto overflow-y-hidden pl-5">
      <div className="flex gap-3 after:h-px after:w-2 after:flex-none after:content-['']">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} variant="big" via={via} />
        ))}
      </div>
    </div>
  );
}
