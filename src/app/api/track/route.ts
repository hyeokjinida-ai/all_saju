import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { GATE_COOKIE, gateProps, readGateAssignment } from "@/lib/gate-experiment";

// 퍼스트파티 분석 수집 — 클라이언트가 보낸 비식별 이벤트를 analytics_events 에 적재.
// 항상 204(빈 응답)로 빠르게 끝낸다(분석이 사용자 경험을 막지 않도록).
//
// 익명 방문자도 호출해야 하므로 무인증 공개 엔드포인트다. 대신 남용(스팸 적재)을
// 막기 위해 (1) 동일 출처(Origin) 검증 (2) IP당 인메모리 레이트리밋 (3) 봇 UA 필터
// (4) 필드 길이·개수 제한을 둔다.
const schema = z.object({
  event: z.string().min(1).max(60),
  path: z.string().max(300).optional(),
  referrer: z.string().max(200).optional(),
  props: z
    .record(z.union([z.string().max(120), z.number(), z.boolean()]))
    .refine((o) => Object.keys(o).length <= 12, "too many props")
    .optional(),
  visitorId: z.string().max(64).optional(),
  sessionId: z.string().max(64).optional(),
});

const BOT = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|chrome-lighthouse|monitor|curl|wget|python-requests|axios|node-fetch|facebookexternalhit|preview/i;

function safeHost(u: string | null | undefined): string {
  if (!u) return "";
  // host/x-forwarded-host 는 스킴 없는 맨호스트라 new URL() 이 예외 → 스킴을 보정해서 비교.
  try {
    return new URL(u.includes("://") ? u : `https://${u}`).host.toLowerCase();
  } catch {
    return "";
  }
}

// IP당 슬라이딩 윈도우(인메모리·인스턴스 로컬). 서버리스 다중 인스턴스에선 완벽하진
// 않지만, 단일 IP에서의 대량 적재를 막는 1차 속도 방지턱으로 충분하다.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 80;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return arr.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 204 });

  // 동일 출처만 허용(브라우저가 보내는 Origin 기준). 다른 출처의 스팸은 조용히 무시.
  const origin = request.headers.get("origin");
  if (origin) {
    const reqHost = safeHost(request.headers.get("x-forwarded-host")) || safeHost(request.headers.get("host"));
    const allowed = new Set([reqHost, safeHost(publicEnv.NEXT_PUBLIC_SITE_URL)].filter(Boolean));
    if (!allowed.has(safeHost(origin))) return new NextResponse(null, { status: 204 });
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return new NextResponse(null, { status: 204 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  try {
    // Client-supplied order links/experiment labels cannot establish attribution.
    if (body.event === "gate_order_link") return new NextResponse(null, { status: 204 });
    const props = { ...(body.props ?? {}) };
    for (const key of ["experiment", "variant", "subject", "qa"]) delete props[key];
    const assignment = readGateAssignment(request.cookies.get(GATE_COOKIE)?.value);
    if (body.event.startsWith("gate_") && !["gate_view", "gate_assignment_failed"].includes(body.event) && !assignment) {
      return new NextResponse(null, { status: 204 });
    }
    const service = createServiceClient();
    const { error } = await service.from("analytics_events").insert({
      event: body.event,
      path: body.path ?? null,
      referrer: body.referrer || null,
      props: (assignment ? { ...props, ...gateProps(assignment) } : { ...props, ...(process.env.VERCEL_ENV === "preview" ? { qa: true } : {}) }) as never,
      visitor_id: body.visitorId ?? null,
      session_id: body.sessionId ?? null,
      ua: ua.slice(0, 300),
    });
    if (error && assignment) console.error("Gate event persistence failed", { code: error.code });
  } catch {
    /* 적재 실패는 조용히 무시 */
  }

  return new NextResponse(null, { status: 204 });
}
