import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSajuApiConfigured, fetchSajuAnalysis, ganjiToMyeongsik, type BirthInfo } from "@/lib/saju/saju-api";

// 무료 분석(⑥)용 명식/오행 차트 — LLM 없이 명식만. 결제 후 상세 풀이는 별도.
// 비용 보호: 같은 생년월일·시각·성별·달력은 인메모리 캐시로 재호출 안 함(6000회 한도).
// luckyloveme 호출 실패/미설정 시 클라가 대표값으로 폴백하도록 ok:false 반환.

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().nullable().optional(),
  timeUnknown: z.boolean().optional(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
});

// 천간/지지 → 오행 (한자·한글 모두 매핑)
const GAN_OH: Record<string, string> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
};
const JI_OH: Record<string, string> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화", 午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
// 천간 한글 → 한자 (브러시 폰트 표시용). 이미 한자면 그대로.
const GAN_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const ELEMENTS = ["목", "화", "토", "금", "수"] as const;

type Pillar = { gan: string; ji: string };
type ChartData = {
  ok: true;
  cheongan: { ch: string; el: string; ilgan: boolean }[]; // 시·일·월·년 순
  ilganElement: string;
  ohaeng: { el: string; pct: number; count: number }[]; // 목화토금수
};

const cache = new Map<string, ChartData>();

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

function buildChart(pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): ChartData {
  // 오행 분포 — 명식 8(또는 6)글자의 천간·지지를 직접 카운트(결정론적, API 내부구조 비의존)
  const counts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const tally = (p: Pillar | null) => {
    if (!p) return;
    const g = GAN_OH[p.gan];
    const j = JI_OH[p.ji];
    if (g) counts[g]++;
    if (j) counts[j]++;
  };
  [pillars.year, pillars.month, pillars.day, pillars.hour].forEach(tally);
  const max = Math.max(1, ...Object.values(counts));
  const ohaeng = ELEMENTS.map((el) => ({ el, count: counts[el], pct: Math.round((counts[el] / max) * 100) }));

  const ilganElement = GAN_OH[pillars.day.gan] ?? "화";
  // 표시 순서: 시 · 일 · 월 · 년 (일간 강조)
  const order: { p: Pillar | null; ilgan: boolean }[] = [
    { p: pillars.hour, ilgan: false },
    { p: pillars.day, ilgan: true },
    { p: pillars.month, ilgan: false },
    { p: pillars.year, ilgan: false },
  ];
  const cheongan = order.map((o) => ({
    ch: o.p ? GAN_HANJA[o.p.gan] ?? o.p.gan : "?",
    el: o.p ? GAN_OH[o.p.gan] ?? "토" : "토",
    ilgan: o.ilgan,
  }));
  return { ok: true, cheongan, ilganElement, ohaeng };
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_input" });
  }

  if (!isSajuApiConfigured()) return NextResponse.json({ ok: false, reason: "unconfigured" });

  const key = JSON.stringify(body);
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  try {
    const analysis = await fetchSajuAnalysis(toBirthInfo(body), ["ganji"], { source: "confirm" });
    const myeongsik = ganjiToMyeongsik(analysis);
    if (!myeongsik) return NextResponse.json({ ok: false, reason: "no_ganji" });
    const chart = buildChart({
      year: { gan: myeongsik.year.cheongan, ji: myeongsik.year.jiji },
      month: { gan: myeongsik.month.cheongan, ji: myeongsik.month.jiji },
      day: { gan: myeongsik.day.cheongan, ji: myeongsik.day.jiji },
      hour: myeongsik.hour ? { gan: myeongsik.hour.cheongan, ji: myeongsik.hour.jiji } : null,
    });
    if (cache.size > 2000) cache.clear();
    cache.set(key, chart);
    return NextResponse.json(chart);
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "api_error", detail: e instanceof Error ? e.message : String(e) });
  }
}
