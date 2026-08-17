// [임시] 티저 구조물(B2·B5) 설계용 실측 프로브 — 월운/세운 범위와 인연 확정값을 찍는다.
//   npx tsx scripts/_probe-inyeon-range.ts
// 캐시된 명식(1993-05-15 14:30 여)이라 만세력 API 0콜. 확인 끝나면 삭제한다.
import type { BirthInfo } from "../src/lib/saju/saju-api";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

async function main() {
  const api = await import("../src/lib/saju/saju-api");
  const birthInfo: BirthInfo = {
    birthYear: "1993", birthMonth: "5", birthDay: "15",
    birthHour: "14", birthMinute: "30",
    calendarType: "양력", gender: "female",
  };

  const analysis = await api.fetchSajuAnalysis(birthInfo, [], { source: "demo" });
  const a = analysis as unknown as Record<string, any>;

  const w = a.weolun ?? {};
  const se = a.seun ?? {};
  const months = [w.currentWeolun, w.nextWeolun, ...(w.upcomingWeoluns ?? [])].filter(Boolean);
  const years = [se.currentSeun, ...(se.upcomingSeuns ?? [])].filter(Boolean);

  console.log("=== 월운 ===");
  console.log("개수:", months.length);
  console.log("범위:", months.map((m: any) => `${m.year}-${String(m.month).padStart(2, "0")}`).join(" "));
  console.log("한 달 키:", Object.keys(months[0] ?? {}).join(","));
  console.log("판정분포:", JSON.stringify(months.reduce((acc: any, m: any) => {
    const v = m?.yongsinJudgment?.종합판정 ?? "-"; acc[v] = (acc[v] ?? 0) + 1; return acc;
  }, {})));
  console.log("월별 종합점수:", months.map((m: any) => `${m.year}/${m.month}:${m?.yongsinJudgment?.종합점수}`).join(" "));

  console.log("\n=== 세운 ===");
  console.log("개수:", years.length);
  console.log("범위:", years.map((y: any) => `${y.year}(${y.age}세)`).join(" "));

  console.log("\n=== computeInyeonFacts (female / partner=male) ===");
  const facts = api.computeInyeonFacts(analysis, "female", "male");
  console.log("score:", facts.score);
  console.log("top3:", JSON.stringify(facts.top3.map((r) => ({ label: r.label, y: r.year, m: r.month, score: r.score, verdict: r.verdict, tags: r.tags }))));
  console.log("shaky:", JSON.stringify(facts.shaky.map((r) => ({ label: r.label, y: r.year, m: r.month, score: r.score }))));
  console.log("topYears:", JSON.stringify(facts.topYears.map((r) => ({ label: r.label, y: r.year, score: r.score }))));
  console.log("ageDir:", facts.ageDir, "| spouseOh:", facts.spouseOh, "| spouseType:", facts.spouseType, "| meetHint:", facts.meetHint);

  console.log("\n=== 열두 달 전부(등급 컷 설계용) ===");
  for (const r of facts.months) {
    console.log(`${r.year}/${String(r.month).padStart(2, "0")}  score=${String(r.score).padStart(4)}  verdict=${r.verdict}  tags=${r.tags.join("·")}`);
  }
  const sorted = [...facts.months].map((r) => r.score).sort((a, b) => b - a);
  console.log("점수 내림차순:", sorted.join(" "));

  console.log("\n=== buildTeaser().inyeon (실제 티저가 받는 값) ===");
  const { buildTeaser } = await import("../src/lib/saju/teaser");
  const t = buildTeaser(analysis, "female", "polite", "male");
  const iy = t?.inyeon;
  if (!iy) { console.log("inyeon = null"); return; }
  console.log("openCount:", iy.openCount, "| nearest:", JSON.stringify(iy.nearest), "| restOpen:", iy.restOpen);
  console.log("달력:", iy.calendar.map((c) => `${c.month}월${c.grade}${c.revealed ? "*" : ""}`).join(" "));
  console.log("등급수:", JSON.stringify(iy.calendar.reduce((a: any, c) => { a[c.grade] = (a[c.grade] ?? 0) + 1; return a; }, {})));

  // ③ 챕터명 개명이 달 배정표(blueprint 정규식)와 어긋나지 않는지 — LLM 0회로 확인한다.
  console.log("\n=== 챕터 ↔ 달 배정표 (개명 동기화 검증) ===");
  const { outlineTitles } = await import("../src/lib/saju/prompt");
  const { buildMonthPlan } = await import("../src/lib/saju/blueprint");
  const titles = outlineTitles("inyeon-saju");
  const plan = buildMonthPlan(titles, null, facts, null);
  titles.forEach((t, i) => {
    const p = plan[i];
    console.log(`${String(i + 1).padStart(2)}. ${t.padEnd(22)} allow=[${p.allow.join(", ")}]${p.ownsYears ? " ownsYears" : ""}`);
  });
  const assigned = plan.filter((p) => p.allow.length > 0 || p.ownsYears).length;
  console.log(`장 수: ${titles.length} · 달/해가 배정된 장: ${assigned}`);

  // ④ result-view 의 강조 영역·인용 — [프로필] 태그가 새지 않는지, 인연 칩이 love 로 가는지
  console.log("\n=== result-view primaryKey / advice.quote ===");
  const { buildResultView } = await import("../src/lib/saju/result-view");
  const { ganjiToMyeongsik } = api;
  const ms = ganjiToMyeongsik(analysis)!;
  const CASES: string[][] = [
    ["[프로필] 인연 방향: 남자", "[프로필] 연애 상태: 혼자", "일하느라 연애가 밀렸어"],
    ["[프로필] 인연 방향: 남자", "결혼 시기가 궁금해"],
    ["[프로필] 직업: 직장인", "돈은 언제 풀리나"],
    ["[프로필] 직업: 직장인", "내년에 이직해도 되나"],
    ["[프로필] 인연 방향: 남자"], // 손님이 적은 고민 없음 → advice 없어야 한다
  ];
  for (const concerns of CASES) {
    const v = buildResultView({
      myeongsik: ms, rawAnalysis: analysis, name: "지수", birthDate: "1993-05-15",
      birthTime: "14:30", timeUnknown: false, gender: "female", calendar: "solar",
      concerns, showScores: true, showDaeun: false,
    });
    const hi = v.categories.find((c) => c.primary)?.label ?? "(없음)";
    console.log(`concerns=${JSON.stringify(concerns)}\n  강조=${hi} · 첫칸=${v.categories[0]?.label} · quote=${v.advice ? JSON.stringify(v.advice.quote) : "(없음)"}`);
  }
}

main().catch((e) => { console.error("FAILED:", e?.message ?? e); process.exit(1); });
