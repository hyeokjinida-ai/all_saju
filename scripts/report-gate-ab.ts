// Read-only, aggregate output only. No customer names, email, birth data or credentials are printed.
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { GATE_EXPERIMENT } from "../src/lib/gate-experiment";
import { summarizeGate, type GateEvent, type GateOrder } from "../src/lib/gate-report";
try { loadEnvFile(".env.local"); } catch { /* deployment env may already be set */ }
async function main() {
const start = process.argv[2];
if (!start || !Number.isFinite(Date.parse(start))) throw new Error("Usage: tsx scripts/report-gate-ab.ts <actual-start-ISO> [as-of-ISO]");
const asOf = process.argv[3] ? Date.parse(process.argv[3]) : Date.now();
if (!Number.isFinite(asOf) || asOf < Date.parse(start)) throw new Error("Invalid as-of time");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const events: GateEvent[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("analytics_events").select("event,created_at,props,id")
    .eq("props->>experiment", GATE_EXPERIMENT).gte("created_at", start).lte("created_at", new Date(asOf).toISOString())
    .order("id").range(from, from + 999);
  if (error) throw new Error(`Experiment read failed: ${error.code}`);
  events.push(...data as GateEvent[]);
  if (data.length < 1000) break;
}
const ids = [...new Set(events.filter(e => e.event === "gate_order_link").map(e => String(e.props.orderId)))];
const orders: GateOrder[] = [];
for (let i = 0; i < ids.length; i += 100) {
  const { data, error } = await db.from("orders").select("order_id,status,paid_at,amount,refunded_amount,exclude_from_pnl").in("order_id", ids.slice(i, i + 100));
  if (error) throw new Error(`Paid order read failed: ${error.code}`);
  orders.push(...data as GateOrder[]);
}
console.log(JSON.stringify({ experiment: GATE_EXPERIMENT, eventRows: events.length, linkedOrderIds: ids.length, missingOrders: ids.length - orders.length,
  mature7DayCohorts: summarizeGate(events, orders, asOf), provisional: summarizeGate(events, orders, asOf, false),
  notes: ["paid_at 기준이며 Meta 기여일과 다릅니다.", "환불 차감 후 금액이며 PG/생성비/광고비를 빼기 전입니다.", "7일 미만 코호트는 잠정치입니다. 재방문·지연 결제를 기다려야 합니다.", "쿠키 삭제·다른 기기 구매는 연결되지 않을 수 있습니다. 광고비를 단순 반으로 나눠 CPA를 만들지 않습니다.", "주문 연결은 있으나 실제 노출 기록이 없는 주문은 어느 안의 구매에도 더하지 않습니다."] }, null, 2));
}
void main().catch(() => { console.error("Gate report failed; do not record failed access as zero performance."); process.exitCode = 1; });
