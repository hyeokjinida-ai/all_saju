import { MIN_CHARGE } from "@/lib/pricing";

type DiagnosticParams = Record<string, string | number | boolean | undefined>;
type DiagnosticTrack = (event: string, params: DiagnosticParams) => void;
type OrderCreationResult =
  | { ok: true; orderId: string; amount: number }
  | { ok: false; code?: string; error?: string };

export function parseOrderServerTiming(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const allowed = new Set(["lookup", "pending", "order", "input", "gate", "context", "total"]);
  const values = new Map<string, number>();
  for (const entry of header.split(",")) {
    const match = entry.trim().match(/^([a-z]+);\s*dur=(\d+(?:\.\d+)?)(?:;.*)?$/);
    if (!match || !allowed.has(match[1])) continue;
    const duration = Number(match[2]);
    if (Number.isFinite(duration) && duration <= 300000) values.set(match[1], Math.round(duration));
  }
  return values.size ? [...values].map(([name, duration]) => `${name}=${duration}`).join(";") : undefined;
}

export async function fetchOrderWithDiagnostics(options: {
  request: () => Promise<Response>;
  track: DiagnosticTrack;
  slug: string;
  displayedAmount: number;
  member: boolean;
  now?: () => number;
}): Promise<OrderCreationResult> {
  const now = options.now ?? (() => performance.now());
  const startedAt = now();
  let attemptId: string | undefined;
  let serverTiming: string | undefined;
  try { attemptId = crypto.randomUUID(); } catch {}
  const context: DiagnosticParams = {
    slug: options.slug,
    displayedAmount: options.displayedAmount,
    member: options.member,
    attemptId,
  };
  const emit = (event: string, params: DiagnosticParams) => {
    try { options.track(event, params); } catch {}
  };
  const finish = (outcome: string, params: DiagnosticParams = {}) => {
    emit("order_create_result", {
      ...context,
      outcome,
      duration_ms: Math.max(0, Math.round(now() - startedAt)),
      ...(serverTiming ? { server_timing: serverTiming } : {}),
      ...params,
    });
  };

  emit("order_create_attempt", context);
  let response: Response;
  try {
    response = await options.request();
    serverTiming = parseOrderServerTiming(response.headers?.get("Server-Timing"));
  } catch (error) {
    finish("network_error");
    throw error;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    finish(response.ok ? "response_error" : "http_error", {
      http_status: response.status,
      reason: "invalid_json",
    });
    throw error;
  }
  const fields = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  if (!response.ok) {
    finish("http_error", {
      http_status: response.status,
      reason: fields.code === "PRICE_CHANGED" ? "price_changed" : "http_status",
    });
    return {
      ok: false,
      code: typeof fields.code === "string" ? fields.code : undefined,
      error: typeof fields.error === "string" ? fields.error : undefined,
    };
  }
  if (typeof fields.orderId !== "string" || !/^ord_[A-Za-z0-9_-]{1,80}$/.test(fields.orderId)
    || typeof fields.amount !== "number" || !Number.isSafeInteger(fields.amount) || fields.amount < MIN_CHARGE) {
    finish("response_error", { http_status: response.status, reason: "invalid_success" });
    throw new Error("주문 생성 실패");
  }
  finish("success", {
    http_status: response.status,
    orderId: fields.orderId,
    value: fields.amount,
    currency: "KRW",
  });
  return { ok: true, orderId: fields.orderId, amount: fields.amount };
}
