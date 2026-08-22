"use client";

// 풀스크린 퍼널/랜딩 라우트에선 사이트 헤더·푸터를 숨긴다(자체 앱바·배경 사용).
// 나머지 페이지(상품·결과·법적고지 등)는 그대로 헤더·푸터를 렌더.
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const isBare = (p: string) =>
  p === "/" ||
  // 전체 풀이 목록 — 홈과 같은 검정 앱셸(HomeShell)을 자체적으로 쓴다.
  // ⚠ `/products/<slug>` 상세는 여기 해당 없음(아래 개별 규칙 유지).
  p === "/products" ||
  p.startsWith("/funnel") ||
  p.startsWith("/start") ||
  p.startsWith("/results") ||
  p.startsWith("/checkout") ||
  // 몰입형 웹툰 랜딩 — 자체 배경·자체 푸터를 가지므로 사이트 크롬 제거
  p === "/products/wealth-saju" ||
  p === "/products/inyeon-saju" ||
  p === "/products/sangun-sinjeom";

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
