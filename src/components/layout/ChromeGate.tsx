"use client";

// 풀스크린 퍼널/랜딩 라우트에선 사이트 헤더·푸터를 숨긴다(자체 앱바·배경 사용).
// 나머지 페이지(상품·결과·법적고지 등)는 그대로 헤더·푸터를 렌더.
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const isBare = (p: string) => p === "/" || p.startsWith("/funnel") || p.startsWith("/start") || p.startsWith("/results") || p.startsWith("/checkout");

export function ChromeGate({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const bare = isBare(usePathname() ?? "");
  return (
    <>
      {!bare && header}
      {children}
      {!bare && footer}
    </>
  );
}
