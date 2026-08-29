// npx tsx scripts/verify-result-gate.ts
// 출고 게이트 회귀 검사 — **DB·LLM 없이** 챕터 파서와 안전장치만 태운다.
//
// 왜 있나: 2026-08-29 에 게이트가 무력화된 채로 며칠 돌았다. 원인은 챕터 경계 정규식
// `new RegExp(String.fromCharCode(10) + "(?=###\s)")` — 문자열 리터럴 안의 `\s` 는
// 이스케이프가 벗겨져 **`s` 글자**가 되므로 실제 정규식이 `/\n(?=###s)/` 였고 한 번도 안 맞았다.
// 타입체크도 린트도 못 잡는 종류라(문법상 멀쩡한 정규식) **실행해 세어 보는 자**를 남긴다.

const ok = (m: string, d = "") => console.log(`   ✓ ${m}${d ? " — " + d : ""}`);
const bad = (m: string, d = "") => {
  console.log(`   ✗ ${m}${d ? " — " + d : ""}`);
  process.exitCode = 1;
};
const eq = (label: string, got: unknown, want: unknown) =>
  got === want ? ok(label, String(got)) : bad(label, `${got} (기대 ${want})`);

async function main() {
  const {
    splitChapters,
    looksLikeDataRequest,
    hasRealInterpretation,
    countPendingChapters,
    mergeCompletedChapters,
    PENDING_CHAPTER_NOTE,
  } = await import("../src/lib/saju/chapters");
  const { coreChapterIndexes } = await import("../src/lib/saju/prompt");

  // 실제 결과지 모양 그대로 — generateByChapters 가 `## 제목` + `### N. 장` 으로 조립한다.
  const doc = [
    "## 산군의 장부",
    "### 1. 네 그릇부터 보자",
    "네 그릇은 넓다. 다만 새는 구멍이 하나 있다.",
    "### 2. 네가 걸어온 길",
    "아래 세 가지만 보내주세요. 그러면 작성하겠습니다.",
    "### 3. 올해 네게 오는 것",
    "값이 오면 이어서 적겠다.",
    "### 4. 돈이 들어오는 달",
    "작성할 수 없습니다. 자료가 필요합니다.",
  ].join("\n\n");

  console.log("\n1) 챕터 경계 — 되물음 장을 전부 세는가");
  const { chapters } = splitChapters(doc);
  eq("장 수", chapters.length, 4);
  const asked = chapters.filter((c) => looksLikeDataRequest(c.body)).length;
  // 옛 정규식은 이 값이 0 또는 1 이었다(조각이 1개라 통째로 한 번만 셌다).
  eq("되묻는 장", asked, 3);

  console.log("\n2) CRLF 내성 — 윈도우에서 복사된 md");
  eq("장 수(CRLF)", splitChapters(doc.replace(/\n/g, "\r\n")).chapters.length, 4);

  console.log("\n3) 자리표시 — 미완 장 세기");
  const withPending = [
    "## 산군의 장부",
    "### 1. 네 그릇부터 보자",
    "네 그릇은 넓다. 다만 새는 구멍이 하나 있다. 올해 안에 한 번 크게 갈린다.",
    "### 2. 네가 걸어온 길",
    PENDING_CHAPTER_NOTE,
  ].join("\n\n");
  eq("미완 장", countPendingChapters(withPending), 1);
  eq("완성본의 미완 장", countPendingChapters(doc), 0);
  eq("본문 있음 판정", hasRealInterpretation(withPending), true);

  console.log("\n4) 재생성이 이전 판을 덮어쓰지 않는가(단조 증가)");
  const prev = [
    "## 산군의 장부",
    "### 1. 네 그릇부터 보자",
    PENDING_CHAPTER_NOTE,
    "### 2. 네가 걸어온 길",
    "스물아홉에 한 번 크게 갈렸다. 그해 네가 놓은 것이 지금 자리를 만들었다.",
  ].join("\n\n");
  const next = [
    "## 산군의 장부",
    "### 1. 네 그릇부터 보자",
    "네 그릇은 넓다. 다만 새는 구멍이 하나 있다. 올해 안에 한 번 크게 갈린다.",
    "### 2. 네가 걸어온 길",
    PENDING_CHAPTER_NOTE,
  ].join("\n\n");
  const merged = mergeCompletedChapters(prev, next);
  eq("병합 후 미완 장", countPendingChapters(merged), 0);
  if (merged.includes("스물아홉")) ok("이전 판의 좋은 장이 살아남음");
  else bad("이전 판의 좋은 장이 사라짐");
  if (merged.includes("새는 구멍")) ok("이번 판의 새 장도 살아남음");
  else bad("이번 판의 새 장이 사라짐");

  console.log("\n5) 완성본은 병합이 손대지 않는가(공백까지 그대로)");
  if (mergeCompletedChapters(prev, doc) === doc) ok("완성본 무변경");
  else bad("완성본이 병합에서 바뀜 — 정상 결과지 조판이 흔들린다");

  console.log("\n6) 핵심 장 목록 — 티저가 판 장");
  const core = coreChapterIndexes("sangun-sinjeom");
  if (core.length >= 4) ok("산군 핵심 장", `${core.map((i) => i + 1).join(",")} (총 ${core.length}장)`);
  else bad("산군 핵심 장이 너무 적다", String(core.length));

  console.log("\n7) 소제목에 장 번호가 붙어 나가지 않는가");
  const { normalizeResultVoice, countSubheadingNumbers } = await import("../src/lib/saju/normalize-voice");
  const subs = [
    "### 1. 네 그릇부터 보자",
    "",
    "**2. 네가 남들과 다른 칼날**", // ← 걷어내야 할 것(모델이 장 번호를 소제목에 이어 매김)
    "",
    "**2027년, 벌린 판을 골라 담는 해**", // ← 연도 소제목은 그대로
    "",
    "1. 번호 목록은 그대로", // ← 목록도 그대로
    "",
    "**[산군의 직언]** 굵게로 시작하지만 문장이 이어지는 줄도 그대로.",
  ].join("\n");
  eq("걸린 소제목", countSubheadingNumbers(subs), 1);
  const fixedText = normalizeResultVoice(subs, { banmal: true, name: "지수" }).text;
  if (fixedText.includes("**네가 남들과 다른 칼날**")) ok("소제목 번호가 떨어짐");
  else bad("소제목 번호가 안 떨어짐");
  if (fixedText.includes("**2027년, 벌린 판을 골라 담는 해**")) ok("연도 소제목 무사");
  else bad("연도 소제목이 깎임 — 네 자리 숫자를 건드렸다");
  if (fixedText.includes("1. 번호 목록은 그대로")) ok("번호 목록 무사");
  else bad("번호 목록이 깎임");

  console.log(process.exitCode ? "\n실패 있음\n" : "\n전 항목 통과\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
