// 열두 달 장부 — 생성부터 화면 잠금까지 한 줄로 검증.
// 사용: npx tsx scripts/verify-twelve-month.ts
import { splitChapters } from "../src/lib/saju/chapters";
import { twelveMonthStyle, gateChapters, lockedChapterBody } from "../src/lib/saju/month-gate";

let fail = 0;
const eq = (n: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${n}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
};
const KST = (y: number, m1: number, d: number, h = 12) => new Date(Date.UTC(y, m1 - 1, d, h - 9));

// 9월 15일 결제자의 결과지가 실제로 어떻게 생기는지 흉내낸다.
const created = KST(2026, 9, 15);
const style = twelveMonthStyle(created);

// buildChapterPrompts 가 만드는 heading 과 **같은 규칙**으로 마크다운을 조립한다.
// (### {i+1}. {" — " 앞부분})
const md =
  `## ${style.title.replace("○○", "홍길동")}\n\n` +
  style.outline
    .map((o, i) => {
      const clean = o.replace(/^★\s*/, "");
      return `### ${i + 1}. ${clean.split(" — ")[0]}\n\n이 장의 본문입니다. 실제 글이 여기 들어갑니다.\n`;
    })
    .join("\n");

const { chapters } = splitChapters(md);
eq("파서가 14장을 읽는다", chapters.length, 14);
eq("2장 제목", chapters[1].title, "2. 9월");
eq("6장 제목(해 넘김)", chapters[5].title, "6. 1월");

// ── 결제 직후 화면 ──
{
  const g = gateChapters(chapters.map((c) => c.title), created, KST(2026, 9, 20));
  const open = chapters.filter((_, i) => g[i].open);
  const locked = chapters.filter((_, i) => !g[i].open);
  eq("결제 직후 열린 장 3", open.length, 3);
  eq("잠긴 장 11", locked.length, 11);
  eq("열린 장 = 전체흐름·9월·큰결정", open.map((c) => c.title), ["1. 열두 달 전체 흐름", "2. 9월", "14. 큰 결정의 때"]);
  // 잠긴 장 본문이 실제 글로 새지 않는지
  const shown = chapters.map((c, i) => (g[i].open ? c.body : lockedChapterBody(g[i].opensAt)));
  eq("잠긴 장에 실제 본문이 안 샌다", shown.filter((b) => b.includes("실제 글이 여기")).length, 3);
  eq("잠긴 장에 블록문자", shown.filter((b) => b.includes("█")).length, 11);
  eq("10월 장 열림 안내", /2026년 10월 1일/.test(shown[2]), true);
}

// ── 3개월 뒤(12월) ──
{
  const g = gateChapters(chapters.map((c) => c.title), created, KST(2026, 12, 5));
  eq("12월엔 열린 장 6(상시2+월4)", g.filter((x) => x.open).length, 6);
  eq("12월 장(5번째 장) 열림", g[4].open, true);
  eq("1월 장(6번째) 아직 잠김", g[5].open, false);
}

// ── 12개월 뒤 ──
{
  const g = gateChapters(chapters.map((c) => c.title), created, KST(2027, 9, 1));
  eq("1년 뒤 전부 열림", g.filter((x) => x.open).length, 14);
}

// ── 다른 상품은 영향 없음(월 제목이 없으니 전부 상시공개) ──
{
  const other = ["1. 나는 어떤 사람일까", "2. 내 타고난 기운", "3. 올해 흐름"];
  const g = gateChapters(other, created, KST(2026, 9, 20));
  eq("월 없는 상품은 전부 열림", g.every((x) => x.open), true);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
