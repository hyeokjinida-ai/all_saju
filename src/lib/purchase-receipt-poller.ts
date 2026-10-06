import type { PurchaseReceipt } from "./purchase-event";

// Receipt delivery has its own lifetime. Finishing result generation must not
// cancel retries when the receipt or Pixel was temporarily unavailable.
export function startPurchaseReceiptPolling(options: {
  read: () => Promise<PurchaseReceipt | null | undefined>;
  send: (receipt: PurchaseReceipt) => boolean;
  onTimeout?: (hasReceipt: boolean) => void;
  intervalMs?: number;
  maxMs?: number;
}) {
  let stopped = false;
  let delivered = false;
  let polling = false;
  let expired = false;
  let receipt: PurchaseReceipt | null = null;
  const clearTimers = () => { clearInterval(interval); clearTimeout(deadline); };
  const accept = (value: PurchaseReceipt | null | undefined): boolean => {
    if (stopped) return false;
    if (delivered) return true;
    if (!value) return false;
    receipt = value;
    try { if (!options.send(value)) return false; }
    catch { return false; }
    delivered = true;
    clearTimers();
    return true;
  };
  const tick = async () => {
    if (stopped || delivered || polling || expired) return;
    polling = true;
    try {
      // A valid receipt is immutable. Retry the same event ID without more reads.
      const value = receipt ?? await options.read();
      if (!stopped && !expired) accept(value);
    } catch { /* Keep payment/result delivery independent of analytics. */ }
    finally { polling = false; }
  };
  const interval = setInterval(() => { void tick(); }, options.intervalMs ?? 5000);
  const deadline = setTimeout(() => {
    expired = true;
    clearTimers();
    if (!stopped && !delivered) options.onTimeout?.(receipt !== null);
  }, options.maxMs ?? 120_000);
  return {
    // A slow confirm response may still provide its verified receipt after the
    // polling window. This does not restart polling or replay historical orders.
    accept,
    stop() { stopped = true; clearTimers(); },
  };
}
