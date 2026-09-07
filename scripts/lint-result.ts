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
export type Rule = {
  id: string;
  what: string;
  why: string;
  severity: Severity;
  /** 본문에서 위반 조각을 뽑는다 */
  find: (text: string, ctx: Ctx) => string[];
};
export type Ctx = {
  name: string;
  birthYear: number;
  thisYear: number;
  /** 손님이 고른 고민 문구 (헤더 concern=) — 고민이 몇 장을 관통하는지 계측용 */
  concern: string;
  /** 이 상품의 화자가 반말 하대체인가(산군). false 면 존댓말 상품(인연·직녀)이다.
   *  화법 규칙은 상품마다 정반대라 이 플래그 없이 재면 정상인 글이 치명 위반으로 잡힌다. */
  banmal: boolean;
  /** 결과지 표(돈·인연 달력)에 실제로 실리는 달. null = 명식 캐시가 없어 검사 불가 */
  tableMonths: Set<string> | null;
  /** 명식 월운에 존재하는 달 — 근거로는 정당하지만 표에는 없는 달 */
  dataMonths: Set<string> | null;
  /** 이 명식의 대운 간지 — 본문이 인용한 간지가 진짜인지 대조한다. null = 캐시 없음 */
  daeunGanji: Set<string> | null;
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

// 60갑자 — 천간 10 × 지지 12 의 **짝수/홀수가 맞는 조합만** 존재한다(갑자·을축…계해 60개).
// 모델은 세운의 천간과 대운의 지지를 섞어 「병축」 같은 없는 글자를 만들어 낸다(2026-08-24 실측).
const GAN = "갑을병정무기경신임계";
const JI = "자축인묘진사오미신유술해";
const SIXTY = new Set(Array.from({ length: 60 }, (_, i) => GAN[i % 10] + JI[i % 12]));

// 한글·ASCII·통용 기호 외의 글자(다른 문자권 글자가 섞여 나오는 사고)
const ALIEN_CHAR =
  /[^\u0020-\u007E\uAC00-\uD7A3\u3130-\u318F\u00B7\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u300C-\u300F\u3010\u3011\u25A0-\u25FF\u2605\u2606\u00D7\u2103\uFF05\n\r\t]/g;

export const RULES: Rule[] = [
  {
    id: "간지오류",
    what: "60갑자에 없거나 이 명식의 것이 아닌 간지를 대운으로 씀",
    why: "만세력 앱을 켜 보는 손님이 있다. 없는 간지 하나면 결과지 전체가 창작으로 읽힌다",
    severity: "FAIL",
    find: (t, c) => {
      // 「이번 대운」·「현재 대운」 같은 일반어를 간지로 오인하지 않게, 천간+지지 조합만 후보로 본다.
      const cited = [...t.matchAll(
        /([갑을병정무기경신임계][자축인묘진사오미신유술해])\s*(?:대운|10년 단위 운|십년 단위 운)/g,
      )].map((m) => m[1]);
      const bad: string[] = [];
      for (const g of new Set(cited)) {
        if (!SIXTY.has(g)) bad.push(`${g} — 60갑자에 없는 글자`);
        else if (c.daeunGanji && c.daeunGanji.size && !c.daeunGanji.has(g)) bad.push(`${g} — 이 명식의 대운이 아님`);
      }
      return bad;
    },
  },
  {
    id: "되물음응답",
    what: "결과지를 쓰지 않고 모델이 정보를 더 달라고 되묻거나 절차를 설명함",
    why: "손님이 돈 내고 받는 자리에 「누락되어 있어요 / 보내주시면 작성하겠습니다」가 실리면 그 자리에서 환불이다",
    severity: "FAIL",
    // 2026-08-25 실측: 결혼예보 샘플의 1장 본문이 통째로 이 되물음이었다(확정값 키가 안 채워진 채
    // 생성이 돌면 모델이 거절 응답을 낸다). 손님 대상 문장에는 나올 수 없는 어휘만 골랐다.
    find: (t) =>
      [...t.matchAll(
        /누락(되어|돼|된)|작성하겠습니다|요청하신 (형식|항목|대로)|아래 항목만|보내\s*주시면|보내\s*주세요|다시 계산하지 말|제공해\s*주시면/g,
      )].map((m) => m[0]),
  },
  {
    id: "2인칭반말",
    what: "존댓말 상품에 반말 대명사(너·네)가 섞임",
    why: "한 장만 반말로 넘어가도 손님은 다른 사람이 쓴 글로 읽는다. 따옴표 안 대사는 정상이라 뺀다",
    severity: "FAIL",
    find: (t, c) => {
      if (c.banmal) return [];
      const body = t.replace(/["\u201C\u201D'][^"\u201C\u201D'\n]{0,200}["\u201C\u201D']/g, " ");
      return [...body.matchAll(/(?:^|[\s(])(너는|너를|너와|너도|너에게|네게|네가|네 [가-힣]{1,6})/g)].map((m) => m[1]);
    },
  },
  {
    id: "내부용어",
    what: "프롬프트 재료의 어휘가 본문에 남음",
    why: "「인연점수 26점」·「확정값」은 우리 계산기의 말이지 손님의 말이 아니다. 보이면 기계가 된다",
    severity: "FAIL",
    find: (t) =>
      [...t.matchAll(/인연점수|재물점수|확정값|월운\s*판정|세운\s*판정|종합점수|소길|소흉/g)].map((m) => m[0]),
  },
  {
    id: "이상문자",
    what: "한글·ASCII 아닌 글자가 섞임",
    why: "모델이 드물게 다른 문자권 글자를 흘린다(실측: 문장 끝 구자라트 문자 2자). 손님은 오류로 읽는다",
    severity: "FAIL",
    find: (t) => [...t.matchAll(ALIEN_CHAR)].map((m) => `${m[0]} (U+${m[0].codePointAt(0)?.toString(16).toUpperCase()})`),
  },
  {
    id: "존대-당신",
    what: '독자를 "당신"이라 부름',
    why: "산군은 반말 하대체다. 한 번만 섞여도 캐릭터가 무너진다",
    severity: "FAIL",
    // 반말 상품에만 적용 — 인연·직녀는 "당신"이 정상 화법이다.
    find: (t, c) => (c.banmal ? [...t.matchAll(/당신[의은는이을를에]?/g)].map((m) => m[0]) : []),
  },
  {
    id: "존대-어미",
    what: "존댓말 어미",
    why: "반말 세계관인데 존대가 섞이면 화자가 두 명이 된다",
    severity: "FAIL",
    // 따옴표 안은 화자가 산군이 아니다 — 독자가 상사에게 할 말("여기까지만 하겠습니다")을
    // 인용하는 건 정당한 장면이라 지우고 잰다(실측 오탐 2건).
    find: (t, c) => {
      if (!c.banmal) return [];
      const noQuote = t.replace(/["“”'][^"“”'\n]{0,80}["“”']/g, "");
      return [...noQuote.matchAll(/(습니다|입니다|해요|하세요|됩니다|드립니다)/g)].map((m) => m[0]);
    },
  },
  {
    // 존댓말 상품(인연·직녀)의 거울 규칙. 해요체가 무너져 반말이 섞이면 화자가 두 명이 된다.
    // 산군의 "존대-어미"와 정확히 반대 방향이라 규칙을 따로 둔다.
    id: "반말혼입",
    what: "존댓말 상품에 반말 종결이 섞임",
    why: "먼저 아는 언니의 해요체인데 반말이 섞이면 손님을 내려다보는 말이 된다",
    severity: "FAIL",
    find: (t, c) => {
      if (c.banmal) return [];
      // 따옴표 안(독자·상대의 대사 인용)과 제목 줄은 정당하다.
      const body = t
        .split("\n")
        .filter((l) => !/^\s{0,3}#{1,3}\s/.test(l))
        .join("\n")
        .replace(/["“”'][^"“”'\n]{0,120}["“”']/g, "");
      // 문장 끝의 반말 종결만 — 명사형(~것이다) 같은 서술은 본문에 정당하게 쓰인다.
      return [...body.matchAll(/(니?[가-힣]{1,6}(?:해라|하지 마라|봐라|하거라))(?=[\s.…!?]|$)/g)].map((m) => m[0]);
    },
  },
  {
    id: "3인칭-이름",
    what: "독자를 이름 3인칭으로 부름",
    why: "눈앞의 상대에게 말하는 중인데 이름을 3인칭으로 부르면 남 얘기가 된다 → '네'",
    severity: "FAIL",
    // 제목 줄("## 산군이 읽은 지수님의 운명 장부")은 문서 제목이라 정상 — 본문만 본다.
    // 반말 상품 전용: 인연·직녀는 "지수님"이라 부르는 게 정상 화법이다.
    find: (t, c) =>
      c.banmal && c.name
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
    // 「당신이 걸어온 길」은 아우트라인이 **두 갈래로 열어 두라**고 시킨 장이다
    // ("관계가 정리됐거나, 반대로 크게 열렸을 거예요"). 시킨 표현을 위반으로 세면 안 된다.
    find: (t) => {
      const chs = chapters(t);
      const pastIdx = chapterIndexBy(chs, /걸어온 길/);
      const body = chs.filter((_, i) => i !== pastIdx).join("\n");
      return [...body.matchAll(/(가능성이 (크|높|있|많)[다습]|수도 있|일 수 있|될 수 있|경향이 있|보인다|듯하다|일 것이다|편이다)/g)].map(
        (m) => m[0],
      );
    },
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
      // 고민 장은 "앞 장들의 근거를 한 줄로 다시 꿰어라"가 아우트라인 지시다 — 여기서 점수를
      // 다시 부르는 건 재탕이 아니라 시킨 일이다(2026-08-24: 정상 결과지 4/4가 이걸로 잡혔다).
      const allow = new Set(
        [
          chapterIndexBy(chs, /돈이 들어오는/),
          chapterIndexBy(chs, /인연이 들어오는/),
          chapterIndexBy(chs, /내 인연 그릇|내 결혼 그릇/),
          chapterIndexBy(chs, /고민|물음/),
        ].filter((i) => i >= 0),
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
    id: "깨진볼드",
    what: "닫는 ** 앞에 공백 — 볼드가 안 닫혀 별표가 손님 화면에 그대로 찍힘",
    why:
      "CommonMark 는 `**문장. **` 을 강조로 안 잡는다(닫는 표 앞 공백). ReactMarkdown 실측: 별표가" +
      " 원문 그대로 렌더된다. 유료 손님이 제일 먼저 보는 급의 결함.",
    severity: "FAIL",
    // ⚠ 정규식 하나로는 못 잡는다(2026-08-31 수리). `/\*\*[^*\n]+?\s\*\*/` 는
    //   **소제목**  7~16세 **무오 대운** 처럼 **볼드 두 개 사이의 텍스트**를 통째로 먹어
    //   "닫는 표 앞 공백"으로 오해한다. 정규식은 여는 표와 닫는 표를 구분할 수 없다.
    //   (그 규칙으로 재던 표본 2장이 FAIL 7건이었는데 토큰 쌍으로 다시 세니 **진짜는 0건**이었다.)
    //   → 줄마다 `**` 를 순서대로 훑어 홀수=여는·짝수=닫는 으로 쌍을 맞추고, 그 **안쪽**
    //     문자열의 양 끝 공백만 본다. 안 닫힌 볼드(개수가 홀수)도 같이 잡는다.
    find: (t) => {
      const bad: string[] = [];
      for (const line of t.split("\n")) {
        const at: number[] = [];
        for (let i = line.indexOf("**"); i >= 0; i = line.indexOf("**", i + 2)) at.push(i);
        for (let k = 0; k + 1 < at.length; k += 2) {
          const inner = line.slice(at[k] + 2, at[k + 1]);
          if (!inner.trim()) continue;
          if (inner !== inner.trim()) bad.push(`${line.slice(at[k], at[k + 1] + 2).slice(0, 30)}…`);
        }
        if (at.length % 2 === 1) bad.push(`안 닫힌 볼드: ${line.slice(at[at.length - 1], at[at.length - 1] + 28)}…`);
      }
      return bad;
    },
  },
  {
    id: "상투어도배",
    what: "같은 관용구가 결과지 전체에 도배됨 (장부 메타포·'장면'·'아니라')",
    why:
      "한 번은 연출이고 여덟 번은 기계 박자다. 2026-08-29 전수(15표본 평균): 「장부를 펼쳐 보니」류" +
      " 5.4회 · 「장면」 9.9회 · 「~가 아니라」 16.2회. '장면'은 프롬프트 지시어(실제 장면으로 쓰라)가" +
      " 본문으로 샌 것이라 특히 티가 난다.",
    severity: "WARN",
    find: (t) => {
      const out: string[] = [];
      const count = (re: RegExp) => (t.match(re) ?? []).length;
      const ledger = count(/장부를 펼쳐 보니|장부에는? .{0,6}적혀/g);
      const scene = count(/장면[이을은]/g);
      const notBut = count(/[가이] 아니라/g);
      if (ledger > 3) out.push(`장부 메타포 ${ledger}회(상한 3)`);
      if (scene > 6) out.push(`「장면」 ${scene}회(상한 6)`);
      if (notBut > 12) out.push(`「~가 아니라」 ${notBut}회(상한 12)`);
      return out;
    },
  },
  {
    id: "볼드위생",
    what: "본문 인라인 볼드가 너무 길거나(문장 통째) 한 문단에 몰림",
    why:
      "굵은 게 절반이면 굵은 건 강조가 아니라 배경이다. 형님이 티저에서 볼드 43%→28% 로 내린 것과 같은 병이" +
      " 결과지에 남아 있었다(2026-08-29 실측: 문단 128개 중 48% 가 볼드 보유, 인라인 54곳, 한 구절이 문장 하나 길이).",
    severity: "WARN",
    find: (t) => {
      const bad: string[] = [];
      for (const rawLine of t.split("\n")) {
        const line = rawLine.trim();
        // 표는 셀마다 굵히는 게 정상이고, 제목 줄(###)은 볼드 예산 밖이다
        if (!line || line.startsWith("|") || line.startsWith("#")) continue;
        const bolds = [...line.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
        if (!bolds.length) continue;
        // 줄 전체가 하나의 볼드면 소제목이다 — prompt.ts 가 그렇게 시킨다(정상)
        if (bolds.length === 1 && line === `**${bolds[0]}**`) continue;
        for (const b of bolds) {
          // 20자 넘는 볼드는 「짧은 구절에만」(prompt.ts:49) 위반 — 문장을 통째로 굵힌 것이다
          if (b.length > 20) bad.push(`긴 볼드 ${b.length}자: ${b.slice(0, 28)}…`);
        }
        if (bolds.length > 2) bad.push(`한 문단 ${bolds.length}곳: ${line.slice(0, 30)}…`);
      }
      return bad;
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
      // 「활력 3/12」 같은 내부 지표 분수 — 손님에게는 뜻 없는 기계 숫자다(2026-08-29 실측 3건)
      ...[...t.matchAll(/[가-힣]{1,4}\s?\d{1,2}\/1[02]/g)].map((m) => m[0]),
    ],
  },
  {
    id: "달도배",
    what: "같은 달이 여러 챕터에 반복",
    why: "9장을 읽었는데 같은 달만 계속 나오면 '결국 한 얘기'로 남는다",
    severity: "WARN",
    find: (t) => {
      const chs = chapters(t);
      // '네 물음'과 '마지막 당부'는 **앞 장의 달을 도로 끌어와 매듭짓는 자리**다(배정표가 그렇게
      // 허용한다). 답을 시기로 맺고 이번 주 할 일을 가장 가까운 좋은 달에 거는 게 상품이라,
      // 여기서 나온 재인용까지 세면 정상 결과지가 전부 위반으로 잡힌다(실측 15/15).
      // 그래서 **재인용 장은 세지 않는다** — 진짜 도배(설명을 되풀이하는 장들)만 남긴다.
      const where = new Map<string, number[]>();
      chs.forEach((c, i) => {
        if (/물음|당부/.test(c.split("\n")[0] ?? "")) return;
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
export async function loadMonthSets(
  /** 캐시 파일명(예: analysis-19930515-female-14.json). md 헤더의 cache= 값. */
  cacheName: string,
  gender: "male" | "female",
): Promise<{ table: Set<string>; data: Set<string> } | null> {
  const cache = resolve(tmpdir(), cacheName);
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

/** 명식 캐시에서 대운 간지를 모은다. 구조가 공급사마다 조금씩 달라 **2글자 60갑자 문자열**을
 *  daeun 하위에서 훑어 담는다(키 이름에 기대지 않는다). */
function loadDaeunGanji(cacheName: string): Set<string> | null {
  const cache = resolve(tmpdir(), cacheName);
  if (!existsSync(cache)) return null;
  try {
    const analysis = JSON.parse(readFileSync(cache, "utf8")) as Record<string, unknown>;
    const out = new Set<string>();
    const walk = (v: unknown) => {
      if (typeof v === "string") {
        if (v.length === 2 && SIXTY.has(v)) out.add(v);
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
    };
    walk(analysis.daeun);
    return out;
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
  // 반말 상품은 산군 계열뿐이다. 화법 규칙 3종이 이 값으로 갈린다(반대로 재면 정상 글이 치명이 된다).
  const banmal = slug === "sangun-sinjeom";
  // 명식 캐시 — 헤더의 cache= 를 우선한다(키가 slug 에서 생일 기준으로 바뀌었다). 없으면 옛 규칙으로 폴백.
  const cacheName = header.match(/cache=([\w.-]+\.json)/)?.[1] ?? (slug ? `analysis-${slug}.json` : "");
  const months = cacheName ? await loadMonthSets(cacheName, gender) : null;

  const ctx: Ctx = {
    name,
    birthYear,
    thisYear: new Date().getFullYear(),
    concern,
    banmal,
    tableMonths: months?.table ?? null,
    dataMonths: months?.data ?? null,
    daeunGanji: cacheName ? loadDaeunGanji(cacheName) : null,
  };

  console.log(
    `\n══ ${basename(file)}  (${text.length}자 · ${chapters(text).length}챕터 · 이름="${name}" · ${birthYear}년생 · ${banmal ? "반말" : "존대"})`,
  );
  if (!months) console.log(`   … 명식 캐시(${cacheName || "?"}) 없음 — 달 검사 2종 건너뜀`);
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

// 다른 스크립트가 RULES 를 import 해 쓸 때(verify-batch) 이 CLI 까지 같이 돌면 안 된다 —
// 남의 실행을 "검사할 md 가 없다"로 죽여 버린다(실측). 직접 실행일 때만 돈다.
if (/lint-result/.test(process.argv[1] ?? "")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
