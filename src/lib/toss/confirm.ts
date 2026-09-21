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
  /** 간편결제일 때만 — provider 는 "카카오페이" 같은 한글 이름으로 온다 */
  easyPay?: { provider?: string | null } | null;
  [key: string]: unknown;
};

export type TossErrorResponse = {
  code: string;
  message: string;
};

/** 어느 키 세트로 승인·조회됐는지 — 자체창(`direct`) / 결제위젯(`widget`) */
export type TossKeyVia = "direct" | "widget";

// ── 시크릿 키가 두 세트다 (2026-09-21) ────────────────────────────────────────
// 토스는 클라이언트 키와 시크릿 키를 **한 세트로만** 쓰게 한다. 결제수단을 직접 그리는
// 자체창은 「API 개별 연동 키」(ck/sk), 예전 결제위젯은 「결제위젯 연동 키」(gck/gsk)라
// 승인할 때도 **그 결제를 연 세트의 시크릿**이 필요하다.
//
// 어느 세트로 열렸는지 클라이언트가 알려 주게 하지 않는다 — 성공 URL 은 손님 손에 있고,
// 결제 페이지를 열어 둔 채 재배포가 끼면 섞인다. 대신 서버가 **순서대로 시도**한다:
//   자체창 키가 있으면 그것부터(그때부터 새 결제는 전부 자체창이다) → 결제위젯 키.
// 다음 키로 넘어가는 건 「키가 안 맞는다」류 오류일 때뿐이다. 카드 거절 같은 진짜 실패를
// 다른 키로 다시 두드리면 손님에게 엉뚱한 사유가 보인다.
function tossKeys(): { key: string; via: TossKeyVia }[] {
  const env = serverEnv();
  const out: { key: string; via: TossKeyVia }[] = [];
  if (env.TOSS_API_SECRET_KEY) out.push({ key: env.TOSS_API_SECRET_KEY, via: "direct" });
  if (env.TOSS_SECRET_KEY && env.TOSS_SECRET_KEY !== env.TOSS_API_SECRET_KEY) {
    out.push({ key: env.TOSS_SECRET_KEY, via: "widget" });
  }
  return out;
}

/** 조회용 — 정산·환불 쪽에서도 같은 순서로 두드린다 */
export function tossSecretKeys(): string[] {
  return tossKeys().map((k) => k.key);
}

const basic = (key: string) => `Basic ${Buffer.from(`${key}:`).toString("base64")}`;

// 키 세트가 안 맞을 때 토스가 돌려주는 쪽의 코드들. 이 밖의 오류는 **다음 키로 안 넘긴다.**
// (어느 코드가 올지는 실결제 전엔 모른다 — 넓게 잡되 거절·한도 같은 결제 사유는 넣지 않았다)
const KEY_MISMATCH = new Set([
  "UNAUTHORIZED_KEY",
  "INVALID_API_KEY",
  "INVALID_CLIENT_KEY",
  "FORBIDDEN_REQUEST",
  "NOT_FOUND_PAYMENT",
  "NOT_FOUND_PAYMENT_SESSION",
]);

export async function confirmTossPayment(
  body: TossConfirmRequest,
): Promise<
  { ok: true; data: TossConfirmResponse; via: TossKeyVia } | { ok: false; error: TossErrorResponse }
> {
  const keys = tossKeys();
  let last: TossErrorResponse = { code: "NO_SECRET_KEY", message: "토스 시크릿 키가 없습니다" };

  for (let i = 0; i < keys.length; i++) {
    const res = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: basic(keys[i].key),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as TossConfirmResponse | TossErrorResponse;
    if (res.ok) return { ok: true, data: json as TossConfirmResponse, via: keys[i].via };

    last = json as TossErrorResponse;
    if (!KEY_MISMATCH.has(last.code)) break;
  }
  return { ok: false, error: last };
}

// 결제 단건 조회 — 웹훅 바디를 신뢰하지 않고 토스 API로 결제 진위/금액을 재확인할 때 사용.
// 읽기라서 키를 바꿔 두드려도 부작용이 없다 — 되는 키가 나올 때까지 시도한다.
export async function fetchTossPayment(
  paymentKey: string,
): Promise<{ ok: true; data: TossConfirmResponse } | { ok: false; error: TossErrorResponse }> {
  let last: TossErrorResponse = { code: "NO_SECRET_KEY", message: "토스 시크릿 키가 없습니다" };
  for (const { key } of tossKeys()) {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
      headers: { Authorization: basic(key) },
    });
    const json = (await res.json()) as TossConfirmResponse | TossErrorResponse;
    if (res.ok) return { ok: true, data: json as TossConfirmResponse };
    last = json as TossErrorResponse;
  }
  return { ok: false, error: last };
}
