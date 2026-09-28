// Server-only assignment. The cookie contains no customer or birth information.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const GATE_EXPERIMENT = "sangun_gate_full_jump_door_v1";
export const GATE_COOKIE = "mr_sangun_gate_v1";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30;
export type GateVariant = "a" | "b";
export type GateAssignment = { subject: string; variant: GateVariant; assignedAt: number; qa?: boolean };

export function gateExperimentEnabled() {
  return process.env.SANGUN_GATE_AB_ENABLED === "1";
}

export function createGateAssignment(id = randomUUID(), now = Date.now()): GateAssignment {
  // One random UUID bit gives a 50:50 allocation; reloads use the signed cookie.
  return { subject: id, variant: parseInt(id.slice(0, 2), 16) < 128 ? "a" : "b", assignedAt: now };
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`${GATE_EXPERIMENT}:${payload}`).digest("base64url");
}

export function signGateAssignment(assignment: GateAssignment, secret: string): string {
  if (!secret) throw new Error("Gate assignment secret unavailable");
  const payload = Buffer.from(JSON.stringify(assignment)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readGateAssignment(token?: string, secret = process.env.SUPABASE_SECRET_KEY ?? "", now = Date.now()): GateAssignment | null {
  if (!token || token.length > 600 || !secret) return null;
  try {
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return null;
    const expected = signature(payload, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    const a = JSON.parse(Buffer.from(payload, "base64url").toString()) as GateAssignment;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.subject)) return null;
    if (a.variant !== "a" && a.variant !== "b") return null;
    if (a.qa !== undefined && typeof a.qa !== "boolean") return null;
    if (!Number.isFinite(a.assignedAt) || a.assignedAt > now + 60_000 || now - a.assignedAt > GATE_MAX_AGE * 1000) return null;
    return a;
  } catch { return null; }
}

export function gateProps(a: GateAssignment) {
  return { experiment: GATE_EXPERIMENT, variant: a.variant, subject: a.subject, qa: a.qa === true };
}
