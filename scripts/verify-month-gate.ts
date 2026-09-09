// 열두 달 장부 — 월 게이트 검증. 사용: npx tsx scripts/verify-month-gate.ts
import {
  unlockedMonthCount, nextUnlockAt, monthOfChapterTitle, gateChapters, lockedChapterBody,
  twelveMonthsFrom, buildTwelveMonthOutline, twelveMonthStyle,
} from "../src/lib/saju/month-gate";

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
};

// KST 기준 헬퍼 — 서버는 UTC 로 돈다. 테스트도 UTC 순간으로 만들어 KST 판정을 검증한다.
const KST = (y: number, m1: number, d: number, h = 12) =>
  new Date(Date.UTC(y, m1 - 1, d, h - 9, 0, 0)); // KST h시 → UTC
const kstDay = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10) : null;

// ── unlockedMonthCount ──
const buy = KST(2026, 9, 15); // KST 2026-09-15 결제
eq("결제 당월 = 0", unlockedMonthCount(buy, KST(2026, 9, 30)), 0);
eq("다음 달 1일 = 1", unlockedMonthCount(buy, KST(2026, 10, 1)), 1);
eq("해 넘김 2027-01 = 4", unlockedMonthCount(buy, KST(2027, 1, 5)), 4);
eq("11개월 뒤 = 11", unlockedMonthCount(buy, KST(2027, 8, 1)), 11);
eq("12개월 뒤도 11에서 멈춤", unlockedMonthCount(buy, KST(2027, 9, 1)), 11);
eq("2년 뒤도 11", unlockedMonthCount(buy, KST(2028, 9, 1)), 11);
eq("시계 역행 방어 = 0", unlockedMonthCount(buy, KST(2026, 8, 1)), 0);

// 말일 결제자와 초일 결제자가 같은 날 열린다
eq("8/31 결제 → 9/1에 1", unlockedMonthCount(KST(2026, 8, 31, 23), KST(2026, 9, 1, 0)), 1);
eq("8/1 결제 → 9/1에 1", unlockedMonthCount(KST(2026, 8, 1), KST(2026, 9, 1, 0)), 1);
// ★ UTC 서버 함정 — KST 10/1 00:30 은 UTC 로는 아직 9/30 15:30 이다. 열려야 한다.
eq("KST 10/1 0시 30분에 열림(UTC는 9/30)", unlockedMonthCount(KST(2026, 9, 15), KST(2026, 10, 1, 0)), 1);
eq("KST 9/30 23시엔 아직 잠김", unlockedMonthCount(KST(2026, 9, 15), KST(2026, 9, 30, 23)), 0);

// ── nextUnlockAt ──
eq("다음 열림 = 다음 달 1일(KST)", kstDay(nextUnlockAt(buy, KST(2026, 9, 20))), "2026-10-01");
eq("다 열리면 null", nextUnlockAt(buy, KST(2027, 9, 1)), null);

// ── monthOfChapterTitle ──
eq("장번호 3 + 10월 → 10", monthOfChapterTitle("3. 10월 — 자리가 바뀐다"), 10);
eq("장번호 없이 9월", monthOfChapterTitle("9월 — 시작"), 9);
eq("장번호 1 + 1월 → 1", monthOfChapterTitle("1. 1월 — 새 판"), 1);
eq("장번호만 있고 월 없음 → null", monthOfChapterTitle("1. 열두 달 전체 흐름"), null);
eq("큰 결정 장 → null", monthOfChapterTitle("14. 큰 결정의 때"), null);
eq("13월은 무효", monthOfChapterTitle("13월"), null);
eq("괄호 장번호도 처리", monthOfChapterTitle("2) 12월 — 마무리"), 12);

// ── gateChapters ── 9월 결제, 장 순서가 해를 넘긴다
const titles = [
  "1. 열두 달 전체 흐름",
  "2. 9월 — 첫 달", "3. 10월", "4. 11월", "5. 12월",
  "6. 1월", "7. 2월", "8. 3월", "9. 4월", "10. 5월", "11. 6월", "12. 7월", "13. 8월",
  "14. 큰 결정의 때",
];
{
  const g = gateChapters(titles, buy, KST(2026, 9, 20)); // 결제 당월
  eq("전체흐름 상시공개", g[0].open, true);
  eq("9월(첫 월장) 열림", g[1].open, true);
  eq("10월 잠김", g[2].open, false);
  eq("큰결정 상시공개", g[13].open, true);
  eq("열린 장 수(상시2 + 월1)", g.filter((x) => x.open).length, 3);
  eq("10월이 열리는 날(KST)", kstDay(g[2].opensAt), "2026-10-01");
}
{
  const g = gateChapters(titles, buy, KST(2027, 1, 10)); // 해 넘겨 4개월째
  eq("해넘김 후 열린 월장 5개", g.filter((x) => x.open && x.month != null).length, 5);
  eq("1월(5번째 월장) 열림", g[5].open, true);
  eq("2월 잠김", g[6].open, false);
}
{
  const g = gateChapters(titles, buy, KST(2027, 9, 1)); // 12개월 뒤
  eq("다 열림", g.every((x) => x.open), true);
}

// ── lockedChapterBody ──
{
  const body = lockedChapterBody(KST(2026, 10, 1));
  eq("블록문자 포함", /█/.test(body), true);
  eq("열리는 날 표시", /2026년 10월 1일/.test(body), true);
}

// ── 목차 생성기 ↔ 게이트 정합 (가장 중요: 둘이 어긋나면 잠금이 통째로 틀린다) ──
{
  const sep = KST(2026, 9, 15);
  const ms = twelveMonthsFrom(sep);
  eq("열두 달 개수", ms.length, 12);
  eq("첫 달 = 결제 달(9월)", ms[0].m + 1, 9);
  eq("마지막 달 = 8월", ms[11].m + 1, 8);
  eq("해 넘어감", ms[11].y, 2027);

  const outline = buildTwelveMonthOutline(sep);
  eq("목차 14장", outline.length, 14);

  // buildChapterPrompts 와 같은 규칙으로 제목을 만든다: "### {i+1}. {' — ' 앞부분}"
  const titles = outline.map((o, i) => `${i + 1}. ${o.replace(/^★\s*/, "").split(" — ")[0]}`);
  eq("1장은 월 아님(상시공개)", monthOfChapterTitle(titles[0]), null);
  eq("2장 = 9월", monthOfChapterTitle(titles[1]), 9);
  eq("6장 = 1월(해 넘김)", monthOfChapterTitle(titles[5]), 1);
  eq("13장 = 8월", monthOfChapterTitle(titles[12]), 8);
  eq("14장은 월 아님", monthOfChapterTitle(titles[13]), null);

  // 결제 당월: 상시 2장 + 첫 달 1장 = 3장만 열림
  const g0 = gateChapters(titles, sep, KST(2026, 9, 20));
  eq("생성 직후 열린 장 3", g0.filter((x) => x.open).length, 3);
  // 12월(4번째 월장)은 12/1 에 열린다
  eq("12월 장이 열리는 날", kstDay(g0[4].opensAt), "2026-12-01");

  // 11개월 뒤 전부 열림
  const g11 = gateChapters(titles, sep, KST(2027, 8, 1));
  eq("11개월 뒤 14장 전부 열림", g11.filter((x) => x.open).length, 14);

  // 12월 결제자는 12월부터 시작
  const dec = KST(2026, 12, 3);
  const decTitles = buildTwelveMonthOutline(dec).map((o, i) => `${i + 1}. ${o.split(" — ")[0]}`);
  eq("12월 결제자 2장 = 12월", monthOfChapterTitle(decTitles[1]), 12);
  eq("12월 결제자 3장 = 1월", monthOfChapterTitle(decTitles[2]), 1);
  eq("12월 결제자 13장 = 11월", monthOfChapterTitle(decTitles[12]), 11);

  const style = twelveMonthStyle(sep);
  eq("스타일 제목에 ○○", /○○/.test(style.title), true);
  eq("스타일 목차 14장", style.outline.length, 14);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
