// =====================================================
// 열두 달 장부 — 월 게이트
// =====================================================
// 「매달 1일에 그 달이 열린다」를 **스케줄러 없이** 구현한다.
//
// 왜 스케줄러가 없나: 만세력 API 총 한도가 6,000회다(usage.ts TOTAL_LIMIT).
// 구독자당 12번 호출하면 500명에서 소진된다. 그래서 결제 시 **1회 호출로 12개월치를
// 전부 생성해 저장**하고, 「열림」은 읽는 시점에 날짜만 비교해 판정한다.
// 저장된 본문은 그대로 두고 화면에서만 가린다 — 크론도 배치도 필요 없다.
//
// ⚠ 잠금은 **본문에만** 건다. 열두 달 등급(좋음/보통/조심)은 결제 즉시 전부 보여준다.
//   돈을 냈는데 아무것도 안 보이면 그건 파는 게 아니라 뺏는 것이다.
//
// ⚠⚠ 모든 달 계산은 **KST 고정**이다. 서버(Vercel)는 UTC 로 돈다 —
//    `new Date(y, m, 1)` 을 그대로 쓰면 손님이 한국시간 10월 1일 0시에 열어도
//    서버는 아직 9월 30일 15시라 잠겨 보인다(2026-09-09 검증에서 실측).
//    저장소 관례와 같은 방식(ResultSealOff.tsx: `t + 9h`)으로 맞춘다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC 순간을 KST 달력의 (연, 월) 로. 월은 0-based. */
function kstYearMonth(d: Date): { y: number; m: number } {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() };
}

/** KST 기준 (연, 월) 1일 0시를 UTC 순간으로. */
function kstMonthStart(y: number, m: number): Date {
  return new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - KST_OFFSET_MS);
}

/** 결과지가 만들어진 달(0번째)부터 세어, 지금 몇 번째 달까지 열렸는지.
 *  같은 달이면 0, 다음 달이면 1 … 11개월 뒤면 11. 12개월치를 다 열면 그 뒤로는 11에서 멈춘다.
 *
 *  '달'만 센다(일자 무시) — 매달 1일에 열리므로 8/31 결제자와 8/1 결제자는 9/1에 같이 열린다. */
export function unlockedMonthCount(createdAt: Date, now: Date): number {
  const a = kstYearMonth(createdAt);
  const b = kstYearMonth(now);
  const months = (b.y - a.y) * 12 + (b.m - a.m);
  if (!Number.isFinite(months) || months < 0) return 0; // 시계가 뒤로 간 경우 방어
  return Math.min(months, 11);
}

/** 다음 달이 열리는 순간(KST 1일 0시). 마지막 달까지 다 열렸으면 null. */
export function nextUnlockAt(createdAt: Date, now: Date): Date | null {
  if (unlockedMonthCount(createdAt, now) >= 11) return null;
  const { y, m } = kstYearMonth(now);
  return kstMonthStart(y, m + 1);
}

/** 장 제목에서 '몇 월 장인가'를 읽는다.
 *
 *  프롬프트가 「### 3. 10월 — …」 꼴로 쓰게 돼 있다(prompt.ts monthly-luck).
 *  숫자 뒤에 반드시 '월'이 붙고, 그 앞의 "3." 은 장 번호라 월로 읽으면 안 된다.
 *  그래서 **장 번호(맨 앞 `N.`)를 먼저 떼고** 남은 데서 첫 `N월` 을 찾는다.
 *  못 찾으면 null — 전체 흐름·큰 결정 같은 상시 공개 장이다. */
export function monthOfChapterTitle(title: string): number | null {
  const withoutIndex = title.replace(/^\s*\d+\s*[.)]\s*/, "");
  const m = withoutIndex.match(/(\d{1,2})\s*월/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? n : null;
}

export type MonthGate = {
  /** 이 장을 지금 보여줘도 되는가 */
  open: boolean;
  /** 이 장이 몇 월 장인가 (상시 공개 장이면 null) */
  month: number | null;
  /** 잠겼다면 언제 열리는가 (열려 있으면 null) */
  opensAt: Date | null;
};

/** 챕터 제목 목록을 받아 각 장의 열림/잠김을 판정한다.
 *
 *  월 장(月章)은 **제목의 월 숫자가 아니라 등장 순서**로 센다. 왜냐하면 결제 달이
 *  9월이면 장 순서가 9월·10월·11월·12월·1월… 로 해를 넘기기 때문이다.
 *  숫자로 세면 1월이 첫 장이 돼 버린다. 순서로 세야 「결제 달부터 열두 달」이 맞는다. */
export function gateChapters(titles: string[], createdAt: Date, now: Date): MonthGate[] {
  const unlocked = unlockedMonthCount(createdAt, now);
  const born = kstYearMonth(createdAt);
  let seen = -1; // 지금까지 만난 월 장의 인덱스
  return titles.map((title) => {
    const month = monthOfChapterTitle(title);
    if (month == null) return { open: true, month: null, opensAt: null }; // 상시 공개
    seen += 1;
    if (seen <= unlocked) return { open: true, month, opensAt: null };
    return { open: false, month, opensAt: kstMonthStart(born.y, born.m + seen) };
  });
}

/** 잠긴 장에 박는 본문. 운세위키식 블록문자 — 이미지 제작이 필요 없다. */
export function lockedChapterBody(opensAt: Date | null): string {
  let when = "다음 달 1일";
  if (opensAt) {
    const { y, m } = kstYearMonth(opensAt);
    when = `${y}년 ${m + 1}월 1일`;
  }
  return [
    "████████ ██████ ████ ███████ ████████.",
    "███ ████████ ███ ██████ ███████ ████.",
    "",
    `*이 달의 장부는 **${when}**에 열립니다.*`,
  ].join("\n");
}

// =====================================================
// 열두 달 목차 — 결제한 달부터 열두 달
// =====================================================
// ⚠ 게이트(gateChapters)와 목차(buildTwelveMonthOutline)가 **같은 파일에 있는 이유**가 있다.
//   목차가 「9월」이라 쓰는데 게이트가 다른 규칙으로 월을 읽으면 잠금이 통째로 어긋난다.
//   둘을 갈라 두면 반드시 어긋난다 — 한 곳에서만 달을 만든다.

/** 결제 시점(KST) 기준으로 열두 달의 (연, 월) 목록. 첫 원소가 결제한 달. */
export function twelveMonthsFrom(createdAt: Date): { y: number; m: number }[] {
  const { y, m } = kstYearMonth(createdAt);
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(Date.UTC(y, m + i, 1));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
  });
}

/** 결과지 목차 14장 —
 *  1장 전체 흐름(상시) · 2~13장 각 달(그 달에 열림) · 14장 큰 결정(상시).
 *
 *  장 제목은 `"{n}월 — …"` 꼴이어야 한다. buildChapterPrompts 가
 *  `" — "` 앞부분만 잘라 `### 3. 10월` 로 만들고, monthOfChapterTitle 이 거기서 월을 읽는다. */
export function buildTwelveMonthOutline(createdAt: Date): string[] {
  const months = twelveMonthsFrom(createdAt);
  const first = months[0];
  const last = months[11];
  const span = `${first.y}년 ${first.m + 1}월부터 ${last.y}년 ${last.m + 1}월까지`;

  const monthChapters = months.map(({ y, m }, i) => {
    const label = `${y}년 ${m + 1}월`;
    const only = `**이 장은 오직 ${label} 한 달만** 말합니다. 다른 달을 끌어오지 마세요.`;
    // 첫 달은 「지금 당장」이라 행동을 더 구체적으로, 나머지는 미리 준비하는 톤.
    const tone = i === 0
      ? "이번 달은 손님이 지금 살고 있는 달입니다. 이번 주에 할 일까지 내려가세요."
      : "아직 오지 않은 달입니다. 미리 준비할 것 한 가지를 콕 집어 주세요.";
    return `${m + 1}월 — ${label}의 흐름. ${only} [월운]에서 이 달의 판정을 근거로 삼아 ①이 달의 공기가 어떤지 ②무엇이 잘 풀리고 무엇이 막히는지 ③이 달에 할 일 한 가지를 씁니다. ${tone}`;
  });

  return [
    `열두 달 전체 흐름 — ${span}의 큰 줄기를 한눈에. 어느 달이 오르막이고 어느 달이 내리막인지 먼저 말하고, 올해가 손님에게 어떤 해인지로 맺습니다. 개별 달의 자세한 이야기는 다음 장들의 몫이니 여기서는 흐름만 짚습니다.`,
    ...monthChapters,
    `큰 결정의 때 — 위 열두 달 중에서 이직·계약·이사·투자 같은 큰 결정을 밀어붙일 달과 미룰 달을 골라 이유와 함께 정리합니다. 새로운 달을 만들지 말고 위에서 말한 달들 안에서만 고르세요. 마지막은 한 문장의 당부로 맺습니다.`,
  ];
}

/** 열두 달 장부의 설계(제목·분량·목차). buildChapterPrompts 의 styleOverride 로 넘긴다. */
export function twelveMonthStyle(createdAt: Date): {
  title: string; length: string; outline: string[];
} {
  return {
    title: "○○님의 열두 달 장부",
    length: "각 달의 장은 250~400자로 짧고 또렷하게. 전체 흐름 장과 큰 결정 장은 400~600자.",
    outline: buildTwelveMonthOutline(createdAt),
  };
}
