// =====================================================
// 분석 이벤트 전송 — GA4(gtag) + Microsoft Clarity
// =====================================================
// 클라이언트 전용. 환경변수(NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_CLARITY_ID)가
// 없으면 스크립트 자체가 로드되지 않으므로 모든 호출이 안전한 no-op이 된다.
//
// ⚠️ 개인정보 금지: 이름·생년월일·시각·성별 등 입력값은 절대 보내지 않는다.
//    단계 번호·상품 slug·금액(value)·통화만 보낸다(퍼널 분석용).

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// 커스텀 이벤트 1건을 GA4와 Clarity 양쪽에 전송.
export function track(event: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
    // Clarity: 커스텀 이벤트 + 세션 필터용 태그(set)
    window.clarity?.("event", event);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) window.clarity?.("set", k, String(v));
    }
  } catch {
    /* 분석 실패가 사용자 흐름을 막지 않도록 무시 */
  }
}

// SPA 라우트 변경 시 GA4 page_view 전송(App Router는 수동 전송 필요).
export function pageview(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (id && window.gtag) window.gtag("config", id, { page_path: url });
  } catch {
    /* no-op */
  }
}
