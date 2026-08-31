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
  // 직녀 리타겟 랜딩 — 광고 트래픽에 사이트 헤더(상품·로그인)가 새면 몰입이 깨진다(8/24)
  p === "/jiknyeo" ||
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
  const pathname = usePathname() ?? "";
  const bare = isBare(pathname);
  const body = (
    <>
      {!bare && header}
      {children}
      {!bare && footer}
    </>
  );
  // 관리 화면은 표가 넓어야 한다 — 기둥 없이 전폭.
  if (pathname.startsWith("/admin")) return body;
  // 폰 기둥 — 전 라우트를 448(max-w-md, 홈·체크아웃과 같은 폭) 가운데로.
  // PC 에서 랜딩 그림판(w-full × object-cover)이 모니터 폭으로 부풀어 그림 한 조각만
  // 보이던 것을 여기 한 곳에서 막는다(랜딩마다 심으면 다음 랜딩에서 또 깨진다).
  // 바깥은 body 의 #18191A 가 이미 칠한다(globals.css "본문 기둥" 주석 참조).
  // ⚠ 순수 폭 클램프만 둘 것 —
  //   transform/filter 금지: 안쪽 position:fixed 기준이 뷰포트→이 박스로 바뀐다(SajuWizard 실측).
  //   overflow 금지: sticky 헤더가 죽는다.
  //   배경·테두리 금지: 폰(≤448px)에서 픽셀이 변하면 안 된다.
  return <div className="mx-auto w-full max-w-md">{body}</div>;
}
