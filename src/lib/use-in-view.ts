"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 화면에 들어온 순간 true 가 되고, 그 뒤로는 계속 true 다(한 번만 재생).
 *
 * 왜 필요한가: 우리 연출(붓 동그라미·형광펜)은 CSS 애니메이션이라 **요소가 만들어지는 순간**
 * 재생된다. 티저는 1만 픽셀이 넘는 페이지라, 연출이 붙은 자리는 손님이 스크롤해 도착하기
 * 한참 전에 이미 끝나 있다 — 만들어 놓고 아무도 못 보는 연출이 된다(형님 지적).
 *
 * 되돌아 올라갔다 내려오면 다시 재생되는 것이 나아 보일 수 있지만, 붓 동그라미는
 * "산군이 방금 표시했다"는 1회성 사건이라 반복되면 장식으로 내려앉는다. 그래서 한 번만.
 *
 * `animation-timeline: view()` 로도 되지만 국내 인앱 브라우저(카톡·인스타)에 아직 못 미친다.
 * IntersectionObserver 는 전 구간 지원.
 *
 * ⚠ **콜백 ref 여야 한다.** useRef + useEffect 로 짰다가 한 번 헛돌았다 —
 * 관찰 대상이 조건부로 그려지는 경우(티저는 로딩이 끝나야 카드가 생긴다) 마운트 시점엔
 * ref.current 가 null 이고, 나중에 요소가 생겨도 effect 의 의존성이 안 변해 다시 돌지 않는다.
 * 콜백 ref 는 **노드가 실제로 붙는 순간** 호출되므로 이 구멍이 없다.
 */
export function useInView<T extends Element>(opts?: { rootMargin?: string; threshold?: number }) {
  const [inView, setInView] = useState(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const rootMargin = opts?.rootMargin ?? "0px 0px -12% 0px"; // 화면 아래 12%에 걸치면 아직 안 본 것으로 친다
  const threshold = opts?.threshold ?? 0.35;

  const ref = useCallback(
    (node: T | null) => {
      ioRef.current?.disconnect();
      ioRef.current = null;
      if (!node) return;
      // 지원 못 하는 환경이면 그냥 보여준다 — 연출만 없고 내용은 멀쩡해야 한다
      if (typeof IntersectionObserver === "undefined") {
        setInView(true);
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true);
            io.disconnect(); // 한 번 보면 끝 — 스크롤 내내 콜백이 도는 걸 막는다
          }
        },
        { rootMargin, threshold },
      );
      io.observe(node);
      ioRef.current = io;
    },
    [rootMargin, threshold],
  );

  useEffect(() => () => ioRef.current?.disconnect(), []);

  return { ref, inView };
}
