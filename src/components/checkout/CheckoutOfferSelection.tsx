"use client";

import { checkoutSummary } from "@/lib/checkout-summary";
import { formatKRW } from "@/lib/utils";

type Offer = {
  productId: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  includes: string[];
};

type Props = {
  options: Offer[];
  selectedId: string;
  recommendedId?: string;
  isMember: boolean;
  disabled?: boolean;
  onSelect: (productId: string) => void;
};

function shortName(name: string) {
  return name.split(/\s[—-]\s/)[0].trim();
}

export function CheckoutOfferSelection({ options, selectedId, recommendedId, isMember, disabled, onSelect }: Props) {
  const selected = options.find(option => option.productId === selectedId) ?? options[0];
  if (!selected) return null;
  const summary = checkoutSummary(selected.price, selected.compareAtPrice, isMember);

  return (
    <section aria-label="사주 상품 선택" className="mb-4 font-sans">
      {summary.totalDiscount > 0 && (
        <p className="mb-6 inline-flex items-center rounded-full bg-[#2C1B18] px-3 py-2 text-[13px] font-semibold text-white" aria-live="polite" aria-atomic="true">
          총 <strong className="mx-1 text-[#E87964]">{formatKRW(summary.totalDiscount)}</strong> 할인받았어요!
        </p>
      )}
      <h2 className="mb-3 px-2 font-sans text-[14px] font-semibold text-[#A1A1A6]">패키지 할인혜택 <span aria-hidden="true" className="ml-1 text-[18px]">🎁</span></h2>
      <div className="space-y-3">
        {options.map(option => {
          const active = option.productId === selected.productId;
          const totals = checkoutSummary(option.price, option.compareAtPrice, false);
          const discount = totals.saleDiscount > 0 ? Math.round(totals.saleDiscount / totals.referencePrice * 100) : 0;
          const bundled = option.includes.length > 1;
          const recommended = option.productId === recommendedId;
          return (
            <button
              key={option.productId}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(option.productId)}
              className={`flex min-h-[74px] w-full items-center justify-between gap-3 rounded-[15px] border-2 bg-[#111111] px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E87964] disabled:opacity-60 ${active ? "border-[#E87964]" : "border-[#3B3B41]"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-snug text-white">
                  {bundled ? `${option.includes.length}종 사주 패키지` : shortName(option.name)}
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[#929297]">
                  {recommended && <span className="mr-1.5 inline-block rounded-full bg-[#2C1B18] px-2 py-0.5 text-[10px] font-semibold text-[#E87964]">추천</span>}
                  {bundled ? option.includes.map(shortName).join(" + ") : "단품 · 전체 풀이"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {totals.saleDiscount > 0 && (
                  <span className="mb-0.5 block text-[12px]">
                    <span className="mr-1.5 font-semibold text-[#E87964]">{discount}%</span>
                    <del className="text-[#929297]">{formatKRW(totals.referencePrice)}</del>
                  </span>
                )}
                <span className="block text-[18px] font-semibold tabular-nums text-white">{formatKRW(option.price)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CheckoutPriceSummary({ price, compareAtPrice, isMember }: {
  price: number;
  compareAtPrice?: number | null;
  isMember: boolean;
}) {
  const summary = checkoutSummary(price, compareAtPrice, isMember);
  return (
    <dl className="mb-7 space-y-3 font-sans text-[14px] tabular-nums" aria-label="결제 금액 안내" aria-live="polite" aria-atomic="true">
      {summary.totalDiscount > 0 && (
        <div className="flex items-center justify-between gap-3 text-[#BDBDC2]">
          <dt>{summary.saleDiscount > 0 ? "상품 기준가" : "상품 판매가"}</dt>
          <dd>{formatKRW(summary.referencePrice)}</dd>
        </div>
      )}
      {summary.saleDiscount > 0 && (
        <div className="flex items-center justify-between gap-3 text-[#E87964]">
          <dt>적용 할인</dt>
          <dd>-{formatKRW(summary.saleDiscount)}</dd>
        </div>
      )}
      {summary.memberDiscount > 0 && (
        <div className="flex items-center justify-between gap-3 text-[#E87964]">
          <dt>회원 할인</dt>
          <dd>-{formatKRW(summary.memberDiscount)}</dd>
        </div>
      )}
      <div className="!mt-4 flex items-center justify-between gap-3 border-t border-[#5B5B60] pt-4 font-semibold text-white">
        <dt>최종 결제금액</dt>
        <dd className="text-[18px]">{formatKRW(summary.amount)}</dd>
      </div>
    </dl>
  );
}
