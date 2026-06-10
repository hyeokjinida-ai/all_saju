import { serverEnv } from "@/lib/env";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export type TossConfirmRequest = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  approvedAt: string;
  method?: string;
  [key: string]: unknown;
};

export type TossErrorResponse = {
  code: string;
  message: string;
};

export async function confirmTossPayment(
  body: TossConfirmRequest,
): Promise<{ ok: true; data: TossConfirmResponse } | { ok: false; error: TossErrorResponse }> {
  const secretKey = serverEnv().TOSS_SECRET_KEY;
  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const res = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as TossConfirmResponse | TossErrorResponse;

  if (!res.ok) {
    return { ok: false, error: json as TossErrorResponse };
  }
  return { ok: true, data: json as TossConfirmResponse };
}

// 결제 단건 조회 — 웹훅 바디를 신뢰하지 않고 토스 API로 결제 진위/금액을 재확인할 때 사용.
export async function fetchTossPayment(
  paymentKey: string,
): Promise<{ ok: true; data: TossConfirmResponse } | { ok: false; error: TossErrorResponse }> {
  const secretKey = serverEnv().TOSS_SECRET_KEY;
  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const json = (await res.json()) as TossConfirmResponse | TossErrorResponse;
  if (!res.ok) {
    return { ok: false, error: json as TossErrorResponse };
  }
  return { ok: true, data: json as TossConfirmResponse };
}
