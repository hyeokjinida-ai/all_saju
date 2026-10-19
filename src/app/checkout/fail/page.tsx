"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { checkoutFailureCode, checkoutFailureMessage, checkoutMode, checkoutRetryPath, isCheckoutCancellation, safeCheckoutTrack } from "@/lib/checkout-recovery";

export default function CheckoutFailPage() {
  return (
    <Suspense>
      <CheckoutFailInner />
    </Suspense>
  );
}

function CheckoutFailInner() {
  const search = useSearchParams();
  const code = checkoutFailureCode(search.get("code"));
  const retryPath = checkoutRetryPath(search.get("orderId"));
  const orderId = retryPath ? search.get("orderId")! : undefined;
  const mode = checkoutMode(search.get("checkout_mode"));

  useEffect(() => {
    safeCheckoutTrack(track, "checkout_fail_view", { orderId, code, retryAvailable: !!retryPath, checkout_mode: mode });
  }, [code, mode, orderId, retryPath]);

  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{isCheckoutCancellation(code) ? "결제 취소" : "결제 실패"}</CardTitle>
          <CardDescription>{checkoutFailureMessage(code)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {retryPath && (
            <Link href={retryPath} className={cn(buttonVariants(), "w-full")}>
              같은 주문으로 다시 시도
            </Link>
          )}
          <div className="flex gap-2">
            <Link href="/products" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
              상품으로
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
              홈으로
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
