import { publicEnv, serverEnv } from "@/lib/env";

/**
 * 결제수단을 직접 그리는 자체창을 켜도 되는가 — **서버에서만** 판정한다(2026-09-21 운영 사고 뒤).
 *
 * 자체창은 「API 개별 연동 키」 한 세트가 필요하다: 클라이언트 `ck` + 시크릿 `sk`, 같은 환경(live/test).
 * 둘 중 하나라도 모양이 틀리면 옛 결제위젯으로 떨어진다.
 *   · 클라이언트 칸에 결제위젯 키(gck)가 들어가면 → 토스가 SDK 를 거부해 **결제창이 아예 안 열린다**(실제로 났다).
 *   · 시크릿 칸에 결제위젯 시크릿(gsk)이 들어가면 → 창은 열리고 손님은 결제까지 하는데
 *     **승인 단계에서 실패**한다. 더 나쁜 사고라 클라이언트 키만 봐서는 안 된다.
 * 시크릿은 브라우저가 볼 수 없으므로 이 판정은 서버 컴포넌트(결제 페이지)가 내리고 prop 으로 내려보낸다.
 */
export function directPayReady(): boolean {
  const ck = /^(live|test)_ck_/.exec(publicEnv.NEXT_PUBLIC_TOSS_API_CLIENT_KEY);
  const sk = /^(live|test)_sk_/.exec(serverEnv().TOSS_API_SECRET_KEY);
  return !!ck && !!sk && ck[1] === sk[1];
}
