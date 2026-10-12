// Server-only assignment. The cookie contains no customer or birth information.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const CTA_EXPERIMENT = "sangun_cta_copy_20261012_v1";
export const CTA_COOKIE = "mr_sangun_cta_copy_v1";
export const CTA_MAX_AGE = 60 * 60 * 24 * 30;
export type CtaVariant = "a" | "b";
export type CtaAssignment = { subject: string; variant: CtaVariant; assignedAt: number; qa?: boolean };

export function ctaExperimentEnabled() {
  return process.env.SANGUN_CTA_AB_ENABLED !== "0";
}

export function createCtaAssignment(id = randomUUID(), now = Date.now()): CtaAssignment {
  // One random UUID bit gives a 50:50 allocation; reloads use the signed cookie.
  return { subject: id, variant: parseInt(id.slice(0, 2), 16) < 128 ? "a" : "b", assignedAt: now };
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`${CTA_EXPERIMENT}:${payload}`).digest("base64url");
}

export function signCtaAssignment(assignment: CtaAssignment, secret: string): string {
  if (!secret) throw new Error("Cta assignment secret unavailable");
  const payload = Buffer.from(JSON.stringify(assignment)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readCtaAssignment(token?: string, secret = process.env.SUPABASE_SECRET_KEY ?? "", now = Date.now()): CtaAssignment | null {
  if (!token || token.length > 600 || !secret) return null;
  try {
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return null;
    const expected = signature(payload, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    const a = JSON.parse(Buffer.from(payload, "base64url").toString()) as CtaAssignment;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.subject)) return null;
    if (a.variant !== "a" && a.variant !== "b") return null;
    if (a.qa !== undefined && typeof a.qa !== "boolean") return null;
    if (!Number.isFinite(a.assignedAt) || a.assignedAt > now + 60_000 || now - a.assignedAt > CTA_MAX_AGE * 1000) return null;
    return a;
  } catch { return null; }
}

export function ctaProps(a: CtaAssignment) {
  return { cta_experiment: CTA_EXPERIMENT, cta_variant: a.variant, cta_subject: a.subject };
}
