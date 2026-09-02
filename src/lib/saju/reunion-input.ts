// =====================================================
// 재회예보 전용 입력 (2026-09-02 신설)
// =====================================================
// 위저드가 묻는 여섯 가지 — 이별 시기 · 연애 기간 · 이별 통보 · 이별 사유 · 그 사람 · 지금 마음.
//
// 별도 컬럼을 두지 않고 profile-tags 와 **같은 길**로 실어 나른다:
//   concerns 배열에 "[프로필] 키: 값" 문자열 → orders/create → saju_inputs.concerns
//   → generate-result → prompt·facts. 마이그레이션이 0이고, 티저(무료)와 결과지(유료)가
//   같은 값을 읽는다. prompt.ts 는 이 접두사를 이미 알고 있어 고민 키워드로 새지 않는다.
//
// ⚠ 그 사람 정보만은 **한 태그에 묶어** 싣는다(이름·성별·생일·시각을 각각 태그로 풀면
//   concerns 가 max 20 인데 프로필 3 + 재회 9 + 고민 6 + 자유입력 1 = 19 로 천장에 붙는다).
//
// 필수는 「지금 마음」 하나뿐이다. 나머지는 전부 건너뛸 수 있고, 그 사람 정보가 통째로 없어도
// 내 명식 중심으로 결과지가 성립한다(청월당 실측: 거의 전 항목 스킵 가능, 감정만 필수).

import { PROFILE_PREFIX, type ProfileOption, type OptionTone } from "./profile-tags";
import type { BirthInfo } from "./saju-api";

/** 이 상품 하나만 아래 입력을 쓴다. 문자열을 여기저기 박지 않기 위한 상수. */
export const REUNION_SLUG = "reunion-saju";

/** 손님에게 보이는 라벨 → 저장 키. 라벨을 바꿔도 파싱이 안 깨지게 키는 고정한다. */
export const REUNION_KEYS = {
  breakupAt: "이별 시기",
  datingLength: "연애 기간",
  whoEnded: "이별 통보",
  reason: "이별 사유",
  partner: "그 사람",
  feeling: "지금 마음",
} as const;

const REUNION_KEY_SET: Set<string> = new Set(Object.values(REUNION_KEYS));

/** prompt.ts 가 「독자 상황」 줄에서 재회 태그를 빼낼 때 쓴다(재회는 전용 블록으로 따로 간다). */
export function isReunionTag(raw: string): boolean {
  if (!raw.startsWith(PROFILE_PREFIX)) return false;
  const body = raw.slice(PROFILE_PREFIX.length).trim();
  const at = body.indexOf(":");
  return at > 0 && REUNION_KEY_SET.has(body.slice(0, at).trim());
}

// ── 선택지 ────────────────────────────────────────────
// 저장은 언제나 value 로 한다(말투를 바꿔도 예전 주문의 파싱이 안 깨진다).
// jik = 직녀 상품의 **손님 대사**. 직녀는 해요체로 묻고 버튼은 손님이 말하는 자리라 반말이다.

/** 연애 기간 — 청월당 빈칸 문장형(「연애 기간은 ___ 이에요.」)의 우리 판. 설문 느낌을 지운다. */
export const DATING_LENGTH_OPTIONS: ProfileOption[] = [
  { value: "3개월 안쪽", label: "3개월 안쪽이에요", ban: "3개월 안쪽이다", jik: "3개월 안쪽이야" },
  { value: "6개월쯤", label: "6개월쯤이에요", ban: "6개월쯤이다", jik: "6개월쯤이야" },
  { value: "1년쯤", label: "1년쯤이에요", ban: "1년쯤이다", jik: "1년쯤이야" },
  { value: "2~3년", label: "2~3년이에요", ban: "2~3년이다", jik: "2~3년이야" },
  { value: "4년 넘게", label: "4년 넘게예요", ban: "4년이 넘는다", jik: "4년 넘게야" },
];

/** 누가 통보했나 — 타이트 실측 문항(「이별을 먼저 이야기한 쪽은?」)의 번안. */
export const WHO_ENDED_OPTIONS: ProfileOption[] = [
  { value: "나", label: "제가 먼저 말했어요", ban: "네가 먼저 말했다", jik: "내가 먼저 말했어" },
  { value: "그 사람", label: "그 사람이 먼저 말했어요", ban: "그쪽이 먼저 말했다", jik: "그 사람이 먼저 말했어" },
];

/**
 * 이별 사유 5지 — 타이트 번안.
 * 「그 사람의 ~」 프레임을 둘 남긴다: 선택지에서부터 「네 탓 아님」을 깔아 두는 자리다.
 */
export const BREAKUP_REASON_OPTIONS: ProfileOption[] = [
  { value: "썸·고백", label: "썸이 끝났거나 고백이 안 됐어요", ban: "썸이 끝났거나 고백이 안 됐다", jik: "썸이 끝났어" },
  { value: "성격·다툼", label: "성격이 안 맞아 자주 다퉜어요", ban: "성격이 안 맞아 자주 다퉜다", jik: "성격이 안 맞아 자주 다퉜어" },
  { value: "집착·이성문제", label: "그 사람의 집착이나 이성 문제가 있었어요", ban: "그쪽의 집착이나 이성 문제가 있었다", jik: "그 사람 집착이나 이성 문제가 있었어" },
  { value: "잠수·통보", label: "그 사람이 잠수하거나 통보했어요", ban: "그쪽이 잠수하거나 통보했다", jik: "그 사람이 잠수하거나 통보했어" },
  { value: "바람", label: "바람이 있었어요", ban: "바람이 있었다", jik: "바람이 있었어" },
];

/**
 * 지금 마음 — **유일한 필수**. 청월당 + 음양관 합성 5지.
 * 뒤 셋이 **환승 트랙**이다. 재회 상품인데 「더 좋은 사람」·「너무 미워요」를 넣는 이유:
 * 이 손님을 이탈시키는 대신 9장(잇지 않는다면)을 두껍게 만들어 같은 결과지로 받는다.
 */
export const FEELING_OPTIONS: (ProfileOption & { track: "reunion" | "moveon" })[] = [
  { value: "재회", label: "다시 만나고 싶어요", ban: "다시 만나고 싶다", jik: "다시 만나고 싶어", track: "reunion" },
  { value: "갈림길", label: "붙잡을지 새 사람일지 고민돼요", ban: "붙잡을지 새 사람일지 고민이다", jik: "붙잡을지 새 사람일지 고민이야", track: "reunion" },
  { value: "새사람", label: "더 좋은 사람 만날 수 있을까요", ban: "더 좋은 사람을 만날 수 있는지 궁금하다", jik: "더 좋은 사람 만날 수 있을까", track: "moveon" },
  { value: "상처", label: "상처받아서 힘들어요", ban: "상처받아 힘들다", jik: "상처받아서 힘들어", track: "moveon" },
  { value: "미움", label: "그 사람이 너무 미워요", ban: "그쪽이 너무 밉다", jik: "그 사람이 너무 미워", track: "moveon" },
];

/** 감정 선택이 환승 트랙인가 — 9장(잇지 않는다면)의 비중을 키우는 스위치. */
export function feelingTrack(value: string | undefined): "reunion" | "moveon" {
  return FEELING_OPTIONS.find((o) => o.value === value)?.track ?? "reunion";
}

/** 저장값 → 화면·프롬프트에 쓸 문장. 없는 값이면 저장값을 그대로 돌려준다. */
export function reunionLabel(opts: ProfileOption[], value: string | undefined, tone: OptionTone = "label"): string {
  if (!value) return "";
  const o = opts.find((x) => x.value === value);
  if (!o) return value;
  return (tone === "jik" ? o.jik : tone === "ban" ? o.ban : o.label) ?? o.label;
}

// ── 입력 구조체 ───────────────────────────────────────

/** 그 사람(전 애인) — **전부 옵션**이다. 통째로 없어도 상품이 성립한다. */
export type ReunionPartner = {
  /** 결과지·티저에서 줄여 호명하는 용도(청월당 실측: 「준호 옆에」). 없으면 「그 사람」으로 부른다. */
  name?: string;
  gender?: "male" | "female";
  /** "YYYY-MM-DD" */
  birthDate?: string;
  /** "HH:mm" — 모르면 없음. 있으면 상대 명식이 시주까지 선다. */
  birthTime?: string;
};

export type ReunionInput = {
  /** 이별 시기 — 년. 월만 있고 년이 없는 상태는 만들지 않는다. */
  breakupYear?: number;
  /** 이별 시기 — 월(1~12) */
  breakupMonth?: number;
  /** DATING_LENGTH_OPTIONS 의 value */
  datingLength?: string;
  /** WHO_ENDED_OPTIONS 의 value */
  whoEnded?: string;
  /** BREAKUP_REASON_OPTIONS 의 value */
  reason?: string;
  /** FEELING_OPTIONS 의 value — 유일한 필수 */
  feeling?: string;
  partner?: ReunionPartner;
};

// ── 태그 조립 / 해석 ──────────────────────────────────

const tag = (key: string, value: string) => `${PROFILE_PREFIX} ${key}: ${value}`;

/** 그 사람 한 줄 — "이름=준호;성별=남;생일=1992-03-14;시각=13:20" (빈 항목은 뺀다) */
function packPartner(p: ReunionPartner): string {
  const parts: string[] = [];
  if (p.name?.trim()) parts.push(`이름=${p.name.trim()}`);
  if (p.gender) parts.push(`성별=${p.gender === "male" ? "남" : "여"}`);
  if (p.birthDate) parts.push(`생일=${p.birthDate}`);
  if (p.birthTime) parts.push(`시각=${p.birthTime}`);
  return parts.join(";");
}

function unpackPartner(raw: string): ReunionPartner | undefined {
  const out: ReunionPartner = {};
  for (const chunk of raw.split(";")) {
    const at = chunk.indexOf("=");
    if (at < 0) continue;
    const k = chunk.slice(0, at).trim();
    const v = chunk.slice(at + 1).trim();
    if (!v) continue;
    if (k === "이름") out.name = v;
    else if (k === "성별") out.gender = v === "남" ? "male" : v === "여" ? "female" : undefined;
    else if (k === "생일" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out.birthDate = v;
    else if (k === "시각" && /^\d{1,2}:\d{2}/.test(v)) out.birthTime = v.slice(0, 5);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * 위저드가 부른다 — 답한 것만 태그로 만든다.
 * 반환값을 `concerns` 앞에 그대로 펼쳐 넣으면 배선이 끝난다(profileTags() 와 같은 자리).
 */
export function reunionTags(input: ReunionInput): string[] {
  const out: string[] = [];
  if (input.breakupYear) {
    const mm = input.breakupMonth ? `-${String(input.breakupMonth).padStart(2, "0")}` : "";
    out.push(tag(REUNION_KEYS.breakupAt, `${input.breakupYear}${mm}`));
  }
  if (input.datingLength) out.push(tag(REUNION_KEYS.datingLength, input.datingLength));
  if (input.whoEnded) out.push(tag(REUNION_KEYS.whoEnded, input.whoEnded));
  if (input.reason) out.push(tag(REUNION_KEYS.reason, input.reason));
  if (input.partner) {
    const packed = packPartner(input.partner);
    if (packed) out.push(tag(REUNION_KEYS.partner, packed));
  }
  if (input.feeling) out.push(tag(REUNION_KEYS.feeling, input.feeling));
  return out;
}

/** concerns 에서 재회 답만 골라 읽는다. 없으면 빈 객체 — 호출부는 예전처럼 동작하면 된다. */
export function parseReunionTags(concerns: string[] | null | undefined): ReunionInput {
  const out: ReunionInput = {};
  for (const raw of concerns ?? []) {
    if (!raw.startsWith(PROFILE_PREFIX)) continue;
    const body = raw.slice(PROFILE_PREFIX.length).trim();
    const at = body.indexOf(":");
    if (at < 0) continue;
    const key = body.slice(0, at).trim();
    const value = body.slice(at + 1).trim();
    if (!value) continue;
    switch (key) {
      case REUNION_KEYS.breakupAt: {
        const m = value.match(/^(\d{4})(?:-(\d{1,2}))?$/);
        if (!m) break;
        out.breakupYear = Number(m[1]);
        const mm = m[2] ? Number(m[2]) : 0;
        if (mm >= 1 && mm <= 12) out.breakupMonth = mm;
        break;
      }
      case REUNION_KEYS.datingLength:
        out.datingLength = value;
        break;
      case REUNION_KEYS.whoEnded:
        out.whoEnded = value;
        break;
      case REUNION_KEYS.reason:
        out.reason = value;
        break;
      case REUNION_KEYS.partner:
        out.partner = unpackPartner(value);
        break;
      case REUNION_KEYS.feeling:
        out.feeling = value;
        break;
    }
  }
  return out;
}

/** 상대 명식을 뽑을 수 있는가 — 생일이 없으면 만세력을 부르지 않는다(빈 콜 = 한도 낭비). */
export function hasPartnerChart(input: ReunionInput): boolean {
  return !!input.partner?.birthDate;
}

/**
 * 상대 생년월일 → 만세력 BirthInfo. **엔진을 포크하지 않는다** — 내 명식과 같은
 * fetchSajuAnalysis 를 한 번 더 부를 뿐이다.
 * 달력은 안 묻는다(양력 고정) — 전 애인의 음/양력까지 아는 손님은 드물고, 물으면 마찰만 는다.
 * 성별을 모르면 내 성별의 반대로 둔다(호출 자체를 막지 않기 위한 폴백 — 명식 여덟 글자는
 * 성별과 무관하고, 성별은 대운 방향에만 쓰인다).
 */
export function partnerBirthInfo(input: ReunionInput, myGender: "male" | "female"): BirthInfo | null {
  const p = input.partner;
  if (!p?.birthDate) return null;
  const [y, m, d] = p.birthDate.split("-");
  const [hh, mm] = p.birthTime ? p.birthTime.split(":") : [undefined, undefined];
  return {
    birthYear: y,
    birthMonth: String(parseInt(m, 10)),
    birthDay: String(parseInt(d, 10)),
    ...(hh ? { birthHour: String(parseInt(hh, 10)), birthMinute: String(parseInt(mm ?? "0", 10)) } : {}),
    calendarType: "양력",
    gender: p.gender ?? (myGender === "female" ? "male" : "female"),
  };
}

/** 결과지·티저에서 그 사람을 부르는 말. 이름을 받았으면 이름으로, 아니면 「그 사람」. */
export function partnerCallName(input: ReunionInput): string {
  const n = input.partner?.name?.trim();
  return n ? n : "그 사람";
}
