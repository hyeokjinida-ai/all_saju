// =====================================================
// 토스 — PG 실수수료(정산)와 환불(결제 취소) 수신
// =====================================================
// 손익 표의 두 칸을 추정에서 사실로 바꾼다:
//   · PG 수수료 — 지금은 요율 3.74% 추정. 정산이 오면 실제 뗀 금액으로 교체된다.
//   · 환불     — 정산 데이터는 D+n 이라 늦다. 결제 취소 내역으로 **그날** 잡는다.
//
// ⚠ 로컬 .env 는 **테스트 키**라 샌드박스 데이터가 온다(2026-09-12 실측: 남의 테스트 거래가 섞여 나옴).
//   운영 키는 Vercel 에만 있으므로 여기 코드의 진짜 검증은 배포 후다.

import { serverEnv } from "@/lib/env";
import { tossSecretKeys } from "@/lib/toss/confirm";

const API = "https://api.tosspayments.com/v1";

const basic = (sk: string) => "Basic " + Buffer.from(sk + ":").toString("base64");

// ⚠ 정산은 **결제위젯 키 하나로만** 읽는다(2026-09-21). 정산은 상점(MID) 단위라 두 키 세트가 같은
//   상점(vallsa5fpz)을 가리키면 같은 줄이 두 번 온다 — 두 키로 읽어 더하면 수수료가 두 배가 된다.
//   자체창 결제가 이 키의 정산에 섞여 오는지는 **첫 자체창 결제가 정산된 뒤** 대조해 볼 것(미확인).
function authHeader(): string {
  return basic(serverEnv().TOSS_SECRET_KEY);
}

/** 라이브 키인지 — 테스트 키로 받은 숫자를 손익에 넣으면 안 된다. */
export function isTossLive(): boolean {
  return serverEnv().TOSS_SECRET_KEY.startsWith("live_");
}

type SettlementRow = {
  soldDate?: string;
  paidOutDate?: string;
  amount?: number;
  fee?: number;
  vat?: number;
  payOutAmount?: number;
  orderId?: string;
};

/**
 * 판매일 기준 정산 — KST 날짜별 실수수료(부가세 포함).
 * 아직 정산되지 않은 날은 아예 키가 없다(추정값을 계속 쓰라는 뜻).
 */
export async function fetchSettlementFees(from: string, to: string): Promise<Map<string, number> | null> {
  if (!isTossLive()) return null;
  try {
    const out = new Map<string, number>();
    for (let page = 1; page <= 20; page++) {
      const url = `${API}/settlements?startDate=${from}&endDate=${to}&dateType=soldDate&page=${page}&size=100`;
      const res = await fetch(url, { headers: { Authorization: authHeader() }, cache: "no-store" });
      if (!res.ok) return null;
      const rows = (await res.json()) as SettlementRow[];
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const r of rows) {
        // 취소분은 amount 가 음수로 들어오고 수수료가 0 이다 — 환불은 아래 함수가 따로 잡는다.
        if (!r.soldDate || !r.fee) continue;
        // fee 는 부가세 별도로 오는 경우가 있어 vat 를 더해 실제 차감액으로 만든다.
        const real = (r.fee ?? 0) + (r.vat ?? 0);
        out.set(r.soldDate, (out.get(r.soldDate) ?? 0) + real);
      }
      if (rows.length < 100) break;
    }
    return out;
  } catch {
    return null;
  }
}

type PaymentCancel = { cancelAmount?: number; canceledAt?: string };

/**
 * 결제 하나의 취소(환불) 내역. 없으면 null.
 * 정산보다 빠르다 — 취소하는 즉시 여기 뜬다.
 */
export async function fetchPaymentCancels(
  paymentKey: string,
): Promise<{ amount: number; at: string } | null> {
  if (!isTossLive()) return null;
  try {
    // 결제 한 건은 그 결제를 연 키 세트로만 보일 수 있다 — 자체창 키 → 결제위젯 키 순으로 두드린다.
    let res: Response | null = null;
    for (const sk of tossSecretKeys()) {
      res = await fetch(`${API}/payments/${encodeURIComponent(paymentKey)}`, {
        headers: { Authorization: basic(sk) },
        cache: "no-store",
      });
      if (res.ok) break;
    }
    if (!res?.ok) return null;
    const j = (await res.json()) as { cancels?: PaymentCancel[] | null };
    const cancels = j.cancels ?? [];
    if (!cancels.length) return null;
    const amount = cancels.reduce((a, c) => a + (c.cancelAmount ?? 0), 0);
    if (amount <= 0) return null;
    // 마지막 취소 시각을 환불일로 본다(부분취소가 여러 번이면 마지막이 확정 시점).
    const at = cancels.map((c) => c.canceledAt ?? "").filter(Boolean).sort().slice(-1)[0];
    return { amount, at: at || new Date().toISOString() };
  } catch {
    return null;
  }
}

