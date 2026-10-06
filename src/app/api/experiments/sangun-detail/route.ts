import { NextResponse, type NextRequest } from "next/server";
import { createDetailAssignment, DETAIL_COOKIE, DETAIL_MAX_AGE, detailExperimentEnabled, readDetailAssignment, signDetailAssignment } from "@/lib/detail-experiment";
import { GATE_COOKIE, readGateAssignment } from "@/lib/gate-experiment";

export async function POST(request: NextRequest) {
  let sameOrigin = false;
  try { sameOrigin = new URL(request.headers.get("origin") ?? "").host === (request.headers.get("host") ?? request.nextUrl.host); } catch { /* reject */ }
  if (!sameOrigin) return new NextResponse(null, { status: 403 });
  const headers = { "Cache-Control": "no-store" };
  if (!detailExperimentEnabled()) return NextResponse.json({ enabled: false }, { headers });
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret) return NextResponse.json({ enabled: false }, { status: 503, headers });
  const old = readDetailAssignment(request.cookies.get(DETAIL_COOKIE)?.value);
  const gate = readGateAssignment(request.cookies.get(GATE_COOKIE)?.value);
  const body = await request.json().catch(() => ({}));
  const qaVariant = body?.qaVariant === "old" || body?.qaVariant === "new" ? body.qaVariant as "old" | "new" : undefined;
  const qa = !!qaVariant || body?.qa === true || process.env.VERCEL_ENV !== "production" || old?.qa === true || gate?.qa === true;
  const replace = !old || (!!qaVariant && (!old.qa || old.variant !== qaVariant));
  const assignment = replace ? { ...createDetailAssignment(), qa, ...(qaVariant ? { variant: qaVariant } : {}) } : { ...old, qa };
  const response = NextResponse.json({ enabled: true, variant: assignment.variant, qa }, { headers });
  if (replace || old?.qa !== qa) response.cookies.set(DETAIL_COOKIE, signDetailAssignment(assignment, secret), {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: DETAIL_MAX_AGE,
  });
  return response;
}
