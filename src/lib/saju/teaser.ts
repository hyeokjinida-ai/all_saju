// =====================================================
// 결제 전 개인화 무료 티저 ("A안")
// =====================================================
// 목적: 결제 직전에 "안 물었는데 맞혔다"를 한 번 만들어준다.
//  - 콜드리딩 3문장 = 만세력 실측값(일간·신강약·오행 결핍·십성 편중·일지 충)으로만 조립.
//    LLM 을 쓰지 않는다: 무료 방문자마다 비용/지연/헛소리 리스크를 지지 않기 위함이고,
//    값 자체가 그 사람 명식에서 나온 거라 "맞혔다" 효과는 그대로 난다.
//  - 크게 바뀌는 해 = 유료 결과지가 쓰는 computeInyeonFacts 와 **같은 계산**을 인용한다.
//    (티저와 결과지가 다른 해를 말하면 그 자리에서 신뢰가 끝나므로 절대 따로 계산하지 않는다.)
import { computeInyeonFacts, type SajuAnalysisResponse } from "./saju-api";

export type TeaserVoice = "sangun" | "polite"; // 산군=반말 신점 / 그 외=해요체

// 원국 표 한 줄 — 기둥별로 천간십성 / 지지십성 / 12운성. 타이트가 티저에서 그대로 까는 표다.
// "읽을 줄 몰라도 된다"는 전제로 낸다: 못 읽는 글자라서 오히려 계산의 증거로 읽힌다(모의구매 6/6).
export type ChartRow = { pos: string; ganSip: string; jiSip: string; fortune: string };

export type SajuTeaser = {
  voice: TeaserVoice;
  headline: string;
  coldRead: string[]; // 3문장 (2번째는 가능하면 과거 검증 문장)
  /** 과거 사건 한 줄이 실제로 잡혔는지 — 잡혔으면 "판정 초대"를 띄운다 */
  hasPastCheck: boolean;
  /** 맞는지 틀리는지 손님이 지금 판정하게 만드는 한 줄 */
  judgeInvite: string;
  chartRows: ChartRow[];
  sinsal: string[];
  turningYear: { year: number; age: number; line: string } | null;
  locked: { label: string; mask: string }[];
  /** 받을 장부의 목차. 손님이 "돈 내면 뭘 받는지"를 보는 유일한 자리다. */
  chapters: TeaserChapter[];
  note: string;
};

/**
 * 목차 한 장(章) — 타이트 목차 실측(2026-08-03)을 따른 **카드** 단위다.
 *
 * 처음엔 결과지 9챕터를 9줄로 폈는데, 줄이 얇아지니 전부 가벼워 보였다(형님 "밤티" 지적 그대로).
 * 타이트는 반대로 4개 章으로 **묶어서** 하나하나를 포스터처럼 무겁게 만든다 — 간지 배너 + 도발
 * 부제 + 불릿 2~3개. 우리도 9챕터를 4章에 담는다. 챕터가 사라지는 게 아니라 불릿으로 들어가므로
 * "목차에 있는데 결과지에 없으면 들통" 규칙은 그대로 지켜진다.
 */
export type TeaserChapter = {
  /** 一 ~ 四 (장 번호 — 배너에 「一章」 으로 찍힌다) */
  no: string;
  /** [장부 기밀] 같은 등급 태그. 타이트의 [VIP 기밀] 대응 — 산군 톤이라 이모지는 안 쓴다 */
  tag?: string;
  /** 도발 부제 (줄 단위 — 카드 상단 중앙) */
  tease: string[];
  /** 결과지 챕터와 1:1 인 불릿들 */
  items: TeaserChapterItem[];
};

export type TeaserChapterItem = {
  /** 앞부분 — 회백색 작은 글 */
  lead?: string;
  /** 핵심 — 굵은 흰 글 (타이트가 한 줄 안에서 명암으로 시선을 강제하는 기법) */
  main: string;
  /** 이미 공개한 값 — 잠금 대신 이걸 보여준다. 하나는 열려 있어야 나머지 잠금이 미끼가 된다 */
  peek?: string;
  /** 잠긴 값 표기 */
  mask?: string;
};

type Line = { ban: string; jon: string };

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

// 일간은 한글로도 한자로도 올 수 있어 한글 한 글자로 정규화한다.
const GAN_READ: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};

// ── ⓪ 과거 검증 문장 ─────────────────────────────────
// 티저의 승부처. 성격 묘사는 누구에게나 맞아서 "맞혔다"가 성립하지 않는다(모의구매 6/6 지적).
// 반대로 연도는 맞거나 틀리거나 둘 중 하나라 손님이 그 자리에서 판정할 수 있다.
// 규칙 둘: ① 무슨 일이었는지는 단정하지 않는다(두 갈래로 열어둔다 — 틀리면 티저 전체가 죽는다)
//          ② 만세력 실측값에서만 뽑는다. 없으면 만들지 않고 신강약 문장으로 되돌아간다.
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

type PastEvent = { year: number; age: number; line: Line };

function computePastEvent(analysis: SajuAnalysisResponse): PastEvent | null {
  const daeun = rec(analysis.daeun);
  const nowAge = num(daeun.current_age);
  const cur = rec(daeun.current_daeun);
  const curStart = num(cur.year_start);
  const curStartAge = num(cur.age_start);

  // ① 대운 교체가 최근 6년 안 — 판이 통째로 바뀐 사건이라 체감이 가장 크다.
  //    (성별·혼인여부와 무관한 유일한 객관 전환점)
  const seunRows = arr(rec(analysis.seun).recentSeuns);
  const latestYear = seunRows.length ? num(seunRows[0].year) : 0;
  if (curStart && latestYear && latestYear - curStart <= 6 && latestYear - curStart >= 1) {
    return {
      year: curStart,
      age: curStartAge,
      line: {
        ban: `${curStart}년 어름에 네 판이 한 번 통째로 바뀌었다. 그때 옮긴 자리가 지금 자리다.`,
        jon: `${curStart}년 무렵에 판이 한 번 통째로 바뀌셨어요. 그때 옮긴 자리가 지금 자리예요.`,
      },
    };
  }

  // ② 최근 5년 세운 중 충·형이 걸린 해 — 끊어내거나 끊긴 해.
  const hit = seunRows.find((r) =>
    arr(r.hapChungRelations).some((h) => /충|형/.test(str(h.type))),
  );
  if (hit && num(hit.year)) {
    const y = num(hit.year);
    return {
      year: y,
      age: num(hit.age),
      line: {
        ban: `${y}년, 너는 하나를 끊어냈다. 사람이든 자리든 — 오래 끌던 것이었다.`,
        jon: `${y}년에 하나를 끊어내셨어요. 사람이든 자리든 — 오래 끌던 것이었고요.`,
      },
    };
  }

  // ③ 최근 5년 중 가장 눌렸던 해 — 종합점수 최저.
  const scored = seunRows
    .map((r) => ({ y: num(r.year), a: num(r.age), s: num(rec(r.yongsinJudgment).종합점수) }))
    .filter((x) => x.y && x.s !== 0);
  if (scored.length >= 3) {
    const worst = scored.reduce((a, b) => (b.s < a.s ? b : a));
    if (worst.y !== latestYear) {
      return {
        year: worst.y,
        age: worst.a,
        line: {
          ban: `${worst.y}년이 네게 제일 무거웠다. 그해에 버틴 것으로 지금까지 온 것이다.`,
          jon: `${worst.y}년이 제일 무거우셨어요. 그해에 버틴 것으로 지금까지 오신 거예요.`,
        },
      };
    }
  }

  void nowAge;
  return null;
}

// ── ①-b 원국 표 — 십성·12운성 (읽을 줄 몰라도 되는 증거) ──
const POS_LABEL: Record<string, string> = { 년: "해", 월: "달", 일: "나", 시: "시" };

function buildChartRows(analysis: SajuAnalysisResponse): ChartRow[] {
  const sip = arr(rec(analysis.sipseong).sipseongs);
  const fortunes = arr(rec(analysis.twelveFortune).fortunes);
  const byPos = (p: string, suffix: "간" | "지") =>
    str(sip.find((s) => str(s.position) === `${p}${suffix}`)?.sipseong);
  const fortuneOf = (p: string) => str(fortunes.find((f) => str(f.position) === `${p}주`)?.fortune);

  return ["년", "월", "일", "시"]
    .map((p) => ({
      pos: POS_LABEL[p] ?? p,
      // 일간은 기준점(나 자신)이라 십성이 없다 — 빈칸으로 두면 계산이 덜 된 것처럼 보인다.
      ganSip: p === "일" ? "나 자신" : byPos(p, "간"),
      jiSip: byPos(p, "지"),
      fortune: fortuneOf(p),
    }))
    .filter((r) => r.jiSip || r.fortune); // 시 모름이면 시주가 통째로 빈다
}

// ── ①-c 신살 칩 — 있는 것만 ────────────────────────────
function buildSinsal(analysis: SajuAnalysisResponse): string[] {
  const out: string[] = [];
  if (arr(rec(analysis.dohwa).dohwa).length) out.push("도화살");
  if (arr(rec(analysis.hongyeom).hongyeom).length) out.push("홍염살");
  if (arr(rec(analysis.hwagae).hwagae).length) out.push("화개살");
  const guiin = rec(analysis.guiin);
  if (arr(guiin.cheoneul).length) out.push("천을귀인");
  if (arr(guiin.geumyeo).length) out.push("금여성");
  // 12신살은 formed:true 인 것만
  const sinsals = rec(analysis.sibisinsals);
  const NAME: Record<string, string> = { yeokma: "역마살", dohwa: "도화살", hwagae: "화개살" };
  for (const [k, v] of Object.entries(sinsals)) {
    const label = NAME[k];
    if (!label || out.includes(label)) continue;
    const byDay = rec(rec(v).byDay);
    const byYear = rec(rec(v).byYear);
    if (byDay.formed === true || byYear.formed === true) out.push(label);
  }
  return out.slice(0, 4);
}

// ── ① 일간 — 타고난 결 ────────────────────────────────
const ILGAN_LINE: Record<string, Line> = {
  갑: { ban: "너는 한번 방향을 정하면 웬만해선 안 꺾는 사람이다.", jon: "한번 방향을 정하면 웬만해선 안 꺾으시는 분이에요." },
  을: { ban: "너는 어디에 놓여도 결국 적응해내는 사람이다. 대신 굽힌 건 오래 기억한다.", jon: "어디에 놓여도 결국 적응해내시는 분이에요. 대신 굽힌 건 오래 기억하시고요." },
  병: { ban: "너는 먼저 밝히고 먼저 지치는 사람이다.", jon: "먼저 밝히고 먼저 지치시는 분이에요." },
  정: { ban: "너는 여럿 앞에선 조용한데, 한 사람 앞에선 다 내주는 사람이다.", jon: "여럿 앞에선 조용한데, 한 사람 앞에선 다 내주시는 분이에요." },
  무: { ban: "너는 남의 짐까지 받아 안고는 정작 네 얘기는 안 하는 사람이다.", jon: "남의 짐까지 받아 안고는, 정작 본인 얘기는 안 하시는 분이에요." },
  기: { ban: "너는 다 받아주다가 결국 혼자 뒷정리하는 사람이다.", jon: "다 받아주시다가 결국 혼자 뒷정리하시는 분이에요." },
  경: { ban: "너는 맺고 끊는 건 확실한데, 그 뒤로 혼자 오래 곱씹는 사람이다.", jon: "맺고 끊는 건 확실한데, 그 뒤로 혼자 오래 곱씹으시는 분이에요." },
  신: { ban: "너는 겉은 단정한데 속으로 사람을 아주 세밀하게 매기는 사람이다.", jon: "겉은 단정한데 속으로 사람을 아주 세밀하게 보시는 분이에요." },
  임: { ban: "너는 생각이 늘 몇 수 앞서 나가서, 시작도 전에 먼저 지치는 사람이다.", jon: "생각이 늘 몇 수 앞서 나가서, 시작도 전에 먼저 지치시는 분이에요." },
  계: { ban: "너는 티 안 내고 다 알아채는 사람이다.", jon: "티 안 내고 다 알아채시는 분이에요." },
};

// ── ② 신강/신약 — 그래서 어떻게 사는가 ────────────────
const STRONG_LINE: Line = {
  ban: "그래서 남한테 기대는 걸 지는 걸로 여긴다. 혼자 감당하다 탈이 난다.",
  jon: "그래서 남한테 기대는 걸 지는 걸로 여기세요. 혼자 감당하시다 탈이 나고요.",
};
const WEAK_LINE: Line = {
  ban: "그래서 이미 답을 정해놓고도 누가 한 번 확인해주길 기다린다.",
  jon: "그래서 이미 답을 정해놓고도, 누가 한 번 확인해주길 기다리세요.",
};
const MID_LINE: Line = {
  ban: "그래서 어느 쪽으로도 잘 안 쏠리는데, 그게 스스로는 답답하다.",
  jon: "그래서 어느 쪽으로도 잘 안 쏠리는데, 그게 스스로는 답답하시죠.",
};

// ── ③ 콕 집는 한 줄 — 우선순위대로 하나만 고른다 ───────
const HURT_LINE: Line = {
  ban: "제일 가까운 사람한테서 제일 크게 흔들린다. 밖에선 티도 안 낸다.",
  jon: "제일 가까운 사람한테서 제일 크게 흔들리세요. 밖에선 티도 안 내시고요.",
};
const MISSING_LINE: Record<string, Line> = {
  수: { ban: "머리를 식힐 데가 없어서 밤에 생각이 길어진다.", jon: "머리를 식힐 데가 없어서 밤에 생각이 길어지세요." },
  화: { ban: "속으로는 다 정해놓고, 말로 꺼내는 데서 늘 손해를 본다.", jon: "속으로는 다 정해놓고, 말로 꺼내는 데서 늘 손해를 보세요." },
  목: { ban: "새로 시작하는 일 앞에서 유독 오래 뜸을 들인다.", jon: "새로 시작하는 일 앞에서 유독 오래 뜸을 들이세요." },
  금: { ban: "끊어야 할 사람을 못 끊고 몇 년을 끌고 간다.", jon: "끊어야 할 사람을 못 끊고 몇 년을 끌고 가세요." },
  토: { ban: "마음 붙일 자리가 자주 바뀐다. 한곳에 오래 못 앉는다.", jon: "마음 붙일 자리가 자주 바뀌세요. 한곳에 오래 못 앉으시고요." },
};
const SIPSEONG_LINE: Record<string, Line> = {
  gwanseong: { ban: "책임이 자꾸 너한테만 몰린다. 네가 거절을 못 해서 그렇다.", jon: "책임이 자꾸 본인한테만 몰려요. 거절을 못 하셔서 그래요." },
  jaeseongZero: { ban: "돈이 안 들어오는 게 아니라, 새는 자리가 안 보이는 것이다.", jon: "돈이 안 들어오는 게 아니라, 새는 자리가 안 보이는 거예요." },
  siksang: { ban: "할 말을 참은 날은 그날 밤 잠이 잘 안 온다.", jon: "할 말을 참으신 날은 그날 밤 잠이 잘 안 오시죠." },
  inseong: { ban: "결심까지가 길다. 머릿속에서 이미 다 끝내버린다.", jon: "결심까지가 길어요. 머릿속에서 이미 다 끝내버리시고요." },
  bigyeop: { ban: "사람은 늘 곁에 있는데, 정작 손 벌릴 사람은 없다.", jon: "사람은 늘 곁에 있는데, 정작 손 벌릴 사람은 없으시죠." },
};
const DOHWA_LINE: Line = {
  ban: "먼저 다가오는 사람은 있는데, 정작 네가 원하는 쪽은 아니다.",
  jon: "먼저 다가오는 사람은 있는데, 정작 원하시는 쪽은 아니에요.",
};
const PLAIN_LINE: Line = {
  ban: "겉이 무던해 보여서, 사람들이 네 속을 자주 오해한다.",
  jon: "겉이 무던해 보여서, 사람들이 속을 자주 오해해요.",
};

const pick = (l: Line, v: TeaserVoice) => (v === "sangun" ? l.ban : l.jon);

export function buildTeaser(
  analysis: SajuAnalysisResponse,
  gender: "male" | "female",
  voice: TeaserVoice,
  /** 인연 상대의 성별 — 유료 결과지와 **같은 값**을 넣어야 티저와 결과지가 같은 해를 말한다 */
  partnerSex?: "male" | "female",
): SajuTeaser | null {
  const day = rec(rec(analysis.ganji).day);
  const ganRaw = str(day.gan).trim();
  if (!ganRaw) return null; // 명식이 없으면 티저 자체를 만들지 않는다(가짜 문장 금지)
  const gan = GAN_READ[ganRaw] ?? ganRaw.slice(0, 1);

  const coldRead: string[] = [];

  // ① 일간
  const l1 = ILGAN_LINE[gan];
  if (l1) coldRead.push(pick(l1, voice));

  // ② 과거 검증 문장 — 티저의 승부처. 이게 잡히면 신강약 문장 대신 여기 쓴다.
  //    성격 문장은 누구에게나 맞아 판정이 불가능하고, 연도는 맞거나 틀리거나 둘 중 하나다.
  //    (모의구매 6/6 전원이 "연도 하나만 맞으면 그 자리에서 샀다"고 답한 유일한 만장일치 조건)
  const past = computePastEvent(analysis);
  if (past) {
    coldRead.push(pick(past.line, voice));
  } else {
    // 폴백: 신강/신약 (7단계 → 강/중/약)
    // 실측 값: 태왕 · 신강 · 중강 · 중화 · 중약 · 신약 · 태약 — "태왕"은 강 계열인데 '강'자가 없어
    // /강/ 만 보면 중간 문장으로 잘못 떨어진다(실측 버그). 약을 먼저 걸러내고 강·왕을 함께 본다.
    const strength = str(rec(analysis.sinStrength).strength);
    if (strength) {
      const l2 = /약/.test(strength) ? WEAK_LINE : /강|왕/.test(strength) ? STRONG_LINE : MID_LINE;
      coldRead.push(pick(l2, voice));
    }
  }

  // ③ 콕 집는 한 줄 — 흔들림 > 없는 오행 > 십성 편중 > 도화 > 기본
  const facts = computeInyeonFacts(analysis, gender, partnerSex);
  const oc = rec(rec(rec(rec(analysis.sipseong).cheonganHap).ohaengImpact).originalCount);
  const missing = ["수", "화", "목", "금", "토"].filter((k) => Object.keys(oc).length && !num(oc[k]));
  const sum = rec(rec(analysis.sipseong).summary);

  let l3: Line;
  if (facts.iljiHurt) l3 = HURT_LINE;
  else if (missing.length && MISSING_LINE[missing[0]]) l3 = MISSING_LINE[missing[0]];
  else if (num(sum.gwanseong) >= 3) l3 = SIPSEONG_LINE.gwanseong;
  else if (num(sum.jaeseong) === 0) l3 = SIPSEONG_LINE.jaeseongZero;
  else if (num(sum.siksang) >= 3) l3 = SIPSEONG_LINE.siksang;
  else if (num(sum.inseong) >= 3) l3 = SIPSEONG_LINE.inseong;
  else if (num(sum.bigyeop) >= 3) l3 = SIPSEONG_LINE.bigyeop;
  else if (facts.dohwaCount > 0) l3 = DOHWA_LINE;
  else l3 = PLAIN_LINE;
  coldRead.push(pick(l3, voice));

  // ④ 크게 바뀌는 해 — 유료 결과지와 같은 값(연도·나이만 공개, 무슨 일인지는 잠근다)
  const ty = facts.topYears[0];
  // 후보를 5년 창으로 좁힌 뒤로는 올해가 뽑히는 경우가 흔하다 → 그때는 미래형이 어색하니 "올해"로 쓴다.
  const baseYear = num(rec(rec(analysis.seun).currentSeun).year);
  const isThisYear = !!ty && ty.year === baseYear;
  const turningYear =
    ty && ty.year
      ? {
          year: ty.year,
          age: ty.age,
          line:
            voice === "sangun"
              ? isThisYear
                ? `바로 올해다. ${ty.year}년, ${ty.age}세에 한 번 크게 갈린다.`
                : `너는 ${ty.year}년, ${ty.age}세에 한 번 크게 갈린다.`
              : isThisYear
                ? `바로 올해예요. ${ty.year}년, ${ty.age}세에 한 번 크게 갈리세요.`
                : `${ty.year}년, ${ty.age}세에 한 번 크게 갈리세요.`,
        }
      : null;

  const locked =
    voice === "sangun"
      ? [
          { label: "그해에 무엇이 갈리는지", mask: "▓▓▓▓▓▓▓▓▓▓" },
          { label: "돈이 들어오는 달", mask: "▓▓년 ▓▓월" },
          { label: "인연이 들어오는 달", mask: "▓▓년 ▓▓월" },
          { label: "조심해야 할 달", mask: "▓▓년 ▓▓월" },
          { label: "네가 물은 것에 대한 답", mask: "▓▓▓▓▓▓▓▓" },
        ]
      : [
          { label: "그해에 무엇이 달라지는지", mask: "▓▓▓▓▓▓▓▓▓▓" },
          { label: "돈이 들어오는 달", mask: "▓▓년 ▓▓월" },
          { label: "인연이 들어오는 달", mask: "▓▓년 ▓▓월" },
          { label: "조심해야 할 달", mask: "▓▓년 ▓▓월" },
          { label: "적어주신 물음에 대한 답", mask: "▓▓▓▓▓▓▓▓" },
        ];

  // 목차 — prompt.ts 의 sangun-sinjeom outline 아홉 줄과 1:1 로 맞춘다.
  // 여기서 지어내면 결제 직후에 바로 들통난다. 순서·개수도 그대로다.
  //
  // 七장·八장에는 **이미 공개한 값**을 다시 박는다. 잠긴 줄만 늘어놓으면 "뭘 주는지" 대신
  // "안 주는 게 많다"로 읽힌다 — 하나라도 열려 있어야 나머지 잠금이 미끼가 된다.
  // 결과지 9챕터를 4章에 담는다(불릿 아홉 = 챕터 아홉, 1:1 유지).
  // 부제는 산군 어미 규칙(~다/~라, 해체 금지)을 지키면서 한 번에 읽히게 — "생각하게 만드는" 단어 금지.
  const chapters: TeaserChapter[] = voice !== "sangun" ? [] : [
    {
      no: "一",
      tease: ["착한 얼굴 말고,", "네 진짜 그릇부터 보자"],
      items: [
        { lead: "타고난 본바탕과 강점 둘", main: "남들과 다른 결 하나", mask: "▓▓▓▓" },
        { lead: "올해 분명히 오는 기회 하나", main: "정리될 것 하나", mask: "▓▓▓▓" },
      ],
    },
    {
      no: "二",
      tag: "장부 기밀",
      tease: ["돈 얘기부터 하자.", "몇 월인지까지 적어 뒀다"],
      items: [
        { lead: "재물그릇 점수와", main: "돈이 들어오는 달 둘 · 새는 달 하나", mask: "▓▓년 ▓▓월" },
        { lead: "승부수를 걸 때와", main: "엎드려 있을 때", mask: "▓▓년 ▓▓월" },
      ],
    },
    {
      no: "三",
      tag: "운명 카드",
      tease: ["네 짝이 적힌 자리도", "넘겨 봤다"],
      items: [
        { lead: "인연 그릇 점수와", main: "인연이 들어오는 달 둘", mask: "▓▓년 ▓▓월" },
        { lead: "마음이 흔들리는 달과", main: "그때 붙잡을 것", mask: "▓▓년 ▓▓월" },
      ],
    },
    {
      no: "四",
      tag: "붉은 표시",
      tease: ["장부에 붉게 적힌 해가 있다.", "이것만 미리 보여주마"],
      items: [
        turningYear
          ? { lead: "네 인생이 크게 바뀌는 해", main: "그 해에 무엇이 갈리는지", peek: `${turningYear.year}년, ${turningYear.age}세` }
          : { lead: "네 인생이", main: "크게 바뀌는 해", mask: "▓▓▓▓년" },
        { lead: "네가 적어 보낸 물음에", main: "확답부터 박는다", mask: "▓▓▓▓" },
        { lead: "이번 주에 할 것", main: "세 가지", mask: "▓▓▓▓" },
      ],
    },
  ];

  return {
    voice,
    headline: voice === "sangun" ? "네 장부, 다 읽고 왔다" : "사주를 먼저 읽어봤어요",
    coldRead,
    chapters,
    hasPastCheck: !!past,
    // 판정을 손님에게 넘긴다. 틀릴 위험을 지지 않는 문장은 맞아도 소름이 안 난다(모의구매 33세).
    judgeInvite: past
      ? voice === "sangun"
        ? "맞으면 나머지를 열어라. 틀렸으면 여기서 닫아라. 나는 틀린 값은 안 받는다."
        : "맞으면 나머지를 열어보세요. 틀렸으면 여기서 닫으셔도 돼요. 틀린 값은 받지 않아요."
      : "",
    chartRows: buildChartRows(analysis),
    sinsal: buildSinsal(analysis),
    turningYear,
    locked,
    note:
      voice === "sangun"
        ? "여기까지는 공짜다. 나머지는 장부를 열어야 나온다."
        : "여기까지는 무료로 보여드려요. 나머지는 결과지에 담겨요.",
  };
}
