// Server-only. Separate random subject/coin from the existing gate experiment.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const DETAIL_EXPERIMENT = "sangun_detail_old_new_v1";
export const DETAIL_COOKIE = "mr_sangun_detail_v1";
export const DETAIL_MAX_AGE = 60 * 60 * 24 * 90;
export type DetailVariant = "old" | "new";
export type DetailAssignment = { subject: string; variant: DetailVariant; assignedAt: number; qa: boolean };

// This release starts the user-approved test. Emergency stop: set to 0 and redeploy.
export const detailExperimentEnabled = () => process.env.SANGUN_DETAIL_AB_ENABLED !== "0";
export function createDetailAssignment(id = randomUUID(), now = Date.now()): DetailAssignment {
  return { subject: id, variant: parseInt(id.slice(0, 2), 16) < 128 ? "old" : "new", assignedAt: now, qa: false };
}
const signature = (payload: string, secret: string) => createHmac("sha256", secret)
  .update(`${DETAIL_EXPERIMENT}:${payload}`).digest("base64url");
export function signDetailAssignment(a: DetailAssignment, secret: string) {
  if (!secret) throw new Error("Detail assignment secret unavailable");
  const payload = Buffer.from(JSON.stringify(a)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function readDetailAssignment(token?: string, secret = process.env.SUPABASE_SECRET_KEY ?? "", now = Date.now()): DetailAssignment | null {
  if (!token || token.length > 600 || !secret) return null;
  try {
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return null;
    const expected = signature(payload, secret);
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    const a = JSON.parse(Buffer.from(payload, "base64url").toString()) as DetailAssignment;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.subject)) return null;
    if (!["old", "new"].includes(a.variant) || typeof a.qa !== "boolean") return null;
    if (!Number.isFinite(a.assignedAt) || a.assignedAt > now + 60_000 || now - a.assignedAt > DETAIL_MAX_AGE * 1000) return null;
    return a;
  } catch { return null; }
}
export const detailProps = (a: DetailAssignment) => ({
  detail_experiment: DETAIL_EXPERIMENT, detail_variant: a.variant, detail_subject: a.subject,
});
