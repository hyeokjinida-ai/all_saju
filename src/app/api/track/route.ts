import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

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
  try {
    return new URL(u).host;
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
    const allowed = new Set([safeHost(request.headers.get("host")), safeHost(publicEnv.NEXT_PUBLIC_SITE_URL)]);
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
    const service = createServiceClient();
    await service.from("analytics_events").insert({
      event: body.event,
      path: body.path ?? null,
      referrer: body.referrer || null,
      props: (body.props ?? {}) as never,
      visitor_id: body.visitorId ?? null,
      session_id: body.sessionId ?? null,
      ua: ua.slice(0, 300),
    });
  } catch {
    /* 적재 실패는 조용히 무시 */
  }

  return new NextResponse(null, { status: 204 });
}
