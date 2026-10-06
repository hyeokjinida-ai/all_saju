"use client";

export type DetailChoice = { variant: "old" | "new"; qa: boolean };
let pending: Promise<DetailChoice | null> | undefined;
export function assignDetail(): Promise<DetailChoice | null> {
  if (pending) return pending;
  const query = new URLSearchParams(location.search);
  // Demo/forced links are always QA, including subsequent visits in this browser.
  return pending = fetch("/api/experiments/sangun-detail", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qaVariant: query.get("detail_qa"), qa: query.has("demo") || query.has("gate_qa") }),
    signal: AbortSignal.timeout(4000),
  }).then(async response => {
    const data = await response.json();
    if (!response.ok || !data.enabled || !["old", "new"].includes(data.variant)) return null;
    try { sessionStorage.setItem("mr_detail_qa", data.qa ? "1" : "0"); } catch { /* server cookie is authoritative */ }
    return { variant: data.variant, qa: data.qa === true } as DetailChoice;
  }).catch(() => null);
}
