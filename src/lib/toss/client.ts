import {
  loadTossPayments,
  type TossPaymentsPayment,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
import { publicEnv } from "@/lib/env";

export async function loadWidgets(customerKey: string): Promise<TossPaymentsWidgets> {
  const tossPayments = await loadTossPayments(publicEnv.NEXT_PUBLIC_TOSS_CLIENT_KEY);
  return tossPayments.widgets({ customerKey });
}

/**
 * 결제수단을 **우리가 직접 그리는** 자체창 결제(2026-09-21, 레퍼런스 몽연 현월).
 *
 * ⚠ 결제위젯 키(`gck`)로는 안 된다 — SDK 가 `NotSupportedWidgetKeyError` 를 던진다
 *    (@tosspayments/tosspayments-sdk 2.7.0 타입 선언). 「API 개별 연동 키」(`ck`)가 필요하고,
 *    그 키가 있을 때만 결제 페이지가 이 길을 탄다(`directPayEnabled`).
 */
export async function loadPayment(customerKey: string): Promise<TossPaymentsPayment> {
  const tossPayments = await loadTossPayments(publicEnv.NEXT_PUBLIC_TOSS_API_CLIENT_KEY);
  return tossPayments.payment({ customerKey });
}

// ⚠ 값이 「있기만」 하면 켜지던 것 → **API 개별 연동 키(ck) 모양일 때만** 켠다(2026-09-21 운영 사고).
//   결제위젯 키(gck)가 이 칸에 들어가자 토스가 「API 개별 연동 키로 연동해주세요」로 SDK 를 거부했고,
//   결제 페이지의 버튼이 창을 못 열었다. 잘못된 키면 새 화면을 끄고 옛 위젯으로 떨어진다 —
//   설정 실수 하나가 결제 전체를 막지 않게.
export const directPayEnabled = (): boolean => /^(live|test)_ck_/.test(publicEnv.NEXT_PUBLIC_TOSS_API_CLIENT_KEY);
