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
    fbq?: (...args: unknown[]) => void;
  }
}

// 우리 이벤트 이름 → 메타 표준 이벤트.
// 표준 이벤트여야 메타가 "구매할 사람"을 학습한다 — 커스텀 이름으로 보내면 최적화가 안 걸린다.
// 유입이 100% 메타라 이 매핑이 광고비의 효율을 결정한다.
// 좌변은 **이 코드베이스가 실제로 부르는 이벤트 이름**이다(track 호출부 전수 확인).
// wizard_step 은 단계마다 터져 노이즈라 픽셀로 안 보낸다 — 자체 DB 로만 퍼널을 본다.
const META_STANDARD: Record<string, string> = {
  page_view: "PageView",
  product_view: "ViewContent",       // 게이트를 넘어 상품(목차·가격)을 실제로 본 지점
  teaser_view: "AddToCart",          // 개인화 티저 = 자기 사주를 확인한 지점(구매 의사 최고조)
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

/** 메타 픽셀로 같은 이벤트를 흘린다. 픽셀이 없으면(로컬·미설정) 조용히 넘어간다. */
function sendMeta(event: string, params: EventParams): void {
  const std = META_STANDARD[event];
  if (!std) return;
  try {
    // 개인정보는 위 주석대로 애초에 params 에 없다 — 금액·통화만 넘어간다.
    const payload: Record<string, unknown> = {};
    if (params.value !== undefined) payload.value = params.value;
    if (params.currency !== undefined) payload.currency = params.currency;
    if (params.slug !== undefined) payload.content_ids = [params.slug];
    window.fbq?.("track", std, payload);
  } catch {
    /* 픽셀 실패가 사용자 흐름을 막지 않도록 무시 */
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

// 광고 소재 꼬리표. 광고 링크의 utm_content 를 **첫 진입 때 한 번만** 세션에 새긴다.
//
// 왜 첫 진입만인가: 손님이 사이트 안에서 움직이면 쿼리가 사라진다. 나중 이벤트에
// 빈 값을 덮어쓰면 그 세션이 「직접 유입」으로 둔갑해 소재 판정이 통째로 무너진다.
// 그래서 빈 값이어도 **저장해 둔다** — 「이 세션은 꼬리표가 없다」를 확정짓기 위해.
//
// 메타 픽셀은 소재별 CTR·ROAS 까지만 알려 준다. 「어느 소재로 들어온 사람이
// 위저드 몇 단계에서 빠졌는가」는 이 꼬리표가 있어야 가릅니다(/admin/analytics).
const UTM_KEY = "mr_utm"; // sessionStorage — 이 방문의 utm_content
const UTM_MAX = 60; // /api/track 의 prop 길이 제한(120) 안에서 넘게 잡은 값

function utmFromUrl(): string {
  try {
    return (new URLSearchParams(location.search).get("utm_content") ?? "").slice(0, UTM_MAX);
  } catch {
    return "";
  }
}

function creative(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = sessionStorage.getItem(UTM_KEY);
    if (saved !== null) return saved;
    const v = utmFromUrl();
    sessionStorage.setItem(UTM_KEY, v);
    return v;
  } catch {
    // 스토리지가 막힌 브라우저(프라이빗·일부 인앱) — 이번 이벤트만 URL 에서 읽는다.
    return utmFromUrl();
  }
}

// 이벤트 1건을 자체 수집 엔드포인트로 전송(페이지 이탈에도 살아남도록 beacon 우선).
function send(event: string, params: EventParams, path?: string): void {
  if (typeof window === "undefined") return;
  const cr = creative();
  try {
    const body = JSON.stringify({
      event,
      path: path ?? location.pathname,
      referrer: referrerHost(),
      // 소재 꼬리표를 자체 DB 쪽에만 실는다(메타는 sendMeta 가 따로 보낸다).
      props: cr ? { ...params, utm: cr } : params,
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
  sendMeta(event, params);
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
  // SPA 라우팅에서도 메타가 페이지뷰를 세게 한다(스크립트의 초기 1회만으로는 SPA 이동이 안 잡힌다).
  sendMeta("page_view", {});
}
