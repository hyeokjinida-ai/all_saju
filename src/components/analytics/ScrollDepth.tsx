"use client";

// 스크롤 깊이 신호 — 긴 랜딩에서 **어디서 잃는지**를 보는 유일한 자.
//
// 왜 만들었나(2026-08-30 판독 A10): `/jiknyeo` 는 10,000px 넘는 스크롤 랜딩인데 이벤트가
// `page_view` 하나뿐이었다. 12화면짜리 페이지에서 손님이 어느 블록에서 떠나는지 볼 방법이
// 지금 없다 — 다음 판단(어느 블록을 고칠지)이 전부 추측이 된다.
//
// 메타로는 보내지 않는다. `analytics.ts` 의 매핑에 없는 이름은 픽셀로 안 나가고 자체 DB 로만
// 쌓인다 — 그게 맞다. 표준이 아닌 이름을 픽셀에 흘리면 최적화가 안 걸리고 노이즈만 는다.
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

const MARKS = [25, 50, 75, 100] as const;

export function ScrollDepth({ slug }: { slug: string }) {
  const fired = useRef<Set<number>>(new Set());
  useEffect(() => {
    let ticking = false;
    const check = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      // 화면보다 짧은 페이지에서 0 으로 나누면 전 구간이 한 번에 터진다.
      if (scrollable <= 0) return;
      const pct = ((window.scrollY || doc.scrollTop) / scrollable) * 100;
      for (const m of MARKS) {
        if (pct >= m && !fired.current.has(m)) {
          fired.current.add(m);
          track("scroll_depth", { slug, depth: m });
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // 새로고침으로 중간에서 시작하는 경우가 있어 한 번은 즉시 잰다.
    check();
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);
  return null;
}
