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

export const directPayEnabled = (): boolean => !!publicEnv.NEXT_PUBLIC_TOSS_API_CLIENT_KEY;
