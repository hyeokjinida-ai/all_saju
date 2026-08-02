// pnpm measure:teaser
//
// 티저 토큰이 실제로 몇 %나 비는지 재는 계측 스크립트.
// 웹툰 말풍선에 {전환점}·{콜드리딩}을 써도 되는지가 이 숫자 하나로 갈린다.
//
// - 표본은 고정 시드로 만든다 → 다시 돌려도 같은 생일 → 만세력 캐시에 걸려 API 0콜.
// - 원본 응답과 티저 결과를 docs-private/ 에 통째로 남긴다.
//   나중에 "신살 분포는?" 같은 새 질문이 생겨도 다시 호출할 필요가 없다.

import { writeFileSync, mkdirSync } from "node:fs";
// 타입만 가져온다(런타임 코드 없음) — 실제 모듈은 env 를 읽은 뒤 main() 안에서 동적으로 부른다.
import type { BirthInfo } from "../src/lib/saju/saju-api";
import type { SajuTeaser } from "../src/lib/saju/teaser";

// Next 없이 도는 스크립트라 .env.local 을 직접 읽는다(node 표준 기능, 의존성 없음)
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

const N = 50;
const OUT_DIR = "docs-private";
const STAMP = "2026-08";

// 고정 시드 난수 — 돌릴 때마다 같은 표본이 나와야 캐시가 듣는다
let seed = 20260802;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

type Sample = {
  birthDate: string;
  birthTime: string | null;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
};

// 실제 손님 분포에 맞춘다 — 3040 여성 중심, 시간 모르는 손님 30%, 음력 10%
function makeSamples(n: number): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const y = int(1980, 2002);
    const m = int(1, 12);
    const d = int(1, 28); // 말일 예외를 피해 28일까지만
    const timeUnknown = rnd() < 0.3;
    out.push({
      birthDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      birthTime: timeUnknown ? null : `${String(int(0, 23)).padStart(2, "0")}:${pick(["00", "30"])}`,
      gender: rnd() < 0.8 ? "female" : "male",
      calendar: rnd() < 0.1 ? "lunar" : "solar",
    });
  }
  return out;
}

function toBirthInfo(s: Sample): BirthInfo {
  const [y, m, d] = s.birthDate.split("-");
  const [hh, mm] = s.birthTime ? s.birthTime.split(":") : [undefined, undefined];
  return {
    birthYear: y,
    birthMonth: String(parseInt(m, 10)),
    birthDay: String(parseInt(d, 10)),
    ...(s.birthTime ? { birthHour: String(parseInt(hh!, 10)), birthMinute: String(parseInt(mm!, 10)) } : {}),
    calendarType: s.calendar === "lunar" ? "음력" : "양력",
    gender: s.gender,
  };
}

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

type Row = {
  sample: Sample;
  ok: boolean;
  error?: string;
  strength?: string; // 신강약 실측값 (태왕·신강·중강·중화·중약·신약·태약)
  teaser?: SajuTeaser;
};

async function main() {
  // env 를 읽은 뒤에 불러야 한다 — 최상단 import 는 loadEnvConfig 보다 먼저 실행돼 버린다.
  const { fetchSajuAnalysis } = await import("../src/lib/saju/saju-api");
  const { buildTeaser } = await import("../src/lib/saju/teaser");

  const samples = makeSamples(N);
  const rows: Row[] = [];
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`표본 ${N}명 계측 시작 — 캐시에 걸리면 API 콜은 그만큼 줄어듭니다.\n`);

  for (const [i, s] of samples.entries()) {
    const tag = `${i + 1}/${N} ${s.birthDate} ${s.gender === "female" ? "여" : "남"}${s.birthTime ? ` ${s.birthTime}` : " 시간모름"}`;
    try {
      const analysis = await fetchSajuAnalysis(toBirthInfo(s), [], { source: "demo" });
      const teaser = buildTeaser(analysis, s.gender, "polite");
      if (!teaser) {
        // 명식이 없으면 티저 자체를 안 만든다 — 이것도 "비었다"로 세야 한다
        rows.push({ sample: s, ok: false, error: "no_teaser(명식 없음)" });
        console.log(`  ${tag} · 티저 없음(명식 없음)`);
        continue;
      }
      rows.push({
        sample: s,
        ok: true,
        strength: String(rec(analysis.sinStrength).strength ?? ""),
        teaser,
      });
      console.log(`  ${tag} · 콜드 ${teaser.coldRead.length}문장 · 전환점 ${teaser.turningYear ? teaser.turningYear.year : "없음"} · 과거검증 ${teaser.hasPastCheck ? "O" : "X"}`);
    } catch (err) {
      rows.push({ sample: s, ok: false, error: (err as Error).message });
      console.log(`  ${tag} · 실패: ${(err as Error).message}`);
    }
    // 중간에 끊겨도 여태 것은 남게
    if ((i + 1) % 10 === 0) writeFileSync(`${OUT_DIR}/teaser-sample-${STAMP}.json`, JSON.stringify(rows, null, 2), "utf8");
  }

  writeFileSync(`${OUT_DIR}/teaser-sample-${STAMP}.json`, JSON.stringify(rows, null, 2), "utf8");

  // ── 집계 ──────────────────────────────────
  const good = rows.filter((r) => r.ok && r.teaser);
  const n = good.length;
  const pct = (k: number) => (n ? `${Math.round((k / n) * 100)}%` : "—");

  const coldDist = new Map<number, number>();
  const sinsalDist = new Map<number, number>();
  const strengthDist = new Map<string, number>();
  let hasTurning = 0;
  let hasPast = 0;

  for (const r of good) {
    const t = r.teaser!;
    coldDist.set(t.coldRead.length, (coldDist.get(t.coldRead.length) ?? 0) + 1);
    sinsalDist.set(t.sinsal.length, (sinsalDist.get(t.sinsal.length) ?? 0) + 1);
    const st = r.strength || "(없음)";
    strengthDist.set(st, (strengthDist.get(st) ?? 0) + 1);
    if (t.turningYear) hasTurning++;
    if (t.hasPastCheck) hasPast++;
  }

  const lines: string[] = [];
  const say = (s: string) => { lines.push(s); console.log(s); };

  say(`\n${"=".repeat(52)}`);
  say(`티저 토큰 계측 — 표본 ${n}명 (실패 ${rows.length - n}명)`);
  say("=".repeat(52));
  say(`\n[웹툰에 쓸 수 있나 — 핵심 3개]`);
  say(`  {전환점}   채워짐 ${hasTurning}/${n}  ${pct(hasTurning)}`);
  say(`  과거검증문장 잡힘 ${hasPast}/${n}  ${pct(hasPast)}   ← 가장 강한 무기`);
  say(`\n[콜드리딩 문장 수]`);
  for (const k of [...coldDist.keys()].sort((a, b) => a - b)) {
    const v = coldDist.get(k)!;
    say(`  ${k}문장  ${String(v).padStart(3)}명  ${pct(v)}`);
  }
  const cold3 = coldDist.get(3) ?? 0;
  say(`  → {콜드3} 쓸 수 있는 비율 ${pct(cold3)}`);
  const cold2plus = [...coldDist.entries()].filter(([k]) => k >= 2).reduce((a, [, v]) => a + v, 0);
  say(`  → {콜드2} 쓸 수 있는 비율 ${pct(cold2plus)}`);
  say(`\n[신강약 분포 — 안 비는 값]`);
  for (const [k, v] of [...strengthDist.entries()].sort((a, b) => b[1] - a[1])) {
    say(`  ${k.padEnd(8)} ${String(v).padStart(3)}명  ${pct(v)}`);
  }
  say(`\n[신살 개수]`);
  for (const k of [...sinsalDist.keys()].sort((a, b) => a - b)) {
    const v = sinsalDist.get(k)!;
    say(`  ${k}개  ${String(v).padStart(3)}명  ${pct(v)}`);
  }
  say(`\n원본 저장: ${OUT_DIR}/teaser-sample-${STAMP}.json`);

  writeFileSync(`${OUT_DIR}/teaser-계측-${STAMP}.md`, `# 티저 토큰 계측 (${STAMP})\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n`, "utf8");
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
