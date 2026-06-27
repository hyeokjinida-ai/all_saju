// =====================================================
// 분석 이벤트 전송 — 퍼스트파티(자체 DB) + Microsoft Clarity
// =====================================================
// 클라이언트 전용. 이벤트는 /api/track 로 보내 내 Supabase(analytics_events)에 적재하고,
// /admin/analytics 에서 집계해 본다. Clarity(세션 녹화)는 보조로 동일 이벤트를 태깅한다.
//
// ⚠️ 개인정보 금지: 이름·생년월일·시각·성별·이메일 등은 절대 보내지 않는다.
//    단계 번호·상품 slug·금액(value)·통화만 보낸다(퍼널 분석용).

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const VISITOR_KEY = "mr_vid"; // localStorage — 고유 방문자(영속)
const SESSION_KEY = "mr_sid"; // sessionStorage — 방문 1회

function uid(): string {
  return crypto.randomUUID();
}

// 스토리지가 차단된 경우(프라이빗·웹뷰 등) 페이지 수명 동안 유지되는 임시 ID로 폴백.
// 상수("anon")로 폴백하면 서로 다른 방문자가 한 세션으로 뭉쳐 퍼널이 왜곡되므로 금지.
let memVisitor: string | null = null;
let memSession: string | null = null;

function visitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = uid();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return (memVisitor ??= uid());
  }
}

function sessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = uid();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return (memSession ??= uid());
  }
}

function referrerHost(): string {
  try {
    if (!document.referrer) return "";
    const h = new URL(document.referrer).hostname;
    return h === location.hostname ? "" : h; // 내부 이동은 유입원에서 제외
  } catch {
    return "";
  }
}

// 이벤트 1건을 자체 수집 엔드포인트로 전송(페이지 이탈에도 살아남도록 beacon 우선).
function send(event: string, params: EventParams, path?: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      path: path ?? location.pathname,
      referrer: referrerHost(),
      props: params,
      visitorId: visitorId(),
      sessionId: sessionId(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* 분석 실패가 사용자 흐름을 막지 않도록 무시 */
  }
}

// 커스텀 이벤트(자체 DB + Clarity 태깅).
export function track(event: string, params: EventParams = {}): void {
  send(event, params);
  try {
    window.clarity?.("event", event);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) window.clarity?.("set", k, String(v));
    }
  } catch {
    /* no-op */
  }
}

// 페이지뷰(라우트 변경 시 호출).
export function pageview(path: string): void {
  send("page_view", {}, path);
}
