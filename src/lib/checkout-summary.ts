import { chargeFor } from "./pricing";

export function checkoutSummary(price: number, compareAtPrice: number | null | undefined, isMember: boolean) {
  const referencePrice = compareAtPrice != null && Number.isFinite(compareAtPrice) && compareAtPrice > price
    ? compareAtPrice
    : price;
  const amount = chargeFor(price, isMember);
  return {
    referencePrice,
    amount,
    saleDiscount: referencePrice - price,
    memberDiscount: price - amount,
    totalDiscount: referencePrice - amount,
  };
}
