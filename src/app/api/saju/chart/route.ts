import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSajuApiConfigured, fetchSajuAnalysis, ganjiToMyeongsik, type BirthInfo, type SajuAnalysisResponse } from "@/lib/saju/saju-api";
import { buildResultView, type ResultView } from "@/lib/saju/result-view";
import { publicEnv } from "@/lib/env";

// 무료 분석(⑥)용 — 명식 + 오행 + 영역별 점수까지(LLM 없이). 결제 후 상세 풀이는 별도.
// 점수는 십성에서 파생되므로 만세력 16종 전체를 한 번에 받는다(호출 수는 1콜로 동일 — 한도 보호).
// 같은 생년월일·시각·성별·달력은 분석을 인메모리 캐시해 재호출 안 함(6000회 한도).
// 대운/조언/상세는 무료에서 잠그므로 showDaeun:false 로 만든다.

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().nullable().optional(),
  timeUnknown: z.boolean().optional(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
  nickname: z.string().max(30).optional(),
  concerns: z.array(z.string().max(500)).max(20).optional(),
});

// 만세력 분석은 생년월일 기준으로만 캐시(닉네임/고민은 분석 호출과 무관 → 뷰만 매번 재조립)
const analysisCache = new Map<string, SajuAnalysisResponse>();

function toBirthInfo(b: z.infer<typeof schema>): BirthInfo {
  const [y, m, d] = b.birthDate.split("-");
  const hasTime = !b.timeUnknown && !!b.birthTime;
  const [hh, mm] = hasTime ? (b.birthTime as string).split(":") : [undefined, undefined];
  return {
    birthYear: y,
    birthMonth: String(parseInt(m, 10)),
    birthDay: String(parseInt(d, 10)),
    ...(hasTime ? { birthHour: String(parseInt(hh!, 10)), birthMinute: String(parseInt(mm!, 10)) } : {}),
    calendarType: b.calendar === "lunar" ? "음력" : "양력",
    gender: b.gender,
  };
}

// 어뷰즈 1차 방지턱(인메모리·IP) — 무료 분석이 유료 만세력 콜을 무한 소진 못 하게.
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|monitor|curl|wget|python-requests|axios|node-fetch|preview/i;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10; // IP당 분당 10회(정상 사용자 1~2회면 충분)
const hits = new Map<string, number[]>();
function safeHost(u: string | null | undefined) {
  if (!u) return "";
  try { return new URL(u).host; } catch { return ""; }
}
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return arr.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  // 동일 출처 + 봇 필터 + IP 레이트리밋
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set([safeHost(request.headers.get("host")), safeHost(publicEnv.NEXT_PUBLIC_SITE_URL)]);
    if (!allowed.has(safeHost(origin))) return NextResponse.json({ ok: false, reason: "forbidden" });
  }
  if (BOT.test(request.headers.get("user-agent") ?? "")) return NextResponse.json({ ok: false, reason: "bot" });
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, reason: "rate_limited" });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_input" });
  }

  if (!isSajuApiConfigured()) return NextResponse.json({ ok: false, reason: "unconfigured" });

  const birthInfo = toBirthInfo(body);
  const birthKey = JSON.stringify(birthInfo);

  try {
    let analysis = analysisCache.get(birthKey);
    if (!analysis) {
      analysis = await fetchSajuAnalysis(birthInfo, [], { source: "demo" }); // 무료 분석 — source=demo(통계/한도 분리)
      if (analysisCache.size > 2000) analysisCache.clear();
      analysisCache.set(birthKey, analysis);
    }
    const myeongsik = ganjiToMyeongsik(analysis);
    if (!myeongsik) return NextResponse.json({ ok: false, reason: "no_ganji" });

    const view: ResultView = buildResultView({
      myeongsik,
      rawAnalysis: analysis,
      name: body.nickname ?? null,
      birthDate: body.birthDate,
      birthTime: body.timeUnknown ? null : body.birthTime ?? null,
      timeUnknown: !!body.timeUnknown,
      gender: body.gender,
      calendar: body.calendar,
      concerns: body.concerns ?? [],
      showScores: true,
      showDaeun: false, // 무료에선 대운 잠금
    });
    return NextResponse.json({ ok: true, view });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "api_error", detail: e instanceof Error ? e.message : String(e) });
  }
}
