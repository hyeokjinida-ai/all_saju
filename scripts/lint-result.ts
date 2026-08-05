// 결과지 린터 — 생성된 결과지 md 가 프롬프트 규칙을 실제로 지켰는지 기계로 잰다.
//
// 프롬프트에 규칙을 적는 것과 모델이 지키는 것은 다른 문제다. 눈으로 훑으면 놓치고,
// "좋아진 것 같다"는 측정이 아니다. 규칙마다 검사기를 붙여 놓고 숫자로 비교한다.
//
//   npx tsx scripts/lint-result.ts <md파일...>
//   npx tsx scripts/lint-result.ts --temp        temp 의 sample-*.md 전부
//
// 종료코드: 치명(FAIL) 위반이 있으면 1.
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, basename } from "node:path";

type Severity = "FAIL" | "WARN";
type Rule = {
  id: string;
  what: string;
  why: string;
  severity: Severity;
  /** 본문에서 위반 조각을 뽑는다 */
  find: (text: string, ctx: Ctx) => string[];
};
type Ctx = { name: string; birthYear: number; thisYear: number };

// 챕터 분리 — "### " 기준
function chapters(text: string): string[] {
  return text.split(/\n###\s+/).slice(1);
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
      const hits: string[] = [];
      chs.forEach((c, i) => {
        const m = c.match(/(재물그릇|인연 ?그릇)[^.\n]{0,12}?(\d{1,3})\s*점/);
        // 3장(돈)·4장(인연)에서만 허용 — 0-index 로 2·3
        if (m && i !== 2 && i !== 3) hits.push(`${i + 1}장: ${m[0]}`);
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
      const count = new Map<string, number>();
      chs.forEach((c) => {
        const months = new Set([...c.matchAll(/(20\d{2})년\s*(\d{1,2})월/g)].map((m) => `${m[1]}-${m[2]}`));
        months.forEach((m) => count.set(m, (count.get(m) ?? 0) + 1));
      });
      return [...count.entries()].filter(([, n]) => n >= 3).map(([m, n]) => `${m} → ${n}개 챕터`);
    },
  },
];

function lint(file: string) {
  const raw = readFileSync(file, "utf8");
  const header = raw.match(/^<!--([\s\S]*?)-->/)?.[1] ?? "";
  const text = raw.replace(/^<!--[\s\S]*?-->\s*/, "");
  // 헤더에서 이름을 못 얻으면 제목에서 뽑는다("산군이 읽은 지수님의 운명 장부")
  const name =
    header.match(/·\s*([가-힣]{2,4})\s*·/)?.[1] ?? text.match(/산군이 읽은\s*([가-힣]{2,4})님/)?.[1] ?? "";
  const ctx: Ctx = { name, birthYear: 1993, thisYear: new Date().getFullYear() };

  console.log(`\n══ ${basename(file)}  (${text.length}자 · ${chapters(text).length}챕터 · 이름="${name}")`);
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
for (const f of files) total += lint(f);
console.log(`\n===== 치명 위반이 있는 규칙 ${total}종 =====`);
process.exit(total ? 1 : 0);
