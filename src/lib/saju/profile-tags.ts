// 결제 전에 받은 손님 상황(인연 방향·연애 상태·직업).
//
// 별도 컬럼을 두지 않고 concerns 배열에 "[프로필] 키: 값" 문자열로 실어 나른다.
// 이유: concerns 는 이미 주문에 저장되고 결과 생성까지 그대로 흘러간다. 마이그레이션 없이
// 티저·결과지 양쪽에서 같은 값을 읽을 수 있다. prompt.ts 가 이 접두사를 이미 알고 있다.
//
// ⚠ 인연 방향만은 프롬프트용이 아니다 — computeInyeonFacts 의 배우자성 계산을 바꾼다.
//   명리에서 남편(남자)은 관성, 아내(여자)는 재성이라 기준이 "내 성별"이 아니라 "상대 성별"이다.

export const PROFILE_PREFIX = "[프로필]";

/** 손님에게 보이는 라벨 → 저장 키. 라벨을 바꿔도 파싱이 안 깨지게 키는 고정한다. */
export const PROFILE_KEYS = {
  partner: "인연 방향",
  relationship: "연애 상태",
  job: "직업",
} as const;

export type ProfileAnswers = {
  /** 인연 상대의 성별. "아직 모르겠다"를 고르면 값이 없다(= 이성으로 계산). */
  partnerSex?: "male" | "female";
  relationship?: string;
  job?: string;
};

export const tag = (key: string, value: string) => `${PROFILE_PREFIX} ${key}: ${value}`;

/**
 * 선택지 — **저장값(value)과 화면 표시(label/ban)를 분리한다.**
 * 산군은 반말, 나머지 상품은 해요체라 같은 문자열을 쓰면 한쪽이 반드시 어긋난다.
 * 저장은 항상 value 로 해야 말투를 바꿔도 예전 주문의 파싱이 안 깨진다.
 */
export type ProfileOption = { value: string; label: string; ban: string };

/** 인연 방향 — value 는 상대의 성별을 정하는 키다 */
export const PARTNER_OPTIONS: (ProfileOption & { sex?: "male" | "female" })[] = [
  { value: "남자", label: "남자", ban: "남자", sex: "male" },
  { value: "여자", label: "여자", ban: "여자", sex: "female" },
  { value: "모름", label: "아직 모르겠어요", ban: "아직 모르겠다" }, // sex 없음 → 이성 인연으로 계산
];

export const RELATIONSHIP_OPTIONS: ProfileOption[] = [
  { value: "혼자", label: "혼자예요", ban: "혼자다" },
  { value: "만나는 사람 있음", label: "만나는 사람이 있어요", ban: "만나는 사람이 있다" },
  { value: "기혼", label: "결혼했어요", ban: "혼인했다" },
  { value: "정리 중", label: "정리하는 중이에요", ban: "정리하는 중이다" },
];

export const JOB_OPTIONS: ProfileOption[] = [
  { value: "직장인", label: "직장에 다녀요", ban: "직장에 다닌다" },
  { value: "자영업", label: "장사를 해요", ban: "장사를 한다" },
  { value: "프리랜서", label: "혼자 일해요", ban: "혼자 일한다" },
  { value: "전문직", label: "전문직이에요", ban: "전문직이다" },
  { value: "가사", label: "집안을 돌봐요", ban: "집안을 돌본다" },
  { value: "학생·준비", label: "공부하거나 준비 중이에요", ban: "공부하거나 준비 중이다" },
];

/** 저장값 → 화면에 보여줄 문장. 확인 화면이 "혼자" 대신 손님이 고른 문장을 그대로 보여주게 한다. */
export const displayOf = (opts: ProfileOption[], value: string, ban: boolean) =>
  opts.find((o) => o.value === value)?.[ban ? "ban" : "label"] ?? value;

/** concerns 에서 프로필 답만 골라 읽는다. 없으면 빈 객체 — 호출부는 예전처럼 동작하면 된다. */
export function parseProfileTags(concerns: string[] | null | undefined): ProfileAnswers {
  const out: ProfileAnswers = {};
  for (const raw of concerns ?? []) {
    if (!raw.startsWith(PROFILE_PREFIX)) continue;
    const body = raw.slice(PROFILE_PREFIX.length).trim();
    const at = body.indexOf(":");
    if (at < 0) continue;
    const key = body.slice(0, at).trim();
    const value = body.slice(at + 1).trim();
    if (!value) continue;
    if (key === PROFILE_KEYS.partner) {
      out.partnerSex = PARTNER_OPTIONS.find((o) => o.value === value)?.sex;
    } else if (key === PROFILE_KEYS.relationship) {
      out.relationship = value;
    } else if (key === PROFILE_KEYS.job) {
      out.job = value;
    }
  }
  return out;
}
