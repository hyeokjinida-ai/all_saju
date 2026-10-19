const CHECKOUT_CODES = [
  "USER_CANCEL", "PAY_PROCESS_CANCELED", "PAY_PROCESS_ABORTED", "INVALID_REQUEST",
  "INVALID_API_KEY", "REJECT_CARD_COMPANY", "REJECT_CARD_PAYMENT",
  "NOT_SUPPORTED_CARD_TYPE", "NOT_AVAILABLE_PAYMENT", "PAYMENT_TIMEOUT",
] as const;

export type CheckoutFailureCode = typeof CHECKOUT_CODES[number] | "unknown";
export type ContactSaveOutcome = "saved" | "http_error" | "network_error" | "timeout";
export type CheckoutMode = "direct" | "widget";
export const CONTACT_SAVE_TIMEOUT_MS = 1500;

export function safeCheckoutTrack(
  emit: (event: string, props: Record<string, string | number | boolean | undefined>) => void,
  event: string,
  props: Record<string, string | number | boolean | undefined>,
): void {
  try {
    emit(event, props);
  } catch {
    return;
  }
}

export function checkoutFailureCode(error: unknown): CheckoutFailureCode {
  const candidate = typeof error === "string" ? error
    : error && typeof error === "object" && "code" in error ? error.code : undefined;
  return typeof candidate === "string" && CHECKOUT_CODES.includes(candidate as typeof CHECKOUT_CODES[number])
    ? candidate as CheckoutFailureCode : "unknown";
}

export function isCheckoutCancellation(error: unknown): boolean {
  const code = checkoutFailureCode(error);
  return code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED";
}

export function checkoutRetryPath(orderId: unknown): string | null {
  return typeof orderId === "string" && orderId.length === 24 && /^ord_[A-Za-z0-9_-]{20}$/.test(orderId)
    ? `/checkout/${orderId}` : null;
}

export function checkoutMode(value: unknown): CheckoutMode | undefined {
  return value === "direct" || value === "widget" ? value : undefined;
}

export function checkoutFailUrl(origin: string, orderId: string, mode?: CheckoutMode): string {
  const target = new URL("/checkout/fail", origin);
  if (checkoutRetryPath(orderId)) target.searchParams.set("orderId", orderId);
  if (checkoutMode(mode)) target.searchParams.set("checkout_mode", mode!);
  return target.toString();
}

export function checkoutFailureMessage(error: unknown): string {
  return isCheckoutCancellation(error)
    ? "결제가 취소되었습니다. 다시 진행하려면 결제 페이지로 돌아가 주세요."
    : "결제를 완료하지 못했습니다. 결제 페이지에서 다시 시도해 주세요.";
}

export async function saveOptionalCheckoutContact(
  orderId: string,
  contact: { phone: string | null; marketingOptIn: boolean },
  timeoutMs = CONTACT_SAVE_TIMEOUT_MS,
): Promise<ContactSaveOutcome> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<ContactSaveOutcome>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve("timeout");
      }, timeoutMs);
    });
    const requested = fetch(`/api/orders/${encodeURIComponent(orderId)}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
      signal: controller.signal,
    }).then<ContactSaveOutcome, ContactSaveOutcome>(
      (response) => response.ok ? "saved" : "http_error",
      () => controller.signal.aborted ? "timeout" : "network_error",
    );
    return await Promise.race([requested, timedOut]);
  } catch {
    return "network_error";
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
