"use client";

// 퍼스트파티 페이지뷰 추적(라우트 변경 시 /api/track) + Microsoft Clarity(세션 녹화) 주입.
// 페이지뷰/이벤트는 항상 자체 DB로 수집된다. Clarity 는 NEXT_PUBLIC_CLARITY_ID 가 있을 때만 로드.

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { pageview } from "@/lib/analytics";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

function RouteChangeTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const qs = search?.toString();
    pageview(pathname + (qs ? `?${qs}` : ""));
  }, [pathname, search]);
  return null;
}

export function Analytics() {
  return (
    <>
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}
