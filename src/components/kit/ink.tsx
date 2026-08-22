"use client";

// 손맛 요소 — 형광펜·낙서·가림·발광. 직녀에서 꺼내 상품 고정을 풀었다(2026-08-23).
// 전부 SVG·CSS 라 에셋이 없고, 색은 스킨 토큰이라 세계관을 따라간다.
import type { CSSProperties, ReactNode } from "react";
import { useInView } from "@/lib/use-in-view";
import { FS } from "@/components/kit/scale";

/**
 * 형광펜 한 칠 — 손님이 그 문장에 **도착했을 때** 좌→우로 그어진다.
 *
 * 인라인 animation 은 요소가 만들어질 때 재생된다. 결과지는 2만 픽셀이 넘어
 * 예전엔 페이지가 뜨는 순간 열몇 개가 한꺼번에 칠해지고 끝났다 — 붓이 지나가는 걸 아무도 못 봤다.
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

/** 형광펜 밑줄 낙서 — 가림 박스 아래에 긋는 거친 스트로크. */
export function ScribbleLine({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 10" preserveAspectRatio="none" className={`block h-2 w-full ${className}`}>
      <path d="M3 6 C 40 2, 70 8, 104 4 C 138 1, 168 7, 197 3" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 8 C 46 5, 78 9, 112 6 C 146 4, 172 8, 192 6" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 한붓 별 낙서 — 숫자 옆에 하나만. 있으면 '만든 것'처럼 보이고 없으면 밋밋하다. */
export function ScribbleStar({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`inline-block h-4 w-4 ${className}`}>
      <path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.75" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 가림 — 모자이크는 '처리'가 아니라 **오브젝트**다.
 * 발광 라운드 박스 + 흐린 더미 글자 + 아래 형광펜 낙서. 가려 놓은 자리가 오히려 눈에 띈다.
 * ⚠ 안에 실값을 넣지 않는다 — 흐리게만 하면 소스에서 그대로 읽힌다.
 */
export function NeonMask({ text = "○○○○○○", scribble = true }: { text?: string; scribble?: boolean }) {
  return (
    <span className="inline-block align-middle">
      <span
        className="inline-flex items-center justify-center rounded-[10px] px-3.5 py-1.5"
        style={{
          border: "1.5px solid var(--gold-bright)",
          boxShadow: "0 0 10px var(--gold-line), 0 0 26px var(--gold-pale), inset 0 0 14px var(--gold-pale)",
          background: "var(--gold-pale)",
        }}
      >
        <span
          className="font-myeongjo font-bold"
          style={{ fontSize: FS.body, color: "var(--bone)", filter: "blur(5px)", userSelect: "none" }}
        >
          {text}
        </span>
      </span>
      {scribble && <ScribbleLine className="-mt-0.5" />}
    </span>
  );
}

/** 발광 띠 — 헤드 뒤에 포인트색 radial 을 깔아 대비를 만든다.
 *  평평한 바탕 위 글자만 얹으면 같은 크기여도 약해 보인다(1:1 대조에서 나온 밤티 원인 3). */
export function GlowBand({ children }: { children: ReactNode }) {
  return (
    // ⚠ overflow-hidden 필수 — 발광이 w-150% 라 감싸지 않으면 **페이지가 가로로 샌다**
    // (실측: scrollWidth 458 vs clientWidth 390 = 68px 초과. 모바일에서 화면이 옆으로 밀린다).
    // 장식 하나가 전체 레이아웃을 넓히는 건 부품으로선 실격이다.
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[190%] w-[150%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--gold-pale) 0%, transparent 70%)" }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** 실 디바이더 — 섹션 사이에 한 가닥. 직녀는 은사, 산군은 금줄로 스킨이 알아서 갈린다. */
export function ThreadDivider() {
  return (
    <div className="flex justify-center py-6">
      <svg aria-hidden viewBox="0 0 12 72" className="h-16 w-3">
        <path d="M6 0 C 8 14, 4 22, 6 34 C 8 46, 4 56, 6 72" stroke="var(--gold)" strokeOpacity="0.55" strokeWidth="1.2" fill="none" />
        <circle cx="6" cy="35" r="2.2" fill="var(--gold)" fillOpacity="0.9" />
      </svg>
    </div>
  );
}
