/**
 * 직녀 인물 컷 프롬프트 조립기 (2026-08-26)
 *
 * 왜 있나: 컷 프롬프트를 손으로 조립하면 반드시 뭔가 빠진다. 실측된 사고들 —
 *   · 나이 가드를 빼먹어 십대로 나왔다(t15)
 *   · 고정 블록을 요약해 점·은사·비녀가 사라지고 다른 사람이 나왔다(8/25)
 *   · 화풍을 「수묵」으로 잘못 썼다(확정 화풍은 웹툰 고광택 반실사)
 *   · 신분증으로 시트가 아니라 완성 컷(j1)을 붙여 그 구도째 복제됐다(8/26, 5회 연속)
 * 기억에 맡기지 않고 **문서에서 읽어 조립**한다. 문서가 유일한 진실이고, 이 스크립트는 배관이다.
 *
 * 쓰기:
 *   npx tsx scripts/jiknyeo-cut-prompt.ts --list
 *   npx tsx scripts/jiknyeo-cut-prompt.ts --id j-greet
 *   npx tsx scripts/jiknyeo-cut-prompt.ts --id N1 --composition "COMPOSITION: ..." [--no-person]
 *   ... --save (조립문을 스크래치 파일로도 떨군다)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SHEET_DOC = path.join(ROOT, "직녀", "에셋_생산_프롬프트시트.md");
const PROTO_DOC = path.join(ROOT, "직녀", "캐릭터시트_프롬프트.md");
const SHEET_PNG = path.join(ROOT, "직녀", "캐릭터시트_정본.png");
/** 계보 참조 — **첨부 2번은 선택이 아니다.** 시트만 붙이면 부품(눈·점·은사)은 맞는데
 *  골격이 다른 사람이 나온다(2026-08-26 N1·N2 사고). 시트=부품 신분증, 이쪽=계보 신분증.
 *  기본값은 j1 계보의 최신 합격 정면 반신컷. 포즈가 더 가까운 합격 컷이 있으면 --pose 로 바꾼다. */
const LINEAGE_DEFAULT = path.join(ROOT, "public", "products", "jiknyeo", "j-greet.webp");

/** ## 제목 다음에 처음 나오는 ``` 블록을 꺼낸다 */
function fencedAfter(md: string, heading: RegExp): string {
  const at = md.search(heading);
  if (at < 0) throw new Error(`문서에서 섹션을 못 찾음: ${heading}`);
  const rest = md.slice(at);
  const m = rest.match(/```[a-z]*\r?\n([\s\S]*?)```/);
  if (!m) throw new Error(`섹션 아래에 코드블록이 없음: ${heading}`);
  return m[1].trim();
}

/** ③ 표에서 id → { person, composition } */
function cutTable(md: string): Map<string, { person: boolean; composition: string }> {
  const out = new Map<string, { person: boolean; composition: string }>();
  for (const line of md.split("\n")) {
    // | **j1** | O | `COMPOSITION: ...` |
    const m = line.match(/^\|\s*\*{0,2}([\w-]+)\*{0,2}\s*\|\s*([OX])\s*\|\s*`([^`]+)`\s*\|/);
    if (m) out.set(m[1], { person: m[2] === "O", composition: m[3].trim() });
  }
  return out;
}

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? (args[i + 1] ?? "") : null;
};
const has = (n: string) => args.includes(n);

const sheetMd = fs.readFileSync(SHEET_DOC, "utf8");
const protoMd = fs.readFileSync(PROTO_DOC, "utf8");
const table = cutTable(sheetMd);

if (has("--list") || args.length === 0) {
  console.log("보유 컷 명세 (직녀/에셋_생산_프롬프트시트.md ③)\n");
  for (const [id, v] of table) {
    console.log(`  ${id.padEnd(9)} ${v.person ? "인물" : "배경"}  ${v.composition.slice(12, 84)}…`);
  }
  console.log("\n  npx tsx scripts/jiknyeo-cut-prompt.ts --id <id>");
  console.log("  새 컷: --id N1 --composition \"COMPOSITION: ...\"");
  process.exit(0);
}

const id = flag("--id");
if (!id) throw new Error("--id 가 필요합니다 (--list 로 목록)");

const known = table.get(id);
const composition = flag("--composition") ?? known?.composition;
if (!composition) {
  throw new Error(`③ 표에 없는 컷입니다: ${id}\n  --composition "COMPOSITION: ..." 로 넘기고, 통과하면 표에 기록하세요.`);
}
const person = has("--no-person") ? false : (known?.person ?? true);

const STYLE = fencedAfter(sheetMd, /^## ① STYLE/m);
const FIXED = fencedAfter(sheetMd, /^## ② 고정 블록/m);
const AGE = fencedAfter(protoMd, /^### 나이 가드/m);
const IDENTITY = [
  "Use BOTH attached images as identity references — they are the SAME woman.",
  "Image 1 is the model sheet: take her eye color, the beauty mark, the silver thread and the binyeo from it.",
  "Image 2 is a finished panel: match its FACE STRUCTURE exactly — face length, jawline, eye spacing, overall impression.",
].join("\n");

// 인물이 없는 컷은 SUBJECT/CLOTHING/SIGNATURE/GUARD 를 뺀다(시트 ② 각주)
const fixedForCut = person
  ? FIXED
  : FIXED.split("\n\n").filter((p) => /^(BACKGROUND|PALETTE|No text|세로)/.test(p.trim())).join("\n\n");

const prompt = [
  person ? IDENTITY : null,
  // 참조를 붙이면 이번엔 포즈가 원본을 따라가는 반대 문제가 생긴다 → 첫머리에 못 박는다
  person ? "POSE MUST CHANGE — copy ONLY her face, hair, hanbok and signature items. The pose, hands, camera angle and framing must follow the COMPOSITION line below, NOT the attached images." : null,
  "",
  STYLE,
  "",
  fixedForCut,
  "",
  composition,
  person ? "\n" + AGE : null,
].filter((x) => x !== null).join("\n");

const attach: string[] = [];
if (person) {
  attach.push(`직녀/캐릭터시트_정본.png   ← 1번: 부품 신분증. ${fs.existsSync(SHEET_PNG) ? "(있음)" : "⚠ 없음!"}`);
  const pose = flag("--pose") ?? path.relative(ROOT, LINEAGE_DEFAULT).split(path.sep).join("/");
  const posePath = path.isAbsolute(pose) ? pose : path.join(ROOT, pose);
  attach.push(`${pose}   ← 2번: 계보 신분증(필수). ${fs.existsSync(posePath) ? "(있음)" : "⚠ 없음!"}`);
}

const bar = "─".repeat(72);
console.log(`\n${bar}\n  ${id}  ${person ? "인물 컷" : "배경 컷"}\n${bar}\n`);
console.log("[첨부]");
attach.length ? attach.forEach((a) => console.log("  " + a)) : console.log("  없음 (배경 컷)");
console.log(`\n[붙여넣을 프롬프트]\n${bar}\n${prompt}\n${bar}\n`);

if (person) {
  console.log("[받자마자 30초 4앵커 게이트 — 2개 어긋나면 리터치 말고 재생성]");
  console.log("  ① 눈  : 남보라로 읽히나 (검정·갈색으로 죽지 않았나) + 은빛 별점");
  console.log("  ② 점  : 왼눈 바깥 밑 그 자리인가 (다른 데 생기면 탈락)");
  console.log("  ③ 은사: 목 초커 + 눈꽃 비녀 + 땋은 끝 은사");
  console.log("  ④ 나이: 30대 초반으로 읽히나 (둥근 얼굴·큰 눈 = 탈락)");
  console.log("  ⑤ 동일인: **기존 컷을 옆에 붙여** 같은 사람인가 — 얼굴 길이·턱선·눈 간격");
  console.log("     ①~④ 는 부품 검사다. 넷 다 맞아도 골격이 다르면 다른 사람이다(8/26 실측).");
  console.log("  + 빨강 0 · 글자 0 · 저고리 여밈 · 375px 축소에서 얼굴 생존\n");
  console.log("[통과하면] webp(q88) 저장 → 시트 ③ 표에 이 컷 기록 → 낙선작 즉시 삭제\n");
}

if (has("--save")) {
  const out = path.join(ROOT, ".cut-prompt.txt");
  fs.writeFileSync(out, prompt, "utf8");
  console.log(`저장: ${out}\n`);
}
