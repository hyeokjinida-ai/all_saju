import { NextResponse, type NextRequest } from "next/server";
import { createCtaAssignment, CTA_COOKIE, CTA_MAX_AGE, ctaExperimentEnabled, readCtaAssignment, signCtaAssignment } from "@/lib/cta-experiment";
import { GATE_COOKIE, readGateAssignment } from "@/lib/gate-experiment";
import { DETAIL_COOKIE, readDetailAssignment } from "@/lib/detail-experiment";

export async function POST(request: NextRequest) {
  let sameOrigin = false;
  try { sameOrigin = new URL(request.headers.get("origin") ?? "").host === (request.headers.get("host") ?? request.nextUrl.host); } catch { /* reject */ }
  if (!sameOrigin) return new NextResponse(null, { status: 403 });
  const headers = { "Cache-Control": "no-store" };
  if (!ctaExperimentEnabled()) return NextResponse.json({ enabled: false }, { headers });
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret) return NextResponse.json({ enabled: false }, { status: 503, headers });
  const old = readCtaAssignment(request.cookies.get(CTA_COOKIE)?.value);
  const body = await request.json().catch(() => ({}));
  const qaVariant = body?.qaVariant === "a" || body?.qaVariant === "b" ? body.qaVariant as "a" | "b" : undefined;
  const qa = !!qaVariant || body?.qa === true || process.env.VERCEL_ENV !== "production" || old?.qa === true
    || readGateAssignment(request.cookies.get(GATE_COOKIE)?.value)?.qa === true
    || readDetailAssignment(request.cookies.get(DETAIL_COOKIE)?.value)?.qa === true;
  const replace = !old || (!!qaVariant && (!old.qa || old.variant !== qaVariant));
  const assignment = replace ? { ...createCtaAssignment(), qa, ...(qaVariant ? { variant: qaVariant } : {}) } : { ...old, qa };
  const response = NextResponse.json({ enabled: true, variant: assignment.variant, qa }, { headers });
  if (replace || old?.qa !== qa) response.cookies.set(CTA_COOKIE, signCtaAssignment(assignment, secret), {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: CTA_MAX_AGE,
  });
  return response;
}
