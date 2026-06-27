// 대운 정확성 검증 — luckyloveme 대운이 만세력 규칙대로 오류 없이 뽑히는지 결정론적으로 확인.
// 검사: ① 순/역행 방향(양남음녀순·음남양녀역) ② 첫 대운 = 월주±1 ③ 60갑자 ±1 연속
//       ④ 나이 10년 단위 연속 ⑤ 현재 대운이 현재나이를 포함.
// 실행: npx tsx scripts/verify-daeun.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const l of readFileSync(resolve(process.cwd(), f), "utf8").split(/\r?\n/)) {
        const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    } catch {}
  }
}
loadEnv();

const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const JI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
function ganjiIndex(ganji: string): number {
  const gan = ganji[0], ji = ganji[1];
  for (let i = 0; i < 60; i++) if (GAN[i % 10] === gan && JI[i % 12] === ji) return i;
  return -1;
}
const mod60 = (n: number) => ((n % 60) + 60) % 60;

type Profile = { id: string; y: string; m: string; d: string; h: string; min: string; g: "male" | "female"; expectDir: "순행" | "역행" };
// 양남순·음녀순·양녀역·음남역 을 모두 커버하도록 같은 생일을 성별만 바꿔 본다.
const PROFILES: Profile[] = [
  { id: "1972-male", y: "1972", m: "8", d: "10", h: "9", min: "0", g: "male", expectDir: "순행" },   // 임(양)+남 → 순
  { id: "1972-female", y: "1972", m: "8", d: "10", h: "9", min: "0", g: "female", expectDir: "역행" }, // 양+녀 → 역
  { id: "1975-female", y: "1975", m: "3", d: "22", h: "14", min: "30", g: "female", expectDir: "순행" }, // 을(음)+녀 → 순
  { id: "1975-male", y: "1975", m: "3", d: "22", h: "14", min: "30", g: "male", expectDir: "역행" },   // 음+남 → 역
];

async function main() {
  const { fetchSajuAnalysis } = await import("../src/lib/saju/saju-api");
  let allPass = true;

  for (const p of PROFILES) {
    const a: any = await fetchSajuAnalysis(
      { birthYear: p.y, birthMonth: p.m, birthDay: p.d, birthHour: p.h, birthMinute: p.min, calendarType: "양력", gender: p.g } as any,
      [],
      { source: "manual" },
    );

    const yearYang = a.ganji?.year?.eumyang?.gan === "양";
    const monthGanji = a.ganji?.month?.fullHangul ?? (a.ganji?.month?.gan + a.ganji?.month?.ji);
    const d = a.daeun ?? {};
    const list: any[] = d.all_daeun ?? [];
    const dir: string = d.direction;
    const step = dir === "순행" ? 1 : -1;

    const checks: { name: string; ok: boolean; detail: string }[] = [];

    // ① 방향
    const expDir = yearYang === (p.g === "male") ? "순행" : "역행";
    checks.push({ name: "방향(순/역)", ok: dir === expDir && dir === p.expectDir, detail: `API=${dir} · 규칙기대=${expDir} (년간 ${yearYang ? "양" : "음"}·${p.g === "male" ? "남" : "녀"})` });

    // ② 첫 대운 = 월주 ± 1
    const monthIdx = ganjiIndex(monthGanji);
    const expFirst = mod60(monthIdx + step);
    const firstIdx = ganjiIndex(list[0]?.ganji ?? "");
    checks.push({ name: "첫 대운=월주±1", ok: firstIdx === expFirst, detail: `월주 ${monthGanji}(${monthIdx}) ${step > 0 ? "+1" : "-1"} → 기대 ${GAN[expFirst % 10] + JI[expFirst % 12]} · 실제 ${list[0]?.ganji}` });

    // ③ 60갑자 ±1 연속
    let seqOk = true, seqBad = "";
    for (let i = 0; i < list.length; i++) {
      const exp = mod60(expFirst + i * step);
      const act = ganjiIndex(list[i].ganji);
      if (act !== exp) { seqOk = false; seqBad = `seq${i + 1} 기대 ${GAN[exp % 10] + JI[exp % 12]} ≠ 실제 ${list[i].ganji}`; break; }
    }
    checks.push({ name: "60갑자 연속(±1)", ok: seqOk, detail: seqOk ? `${list.length}개 모두 일치 (${list.map((x) => x.ganji).join("→")})` : seqBad });

    // ④ 나이 10년 단위 연속
    let ageOk = list[0]?.age_start === d.daeun_start_age;
    let ageBad = ageOk ? "" : `첫 시작나이 ${list[0]?.age_start} ≠ daeun_start_age ${d.daeun_start_age}`;
    for (let i = 0; i < list.length && ageOk; i++) {
      if (list[i].age_start !== d.daeun_start_age + 10 * i || list[i].age_end !== list[i].age_start + 9) { ageOk = false; ageBad = `seq${i + 1} 나이구간 ${list[i].age_start}~${list[i].age_end} 불연속`; }
    }
    checks.push({ name: "나이 10년 연속", ok: ageOk, detail: ageOk ? `${d.daeun_start_age}세부터 10년 단위 ${list.length}구간` : ageBad });

    // ⑤ 현재 대운이 현재나이 포함
    const cur = d.current_daeun;
    const curOk = cur && cur.age_start <= d.current_age && d.current_age <= cur.age_end;
    checks.push({ name: "현재대운∋현재나이", ok: !!curOk, detail: `현재 ${d.current_age}세 · 현재대운 ${cur?.ganji}(${cur?.age_start}~${cur?.age_end})` });

    const pass = checks.every((c) => c.ok);
    allPass = allPass && pass;
    console.log(`\n■ ${p.id} (${p.y}-${p.m}-${p.d} ${p.g}) — ${pass ? "✅ 통과" : "❌ 실패"}`);
    for (const c of checks) console.log(`   ${c.ok ? "✅" : "❌"} ${c.name}: ${c.detail}`);
  }

  console.log(`\n${"=".repeat(50)}\n결론: ${allPass ? "✅ 전 프로필 대운 정확 — 오류 없음" : "❌ 일부 프로필에서 대운 오류 발견"}`);
  process.exit(allPass ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
