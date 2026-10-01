"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track } from "@/lib/analytics";

/** Observe the actual price/button region, not merely the page mounting. */
export function PriceExposure({ slug, basePrice, displayedAmount, isMember, stage, orderId, children }: {
  slug: string; basePrice: number; displayedAmount: number; isMember: boolean;
  stage: "inline" | "sheet" | "checkout"; orderId?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      track("price_view", { slug, basePrice, displayedAmount, member: isMember, stage, orderId });
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(element.querySelector("[data-price-amount]") ?? element);
    return () => observer.disconnect();
  }, [slug, basePrice, displayedAmount, isMember, stage, orderId]);
  return <div ref={ref}>{children}</div>;
}
