import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSajuApiConfigured, fetchSajuAnalysis, ganjiToMyeongsik, type BirthInfo, type SajuAnalysisResponse } from "@/lib/saju/saju-api";
import { buildResultView, type ResultView } from "@/lib/saju/result-view";
import { buildTeaser } from "@/lib/saju/teaser";
import { buildWebtoonTokens } from "@/lib/saju/webtoon-tokens";
import { parseProfileTags } from "@/lib/saju/profile-tags";
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
  // 결제 전 티저를 함께 받을 때만 — 상품 슬러그로 말투(산군=반말)를 정한다.
  slug: z.string().max(60).optional(),
  teaser: z.boolean().optional(),
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
  // host/x-forwarded-host 는 스킴 없는 맨호스트라 new URL() 이 예외 → 스킴을 보정해서 비교.
  try { return new URL(u.includes("://") ? u : `https://${u}`).host.toLowerCase(); } catch { return ""; }
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
  // 동일 출처 + 봇 필터 + IP 레이트리밋. (Vercel은 접속 호스트가 x-forwarded-host 라 그걸 우선)
  const origin = request.headers.get("origin");
  if (origin) {
    const reqHost = safeHost(request.headers.get("x-forwarded-host")) || safeHost(request.headers.get("host"));
    const allowed = new Set([reqHost, safeHost(publicEnv.NEXT_PUBLIC_SITE_URL)].filter(Boolean));
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
    // 결제 전 티저(요청 시에만) — LLM 없이 만세력 실측값으로만 조립. 실패해도 view 는 그대로 준다.
    let teaser = null;
    if (body.teaser) {
      try {
        // 인연 방향은 유료 결과지와 같은 값을 써야 티저와 결과지가 같은 해를 말한다
        const { partnerSex } = parseProfileTags(body.concerns);
        teaser = buildTeaser(analysis, body.gender, body.slug === "sangun-sinjeom" ? "sangun" : "polite", partnerSex);
      } catch {
        teaser = null; // 티저는 부가물 — 실패해도 명식/결제 흐름을 막지 않는다
      }
    }
    // 웹툰 말풍선에 꽂을 값. view·teaser·analysis 가 한자리에 있는 여기서만 한 번에 만들 수 있다
    // (신강약은 analysis 에만, 원국 한글 읽기는 view 에만 있다).
    let tokens: Record<string, string> = {};
    if (body.teaser) {
      try {
        tokens = buildWebtoonTokens({ name: body.nickname, birthDate: body.birthDate, view, teaser, analysis });
      } catch {
        tokens = {}; // 토큰이 없으면 렌더러가 해당 말풍선을 숨긴다 — 흐름은 안 막는다
      }
    }
    return NextResponse.json({ ok: true, view, teaser, tokens });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "api_error", detail: e instanceof Error ? e.message : String(e) });
  }
}
