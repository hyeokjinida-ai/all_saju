// 생성된 결과지의 **기계적으로 확실한 위반**만 후처리로 바로잡는다.
//
// 왜 프롬프트가 아니라 코드인가: 2026-08-06 실측에서 프롬프트에 금지 규칙을 넣고 재생성했더니
// "당신"(2→0)·한자병기(4→0)는 사라졌지만 하라체는 오히려 5→6 으로 늘었다. 챕터별 독립 호출이라
// 규칙이 과제 지시에 묻히고, 작은 모델은 한국어 명령형 형태소를 안정적으로 못 지킨다.
//   → **판단이 필요한 것은 프롬프트, 기계적으로 정답이 하나인 것은 코드.**
// 여기서 고치는 것들은 전부 후자다(어미 형태, 괄호 한자, 내부 판정값 단어, 호칭).
//
// 원칙: 문장을 지우거나 새로 쓰지 않는다. 형태만 바꾼다 — 뜻이 바뀌면 후처리가 아니라 개작이다.

/** "○○하라 → ○○해라" 류 문어 명령형을 입말 명령형으로. */
function fixImperatives(t: string): string {
  return (
    t
      // 말라 → 마라 ("하지 말라" → "하지 마라")
      .replace(/말라(?=[\s.,!?)\]"'」』]|$)/g, "마라")
      // 보라 → 봐라 (지켜보라 · 살펴보라 · 해보라)
      .replace(/보라(?=[\s.,!?)\]"'」』]|$)/g, "봐라")
      // ○○하라 → ○○해라 (활용하라 · 조절하라 · 추진하라). '하라'만 바꾸고 앞 어간은 그대로 둔다.
      .replace(/하라(?=[\s.,!?)\]"'」』]|$)/g, "해라")
      // 기다리라/서두르라 같은 '르/리 + 라' 는 '~려라'가 어색하다 — 흔한 것만 명시적으로.
      .replace(/기다리라(?=[\s.,!?)\]"'」』]|$)/g, "기다려라")
  );
}

/** 괄호 한자 병기 제거 — "경신(庚申)" → "경신". 읽는 사람이 한자를 모른다는 전제다. */
function stripHanjaParens(t: string): string {
  return t.replace(/([가-힣])\s*\(\s*[一-鿿]+\s*\)/g, "$1");
}

/** 내부 판정값 단어(대길·대흉)를 사람 말로. 점수·판정값은 본문에 나오면 안 된다. */
function humanizeVerdicts(t: string): string {
  const map: [RegExp, string][] = [
    [/대길하다/g, "크게 트인다"],
    [/대길하며/g, "크게 트이며"],
    [/대길하고/g, "크게 트이고"],
    [/대길한/g, "크게 트인"],
    [/대길이다/g, "크게 트인다"],
    [/대흉하다/g, "크게 눌린다"],
    [/대흉하며/g, "크게 눌리며"],
    [/대흉하고/g, "크게 눌리고"],
    [/대흉한/g, "크게 눌린"],
    [/대흉이다/g, "크게 눌린다"],
    // 소길/소흉 - 치환표에 없어 「월운 판정이 소흉이라」로 손님에게 새 나갔다(2026-08-24 실측).
    [/소길하다/g, "조금 트인다"],
    [/소길한/g, "조금 트인"],
    [/소흉하다/g, "조금 눌린다"],
    [/소흉한/g, "조금 눌린"],
  ];
  let out = t;
  for (const [re, to] of map) out = out.replace(re, to);
  // 위 활용형에 안 걸린 잔여("흐름이 대길·대흉") — 조사 없이 남은 것만 바꾼다
  return out
    .replace(/대길/g, "크게 트임")
    .replace(/대흉/g, "크게 눌림")
    .replace(/소길/g, "조금 트임")
    .replace(/소흉/g, "조금 눌림");
}

/** 따옴표 안(독자·상대의 대사)을 잠시 치워 두고 본문만 손보게 한다.
 *  대사는 반말이 정상이다 - "그건 네가 힘들었겠다"를 존대로 고치면 장면이 망가진다. */
function maskQuotes(t: string): { masked: string; restore: (s: string) => string } {
  const box: string[] = [];
  const masked = t.replace(/["\u201C\u201D'][^"\u201C\u201D'\n]{0,200}["\u201C\u201D']/g, (m) => {
    box.push(m);
    return ` \u0000Q${box.length - 1}\u0000 `;
  });
  return { masked, restore: (s) => s.replace(/ \u0000Q(\d+)\u0000 /g, (_a, i) => box[Number(i)] ?? "") };
}

/** 닫는 별표 앞 공백 정리 - `**굵게 **` 는 마크다운이 안 먹어서 별표가 화면에 그대로 뜬다.
 *  (micromark 실측 2026-08-24: `A **공백 닫기입니다. ** B` 가 그대로 문단 텍스트로 나온다)
 *  샘플 4장에서 25건 나왔다. 뜻은 그대로 두고 공백 위치만 옮긴다. */
function fixDanglingEmphasis(t: string): string {
  return t
    .split("\n")
    .map((line) => {
      const parts = line.split("**");
      // parts 가 홀수여야 ** 가 짝수 개다. 짝이 안 맞는 줄은 손대지 않는다(깨뜨릴 위험).
      if (parts.length < 3 || parts.length % 2 === 0) return line;
      for (let i = 1; i < parts.length; i += 2) {
        const inner = parts[i];
        const lead = inner.match(/^[ \t]+/)?.[0] ?? "";
        const tail = inner.match(/[ \t]+$/)?.[0] ?? "";
        if (!lead && !tail) continue;
        const core = inner.slice(lead.length, inner.length - tail.length);
        if (!core) continue; // 안이 공백뿐이면 건드리지 않는다
        parts[i] = core;
        parts[i - 1] += lead;
        parts[i + 1] = tail + parts[i + 1];
      }
      return parts.join("**");
    })
    .join("\n");
}

/** 강조 안쪽에 공백이 물린 곳의 개수 - 계측용(치환과 같은 잣대로 센다).
 *  정규식으로 세면 「닫는 별표 ~ 다음 여는 별표」 사이를 오탐한다(2026-08-24 실측 6건). */
export function countDanglingEmphasis(t: string): number {
  let n = 0;
  for (const line of t.split("\n")) {
    const parts = line.split("**");
    if (parts.length < 3 || parts.length % 2 === 0) continue;
    for (let i = 1; i < parts.length; i += 2) {
      const inner = parts[i];
      if (inner.trim() && (/^[ \t]/.test(inner) || /[ \t]$/.test(inner))) n += 1;
    }
  }
  return n;
}

/** 내부 계산 용어 제거 - 「인연점수 26점」·「월운 판정」·「확정값」은 프롬프트 재료의 어휘지
 *  손님의 말이 아니다. 보이는 순간 '기계가 돌린 것'이 되고 신점이 아니게 된다.
 *  1) 부속 구(가운뎃점·쉼표·괄호로 달린 것)는 구만 걷어낸다 - 문장은 살아 있다.
 *  2) 그러고도 내부어가 남은 문장은 통째로 지운다(그 문장은 전부 기계 얘기다). */
function stripInternalTerms(t: string): string {
  let out = t
    .replace(/\s*[\u00B7,]\s*인연점수\s*-?\d+\s*점/g, "")
    .replace(/\s*\(\s*인연점수\s*-?\d+\s*점\s*\)/g, "")
    .replace(/\s*[\u00B7,]\s*재물점수\s*-?\d+\s*점/g, "");

  const INTERNAL = /인연점수|재물점수|확정값|월운\s*판정|세운\s*판정|종합점수/;
  const lines = out.split("\n").map((line) => {
    if (/^\s{0,3}#{1,3}\s/.test(line) || !INTERNAL.test(line)) return line;
    return line
      .split(/(?<=[.!?])\s+/)
      .filter((sent) => !INTERNAL.test(sent))
      .join(" ")
      .trim();
  });
  return lines.filter((line, i) => !(line === "" && lines[i - 1] === "")).join("\n");
}

/** 한글·ASCII·통용 기호가 아닌 글자를 걷어낸다. 모델이 드물게 다른 문자권 글자를 흘린다
 *  (2026-08-24 실측: 문장 끝에 구자라트 문자 2자). 조판이 깨지고 손님은 오류로 읽는다. */
function stripAlienChars(t: string): string {
  return t.replace(
    /[^\u0020-\u007E\uAC00-\uD7A3\u3130-\u318F\u00B7\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u300C-\u300F\u3010\u3011\u25A0-\u25FF\u2605\u2606\u00D7\u2103\uFF05\n\r\t]/g,
    "",
  );
}

/** 존댓말 상품 전용 - 2인칭 반말 대명사를 존대로 되돌린다.
 *  원인은 프롬프트 재료였고(확정값의 짝 지시문) 거기서 고쳤지만, 모델이 한 장만 반말로
 *  넘어가는 사고(2026-08-24 실측 4/4, 5장에서만 최대 16회)는 여기서도 막는다. */
function fixInformalPronounsToPolite(t: string): string {
  const { masked, restore } = maskQuotes(t);
  const fixed = masked
    .replace(/(^|[\s("\u201C\u2018])너는(?=[\s,.!?)])/g, "$1당신은")
    .replace(/(^|[\s("\u201C\u2018])너를(?=[\s,.!?)])/g, "$1당신을")
    .replace(/(^|[\s("\u201C\u2018])너와(?=[\s,.!?)])/g, "$1당신과")
    .replace(/(^|[\s("\u201C\u2018])너도(?=[\s,.!?)])/g, "$1당신도")
    .replace(/(^|[\s("\u201C\u2018])너에게(?=[\s,.!?)])/g, "$1당신에게")
    .replace(/(^|[\s("\u201C\u2018])네게(?=[\s,.!?)])/g, "$1당신에게")
    .replace(/(^|[\s("\u201C\u2018])네가(?=[\s,.!?)])/g, "$1당신이")
    .replace(/(^|[\s("\u201C\u2018])네 짝의/g, "$1당신 짝의")
    .replace(/(^|[\s("\u201C\u2018])네 (?=[가-힣])/g, "$1당신의 ")
    .replace(/(^|[\s("\u201C\u2018])너(?=[\s,.!?)])/g, "$1당신");
  return restore(fixed);
}

/** 반말 상품 전용 — 독자를 "당신"이나 이름 3인칭으로 부르는 것을 "너/네"로. */
function fixSecondPerson(t: string, name?: string | null): string {
  let out = t
    .replace(/당신의/g, "네")
    .replace(/당신은/g, "너는")
    .replace(/당신이/g, "네가")
    .replace(/당신을/g, "너를")
    .replace(/당신에게/g, "너에게")
    .replace(/당신과/g, "너와")
    .replace(/당신도/g, "너도")
    .replace(/당신/g, "너");

  const n = name?.trim();
  if (n && /^[가-힣]{2,4}$/.test(n)) {
    // 이름 + 조사 → 2인칭. 문서 제목(## 줄)은 "○○님의 운명 장부"가 정상이라 건드리지 않는다.
    const lines = out.split("\n");
    out = lines
      .map((line) => {
        if (/^\s{0,3}#{1,3}\s/.test(line)) return line; // 제목 줄은 그대로
        return line
          .replace(new RegExp(`${n}님의`, "g"), "네")
          .replace(new RegExp(`${n}님은`, "g"), "너는")
          .replace(new RegExp(`${n}님`, "g"), "너")
          .replace(new RegExp(`${n}의`, "g"), "네")
          .replace(new RegExp(`${n}은(?![가-힣])`, "g"), "너는")
          .replace(new RegExp(`${n}는(?![가-힣])`, "g"), "너는")
          .replace(new RegExp(`${n}이(?=[\\s,.])`, "g"), "네가")
          .replace(new RegExp(`${n}가(?=[\\s,.])`, "g"), "네가");
      })
      .join("\n");
  }
  return out;
}

/** 챕터마다 형광펜(==문장==)을 최대 하나만 남긴다. 한 장에 셋이면 강조가 아니라 배경이 된다.
 *  지우는 게 아니라 == 표시만 걷어낸다 — 문장은 그대로 남는다. */
function keepOneHighlightPerChapter(t: string): string {
  const parts = t.split(/(?=\n###\s)/); // 챕터 경계 유지하며 자르기
  return parts
    .map((chunk) => {
      let seen = false;
      return chunk.replace(/==([^=]+)==/g, (_all, inner) => {
        if (seen) return inner; // 두 번째부터는 표시만 벗긴다
        seen = true;
        return `==${inner}==`;
      });
    })
    .join("");
}

export type NormalizeReport = { rule: string; before: number }[];

/**
 * 결과지 본문을 규칙에 맞게 다듬는다.
 * @param banmal 반말 하대체 상품(산군)인지 — "당신"·이름 3인칭 교정은 여기서만 한다.
 *               존댓말 상품에서 "당신"은 정상이므로 건드리면 안 된다.
 */
/** 소제목에 붙은 장 번호를 뗀다.
 *
 *  프롬프트는 「장 제목은 그대로 두고 소제목엔 굵은 글씨를 쓰라」고 하는데, 모델이 이따금
 *  소제목까지 장 번호로 이어 매긴다(2026-08-29 실측 gpt-5.6-luna: 1장 본문에
 *  `**2. 네가 남들과 다른 칼날**`). 손님 화면에는 「1.」 없이 「2.」만 뜬 소제목이 되고,
 *  화면의 장 번호(한자)와도 어긋난다 — 기계적으로 정답이 하나라 후처리로 못 박는다.
 *
 *  **굵은 글씨만으로 이뤄진 줄**에서, 앞머리의 한두 자리 번호만 뗀다:
 *   · 목록(`1. …`)은 굵은 글씨 줄이 아니라 안 걸린다
 *   · 연도 소제목(`**2027년, 벌린 판을 …**`)은 네 자리라 안 걸린다 */
/** 소제목 줄(굵은 글씨만으로 이뤄진 한 줄) 앞머리의 번호 — 치환과 계측이 **같은 자**를 쓴다.
 *  (다른 자로 세면 「고쳤다는데 숫자가 그대로」가 된다 — countDanglingEmphasis 가 남긴 교훈) */
const SUBHEAD_NUM = /^(\s{0,3}\*\*)\d{1,2}\.[ \t]+(?=\S)/;
const isBoldOnlyLine = (l: string) => /^\s{0,3}\*\*/.test(l) && l.trimEnd().endsWith("**");

function stripSubheadingNumbers(t: string): string {
  return t
    .split("\n")
    .map((line) => (isBoldOnlyLine(line) ? line.replace(SUBHEAD_NUM, "$1") : line))
    .join("\n");
}

/** 위 치환이 걸릴 줄의 수 — 계측용(같은 잣대). */
export function countSubheadingNumbers(t: string): number {
  return t.split("\n").filter((l) => isBoldOnlyLine(l) && SUBHEAD_NUM.test(l)).length;
}

export function normalizeResultVoice(
  md: string,
  opts: { banmal: boolean; name?: string | null },
): { text: string; fixed: NormalizeReport } {
  const count = (re: RegExp) => (md.match(re) ?? []).length;
  const fixed: NormalizeReport = [];
  const note = (rule: string, before: number) => {
    if (before > 0) fixed.push({ rule, before });
  };

  note("하라체", count(/(하라|보라|말라|기다리라)(?=[\s.,!?)\]"'」』]|$)/g));
  note("한자병기", count(/[가-힣]\s*\(\s*[一-鿿]+\s*\)/g));
  note("내부판정값", count(/대길|대흉|소길|소흉/g));
  note("별표 공백닫기", countDanglingEmphasis(md));
  note("내부용어", count(/인연점수|재물점수|확정값|월운\s*판정|종합점수/g));
  note(
    "이상문자",
    count(
      /[^\u0020-\u007E\uAC00-\uD7A3\u3130-\u318F\u00B7\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u300C-\u300F\u3010\u3011\u25A0-\u25FF\u2605\u2606\u00D7\u2103\uFF05\n\r\t]/g,
    ),
  );
  if (!opts.banmal) note("반말 대명사", count(/(^|[\s(])(너는|너를|너와|너도|너에게|네게|네가|네 [가-힣])/g));
  if (opts.banmal) note("당신", count(/당신/g));
  const extraMarks = md
    .split(/(?=\n###\s)/)
    .reduce((n, c) => n + Math.max(0, (c.match(/==[^=]+==/g) ?? []).length - 1), 0);
  note("형광펜 과다", extraMarks);
  note("소제목 번호", countSubheadingNumbers(md));

  let out = fixImperatives(md);
  out = stripHanjaParens(out);
  out = humanizeVerdicts(out);
  out = stripInternalTerms(out);
  out = stripAlienChars(out);
  out = fixDanglingEmphasis(out);
  out = keepOneHighlightPerChapter(out);
  out = stripSubheadingNumbers(out);
  if (opts.banmal) out = fixSecondPerson(out, opts.name);
  // 존댓말 상품은 반대 방향 - 반말로 넘어간 대명사를 되돌린다(대사는 건드리지 않는다)
  else out = fixInformalPronounsToPolite(out);

  return { text: out, fixed };
}
