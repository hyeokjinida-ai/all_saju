// 결과지 린터 — 생성된 결과지 md 가 프롬프트 규칙을 실제로 지켰는지 기계로 잰다.
//
// 프롬프트에 규칙을 적는 것과 모델이 지키는 것은 다른 문제다. 눈으로 훑으면 놓치고,
// "좋아진 것 같다"는 측정이 아니다. 규칙마다 검사기를 붙여 놓고 숫자로 비교한다.
//
//   npx tsx scripts/lint-result.ts <md파일...>
//   npx tsx scripts/lint-result.ts --temp        temp 의 sample-*.md 전부
//
// 달 검사(지어낸달·표밖의달)는 명식 캐시가 있어야 돈다 — md 헤더의 slug 로
// temp/analysis-<slug>.json 을 찾아 **확정값을 다시 계산**해서 대조한다(저장값 재사용 금지).
// 캐시가 없으면 그 두 규칙만 건너뛴다.
//
// 종료코드: 치명(FAIL) 위반이 있으면 1.
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, basename } from "node:path";

// saju-api 는 import 시점에 env 를 검증한다 — 앱 모듈보다 먼저 깔아 둔다.
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

type Severity = "FAIL" | "WARN";
type Rule = {
  id: string;
  what: string;
  why: string;
  severity: Severity;
  /** 본문에서 위반 조각을 뽑는다 */
  find: (text: string, ctx: Ctx) => string[];
};
type Ctx = {
  name: string;
  birthYear: number;
  thisYear: number;
  /** 손님이 고른 고민 문구 (헤더 concern=) — 고민이 몇 장을 관통하는지 계측용 */
  concern: string;
  /** 결과지 표(돈·인연 달력)에 실제로 실리는 달. null = 명식 캐시가 없어 검사 불가 */
  tableMonths: Set<string> | null;
  /** 명식 월운에 존재하는 달 — 근거로는 정당하지만 표에는 없는 달 */
  dataMonths: Set<string> | null;
};

// 챕터 분리 — "### " 기준
function chapters(text: string): string[] {
  return text.split(/\n###\s+/).slice(1);
}

/** 챕터 제목으로 장을 찾는다. 장 순서·개수가 바뀌어도 규칙이 따라오도록 인덱스를 쓰지 않는다
 *  (9장 → 11장 개편 때 하드코딩된 인덱스가 전부 어긋나는 걸 막는다). */
function chapterIndexBy(chs: string[], re: RegExp): number {
  return chs.findIndex((c) => re.test(c.split("\n")[0] ?? ""));
}

/** "2027년 6월" → "2027-6" 로 정규화. 표·본문·월운을 같은 키로 비교하기 위한 것. */
function monthKey(year: string | number, month: string | number): string {
  return `${year}-${Number(month)}`;
}
function monthsInText(t: string): string[] {
  return [...t.matchAll(/(20\d{2})년\s*(\d{1,2})월/g)].map((m) => monthKey(m[1], m[2]));
}

const RULES: Rule[] = [
  {
    id: "존대-당신",
    what: '독자를 "당신"이라 부름',
    why: "산군은 반말 하대체다. 한 번만 섞여도 캐릭터가 무너진다",
    severity: "FAIL",
    find: (t) => [...t.matchAll(/당신[의은는이을를에]?/g)].map((m) => m[0]),
  },
  {
    id: "존대-어미",
    what: "존댓말 어미",
    why: "반말 세계관인데 존대가 섞이면 화자가 두 명이 된다",
    severity: "FAIL",
    find: (t) => [...t.matchAll(/(습니다|입니다|해요|하세요|됩니다|드립니다)/g)].map((m) => m[0]),
  },
  {
    id: "3인칭-이름",
    what: "독자를 이름 3인칭으로 부름",
    why: "눈앞의 상대에게 말하는 중인데 이름을 3인칭으로 부르면 남 얘기가 된다 → '네'",
    severity: "FAIL",
    // 제목 줄("## 산군이 읽은 지수님의 운명 장부")은 문서 제목이라 정상 — 본문만 본다.
    find: (t, c) =>
      c.name
        ? t
            .split("\n")
            .filter((l) => !/^\s{0,3}#{1,3}\s/.test(l))
            .flatMap((l) => [...l.matchAll(new RegExp(`${c.name}(의|은|는|이|가|님)`, "g"))].map((m) => m[0]))
        : [],
  },
  {
    id: "하라체",
    what: "문어 명령형(~하라·~보라·~말라)",
    why: "평소 안 쓰는 말이라 한 박자 해석해야 한다 — 확답은 즉시 꽂혀야 한다 → ~해라/~봐라",
    severity: "FAIL",
    // '~아라/~어라/~여라'(해라체)는 통과. '하라/보라/말라/으라/시라' 형태만 잡는다.
    find: (t) =>
      [...t.matchAll(/[가-힣]{1,4}(하라|보라|말라|으라|시라|하라\.|기다리라)(?=[\s.,!?)\]]|$)/g)].map((m) => m[0]),
  },
  {
    id: "헷지",
    what: "얼버무리는 표현",
    why: "돈 내고 확답을 사러 온 사람에게 '~일 수도'는 상품 훼손이다",
    severity: "WARN",
    find: (t) =>
      [...t.matchAll(/(가능성이 (크|높|있|많)[다습]|수도 있|일 수 있|될 수 있|경향이 있|보인다|듯하다|일 것이다|편이다)/g)].map(
        (m) => m[0],
      ),
  },
  {
    id: "나이오류",
    what: "'지금 몇 살'을 틀리게 씀",
    why: "현재 나이가 틀리면 그 뒤 문장 전부를 의심하게 된다",
    severity: "FAIL",
    // 주의: 본문의 모든 'NN세'를 현재 나이로 보면 안 된다 — 대운 구간(27~36세), 미래 시점(37세에),
    // 구간 끝(36세까지)은 전부 정상이다. 예전 검사기가 이걸 다 잡아 "나이 오류"를 부풀렸다.
    // **현재 나이를 단언하는 자리**만 본다.
    find: (t, c) => {
      const bad: string[] = [];
      const cur = /(?:너는|넌|지금|현재|올해)\s*(?:만\s*)?(\d{2})\s*세/g;
      for (const m of t.matchAll(cur)) {
        const age = Number(m[1]);
        const korean = c.thisYear - c.birthYear + 1;
        if (age !== korean && age !== korean - 1) {
          bad.push(`${m[0]} (만 ${korean - 1} / 세는 ${korean} 이어야)`);
        }
      }
      return bad;
    },
  },
  {
    id: "점수중복",
    what: "재물/인연 그릇 점수를 지정 챕터 밖에서 반복",
    why: "같은 숫자를 여러 장에서 다시 꺼내면 '할 말이 없어 재탕한다'로 읽힌다",
    severity: "WARN",
    find: (t) => {
      const chs = chapters(t);
      // 돈 장·인연 장에서만 허용. 장 번호를 박아두면 11장 개편에서 통째로 어긋나므로 제목으로 찾는다.
      const allow = new Set(
        [chapterIndexBy(chs, /돈이 들어오는/), chapterIndexBy(chs, /인연이 들어오는/)].filter((i) => i >= 0),
      );
      const hits: string[] = [];
      chs.forEach((c, i) => {
        const m = c.match(/(재물그릇|인연 ?그릇)[^.\n]{0,12}?(\d{1,3})\s*점/);
        if (m && !allow.has(i)) hits.push(`${i + 1}장: ${m[0]}`);
      });
      return hits;
    },
  },
  {
    id: "형광펜",
    what: "챕터당 ==형광펜== 이 없음",
    why: "긴 글을 안 읽는 사람이 하이라이트만 따라가게 하는 장치다. 빠진 장은 그냥 벽이다",
    severity: "WARN",
    find: (t) => {
      const chs = chapters(t);
      const miss: string[] = [];
      chs.forEach((c, i) => {
        const n = (c.match(/==[^=]+==/g) ?? []).length;
        if (n === 0) miss.push(`${i + 1}장: 없음`);
        else if (n > 1) miss.push(`${i + 1}장: ${n}개(1개여야)`);
      });
      return miss;
    },
  },
  {
    id: "한자병기",
    what: "본문에 한자 병기",
    why: "읽는 사람이 한자를 모른다는 전제다. 괄호 한자는 읽기를 끊는다",
    severity: "WARN",
    find: (t) => [...t.matchAll(/[가-힣]\s*\([一-鿿]+\)/g)].map((m) => m[0]),
  },
  {
    id: "내부점수노출",
    what: "달별 점수·대길/대흉 같은 내부 판정값 노출",
    why: "내부 계산값이다. 숫자가 보이면 '기계가 돌린 것'이 되고 신점이 아니게 된다",
    severity: "FAIL",
    find: (t) => [
      ...[...t.matchAll(/(대길|대흉)/g)].map((m) => m[0]),
      ...[...t.matchAll(/-\d{2,3}\s*점/g)].map((m) => m[0]),
    ],
  },
  {
    id: "달도배",
    what: "같은 달이 여러 챕터에 반복",
    why: "9장을 읽었는데 같은 달만 계속 나오면 '결국 한 얘기'로 남는다",
    severity: "WARN",
    find: (t) => {
      const chs = chapters(t);
      // 어느 장에서 나왔는지까지 찍는다 — 배정표(1단계)를 짤 때 어디를 떼어낼지 바로 보이게.
      const where = new Map<string, number[]>();
      chs.forEach((c, i) => {
        new Set(monthsInText(c)).forEach((m) => where.set(m, [...(where.get(m) ?? []), i + 1]));
      });
      return [...where.entries()]
        .filter(([, ch]) => ch.length >= 3)
        .map(([m, ch]) => `${m} → ${ch.length}개 챕터(${ch.join("·")}장)`);
    },
  },
  {
    id: "지어낸달",
    what: "명식에 근거가 아예 없는 달",
    why: "표에도 월운에도 없는 달은 모델이 만들어낸 것이다. 사주가 아니라 소설이 된다",
    severity: "FAIL",
    find: (t, c) => {
      if (!c.tableMonths || !c.dataMonths) return [];
      const hits = new Set<string>();
      for (const m of monthsInText(t)) {
        if (!c.tableMonths.has(m) && !c.dataMonths.has(m)) hits.add(m);
      }
      return [...hits];
    },
  },
  {
    id: "표밖의달",
    what: "결과지 표(달력)에 없는 달을 본문이 말함",
    why: "손님은 표를 보고 바로 아래 본문을 읽는다. 표는 2027년 6월인데 본문이 2026년 6월을 밀면 계산을 안 한 것처럼 보인다",
    severity: "WARN",
    find: (t, c) => {
      if (!c.tableMonths || !c.dataMonths) return [];
      const hits = new Set<string>();
      for (const m of monthsInText(t)) {
        if (!c.tableMonths.has(m) && c.dataMonths.has(m)) hits.add(m);
      }
      return [...hits];
    },
  },
  {
    id: "고민관통",
    what: "손님 고민이 결과지를 관통하지 못함",
    why: "고민 하나 물어보고 산 사람이다. 그 얘기가 한 장에만 있으면 나머지 장은 남의 사주로 읽힌다",
    severity: "WARN",
    find: (t, c) => {
      if (!c.concern) return [];
      // "올해 이직해도 될까요" → [이직, 될까] 처럼 어간 두 글자만 따서 본다(형태소 분석 없이 실용 근사).
      const STOP = /^(올해|내년|작년|지금|제가|저는|내가|나는|언제|어떻|어떤|무엇|얼마)/;
      const keys = [...new Set(
        (c.concern.match(/[가-힣]{2,}/g) ?? [])
          .filter((w) => !STOP.test(w))
          .map((w) => w.slice(0, 2)),
      )];
      if (!keys.length) return [];
      const chs = chapters(t);
      const best = Math.max(...keys.map((k) => chs.filter((ch) => ch.includes(k)).length));
      return best >= 3 ? [] : [`"${c.concern}" → ${best}개 챕터에만 등장(3장 이상이어야)`];
    },
  },
];

/** 명식 캐시에서 **확정값을 다시 계산**해 (표에 실리는 달, 월운에 존재하는 달) 두 집합을 만든다.
 *  저장된 결과지 값을 믿지 않는다 — 계산이 곧 정답지고, 그게 표에 그려지는 값이다. */
async function loadMonthSets(
  slug: string,
  gender: "male" | "female",
): Promise<{ table: Set<string>; data: Set<string> } | null> {
  const cache = resolve(tmpdir(), `analysis-${slug}.json`);
  if (!existsSync(cache)) return null;
  try {
    const analysis = JSON.parse(readFileSync(cache, "utf8"));
    const api = await import("../src/lib/saju/saju-api");
    const table = new Set<string>();
    const push = (label: string) => {
      const m = label.match(/(20\d{2})년\s*(\d{1,2})월/);
      if (m) table.add(monthKey(m[1], m[2]));
    };
    const w = api.computeWealthFacts(analysis);
    [...w.top, ...w.bad].forEach((r) => push(r.label));
    const iy = api.computeInyeonFacts(analysis, gender, undefined);
    [...iy.top3, ...iy.shaky].forEach((r) => push(r.label));

    // 월운 — 표엔 없지만 프롬프트가 근거로 쓰라고 준 달들(outline 5장의 [월운])
    const data = new Set<string>();
    const rec = (v: unknown): Record<string, unknown> =>
      v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    const weolun = rec(rec(analysis).weolun);
    const rows = [weolun.currentWeolun, weolun.nextWeolun, ...(Array.isArray(weolun.upcomingWeoluns) ? weolun.upcomingWeoluns : [])];
    for (const r of rows) {
      const o = rec(r);
      if (o.year && o.month) data.add(monthKey(String(o.year), String(o.month)));
    }
    return { table, data };
  } catch {
    return null;
  }
}

async function lint(file: string) {
  const raw = readFileSync(file, "utf8");
  const header = raw.match(/^<!--([\s\S]*?)-->/)?.[1] ?? "";
  const text = raw.replace(/^<!--[\s\S]*?-->\s*/, "");
  // 헤더에서 이름을 못 얻으면 제목에서 뽑는다("산군이 읽은 지수님의 운명 장부")
  const name =
    header.match(/·\s*([가-힣]{2,4})\s*·/)?.[1] ?? text.match(/산군이 읽은\s*([가-힣]{2,4})님/)?.[1] ?? "";
  const slug = header.match(/slug=([\w-]+)/)?.[1] ?? "";
  // 예전에 생년을 1993 으로 박아뒀었다 — 다른 표본을 재면 나이 검사가 통째로 거짓말이 된다.
  const birthYear = Number(header.match(/birth=(\d{4})/)?.[1]) || 1993;
  const gender = header.match(/gender=(male|female)/)?.[1] === "male" ? "male" : "female";
  const concern = header.match(/concern=([^·]*)/)?.[1]?.trim() ?? "";
  const months = slug ? await loadMonthSets(slug, gender) : null;

  const ctx: Ctx = {
    name,
    birthYear,
    thisYear: new Date().getFullYear(),
    concern,
    tableMonths: months?.table ?? null,
    dataMonths: months?.data ?? null,
  };

  console.log(`\n══ ${basename(file)}  (${text.length}자 · ${chapters(text).length}챕터 · 이름="${name}" · ${birthYear}년생)`);
  if (!months) console.log(`   … 명식 캐시(analysis-${slug}.json) 없음 — 달 검사 2종 건너뜀`);
  let fails = 0;
  for (const r of RULES) {
    const hits = r.find(text, ctx);
    if (!hits.length) {
      console.log(`   ✓ ${r.id}`);
      continue;
    }
    if (r.severity === "FAIL") fails++;
    const uniq = [...new Set(hits)];
    console.log(`   ${r.severity === "FAIL" ? "✗" : "△"} ${r.id} — ${hits.length}건 · ${r.what}`);
    console.log(`      ${uniq.slice(0, 6).join(" / ")}${uniq.length > 6 ? ` … +${uniq.length - 6}` : ""}`);
    console.log(`      왜: ${r.why}`);
  }
  return fails;
}

// tsx 가 CJS 로 뽑아서 top-level await 이 안 된다 — main 으로 감싼다.
async function main() {
  const args = process.argv.slice(2);
  let files: string[];
  if (args.includes("--temp") || args.length === 0) {
    files = globSync(resolve(tmpdir(), "sample-*.md"));
  } else {
    files = args.filter((a) => !a.startsWith("--"));
  }
  files = files.filter((f) => existsSync(f));
  if (!files.length) {
    console.error("검사할 md 가 없다. scripts/sample-results.ts 로 먼저 생성하거나 경로를 넘겨라.");
    process.exit(1);
  }
  let total = 0;
  for (const f of files) total += await lint(f);
  console.log(`\n===== 치명 위반이 있는 규칙 ${total}종 =====`);
  process.exit(total ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
