"use client";

// 상품 열람 1회 신호 — `product_view` → 메타 **ViewContent**.
//
// 왜 컴포넌트로 빼나: 전에는 산군·직녀 랜딩 **안에서만** 쐈고 slug 가 하드코딩돼 있었다.
// 그래서 상품 빌더로 새로 만든 상품은 퍼널 첫 칸이 통째로 비었다 —
// 「광고 클릭 → 이탈」과 「상품 보고 이탈」을 구분할 수 없다.
//
// ⚠ 게이트가 있는 랜딩(산군·직녀)에는 **붙이지 않는다.**
//    그쪽 `product_view` 는 「게이트를 벗어난 순간」에 쏘고, 그게 게이트 이탈률을 재는
//    유일한 자다(SangunWebtoon.tsx·JiknyeoStory.tsx 주석 참조). 페이지 로드로 앞당기면
//    그 자가 없어진다. 이 비콘은 **게이트가 없어 「페이지 로드 = 상품 열람」인 화면** 전용이다.
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export function ProductViewBeacon({ slug }: { slug: string }) {
  // React 18 StrictMode 는 개발에서 effect 를 두 번 돌린다 — 중복 전송을 막는다.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("product_view", { slug });
  }, [slug]);
  return null;
}
