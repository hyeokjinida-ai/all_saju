// 웹툰 말풍선에 꽂는 손님 데이터 토큰.
//
// 편집기(어드민)와 렌더러(손님 화면)가 **이 파일 하나**를 같이 본다.
// 두 군데에 따로 적어두면 토큰을 하나 추가할 때마다 반드시 한쪽이 빠진다.
//
// 계측 근거(2026-08-02, 표본 50 — docs-private/teaser-sample-2026-08.json):
//   전환점·과거검증문장·콜드리딩 3문장이 50/50 전원 채워졌다. 그래서 토큰을 가려 쓸 이유가 없다.
//   신살도 0개인 사람이 0명이라 하나만 쓰면 안 빈다. 다만 **첫 번째를 그냥 쓰면 82%가 도화살**로
//   쏠려 개인화가 죽는다 → 가진 것 중 가장 희소한 것을 고른다(최다 쏠림 82%→28%).

import type { ResultView, ElementKey } from "./result-view";
import type { SajuTeaser } from "./teaser";
import { honorific } from "./display-name";

// 편집기 토큰 버튼 + 미리보기 샘플값. 순서가 곧 버튼 순서다.
//
// ⚠ 샘플은 **실측 최댓값**을 쓴다(중앙값 아님). 편집기에서 안 넘치게 맞춰두면 실제 손님에게도
//   안 넘친다는 뜻이 되어야 한다. 짧은 샘플로 맞추면 실전에서 글자가 말풍선을 뚫는다.
//   콜드리딩 실측 길이(표본 50): 콜드1 20~42자 · 콜드2 42~46자 · 콜드3 27~40자.
export const WEBTOON_TOKENS: { token: string; hint: string; sample: string }[] = [
  { token: "{이름}", hint: "성을 뗀 호칭", sample: "지훈님" },
  { token: "{생년월일}", hint: "입력한 생일", sample: "1995년 12월 27일" },
  { token: "{간지}", hint: "원국 3기둥", sample: "기묘년 갑술월 임자일" },
  { token: "{일간}", hint: "타고난 기운", sample: "임수" },
  { token: "{신강약}", hint: "기운의 세기 7단계", sample: "태약" },
  { token: "{오행최다}", hint: "가장 많은 오행", sample: "토" },
  { token: "{전환점}", hint: "크게 갈리는 해", sample: "2028년, 30세" },
  { token: "{신살}", hint: "가진 것 중 가장 희소한 살", sample: "천을귀인" },
  { token: "{신살풀이}", hint: "그 살이 뜻하는 한 줄", sample: "혼자 있는 시간이 있어야 사는 살" },
  { token: "{콜드1}", hint: "콜드리딩 1 — 타고난 결 (최대 42자)", sample: "어디에 놓여도 결국 적응해내시는 분이에요. 대신 굽힌 건 오래 기억하시고요." },
  { token: "{콜드2}", hint: "콜드리딩 2 — 과거 검증 (최대 46자)", sample: "2019년 무렵에 판이 한 번 통째로 바뀌셨어요. 그때 옮긴 자리가 지금 자리예요." },
  { token: "{콜드3}", hint: "콜드리딩 3 — 콕 집는 한 줄 (최대 40자)", sample: "제일 가까운 사람한테서 제일 크게 흔들리세요. 밖에선 티도 안 내시고요." },
];

/** 표본 50에서 잰 보유율. 낮을수록 희소 = 개인화 효과가 크다. 표본이 늘면 갱신할 것. */
const SINSAL_RARITY: Record<string, number> = {
  금여성: 28,
  역마살: 32,
  홍염살: 38,
  천을귀인: 50,
  화개살: 76,
  도화살: 82,
};

/** 신살 한 줄 풀이 — 뜻이 정반대인 것이 섞여 있다(천을귀인은 길신). 대사 톤을 여기서 맞춘다. */
const SINSAL_GLOSS: Record<string, string> = {
  금여성: "귀한 자리로 이끄는 살",
  역마살: "한곳에 머무르지 못하는 살",
  홍염살: "가만히 있어도 눈에 띄는 살",
  천을귀인: "위기마다 사람이 붙는 길신",
  화개살: "혼자 있는 시간이 있어야 사는 살",
  도화살: "사람을 끌어당기는 살",
};

const EL_KO: Record<ElementKey, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

/** 가진 신살 중 가장 희소한 것. 표에 없는 이름은 가장 희소한 쪽으로 친다(새 신살이 추가돼도 안 죽게). */
function rarestSinsal(list: string[]): string {
  return [...list].sort((a, b) => (SINSAL_RARITY[a] ?? 0) - (SINSAL_RARITY[b] ?? 0))[0] ?? "";
}

function birthLine(birthDate?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((birthDate ?? "").trim());
  if (!m) return "";
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/**
 * 손님 한 명의 토큰 값. **값이 없는 토큰은 키 자체를 넣지 않는다** —
 * 렌더러가 "없음"과 "빈 문자열"을 구분해야 말풍선을 숨길지 판단할 수 있다.
 */
export function buildWebtoonTokens(args: {
  name?: string | null;
  birthDate?: string | null;
  view: ResultView;
  teaser: SajuTeaser | null;
  /** 신강약(sinStrength.strength)만 꺼내 쓴다 — view·teaser 어디에도 안 실려 있다 */
  analysis?: unknown;
}): Record<string, string> {
  const { view, teaser } = args;
  const t: Record<string, string> = {};
  const put = (k: string, v: string) => { if (v) t[k] = v; };

  put("{이름}", honorific(args.name, ""));
  put("{생년월일}", birthLine(args.birthDate));

  // 원국 — pillars 표시 순서는 시·일·월·년이라 뒤에서부터 년·월·일을 집는다.
  const p = view.pillars ?? [];
  const day = p.find((x) => x.isDay) ?? p[1];
  if (p.length === 4) {
    const [year, month] = [p[3], p[2]];
    const gz = (x: typeof year) => `${x.gan.read}${x.ji.read}`;
    if (year?.gan.read && month?.gan.read && day?.gan.read) {
      put("{간지}", `${gz(year)}년 ${gz(month)}월 ${gz(day)}일`);
    }
  }
  if (day?.gan.read) put("{일간}", `${day.gan.read}${EL_KO[day.gan.element]}`);

  // 가장 많은 오행 — 동수면 어느 하나를 고르지 않는다(거짓말이 된다)
  const oh = view.ohaeng ?? [];
  const top = oh.filter((o) => o.emphasis === "strong");
  if (top.length === 1) put("{오행최다}", EL_KO[top[0].key]);

  const strength = (() => {
    const a = args.analysis;
    if (!a || typeof a !== "object") return "";
    const s = (a as Record<string, unknown>).sinStrength;
    if (!s || typeof s !== "object") return "";
    const v = (s as Record<string, unknown>).strength;
    return v == null ? "" : String(v).trim();
  })();
  put("{신강약}", strength);

  if (teaser) {
    if (teaser.turningYear) put("{전환점}", `${teaser.turningYear.year}년, ${teaser.turningYear.age}세`);
    const ss = rarestSinsal(teaser.sinsal ?? []);
    put("{신살}", ss);
    put("{신살풀이}", SINSAL_GLOSS[ss] ?? "");
    teaser.coldRead?.forEach((line, i) => put(`{콜드${i + 1}}`, line));
  }

  return t;
}

const TOKEN_RE = /\{[^{}]+\}/g;

/**
 * 대사 한 줄을 채운다. **채울 수 없는 토큰이 하나라도 있으면 null** —
 * 손님 화면에 "{전환점}"이 그대로 보이는 것보다 그 말풍선이 없는 편이 낫다.
 * (계측상 50/50 전원 채워졌으니 실제로는 거의 안 걸리는 안전장치)
 */
export function fillWebtoonText(text: string, tokens: Record<string, string>): string | null {
  let missing = false;
  const out = text.replace(TOKEN_RE, (m) => {
    const v = tokens[m];
    if (v == null) { missing = true; return m; }
    return v;
  });
  return missing ? null : out;
}

/** 편집기 미리보기용 — 실제 손님 값 대신 샘플로 채운다. 못 채우는 토큰은 그대로 남겨 눈에 띄게 둔다. */
export const WEBTOON_SAMPLE_TOKENS: Record<string, string> = Object.fromEntries(
  WEBTOON_TOKENS.map((t) => [t.token, t.sample]),
);
