// Pure conversion rules shared with tests. No credentials or customer input here.
export const PURCHASE_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PurchaseReceipt = {
  eventId: string;
  orderId: string;
  value: number;
  currency: "KRW";
  slug: string;
  paidAt: string;
};

export function isRecentPurchase(paidAt: string | null, now = Date.now()): boolean {
  const time = Date.parse(paidAt ?? "");
  return Number.isFinite(time) && time <= now + 60_000 && now - time < PURCHASE_RETRY_WINDOW_MS;
}

export function metaCookie(value: unknown, kind: "fbp" | "fbc"): string | undefined {
  if (typeof value !== "string" || value.length > 500) return undefined;
  const pattern = kind === "fbp" ? /^fb\.\d+\.\d{10,13}\.\d+$/ : /^fb\.\d+\.\d{10,13}\.[A-Za-z0-9_-]+$/;
  return pattern.test(value) ? value : undefined;
}

export function nextRetryDelay(attempt: number): number {
  return Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.min(Math.max(attempt - 1, 0), 9));
}

export function metaAccepted(httpOk: boolean, body: unknown): boolean {
  return httpOk && !!body && typeof body === "object" &&
    (body as Record<string, unknown>).events_received === 1 && !(body as Record<string, unknown>).error;
}

export function attributionCookie(raw?: string): { visitor?: string; session?: string; utm?: string; qa?: boolean } {
  if (!raw || raw.length > 1500) return {};
  try {
    const value = JSON.parse(decodeURIComponent(raw));
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return {
      ...(typeof value.v === "string" && uuid.test(value.v) ? { visitor: value.v } : {}),
      ...(typeof value.s === "string" && uuid.test(value.s) ? { session: value.s } : {}),
      ...(typeof value.u === "string" ? { utm: value.u.slice(0, 60) } : {}),
      ...(value.qa === true ? { qa: true } : {}),
    };
  } catch { return {}; }
}
