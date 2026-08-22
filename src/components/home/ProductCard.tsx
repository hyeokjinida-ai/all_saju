// 상품 카드 — 청월당 홈의 세 가지 카드를 한 부품으로.
//
//   big   w-[70%]  실측 300×376  rounded-xl(12)  · 글자를 그림 위에 얹음
//   row   w-[44%]  실측 180×283  rounded-lg(8)   · 글자를 그림 아래에
//   grid  2열 격자 (/products 목록)               · row 와 같은 조판, 폭만 다름
//
// 비율은 전부 청월당 그대로 aspect-[295/370].
// 색은 타이트 토큰(§2-4): 테두리 white/10, 바탕 #18181B, 제목 #FAFAFA, 부제 #A1A1AA.
//
// ⚠ 가격은 카드에 안 쓴다 — 청월당·타이트 둘 다 홈이 무가격이다(가격은 티저 뒤 결제 시트).
// ⚠ 그림은 next/image 가 아니라 미리 구운 webp + <img> 다. 이 저장소엔 sharp 런타임
//    최적화 경로가 없다(계획서 R2). 굽는 건 scripts/make-home-art.ts.
import Link from "next/link";
import { cardName, homeArt, shortDesc } from "@/config/home";
import type { HomeProduct } from "@/lib/home-data";

type Variant = "big" | "row" | "grid";

const SHELL: Record<Variant, string> = {
  big: "relative w-[70%] shrink-0",
  row: "relative w-[44%] shrink-0",
  grid: "relative w-full",
};

const RADIUS: Record<Variant, string> = {
  big: "rounded-xl",
  row: "rounded-lg",
  grid: "rounded-lg",
};

export function ProductCard({
  product,
  variant,
  via,
}: {
  product: HomeProduct;
  variant: Variant;
  /** 어느 자리에서 눌렸는지 — 페이지뷰 쿼리에 남아 행별 전환을 볼 수 있다.
   *  ⚠ `?from=` 은 직녀 몰입형에서 "게이트 건너뛰기" 뜻으로 이미 쓰인다. 그래서 `via`. */
  via: string;
}) {
  const art = product.art?.[variant === "grid" ? "row" : variant] ?? homeArt(product.slug, variant === "grid" ? "row" : variant);
  const title = product.cardTitle || cardName(product.name);
  const sub = product.tagline || shortDesc(product.description);
  const overlay = variant === "big";

  return (
    <Link
      href={`/products/${product.slug}?via=${via}`}
      className={`${SHELL[variant]} group block transition-opacity active:opacity-80`}
    >
      <div
        className={`relative aspect-[295/370] w-full overflow-hidden ${RADIUS[variant]}`}
        style={{ background: "#18181B", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 사전 생성 webp, 런타임 최적화 경로 없음 */}
        <img
          src={art}
          alt={product.name}
          loading={variant === "big" ? "eager" : "lazy"}
          className="h-full w-full object-cover"
        />
        {overlay && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 100%)" }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-4">
              <h5 className="truncate text-[17px] font-semibold leading-[130%] tracking-[-0.025em] text-white">
                {title}
              </h5>
              <p className="line-clamp-1 text-[12px] leading-[130%] tracking-[-0.025em] text-white/75">{sub}</p>
            </div>
          </>
        )}
      </div>

      {!overlay && (
        <div className="mt-3 flex w-full flex-col gap-1 px-1">
          <h5
            className="truncate text-[16px] font-semibold tracking-[-0.025em]"
            style={{ color: "#FAFAFA" }}
          >
            {title}
          </h5>
          <p
            className="line-clamp-1 text-[14px] font-medium leading-[130%] tracking-[-0.025em]"
            style={{ color: "#A1A1AA" }}
          >
            {sub}
          </p>
        </div>
      )}
    </Link>
  );
}
