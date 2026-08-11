"use client";

import type { CSSProperties, ReactNode } from "react";
import { useInView } from "@/lib/use-in-view";

/**
 * 형광펜 한 칠 — 손님이 그 문장에 도착했을 때 좌→우로 그어진다.
 *
 * 왜 컴포넌트로 빼나: 결과지는 11장짜리라 형광펜이 열 번 넘게 나온다. 인라인 style 의
 * animation 은 요소가 만들어질 때 재생되므로, 예전엔 페이지가 뜨는 순간 **열몇 개가 한꺼번에**
 * 칠해지고 끝났다 — 손님이 3장쯤 읽어 내려올 때는 이미 다 칠해져 있어서, 붓이 지나가는 걸
 * 정작 아무도 못 봤다(전환점 카드의 붓 동그라미와 같은 병).
 *
 * ResultBody 는 서버 컴포넌트라 훅을 못 쓴다. 이 조각만 클라이언트로 떼어 낸다.
 */
export function InkMark({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  // 인라인 요소라 임계값을 낮게 — 문장이 두 줄에 걸치면 위 줄만 보이는 순간이 생긴다.
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.5, rootMargin: "0px 0px -8% 0px" });

  return (
    <mark ref={ref} className={`ink-swipe${inView ? " is-drawn" : ""}`} style={style}>
      {children}
    </mark>
  );
}
