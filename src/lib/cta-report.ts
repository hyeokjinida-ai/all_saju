import { CTA_EXPERIMENT } from "./cta-experiment";
import { summarizeGate, type GateEvent, type GateOrder } from "./gate-report";
// Reuse the seven-day cohort calculation while keeping historical video cohorts separate.
export function summarizeCta(events: GateEvent[], orders: GateOrder[], asOf: number, matureOnly = true) {
  return summarizeGate(events.filter(e => e.props.cta_experiment === CTA_EXPERIMENT && e.event.startsWith("cta_"))
    .map(e => ({ ...e, event: e.event.replace(/^cta_/, "gate_"), props: { ...e.props, subject: e.props.cta_subject, variant: e.props.cta_variant } })), orders, asOf, matureOnly);
}
