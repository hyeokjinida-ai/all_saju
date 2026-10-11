import assert from "node:assert/strict";
import { createGateAssignment, GATE_MAX_AGE, readGateAssignment, signGateAssignment } from "../src/lib/gate-experiment";
import { summarizeGate, type GateEvent, type GateOrder } from "../src/lib/gate-report";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/experiments/sangun-gate/route";

const now = Date.parse("2026-09-28T12:00:00Z");
const secret = "test-only-key-not-a-production-secret";
const assignment = createGateAssignment("01000000-0000-4000-8000-000000000000", now);
const token = signGateAssignment(assignment, secret);
assert.deepEqual(readGateAssignment(token, secret, now + 1000), assignment);
assert.equal(readGateAssignment(token.replace(/^./, "X"), secret, now), null);
assert.equal(readGateAssignment(token, "wrong-key", now), null);
assert.equal(readGateAssignment(token, secret, now + (GATE_MAX_AGE + 1) * 1000), null);
assert.equal(readGateAssignment(token, secret, now - 120_000), null);
const counts = { a: 0, b: 0 };
for (let i = 0; i < 256; i++) counts[createGateAssignment(`${i.toString(16).padStart(2, "0")}000000-0000-4000-8000-000000000000`, now).variant]++;
assert.deepEqual(counts, { a: 128, b: 128 });
const event = (event: string, subject: string, variant: string, extra = {}) => ({ event, created_at: new Date(now).toISOString(), props: { subject, variant, ...extra } });
const events: GateEvent[] = [event("gate_exposure", "one", "a"), event("gate_exposure", "one", "a"), event("gate_exposure", "two", "b"), event("gate_exposure", "three", "b"), event("gate_click", "one", "a"), event("gate_click", "one", "a"), event("gate_media_error", "two", "b"), event("gate_order_link", "one", "a", { orderId: "paid", source: "server" }), event("gate_order_link", "one", "a", { orderId: "paid", source: "server" }), event("gate_order_link", "two", "b", { orderId: "pending", source: "server" })];
const orders: GateOrder[] = [{ order_id: "paid", status: "paid", paid_at: new Date(now + 1000).toISOString(), amount: 19900, refunded_amount: 1900, exclude_from_pnl: false }, { order_id: "pending", status: "pending", paid_at: null, amount: 19900, refunded_amount: 0, exclude_from_pnl: false }];
const report = summarizeGate(events, [...orders, orders[0]], now + 8 * 86400000);
assert.equal(report.variants.a.exposed, 1);
assert.equal(report.variants.a.clicked, 1);
assert.equal(report.variants.a.paidOrders, 1);
assert.equal(report.variants.a.netPaid, 18000);
assert.equal(report.variants.b.exposed, 2); // A media failure remains in the denominator.
assert.equal(report.variants.b.paidBuyers, 0);
assert.equal(report.variants.b.mediaIssueVisitors, 1);
assert.equal(summarizeGate(events, orders, now + 2 * 86400000).variants.a.exposed, 0);
assert.equal(summarizeGate(events, [{ ...orders[0], exclude_from_pnl: true }], now + 8 * 86400000).variants.a.paidBuyers, 0);
assert.equal(summarizeGate(events, [{ ...orders[0], paid_at: new Date(now + 9 * 86400000).toISOString() }], now + 10 * 86400000).variants.a.paidBuyers, 0);
const conflict = summarizeGate([...events, event("gate_order_link", "two", "b", { orderId: "paid", source: "server" })], orders, now + 8 * 86400000);
assert.equal(conflict.conflicts.orders, 1);
assert.equal(conflict.variants.a.paidBuyers, 0);
assert.equal(summarizeGate(events.map(e => ({ ...e, props: { ...e.props, qa: true } })), orders, now + 8 * 86400000).allExposed, 0);
console.log("PASS: signed/sticky 50:50 assignment; tamper/expiry; paid-order deduplication; pending/test exclusions; refunds; media failures; conversion window; attribution conflicts");
async function testRoute() {
  process.env.SUPABASE_SECRET_KEY = secret;
  const request = (origin: string, cookie?: string) => new NextRequest("http://localhost:3065/api/experiments/sangun-gate", { method: "POST", headers: { origin, host: "127.0.0.1:3065", ...(cookie ? { cookie } : {}) } });
  assert.equal((await POST(request("https://external.example"))).status, 403);
  assert.equal((await POST(request("not a URL"))).status, 403);
  // A stale deployment flag must not restart a completed experiment.
  for (const flag of ["1", "0", undefined]) {
    if (flag === undefined) delete process.env.SANGUN_GATE_AB_ENABLED;
    else process.env.SANGUN_GATE_AB_ENABLED = flag;
    const response = await POST(request("http://127.0.0.1:3065"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { enabled: false });
    assert.equal(response.headers.get("set-cookie"), null);
  }
  // Existing A/B assignments remain readable and are not overwritten or expired.
  for (const variant of ["a", "b"] as const) {
    const old = { ...createGateAssignment(undefined, Date.now()), variant };
    const oldToken = signGateAssignment(old, secret);
    const response = await POST(request("http://127.0.0.1:3065", `mr_sangun_gate_v1=${oldToken}`));
    assert.deepEqual(await response.json(), { enabled: false });
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(readGateAssignment(oldToken, secret), old);
  }
  const qaRequest = new NextRequest("http://localhost:3065/api/experiments/sangun-gate", { method: "POST", headers: { origin: "http://127.0.0.1:3065", host: "127.0.0.1:3065", "Content-Type": "application/json" }, body: JSON.stringify({ qaVariant: "a" }) });
  const qaResponse = await POST(qaRequest);
  assert.deepEqual(await qaResponse.json(), { enabled: false });
  assert.equal(qaResponse.headers.get("set-cookie"), null);
  console.log("PASS: closed experiment stays disabled; no new or replacement cookies; delayed attribution preserved; cross-origin rejection");
}
void testRoute().catch(error => { console.error(error); process.exitCode = 1; });
