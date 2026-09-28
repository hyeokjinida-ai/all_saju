import { NextResponse, type NextRequest } from "next/server";
import { createGateAssignment, GATE_COOKIE, GATE_MAX_AGE, gateExperimentEnabled, readGateAssignment, signGateAssignment } from "@/lib/gate-experiment";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try { sameOrigin = !!origin && new URL(origin).host === (request.headers.get("host") ?? request.nextUrl.host); } catch { /* reject malformed origins */ }
  if (!sameOrigin) return new NextResponse(null, { status: 403 });
  if (!gateExperimentEnabled()) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret) return NextResponse.json({ enabled: false }, { status: 503 });
  const old = readGateAssignment(request.cookies.get(GATE_COOKIE)?.value);
  const body = await request.json().catch(() => ({}));
  const qaVariant = body?.qaVariant === "a" || body?.qaVariant === "b" ? body.qaVariant as "a" | "b" : undefined;
  const qa = !!qaVariant || process.env.VERCEL_ENV === "preview" || old?.qa === true;
  // Explicit QA links are visibly labelled and always excluded, including their later orders.
  const replace = !old || (!!qaVariant && (!old.qa || old.variant !== qaVariant));
  const assignment = replace ? { ...createGateAssignment(), qa, ...(qaVariant ? { variant: qaVariant } : {}) } : { ...old, qa };
  const response = NextResponse.json({ enabled: true, variant: assignment.variant, qa }, { headers: { "Cache-Control": "no-store" } });
  if (replace || old?.qa !== qa) response.cookies.set(GATE_COOKIE, signGateAssignment(assignment, secret), {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: GATE_MAX_AGE,
  });
  return response;
}
