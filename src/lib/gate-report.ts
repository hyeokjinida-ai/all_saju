export type GateEvent = { event: string; created_at: string; props: Record<string, unknown> };
export type GateOrder = { order_id: string; status: string; paid_at: string | null; amount: number; refunded_amount: number; exclude_from_pnl: boolean };
const WINDOW = 7 * 24 * 60 * 60 * 1000;

// Descriptive cohort report, not a significance test or an automatic winner selector.
export function summarizeGate(events: GateEvent[], orders: GateOrder[], asOf: number, matureOnly = true) {
  events = events.filter(e => e.props.qa !== true);
  const exposures = new Map<string, { variant: "a" | "b"; time: number }>();
  const conflicts = new Set<string>();
  for (const e of events.filter(e => e.event === "gate_exposure").sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const s = String(e.props.subject ?? "");
    const v = e.props.variant;
    const time = Date.parse(e.created_at);
    if (!s || (v !== "a" && v !== "b") || !Number.isFinite(time) || time > asOf) continue;
    const old = exposures.get(s);
    if (old && old.variant !== v) conflicts.add(s);
    if (!old) exposures.set(s, { variant: v, time });
  }
  const cohort = new Map([...exposures].filter(([, e]) => !matureOnly || e.time + WINDOW <= asOf));
  const variants = { a: { exposed: 0, clicked: new Set<string>(), buyers: new Set<string>(), orders: new Set<string>(), mediaIssues: new Set<string>(), netPaid: 0 }, b: { exposed: 0, clicked: new Set<string>(), buyers: new Set<string>(), orders: new Set<string>(), mediaIssues: new Set<string>(), netPaid: 0 } };
  for (const e of cohort.values()) variants[e.variant].exposed++;
  const orderLinks = new Map<string, Set<string>>();
  for (const e of events) {
    const subject = String(e.props.subject ?? "");
    const time = Date.parse(e.created_at);
    const exposure = cohort.get(subject);
    if (e.event === "gate_order_link" && e.props.source === "server" && typeof e.props.orderId === "string" && time <= asOf) {
      const links = orderLinks.get(e.props.orderId) ?? new Set<string>();
      links.add(subject); orderLinks.set(e.props.orderId, links);
    }
    if (!exposure || time < exposure.time || time > Math.min(asOf, exposure.time + WINDOW)) continue;
    const row = variants[exposure.variant];
    if (e.event === "gate_click") row.clicked.add(subject);
    if (["gate_media_error", "gate_media_blocked", "gate_media_slow", "gate_idle_error", "gate_idle_blocked"].includes(e.event)) row.mediaIssues.add(subject);
  }
  let conflictingOrders = 0, missingExposureLinks = 0, linkedUnpaid = 0;
  const seenOrders = new Set<string>();
  for (const order of orders) {
    if (seenOrders.has(order.order_id)) continue;
    seenOrders.add(order.order_id);
    const links = orderLinks.get(order.order_id);
    if (!links) continue;
    if (links.size !== 1) { conflictingOrders++; continue; }
    const subject = [...links][0];
    const exposure = cohort.get(subject);
    if (!exposure) { missingExposureLinks++; continue; }
    if (order.exclude_from_pnl) continue;
    if (order.status !== "paid" || !order.paid_at) { linkedUnpaid++; continue; }
    const paid = Date.parse(order.paid_at);
    if (!Number.isFinite(paid) || paid < exposure.time || paid > Math.min(asOf, exposure.time + WINDOW)) continue;
    const row = variants[exposure.variant];
    row.buyers.add(subject); row.orders.add(order.order_id);
    row.netPaid += Math.max(0, order.amount - (order.refunded_amount ?? 0));
  }
  return {
    asOf: new Date(asOf).toISOString(), windowDays: 7, matureOnly,
    warning: conflicts.size || conflictingOrders ? "배정/주문 충돌이 있어 승패 판단 금지" : "관측 집계입니다. 클릭률만으로 승자를 정하지 않습니다.",
    allExposed: exposures.size, immature: exposures.size - cohort.size,
    conflicts: { subjects: conflicts.size, orders: conflictingOrders, missingExposureLinks, linkedUnpaid },
    variants: Object.fromEntries(Object.entries(variants).map(([v, r]) => [v, {
      exposed: r.exposed, clicked: r.clicked.size, paidBuyers: r.buyers.size, paidOrders: r.orders.size,
      gatePassRate: r.exposed ? r.clicked.size / r.exposed : null,
      paidBuyerRate: r.exposed ? r.buyers.size / r.exposed : null,
      mediaIssueVisitors: r.mediaIssues.size, netPaid: r.netPaid,
      netPaidPerVisitor: r.exposed ? r.netPaid / r.exposed : null,
    }])),
  };
}
