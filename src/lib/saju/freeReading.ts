// =====================================================
// 무료 결과 해석 엔진 (결제 전 · LLM 없이 결정론적 생성)
// =====================================================
// 결제 전 무료 결과는 비용이 큰 LLM 대신, 계산된 명식에서
// 일간 성향 / 오행 균형 / 올해 흐름 / 고민 맛보기를 규칙 기반으로 뽑아낸다.
// 유료 기본 풀이 본문만 실제 LLM(prompt.ts + llm.ts)을 사용한다.

import type { Myeongsik } from "@/lib/saju/manseryeok";

// ── 한글 간지 → 한자 (디자인 표기용) ──────────────────
export const GAN_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
export const JI_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};
export const ganToHanja = (s: string) => GAN_HANJA[s] ?? s;
export const jiToHanja = (s: string) => JI_HANJA[s] ?? s;

// ── 오행(五行) ────────────────────────────────────────
type Element = "목" | "화" | "토" | "금" | "수";
const ELEMENT_LABEL: Record<Element, string> = {
  목: "나무(木)", 화: "불(火)", 토: "흙(土)", 금: "쇠(金)", 수: "물(水)",
};

const GAN_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};
const JI_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};

// ── 일간(日干) 성향 ───────────────────────────────────
const ILGAN: Record<string, { title: string; trait: string }> = {
  갑: {
    title: "큰 나무처럼 곧게 뻗는 기운",
    trait:
      "한번 방향을 정하면 곧게 밀고 나가는 추진력이 강합니다. 다만 굽히기 어려운 성향 탓에, 상황이 바뀌어도 방향을 못 틀어 혼자 부담을 끌어안기 쉽습니다.",
  },
  을: {
    title: "덩굴처럼 유연하게 감싸는 기운",
    trait:
      "어떤 환경에도 잘 적응하고 끈질기게 버티는 힘이 강합니다. 다만 겉으로 맞춰주느라 속마음을 늦게 꺼내, 참다가 한 번에 지치는 흐름이 생기기 쉽습니다.",
  },
  병: {
    title: "태양처럼 밝게 드러나는 기운",
    trait:
      "감정과 생각을 솔직하게 드러내며 사람을 끌어당기는 힘이 있습니다. 다만 한번 달아오르면 말이 앞서, 뒤늦게 수습하느라 에너지를 쓰는 경우가 많습니다.",
  },
  정: {
    title: "등불처럼 따뜻하게 비추는 기운",
    trait:
      "주변을 세심하게 챙기고 분위기를 살피는 배려가 깊습니다. 다만 남의 감정을 먼저 읽다 보니, 정작 본인 마음은 뒤로 미루다 예민해지기 쉽습니다.",
  },
  무: {
    title: "큰 산처럼 듬직하게 버티는 기운",
    trait:
      "쉽게 흔들리지 않고 사람과 일을 넓게 품는 신용이 있습니다. 다만 다 받아주려다 책임이 한쪽으로 몰리고, 정작 표현은 아껴 속을 알기 어렵다는 말을 듣습니다.",
  },
  기: {
    title: "기름진 밭처럼 실속을 챙기는 기운",
    trait:
      "현실 감각이 좋고 꼼꼼하게 살림과 일을 꾸리는 힘이 있습니다. 다만 멀리까지 미리 걱정하느라, 결정 앞에서 머뭇거리며 기회를 흘려보내기도 합니다.",
  },
  경: {
    title: "단단한 쇠처럼 결단하는 기운",
    trait:
      "한번 마음먹은 일은 쉽게 포기하지 않는 강단과 의리가 있습니다. 다만 주변의 기대와 책임을 혼자 떠안는 흐름이 생기면, 마음은 지치는데 겉으로는 괜찮은 척하기 쉽습니다.",
  },
  신: {
    title: "잘 벼린 칼처럼 예리한 기운",
    trait:
      "깔끔하고 분명한 것을 좋아하며 핵심을 짚는 감각이 날카롭습니다. 다만 기준이 높아 스스로와 주변을 자주 다그치고, 자존심 때문에 속내를 숨기는 편입니다.",
  },
  임: {
    title: "큰 물처럼 흐르며 품는 기운",
    trait:
      "생각의 폭이 넓고 큰 그림을 그리며 사람을 포용하는 지혜가 있습니다. 다만 흐름이 자주 바뀌어, 한곳에 진득하게 머무는 일을 답답해하기 쉽습니다.",
  },
  계: {
    title: "이슬처럼 맑고 섬세한 기운",
    trait:
      "조용히 살피며 앞일을 직관으로 읽어내는 감각이 뛰어납니다. 다만 속을 잘 드러내지 않아, 마음고생을 혼자 삭이다 깊어지는 경우가 많습니다.",
  },
};

// ── 올해(세운) 한 줄 흐름 ─────────────────────────────
function yearGanji(year: number): { hanja: string; element: Element } {
  const gan = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const g = gan[((year - 4) % 10 + 10) % 10];
  return { hanja: ganToHanja(g), element: GAN_ELEMENT[g] };
}

// 일간 오행 vs 올해 오행 관계(십성 단순화)별 한 줄
function yearFlowLine(ilganEl: Element, yearEl: Element): string {
  const order: Element[] = ["목", "화", "토", "금", "수"]; // 생(生) 순환
  const yl = ELEMENT_LABEL[yearEl];
  if (ilganEl === yearEl)
    return `${yl}인 당신에게 같은 ${yl.slice(0, 2)}의 해 — 인연과 일이 함께 늘어 바빠지는 흐름입니다. 혼자 떠안기 쉬우니 사람과 일을 나누는 지혜가 필요합니다.`;
  const next = order[(order.indexOf(ilganEl) + 1) % 5]; // 내가 생하는 것(식상)
  const prev = order[(order.indexOf(ilganEl) + 4) % 5]; // 나를 생하는 것(인성)
  const myCtrl = order[(order.indexOf(ilganEl) + 2) % 5]; // 내가 극하는 것(재성)
  const ctrlMe = order[(order.indexOf(ilganEl) + 3) % 5]; // 나를 극하는 것(관성)
  if (yearEl === next)
    return `${ELEMENT_LABEL[ilganEl]}인 당신에게 ${yl}의 해 — 가진 것을 밖으로 풀어내고 활동이 느는 흐름입니다. 그만큼 지출도 새기 쉬워, 벌이기보다 지키는 관리가 중요합니다.`;
  if (yearEl === prev)
    return `${ELEMENT_LABEL[ilganEl]}인 당신에게 ${yl}의 해 — 도움과 배움, 안정의 기운이 들어오는 흐름입니다. 무리한 확장보다 기반을 다지기 좋은 시기입니다.`;
  if (yearEl === myCtrl)
    return `${ELEMENT_LABEL[ilganEl]}인 당신에게 ${yl}의 해 — 재물과 성과의 기회가 보이는 흐름입니다. 다만 욕심이 앞서면 새기 쉬워, 들어올 때 지키는 준비가 필요합니다.`;
  if (yearEl === ctrlMe)
    return `${ELEMENT_LABEL[ilganEl]}인 당신에게 ${yl}의 해 — 책임과 성과를 시험받는 흐름입니다. 압박이 커질 수 있지만, 그만큼 자리를 잡고 인정받을 기회이기도 합니다.`;
  return `${ELEMENT_LABEL[ilganEl]}인 당신에게 ${yl}의 해 — 변화의 결이 분명한 흐름입니다. 시기를 고르는 것만으로도 결과가 크게 달라집니다.`;
}

// ── 고민별 맛보기 해석 ────────────────────────────────
export const CONCERN_TEASER: Record<string, string> = {
  재물:
    "당신의 재물은 한 번에 크게 얻는 구조라기보다, 꾸준히 쌓고 지키는 힘이 중요하게 작동합니다. 올해는 수입 자체보다 가족·주거·건강과 관련된 지출을 어떻게 다루느냐가 흐름을 좌우합니다.",
  "부부·연애":
    "당신은 관계에서 먼저 마음을 쓰고 책임을 떠안는 쪽으로 흐르기 쉽습니다. 표현이 서툴러 오해가 쌓이는 구조라, 참기보다 솔직하게 풀어내는 한마디가 관계를 바꿉니다.",
  자녀:
    "자녀 문제에서 당신은 끌어주려는 마음이 앞서 혼자 애태우기 쉽습니다. 통제보다 한 발 거리를 두고 지켜보는 흐름이 오히려 관계를 부드럽게 만드는 시기입니다.",
  "직장·사업":
    "당신은 일을 새로 벌이는 힘보다 맡은 일을 끝까지 책임지는 힘이 강합니다. 올해는 확장·이직보다 자리를 단단히 다지는 선택이 더 유리하게 작동합니다.",
  건강:
    "당신은 지치면서도 겉으로는 괜찮은 척 버티는 흐름이 있습니다. 무리가 한 번에 몰려 나타나기 쉬워, 미루지 말고 작은 신호부터 챙기는 것이 중요합니다.",
  "올해 운":
    "올해는 좋은 달과 조심할 달의 차이가 뚜렷한 흐름입니다. 큰 결정을 기운이 약한 시기에 몰아서 하면 탈이 나기 쉬워, 시기를 고르는 것만으로도 결과가 달라집니다.",
  노후:
    "당신은 남을 챙기느라 정작 자신의 노후 준비를 뒤로 미루기 쉬운 구조입니다. 올해는 늘리기보다 지키고 정리하는 쪽으로 방향을 잡는 것이 안정적입니다.",
  가족:
    "당신의 고민은 돈이나 일 그 자체보다 가족과 얽혀 풀리지 않는 경우가 많습니다. 책임을 혼자 떠안는 흐름을 내려놓는 것이 실마리가 됩니다.",
};

// ── 결과 타입 ─────────────────────────────────────────
export type FreeReading = {
  ilgan: { gan: string; hanja: string; element: string; elementLabel: string; title: string; trait: string };
  ohaeng: { element: string; label: string; count: number }[];
  strong: { label: string; note: string };
  weak: { label: string; note: string };
  yearFlow: { year: string; hanja: string; line: string };
  // teaser = 무료로 보여줄 첫 문장(갈증 유발), locked = 결제 후 이어질 잠긴 나머지
  concernTeaser: { concern: string; teaser: string; locked: string } | null;
};

// "첫 문장 + 나머지" 로 분리 — 무료는 teaser 만 노출, 나머지는 결제 유도용으로 흐림
function splitTeaser(text: string): { teaser: string; locked: string } {
  const m = text.match(/^(.*?[.。!?])\s*(.*)$/s);
  if (!m) return { teaser: text, locked: "" };
  return { teaser: m[1].trim(), locked: m[2].trim() };
}

export function buildFreeReading(
  myeongsik: Myeongsik,
  concern: string | null,
  year = new Date().getFullYear(),
): FreeReading {
  const ilganGan = myeongsik.day.cheongan;
  const ilganEl = GAN_ELEMENT[ilganGan] ?? "토";
  const ilganInfo = ILGAN[ilganGan] ?? {
    title: "당신의 중심 기운",
    trait: "타고난 성향이 또렷한 명식입니다.",
  };

  // 오행 카운트
  const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars = [myeongsik.year, myeongsik.month, myeongsik.day, myeongsik.hour];
  for (const p of pillars) {
    if (!p) continue;
    counts[GAN_ELEMENT[p.cheongan]] = (counts[GAN_ELEMENT[p.cheongan]] ?? 0) + 1;
    counts[JI_ELEMENT[p.jiji]] = (counts[JI_ELEMENT[p.jiji]] ?? 0) + 1;
  }
  const order: Element[] = ["목", "화", "토", "금", "수"];
  const ohaeng = order.map((e) => ({ element: e, label: ELEMENT_LABEL[e], count: counts[e] }));

  const strongEl = order.reduce((a, b) => (counts[b] > counts[a] ? b : a), "목" as Element);
  const weakEl = order.reduce((a, b) => (counts[b] < counts[a] ? b : a), "목" as Element);

  const STRONG_NOTE: Record<Element, string> = {
    목: "추진력과 성장의 기운이 넉넉합니다. 벌이는 일이 많은 만큼 마무리에 신경 쓰면 좋습니다.",
    화: "표현과 열정의 기운이 강합니다. 에너지가 한 번에 쏠리지 않도록 페이스 조절이 필요합니다.",
    토: "안정과 책임의 기운이 두텁습니다. 듬직하지만 변화 앞에서 무거워지기 쉽습니다.",
    금: "결단과 원칙의 기운이 단단합니다. 강직한 만큼 유연함을 더하면 관계가 편해집니다.",
    수: "지혜와 융통의 기운이 풍부합니다. 생각이 많은 만큼 실행 시기를 놓치지 않는 게 중요합니다.",
  };
  const WEAK_NOTE: Record<Element, string> = {
    목: "새로 시작하고 뻗어가는 힘이 약해, 결정을 미루다 기회를 놓치기 쉽습니다.",
    화: "드러내고 표현하는 힘이 약해, 마음을 안으로 삭이다 지치기 쉽습니다.",
    토: "중심을 잡고 버티는 힘이 약해, 외부 변화에 쉽게 흔들릴 수 있습니다.",
    금: "끊고 정리하는 힘이 약해, 맺고 끊는 결정 앞에서 머뭇거리기 쉽습니다.",
    수: "쉬어가고 채우는 힘이 약해, 충분히 회복하지 못한 채 달리기 쉽습니다.",
  };

  const yg = yearGanji(year);

  return {
    ilgan: {
      gan: ilganGan,
      hanja: ganToHanja(ilganGan),
      element: ilganEl,
      elementLabel: ELEMENT_LABEL[ilganEl],
      title: ilganInfo.title,
      trait: ilganInfo.trait,
    },
    ohaeng,
    strong: { label: ELEMENT_LABEL[strongEl], note: STRONG_NOTE[strongEl] },
    weak: { label: ELEMENT_LABEL[weakEl], note: WEAK_NOTE[weakEl] },
    yearFlow: { year: `${year}`, hanja: yg.hanja, line: yearFlowLine(ilganEl, yg.element) },
    concernTeaser:
      concern && CONCERN_TEASER[concern]
        ? { concern, ...splitTeaser(CONCERN_TEASER[concern]) }
        : null,
  };
}
