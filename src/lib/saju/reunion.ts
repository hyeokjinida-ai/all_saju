// =====================================================
// 재회 확정값 — 「견우의 재회예보」 전용 계산 (2026-09-02 신설)
// =====================================================
// 새 만세력 엔진을 만들지 않는다. 이미 검증된 월운 기계(computeInyeonFacts)를 그대로 돌리고,
// **라벨만 견우의 말로 바꿔 단다**(오작교가 놓이는 달 = 인연 TOP3). 등급 판정은 gradeMonths 한 곳에서만 나온다 —
// 티저가 「연락해도 되는 달」이라 한 달을 결과지가 다르게 부르면 그 자리에서 신뢰가 끝난다.
//
//   ● 만나는 달(top3)      → 다리가 놓이는 달
//   ◎ 자리가 생기는 달     → 연락해도 되는 달
//   △ 조심할 달            → 먼저 연락하면 안 되는 달
//   ○ 평                   → 그냥 지나가는 달
//
// 여기서 새로 계산하는 것은 넷뿐이다:
//   ② 이별 무렵 판독(죄책감 해제의 근거)  ③ 나↔상대 대조 + 연적 신호  ④ 재회 가능성 판정
//   ⑤ 그 사람의 결(행동 묘사)
//
// ⚠ 내부 점수(odds.score·인연점수)는 **프롬프트에 안 나간다.** 모델은 등급 이름과 달 이름만 받는다
//    (2026-08-31 실측: 「5/12로」 같은 기계 분수를 본문에 그대로 옮겨 적었다).

import {
  computeInyeonFacts,
  jijiRel,
  type InyeonFacts,
  type InyeonRow,
  type SajuAnalysisResponse,
} from "./saju-api";
import { gradeMonths } from "./teaser";
import { buildPartnerFace } from "./partner-face";
import {
  BREAKUP_REASON_OPTIONS,
  DATING_LENGTH_OPTIONS,
  FEELING_OPTIONS,
  WHO_ENDED_OPTIONS,
  feelingTrack,
  partnerCallName,
  reunionLabel,
  type ReunionInput,
} from "./reunion-input";

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

// ── 타입 ──────────────────────────────────────────────

export type ReunionMonthKind =
  | "다리가 놓이는 달"
  | "연락해도 되는 달"
  | "먼저 연락하면 안 되는 달"
  | "그냥 지나가는 달";

/** 월운 한 줄 + 재회 라벨. row 는 computeInyeonFacts 가 만든 그 줄 그대로다(따로 계산 금지). */
export type ReunionMonth = { row: InyeonRow; kind: ReunionMonthKind };

/** 이별 무렵 판독 — 「그날 끊어진 건 당신이 모자라서가 아니에요」의 계산 근거. */
export type ReunionBreakup = {
  year: number;
  month: number | null;
  /** 그 무렵 흐름이 꺾여 있었는가. false 면 false 라고 말한다(지어내지 않는다). */
  bent: boolean;
  /** 무엇이 꺾였는지 — 손님 말 그대로. 프롬프트·티저가 이 문장을 인용한다. */
  marks: string[];
  /** 그 해 흐름의 판정(대흉·흉·평·길·대길). 세운에서 못 찾으면 "" */
  verdict: string;
  /** 그 무렵 10년 단위 흐름이 갈렸는가(±1년) */
  daeunTurn: boolean;
  /** 결과지·티저가 그대로 쓰는 한 줄 */
  line: string;
};

/** 상대 명식이 있을 때만 찬다. 없으면 null 이고 나머지 계산은 전부 산다. */
export type ReunionPartnerRead = {
  callName: string;
  ilgan: string;
  ilji: string;
  /** 나↔상대 일지(배우자 자리) 관계 — jijiRel 과 같은 자 */
  jijiTag: string;
  jijiScore: number;
  /** 나↔상대 일간 관계 — 천간 합/충 */
  ganTag: string;
  ganScore: number;
  /** 그 사람이 실제로 어떻게 행동하는가 — 성격 단어가 아니라 장면으로 쓸 재료 두 줄 */
  traits: string[];
};

/** 연적 신호 — **항상 등장한다.** 근거가 상대 명식이면 구체적으로, 없으면 내 흐름으로 일반 묘사. */
export type ReunionRival = {
  basis: "상대" | "나";
  strength: "강" | "중" | "약";
  /** 행동 패턴 묘사만. 외모·직업·이름 단정은 여기서도 금지다. */
  lines: string[];
  /** 신호가 켜지는 달(있으면) */
  when: { year: number; month: number } | null;
};

export type ReunionOdds = {
  grade: "높음" | "보통" | "낮음";
  /** 내부 점수 — 게이트·회귀 검사용. **프롬프트·화면에 절대 내보내지 않는다.** */
  score: number;
  /** 판정 근거 — 손님이 읽는 말. 등급이 낮으면 낮은 이유가 여기 그대로 선다. */
  reasons: string[];
};

export type ReunionFacts = {
  /** 재라벨의 원본. 그릇 점수·짝의 결·나이대 등 인연 값이 그대로 필요하다. */
  inyeon: InyeonFacts;
  /** 앞으로 열두 달 전부(시간순) — 12칸 격자가 이걸 그린다 */
  months: ReunionMonth[];
  reconnect: ReunionMonth[];
  contactOk: ReunionMonth[];
  contactNo: ReunionMonth[];
  breakup: ReunionBreakup | null;
  partner: ReunionPartnerRead | null;
  rival: ReunionRival;
  odds: ReunionOdds;
  /** 감정 선택이 환승 트랙인가 — 9장(잇지 않는다면) 비중 스위치 */
  track: "reunion" | "moveon";
  /** 손님이 고른 「지금 마음」 문장(라벨) */
  feelingLabel: string;
  /** 이별 사유·통보·연애 기간 문장(라벨). 빈 값은 빈 문자열 */
  reasonLabel: string;
  whoEndedLabel: string;
  datingLengthLabel: string;
  /** 그 사람을 부르는 말 — 이름을 받았으면 이름 */
  callName: string;
};

// ── 천간 관계표 ───────────────────────────────────────
// 지지는 jijiRel(saju-api) 을 그대로 쓴다. 천간은 쓰는 자리가 여기뿐이라 여기 둔다.
const GAN_HAP: Record<string, string> = { 갑: "기", 기: "갑", 을: "경", 경: "을", 병: "신", 신: "병", 정: "임", 임: "정", 무: "계", 계: "무" };
const GAN_CHUNG: Record<string, string> = { 갑: "경", 경: "갑", 을: "신", 신: "을", 병: "임", 임: "병", 정: "계", 계: "정" };
const GAN_READ: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const JI_READ: Record<string, string> = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };

const readGan = (v: string) => GAN_READ[v.slice(0, 1)] ?? v.slice(0, 1);
const readJi = (v: string) => JI_READ[v.slice(0, 1)] ?? v.slice(0, 1);

/**
 * 십성 편중 → 그 사람이 실제로 하는 행동. 성격 단어("고집이 세다")로 끝내지 않는다.
 * 두 줄까지만 뽑는다 — 셋을 넘기면 어느 명식이든 다 맞는 말이 되어 바넘이 된다.
 */
const PARTNER_TRAIT: { key: string; line: string }[] = [
  { key: "bigyeop", line: "혼자 결정을 끝내 놓고 나서 통보하듯 말하는 사람입니다" },
  { key: "siksang", line: "마음이 식으면 말수보다 연락 간격이 먼저 벌어지는 사람입니다" },
  { key: "jaeseong", line: "형편과 조건이 맞는지부터 재고 나서 움직이는 사람입니다" },
  { key: "gwanseong", line: "책임질 자리에선 무거운데, 관계에 이름을 붙이는 건 유독 늦는 사람입니다" },
  { key: "inseong", line: "혼자 오래 생각하다 답을 다 정해 놓고 나서야 말을 꺼내는 사람입니다" },
];

// ── ② 이별 무렵 판독 ─────────────────────────────────

function readBreakup(
  analysis: SajuAnalysisResponse,
  input: ReunionInput,
  myIlji: string,
): ReunionBreakup | null {
  const y = input.breakupYear;
  if (!y) return null;
  const month = input.breakupMonth ?? null;

  const se = rec(analysis.seun);
  const rows = [...arr(se.recentSeuns), rec(se.currentSeun), ...arr(se.upcomingSeuns)];
  const row = rows.find((r) => num(r.year) === y);

  const marks: string[] = [];
  let verdict = "";

  if (row) {
    verdict = str(rec(row.yongsinJudgment).종합판정);
    const score = num(rec(row.yongsinJudgment).종합점수);
    if (/흉/.test(verdict) || score < 0) {
      marks.push("그 해 흐름 자체가 아래로 꺾여 있었습니다");
    }
    if (arr(row.hapChungRelations).some((h) => /충|형|파|해|원진/.test(str(h.type)))) {
      marks.push("그 해에 오래 맺어 둔 것이 부딪혀 끊어지는 자리가 있었습니다");
    }
    const rel = jijiRel(readJi(str(row.ji)), myIlji);
    if (rel && rel.score < 0) marks.push("그 무렵 곁자리가 흔들리고 있었습니다");
  }

  // 10년 단위 흐름이 그 무렵 갈렸는가 — 판이 통째로 바뀐 해라 체감이 가장 크다.
  const daeunTurn = arr(rec(analysis.daeun).all_daeun).some((d) => {
    const s = num(d.year_start);
    return s > 0 && Math.abs(s - y) <= 1;
  });
  if (daeunTurn) marks.push("그 무렵 10년 단위 흐름이 통째로 갈리고 있었습니다");

  // 월운은 만세력 창이 「최근 3개월 + 현재 + 향후 11개월」이라 대개 이별 달까지 못 닿는다.
  // 닿는 경우에만 한 줄 더 얹는다(없으면 없는 대로 — 지어내지 않는다).
  if (month) {
    const w = rec(analysis.weolun);
    const mrows = [...arr(w.recentWeoluns), rec(w.currentWeolun), rec(w.nextWeolun), ...arr(w.upcomingWeoluns)];
    const mrow = mrows.find((r) => num(r.year) === y && num(r.month) === month);
    if (mrow) {
      const mv = str(rec(mrow.yongsinJudgment).종합판정);
      if (/흉/.test(mv)) marks.push("그 달 하나만 떼어 봐도 눌려 있던 달이었습니다");
    }
  }

  const bent = marks.length > 0;
  if (!bent) {
    marks.push("그 무렵 흐름이 크게 꺾여 있진 않았습니다 — 갈라진 자리는 흐름이 아니라 두 사람 사이에 있습니다");
  }

  // 꺾여 있었으면 죄책감을 흐름으로 옮겨 준다. 아니면 그렇다고 말한다 —
  // 없는 꺾임을 지어내면 「계산을 다 보여준다」는 이 상품의 약속이 그 자리에서 깨진다.
  const line = bent
    ? `그날 강이 갈라진 건 모자라서가 아닙니다. ${marks[0]}.`
    : `${marks[0]}. 그러니 흐름 탓으로 덮지 말고, 무엇이 어긋났는지부터 같이 봅시다.`;

  return { year: y, month, bent, marks, verdict, daeunTurn, line };
}

// ── ③ 나↔상대 대조 ───────────────────────────────────

function readPartner(
  partnerAnalysis: SajuAnalysisResponse,
  myIlgan: string,
  myIlji: string,
  callName: string,
): ReunionPartnerRead {
  const day = rec(rec(partnerAnalysis.ganji).day);
  const ilgan = readGan(str(day.gan));
  const ilji = readJi(str(day.ji));

  const jr = jijiRel(ilji, myIlji);
  const jijiTag = jr?.tag ?? "";
  const jijiScore = jr?.score ?? 0;

  let ganTag = "";
  let ganScore = 0;
  if (GAN_HAP[ilgan] === myIlgan) {
    ganTag = "두 사람의 결이 서로 맞물리는 자리";
    ganScore = 10;
  } else if (GAN_CHUNG[ilgan] === myIlgan) {
    ganTag = "두 사람의 결이 정면으로 부딪히는 자리";
    ganScore = -10;
  }

  const sum = rec(rec(partnerAnalysis.sipseong).summary);
  const traits = [...PARTNER_TRAIT]
    .map((t) => ({ ...t, n: num(sum[t.key]) }))
    .sort((a, b) => b.n - a.n)
    .filter((t) => t.n > 0)
    .slice(0, 2)
    .map((t) => t.line);

  return {
    callName,
    ilgan,
    ilji,
    jijiTag,
    jijiScore,
    ganTag,
    ganScore,
    traits: traits.length ? traits : ["말보다 행동이 늦게 오는 사람입니다"],
  };
}

// ── ③-b 연적 신호 ────────────────────────────────────
// 형님 픽: **수위 높게, 항상 등장.** 다만 우리 원칙은 계산이라 근거의 출처를 분명히 갈라 둔다.
//   상대 명식이 있으면 → 그 사람 흐름에서 뽑아 구체적으로(달까지)
//   없으면            → 내 명식의 짝 자리 흐름으로 일반 묘사(달을 단정하지 않는다)
// 어느 쪽이든 **외모·직업·이름은 그리지 않는다**(청월당이 외모 대신 행동 패턴을 그리는 이유와 같다).

const RIVAL_BEHAVIOR: Record<string, string> = {
  목: "먼저 다음 약속을 잡아 주는 사람이 그 옆에 섭니다",
  화: "그 자리에서 좋다는 말을 해 버리는 사람이 그 옆에 섭니다",
  토: "말없이 필요한 걸 먼저 해결해 두는 사람이 그 옆에 섭니다",
  금: "애매한 사이를 오래 두지 않고 이름부터 붙이는 사람이 그 옆에 섭니다",
  수: "지나가듯 한 말을 기억했다가 되묻는 사람이 그 옆에 섭니다",
};

function readRival(
  mine: InyeonFacts,
  partnerFacts: InyeonFacts | null,
  callName: string,
): ReunionRival {
  if (partnerFacts) {
    const hit = partnerFacts.top3[0];
    const when = hit ? { year: hit.year, month: hit.month } : null;
    const hot = hit ? hit.tags.some((t) => /짝|끌림|도화|매력|합/.test(t)) : false;
    const strength: "강" | "중" | "약" = hot && partnerFacts.dohwaCount > 0 ? "강" : hot ? "중" : "약";
    const lines = [
      when
        ? `${callName} 쪽 흐름에는 ${when.year}년 ${when.month}월께 새 사람이 붙는 자리가 켜져 있습니다.`
        : `${callName} 쪽 흐름에도 새 사람이 붙는 자리가 열려 있습니다.`,
      RIVAL_BEHAVIOR[partnerFacts.spouseOh] ?? RIVAL_BEHAVIOR["토"],
      strength === "강"
        ? "지금 그 자리가 비어 있다고 생각하면 안 됩니다. 먼저 움직이는 사람이 이미 있습니다."
        : strength === "중"
          ? "아직 자리는 비어 있는데, 그 자리를 노리는 쪽이 이미 근처에 있습니다."
          : "당장 옆에 붙은 사람은 안 보입니다. 대신 그만큼 시간이 남아 있습니다.",
    ];
    return { basis: "상대", strength, lines, when };
  }

  // 상대 명식이 없을 때 — 내 짝 자리 흐름으로만 말한다. 달은 단정하지 않는다.
  // ⚠ 세기를 「흔들리는 달이 있나」로 가르면 안 된다: shaky 는 거의 모든 명식에서 차므로
  //    전원이 「강」으로 나오고, 그러면 판정 점수가 손님마다 안 갈린다(2026-09-02 연기검사에서 잡음).
  //    원국 자체의 곁자리 상태(일지 충·원진)와 도화 수로만 가른다 — 이건 명식마다 다르다.
  const strength: "강" | "중" | "약" =
    mine.iljiHurt && mine.dohwaCount > 0 ? "강" : mine.iljiHurt || mine.dohwaCount >= 2 ? "중" : "약";
  return {
    basis: "나",
    strength,
    lines: [
      "그 사람 생일을 안 받아서 그쪽 흐름은 직접 못 봤습니다. 대신 곁자리 흐름으로 말씀드립니다.",
      RIVAL_BEHAVIOR[mine.spouseOh] ?? RIVAL_BEHAVIOR["토"],
      strength === "약"
        ? "지금은 그 자리를 밀고 들어오는 쪽이 세지 않습니다. 서두르지 않아도 되는 구간입니다."
        : "곁자리가 흔들리는 구간입니다. 이런 때 옆자리는 오래 비어 있지 않습니다.",
    ],
    when: null,
  };
}

// ── ④ 재회 가능성 판정 ───────────────────────────────
// **흐름에서만 뽑는다.** 이별 사유·통보한 쪽 같은 손님 입력은 점수에 안 넣는다 —
// 그건 사주가 아니라 사연이고, 사연으로 등급을 매기면 「계산을 다 보여준다」는 상품 약속이 깨진다.
// (사연은 프롬프트가 문장으로 다룬다.)

function judgeOdds(
  mine: InyeonFacts,
  reconnect: ReunionMonth[],
  contactOk: ReunionMonth[],
  contactNo: ReunionMonth[],
  partner: ReunionPartnerRead | null,
  breakup: ReunionBreakup | null,
  rival: ReunionRival,
): ReunionOdds {
  const reasons: string[] = [];
  let s = 46;

  // ⚠ **개수로 세지 않는다.** top3 는 후보가 있는 한 늘 세 개라 개수엔 정보가 없다
  //   (연기검사에서 전원 +18 이 붙어 판정이 안 갈렸다). 갈리는 건 **그 달의 질**이다.
  const best = reconnect[0]?.row.score ?? -999;
  const second = reconnect[1]?.row.score ?? -999;
  if (best >= 30) {
    s += 14;
    reasons.push("열두 달 안에 다리가 뚜렷하게 놓입니다");
  } else if (best >= 15) {
    s += 8;
    reasons.push("열두 달 안에 다리가 놓이긴 합니다");
  } else if (best >= 0) {
    s += 2;
    reasons.push("다리가 놓이긴 하는데 폭이 좁습니다");
  } else {
    s -= 6;
    reasons.push("열두 달 안에는 다리가 안 놓입니다");
  }
  if (second >= 15) s += 4;

  // 문이 몇 번이나 열리는가 — 한 달만 열리는 사람과 여섯 달이 열리는 사람은 다르다.
  if (contactOk.length >= 6) s += 4;
  else if (contactOk.length <= 3) {
    s -= 4;
    reasons.push("연락이 닿는 달 자체가 적습니다");
  }

  if (partner) {
    if (partner.jijiScore > 0) {
      s += 12;
      reasons.push(`두 사람 곁자리가 서로 맞물립니다(${partner.jijiTag})`);
    } else if (partner.jijiScore < 0) {
      s -= 14;
      reasons.push(`두 사람 곁자리가 서로 어긋납니다(${partner.jijiTag})`);
    }
    s += partner.ganScore;
    if (partner.ganTag) reasons.push(partner.ganTag + "입니다");
  }

  if (breakup) {
    if (breakup.bent) {
      s += 6;
      reasons.push("갈라진 그 무렵 흐름이 꺾여 있었습니다 — 사람이 아니라 때의 문제였다는 뜻입니다");
    } else {
      s -= 2;
      reasons.push("갈라진 무렵 흐름은 나쁘지 않았습니다 — 때 탓으로 돌릴 수 없는 자리입니다");
    }
  }

  if (mine.iljiHurt) {
    s -= 8;
    reasons.push("내 곁자리가 원래 흔들림을 안고 있습니다");
  }

  if (rival.strength === "강") {
    s -= 12;
    reasons.push("그 자리를 먼저 채우려는 쪽이 셉니다");
  } else if (rival.strength === "중") {
    s -= 5;
  }

  if (contactNo.length >= 5) {
    s -= 8;
    reasons.push("먼저 연락하면 안 되는 달이 열두 달의 절반 가깝습니다");
  } else if (contactNo.length >= 4) {
    s -= 4;
  }

  // 상대 명식을 안 받았으면 판정을 강하게 못 민다 — 근거가 반쪽이기 때문이다.
  // 「높음」은 두 사람 명식이 실제로 맞물릴 때만 나오게 천장을 내린다(과한 확신이 곧 환불이다).
  if (!partner) s = Math.min(s, 60);

  const score = Math.max(5, Math.min(95, s));
  const grade: "높음" | "보통" | "낮음" = score >= 62 ? "높음" : score >= 45 ? "보통" : "낮음";
  return { grade, score, reasons };
}

// ── 본체 ──────────────────────────────────────────────

export type ReunionOptions = {
  /** 상대(전 애인) 명식. 없으면 나 중심으로 전부 성립한다. */
  partnerAnalysis?: SajuAnalysisResponse | null;
  /** 위저드 「인연 방향」 답. 상대 성별을 직접 받았으면 그쪽이 이긴다. */
  partnerSex?: "male" | "female";
};

export function computeReunionFacts(
  analysis: SajuAnalysisResponse,
  gender: "male" | "female",
  input: ReunionInput,
  opts: ReunionOptions = {},
): ReunionFacts {
  // 상대 성별 — 배우자성이 여기서 갈린다. 상대 정보를 받았으면 그 값이 1순위다.
  const partnerSex = input.partner?.gender ?? opts.partnerSex;
  const inyeon = computeInyeonFacts(analysis, gender, partnerSex);

  // ① 12칸 재라벨 — 등급은 gradeMonths 한 곳에서만 나온다(티저·결과지 공용).
  const gradeBy = new Map(gradeMonths(inyeon).map((g) => [`${g.year}-${g.month}`, g.grade]));
  const KIND: Record<string, ReunionMonthKind> = {
    "●": "다리가 놓이는 달",
    "◎": "연락해도 되는 달",
    "△": "먼저 연락하면 안 되는 달",
    "○": "그냥 지나가는 달",
  };
  const months: ReunionMonth[] = inyeon.months.map((row) => ({
    row,
    kind: KIND[gradeBy.get(`${row.year}-${row.month}`) ?? "○"] ?? "그냥 지나가는 달",
  }));
  const reconnect = months.filter((m) => m.kind === "다리가 놓이는 달");
  // 「연락해도 되는 달」은 다리가 놓이는 달을 포함한다 — 다리가 놓인 달에 연락을 막으면 자기모순이다.
  const contactOk = months.filter((m) => m.kind === "다리가 놓이는 달" || m.kind === "연락해도 되는 달");
  const contactNo = months.filter((m) => m.kind === "먼저 연락하면 안 되는 달");

  const day = rec(rec(analysis.ganji).day);
  const myIlgan = readGan(str(day.gan));
  const myIlji = readJi(str(day.ji)) || inyeon.ilji;

  const callName = partnerCallName(input);
  const breakup = readBreakup(analysis, input, myIlji);

  const pa = opts.partnerAnalysis ?? null;
  const partner = pa ? readPartner(pa, myIlgan, myIlji, callName) : null;
  // 연적 근거 — 그 사람 쪽에서 본 「새 인연」. 기준 성별은 내 성별이다(그 사람이 볼 짝이 나다).
  const partnerFacts = pa
    ? computeInyeonFacts(pa, input.partner?.gender ?? (gender === "female" ? "male" : "female"), gender)
    : null;
  const rival = readRival(inyeon, partnerFacts, callName);
  const odds = judgeOdds(inyeon, reconnect, contactOk, contactNo, partner, breakup, rival);

  return {
    inyeon,
    months,
    reconnect,
    contactOk,
    contactNo,
    breakup,
    partner,
    rival,
    odds,
    track: feelingTrack(input.feeling),
    feelingLabel: reunionLabel(FEELING_OPTIONS, input.feeling),
    reasonLabel: reunionLabel(BREAKUP_REASON_OPTIONS, input.reason),
    whoEndedLabel: reunionLabel(WHO_ENDED_OPTIONS, input.whoEnded),
    datingLengthLabel: reunionLabel(DATING_LENGTH_OPTIONS, input.datingLength),
    callName,
  };
}

// ── 프롬프트 블록 ─────────────────────────────────────

/** "2027년 6월" — 라벨은 월운 행이 이미 들고 있다(따로 만들면 표기가 갈린다). */
const label = (m: ReunionMonth) => m.row.label;

/**
 * 재회 확정값 블록 — 모델에게 **등급 이름과 달 이름만** 준다.
 * 내부 점수(인연점수·판정 점수·n/12)는 한 줄도 안 나간다: 모델이 그 숫자를 본문에 그대로
 * 옮겨 적고(2026-08-31 실측), 손님에게 뜻 없는 기계 숫자라 「돌린 것」으로 읽히며,
 * 린터의 내부점수노출(FAIL)에도 걸린다.
 */
export function buildReunionFactsBlock(f: ReunionFacts): string {
  const lines: string[] = [];

  lines.push(`- 그 사람을 부르는 말: ${f.callName} — 본문에서 이 말로만 부를 것`);
  if (f.feelingLabel) {
    lines.push(
      `- 지금 마음(손님이 고른 것): 「${f.feelingLabel}」${
        f.track === "moveon"
          ? " — **환승 트랙이다.** 9장(강을 건너지 않는다면)을 가장 두껍게 쓰고, 재회를 권하지 말 것"
          : ""
      }`,
    );
  }
  if (f.datingLengthLabel) lines.push(`- 연애 기간: ${f.datingLengthLabel}`);
  if (f.whoEndedLabel) lines.push(`- 이별을 먼저 말한 쪽: ${f.whoEndedLabel}`);
  if (f.reasonLabel) lines.push(`- 이별 사유(손님이 고른 것): ${f.reasonLabel} — 나무라지 말 것`);

  // ② 이별 무렵
  if (f.breakup) {
    lines.push(
      `- 이별 무렵 판독(${f.breakup.year}년${f.breakup.month ? ` ${f.breakup.month}월` : ""}): ${
        f.breakup.bent ? "그 무렵 흐름이 꺾여 있었다" : "그 무렵 흐름은 크게 꺾여 있지 않았다"
      } — ${f.breakup.marks.join(" / ")}`,
    );
    lines.push(
      `  → 2장은 이 판독으로 **죄책감을 걷어내는 장**이다. 「${f.breakup.line}」를 그대로 베끼지 말고 같은 뜻을 쉬운 말로 풀어 쓸 것. 꺾여 있지 않았다면 꺾였다고 지어내지 말 것`,
    );
  }

  // ③ 상대 대조
  if (f.partner) {
    lines.push(
      `- 두 사람 대조: 곁자리 ${f.partner.jijiTag || "특별한 관계 없음"}${f.partner.ganTag ? ` · ${f.partner.ganTag}` : ""}`,
    );
    lines.push(`- ${f.callName}의 결(3장에서 이것으로 그릴 것): ${f.partner.traits.map((t) => `「${t}」`).join(" / ")}`);
  } else {
    lines.push(
      `- 그 사람 생년월일을 안 받았다. **그 사람의 속마음·근황을 아는 척하지 말 것.** 3장은 내 흐름에서 읽히는 것만 쓰고, 「지금 그 사람이 ~하고 있다」는 단정은 한 줄도 쓰지 않는다`,
    );
  }

  // 연적
  lines.push(
    `- 연적 신호(근거: ${f.rival.basis === "상대" ? "그 사람 흐름" : "내 곁자리 흐름"} · 세기 ${f.rival.strength}): ${f.rival.lines.map((l) => `「${l}」`).join(" / ")}`,
  );
  lines.push(
    `  → 이 신호는 **반드시 등장시킬 것**. 다만 외모·직업·이름·지역은 그리지 말고 **행동 패턴**으로만 그린다`,
  );

  // ④ 판정
  lines.push(
    `- 재회 가능성: **${f.odds.grade}** — 근거: ${f.odds.reasons.join(" / ")}`,
  );
  lines.push(
    `  → 4장은 이 등급을 **정면으로 말하는 장**이다. 낮으면 낮다고 쓴다(돌려 말하지 말 것). 대신 「이 장부는 여기서 끝나지 않습니다」로 9장을 예고한다`,
  );

  // ① 달
  if (f.reconnect.length) lines.push(`- 다리가 놓이는 달: ${f.reconnect.map(label).join(", ")}`);
  else lines.push(`- 다리가 놓이는 달: 열두 달 안에는 없다 — 없다고 쓰고, 대신 무엇을 준비할지로 채운다`);
  if (f.contactOk.length) lines.push(`- 연락해도 되는 달: ${f.contactOk.map(label).join(", ")}`);
  if (f.contactNo.length) lines.push(`- 먼저 연락하면 안 되는 달: ${f.contactNo.map(label).join(", ")}`);
  // 9장(강을 건너지 않는다면) — 새 인연. 얼굴 카드는 인연 상품과 **같은 계산**에서 나온 같은 표다
  // (partner 카드 70장 재사용). 표는 인상을 맡고 본문은 그 인상이 어떻게 드러나는지를 맡는다.
  const face = buildPartnerFace(f.inyeon);
  lines.push(
    `- 새 인연 쪽(9장에서만 쓸 것): 만날 사람의 결 ${f.inyeon.spouseOh || "미상"} · ${
      f.inyeon.spouseType === "편" ? "강렬하게 끌리는 인연" : "바르게 오래 가는 인연"
    } · 나이대 ${f.inyeon.ageDir}${f.inyeon.topYears[0] ? ` · 크게 바뀌는 해 ${f.inyeon.topYears[0].label}` : ""}`,
  );
  lines.push(
    `- 9장 바로 위에 새 인연의 얼굴 카드가 표로 떠 있다. 표에 적힌 것은 **전부 새로 올 사람의 것이지 전 애인의 것도, 독자 본인의 것도 아니다** — 외모 "${face.look}" / 성격 "${face.nature}" / 만나는 자리 "${face.place}"`,
  );
  lines.push(
    `  → 이 세 줄을 **9장 본문이 회수할 것** — 문구를 그대로 옮겨 붙이지 말고 그 인상·성격·자리가 어떻게 드러나는지를 장면으로 풀어 쓴다. 표와 어긋나는 인상을 새로 지어내면 그 자리에서 들통난다`,
  );

  return `[재회 확정값 — 등급과 달은 아래 값을 그대로 인용할 것. 다른 등급·다른 달을 지어내지 말 것]\n${lines.join("\n")}`;
}
