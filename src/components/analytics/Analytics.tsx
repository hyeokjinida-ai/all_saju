"use client";

// 퍼스트파티 페이지뷰 추적(라우트 변경 시 /api/track) + Microsoft Clarity(세션 녹화)
// + 메타 픽셀(광고 최적화) 주입.
// 페이지뷰/이벤트는 항상 자체 DB로 수집된다. Clarity·픽셀은 각 ID 가 있을 때만 로드.
//
// 픽셀이 왜 필요한가: 유입이 100% 메타인데 픽셀이 없으면 메타가 "누가 샀는지"를 못 배운다.
// 그러면 광고 최적화가 안 걸려 소재 판단(ROAS·소재당 전환)이 통계로 불가능해진다 —
// 상품 문제와 무관하게 광고비가 새는 자리다.

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { pageview } from "@/lib/analytics";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
      {META_PIXEL_ID && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}
