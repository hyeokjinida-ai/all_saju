"use client";

// GA4 + Microsoft Clarity 스크립트 주입 + SPA 라우트 변경 시 page_view 전송.
// 환경변수가 없으면 아무 스크립트도 로드하지 않는다(완전 비활성).
//   NEXT_PUBLIC_GA_ID      예) G-XXXXXXXXXX   (구글 애널리틱스 4)
//   NEXT_PUBLIC_CLARITY_ID 예) abcdefghij     (Microsoft Clarity 프로젝트 ID)

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { pageview } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

function RouteChangeTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!GA_ID) return;
    const qs = search?.toString();
    pageview(pathname + (qs ? `?${qs}` : ""));
  }, [pathname, search]);
  return null;
}

export function Analytics() {
  if (!GA_ID && !CLARITY_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
          <Suspense fallback={null}>
            <RouteChangeTracker />
          </Suspense>
        </>
      )}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
    </>
  );
}
