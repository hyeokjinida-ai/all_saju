// =====================================================
// 사주 해석 프롬프트 빌더
// =====================================================
// 상품 slug 별로 톤/분량을 다르게. 수강생은 여기서 본인 톤으로 갈아끼우면 됩니다.

import type { Myeongsik } from "./manseryeok";

export type PromptInput = {
  productSlug: string;
  productName: string;
  myeongsik: Myeongsik;
  // luckyloveme 풀 분석이 있으면 4기둥 자리 대신 이 텍스트(천간지지/십성/대운/세운/12운성/신살 등 16종)로 교체.
  // 없으면(데모 / 호출 실패 fallback) 단순 4기둥만 포함.
  manseryeokText?: string;
  birthDate: string;
  birthTime: string | null;
  timeUnknown: boolean;
  gender: "male" | "female";
  concerns: string[];
};

const SYSTEM_BASE = `당신은 따뜻하고 공감력이 높은 사주 풀이 전문가입니다.
원칙:
- 단정적인 운명론은 피하고, 가능성과 경향성으로 표현합니다.
- 부정적인 내용도 반드시 행동 가능한 조언으로 마무리합니다.
- 한국어로, 친근한 존댓말로 작성합니다.
- 마크다운 헤딩(##, ###)과 불릿을 적극 사용합니다.
- 점성/주술적 권유나 비과학적 단정은 피합니다.`;

const STYLE_BY_SLUG: Record<string, { length: string; focus: string }> = {
  "today-fortune": {
    length: "2-3문장",
    focus: "오늘 하루의 흐름과 작은 행동 팁 1개",
  },
  "basic-saju": {
    length: "600-900자",
    focus: "기본 성향, 강점, 보완점, 올해의 흐름",
  },
  "love-saju": {
    length: "900-1200자",
    focus: "연애 패턴, 잘 맞는 상대 유형, 갈등 패턴, 현재 관계 조언",
  },
  "premium-saju": {
    length: "1500-2000자",
    focus: "대운/세운 흐름, 직업운, 재물운, 건강운, 인간관계 종합",
  },
};

export function buildSajuPrompt(input: PromptInput): { system: string; user: string } {
  const style = STYLE_BY_SLUG[input.productSlug] ?? STYLE_BY_SLUG["basic-saju"];
  const m = input.myeongsik;
  const pillar = (p: { cheongan: string; jiji: string } | null) =>
    p ? `${p.cheongan}${p.jiji}` : "(시 미상)";

  // 풀 분석 텍스트가 있으면 그걸 우선 사용, 없으면 단순 4기둥
  const sajuSection = input.manseryeokText
    ? `[사주 풀 명식]\n${input.manseryeokText}`
    : [
        `[사주 4기둥]`,
        `- 년주: ${pillar(m.year)}`,
        `- 월주: ${pillar(m.month)}`,
        `- 일주: ${pillar(m.day)}`,
        `- 시주: ${pillar(m.hour)}`,
      ].join("\n");

  const user = `[상품] ${input.productName}
[분량] 약 ${style.length}
[핵심 포커스] ${style.focus}

${sajuSection}

[기본 정보]
- 생년월일: ${input.birthDate}${input.timeUnknown ? " (시 미상)" : input.birthTime ? ` ${input.birthTime}` : ""}
- 성별: ${input.gender === "male" ? "남성" : "여성"}
- 고민 키워드: ${input.concerns.length > 0 ? input.concerns.join(", ") : "(미입력)"}

위 정보를 바탕으로 마크다운 리포트를 작성해 주세요.${
    input.manseryeokText
      ? " 천간지지/십성/대운/세운/신살 등 풀 명식 정보를 적극 활용하되, 단정적 표현은 피하고 가능성/경향으로 풀어 주세요."
      : ""
  }`;

  return { system: SYSTEM_BASE, user };
}
