// =====================================================
// 짝의 얼굴 — 결제 전 티저 카드와 결제 후 결과지가 **같은 얼굴·같은 문장**을 쓰게 하는 매핑.
// =====================================================
// 왜 오행으로 고르나: 예전엔 생일 문자코드 % 4 로 골랐다. 그러면 사진이 사주와 아무 상관이 없어서
// "얼굴까지 봤다"가 순전한 연출로만 남고, 결과지에서 회수할 근거도 없다. 배우자성(정·편관 / 정·편재)이
// 붙은 글자의 오행으로 고르면 ① 같은 명식이면 언제 봐도 같은 얼굴이고 ② 왜 이 얼굴인지 댈 근거가 있고
// ③ 티저에서 흐리게 본 그 얼굴이 결과지에서 그대로 열린다.
//
// 장수(2026-08-24 확장): **best 60 + worst 10 = 70장 고정**.
//   best  = 상대 성별 2 × 배우자성 오행 5 × 정·편 2 × 나이대 3
//   worst = 상대 성별 2 × 오행 5 (짝의 오행을 극(剋)하는 결 = 「멀리할 사람」)
// 왜 늘렸나: 사주는 친구끼리 돌려 본다. **같은 얼굴 두 명이 마주치는 순간 이 장치는 죽는다** —
// 그게 유일한 사망 원인이다. 10장이면 같은 성별끼리 1/5 로 겹치고, 60장이면 1/30 이다.
// 청월당은 40장(성별×일간×신강약)인데, 그쪽 축은 **'나'의 속성**으로 상대를 고른다.
// 우리 축은 넷 다 **'상대'의 속성**이라 "관성 木이 편(偏)으로 붙었고 연상 — 그래서 이 얼굴"을
// 석 줄로 댈 수 있다(`docs-private/청월당_정통사주_유료결과지_해부.md` §2).
// 사람마다 생성하지 않는다 — 결과 1건당 비용 0·대기 0이고, 재접속해도 얼굴이 안 바뀐다.
// 파일이 아직 없으면 **산군 구 10장 → 실루엣** 순으로 조용히 내려앉는다(FACE_DIR 아래 폴백).
import type { InyeonFacts } from "./saju-api";

export type FaceElement = "wood" | "fire" | "earth" | "metal" | "water";
/** 정(正)=오래 가는 결 / 편(偏)=끌리는 결 */
export type FaceType = "jeong" | "pyeon";
/** 연상/동갑/연하 — ageDir 문자열에서 뽑아낸 축 */
export type FaceAge = "elder" | "same" | "younger";

/** 짝 얼굴 공용 풀(직녀·산군이 같이 쓴다). 청월당도 유료 2종이 같은 40장 풀을 공유한다(8/24 실측). */
const FACE_DIR = "/products/partner";
/** 산군이 8/7부터 쓰던 10장. 70장이 배치되기 전까지의 폴백이자, 배치돼도 남겨 둘 안전망. */
const LEGACY_DIR = "/products/sangun";

export type PartnerFace = {
  /** 얼굴 이미지 경로 — 없으면 컴포넌트가 실루엣으로 폴백 */
  src: string;
  /** 70장이 아직 안 깔렸을 때 쓸 구 10장 경로. 컴포넌트가 onError 에서 이걸로 한 번 더 시도한다. */
  legacySrc: string;
  sex: "m" | "f";
  el: FaceElement;
  type: FaceType;
  age: FaceAge;
  /** 목/화/토/금/수 — 카드 하단 근거 한 줄에 그대로 쓴다 */
  ohKo: string;
  /** 외모 — "정확한 수치 금지" 규칙에 맞춰 인상만 그린다(키 몇 cm 같은 건 절대 쓰지 않는다) */
  look: string;
  /** look 의 **앞 어구만** — 결제 전 티저에서 이것만 열고 나머지를 가린다.
   *  청월당 실측(2026-08-24): 저쪽은 짝 카드의 태그 8개 중 4개를 **열어 둔 채** 나머지만 흐린다.
   *  통째로 가리면 "가려진 게 무엇인지"를 몰라 궁금하지 않고, 다 열면 살 이유가 사라진다.
   *  잠금의 본체는 **가린 자리의 모양과 개수를 보여주는 것**이다. */
  lookOpen: string;
  nature: string;
  /** 만나기 쉬운 자리 */
  place: string;
  /** 연상/연하/동갑 — 얼굴을 고르는 축이자, 티저 카드에서 **열어 두는** 값.
   *  InyeonTeaser 에 실어 보내지 않고 여기 두는 이유: 티저 페이로드는 "화면에 쓸 값만" 담는다는
   *  규칙이 있고(teaser.ts InyeonTeaser 주석), 이 값은 얼굴 선택에 직접 쓰이므로 얼굴의 속성이 맞다. */
  ageDir: string;
};

const KEY_OF: Record<string, FaceElement> = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };

/** ageDir 은 사람 말("연상 쪽"·"동갑 언저리"·"연하 쪽")로 온다 — saju-api.ts:693.
 *  얼굴 파일명은 축이라 여기서 한 번만 번역한다. 못 읽으면 same(가장 중립적인 나이대). */
function ageKey(ageDir: string): FaceAge {
  if (ageDir.includes("연상")) return "elder";
  if (ageDir.includes("연하")) return "younger";
  return "same";
}

/** 상극(剋) — 「멀리할 결」을 고르는 규칙. 木을 꺾는 건 金, 火를 끄는 건 水…
 *  LLM 에 맡기지 않고 표로 두는 이유: 근거를 한 줄로 댈 수 있어야 카드가 서기 때문이다
 *  ("네 짝의 결(木)을 꺾는 결(金) — 이 결이 스치면 오래 못 가요"). */
const GEUK: Record<FaceElement, FaceElement> = {
  wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth",
};

// 오행별 인상. 상품이 "운명의 상대"라 인물은 매력적으로 그린다 — 다만 오행마다 매력의 결이 달라야
// 열 명이 열 명 다르게 읽힌다("잘생겼다" 한 줄로 통일하면 열 장이 한 장처럼 보인다).
const LOOK: Record<FaceElement, string> = {
  wood: "키가 크고 선이 곧은, 늘씬한 인상",
  fire: "이목구비가 또렷하고 눈빛이 살아 있는 화사한 인상",
  earth: "이목구비가 순하고 살결이 고운, 보고 있으면 편안한 인상",
  metal: "피부가 희고 이목구비가 정갈한, 단정하고 세련된 인상",
  water: "눈매가 깊고 살결이 맑은, 분위기 있는 인상",
};

// LOOK 의 첫 어구만 따로 둔다 — 문자열을 쪼개 파싱하지 않는 이유는, 쉼표 위치가 오행마다 달라
// 파싱이 한 글자만 어긋나도 티저에 반쪽 문장이 뜨기 때문이다. 여기 값은 반드시 LOOK 의 앞부분과
// **글자 그대로 일치**해야 한다 — 티저에서 본 어구가 결과지 본문에 그대로 있어야 회수가 성립한다.
const LOOK_OPEN: Record<FaceElement, string> = {
  wood: "키가 크고",
  fire: "이목구비가 또렷하고",
  earth: "이목구비가 순하고",
  metal: "피부가 희고",
  water: "눈매가 깊고",
};

// 성격 — 같은 오행이라도 정(正)과 편(偏)이 갈린다. 정은 오래 가는 결, 편은 끌리는 결.
const NATURE: Record<FaceElement, { 정: string; 편: string }> = {
  wood: { 정: "곧고 성실해 한번 정한 사람에게 오래 간다", 편: "추진력이 세고 활동 반경이 넓다" },
  fire: { 정: "밝고 다정해 곁에 있으면 기운이 난다", 편: "열정이 뜨겁고 표현이 화끈하다" },
  earth: { 정: "듬직하고 한결같아 말보다 행동으로 챙긴다", 편: "품이 넓지만 제 뜻은 굽히지 않는다" },
  metal: { 정: "반듯하고 약속을 지키며 뒷말이 없다", 편: "결단이 빠르고 사람을 끄는 힘이 있다" },
  water: { 정: "차분하고 사려 깊어 사람 속을 잘 읽는다", 편: "자유롭고 감각이 남달라 곁이 심심하지 않다" },
};

// 만나기 쉬운 자리 — 도화 해석(meetHint)에서 장소를 말한 절만 뽑아 쓰고, 없을 때 오행으로 채운다.
//
// meetHint 는 "도삽도화라고도 하며, 어려서부터 성숙한 감성을 가집니다. 연상의 이성과 인연이 깊고,
// 조직이나 직장 내에서 상대를 만날 가능성이 높습니다" 처럼 길고 여러 얘기가 섞여 온다.
// 통째로는 카드에 안 들어가는데, 그렇다고 버리고 오행으로만 채우면 **같은 힌트를 보고 쓰는 본문은
// "직장에서 만난다"** 인데 카드만 "물가·온라인" 이 되어 한 장부 안에서 두 곳을 가리키게 된다(실측).
const PLACE_WORD = /직장|조직|회사|업무|거래|모임|동호회|동아리|학교|학원|공부|소개|온라인|인터넷|여행|물가|종교|봉사|취미/;
const 존댓말 = /습니다$|합니다$|입니다$|됩니다$/;

/** 도화 해석에서 "어디서 만나는지"를 말한 절 하나만 꺼내 반말로 맞춘다(결과지가 반말 세계관이다) */
function placeFromHint(hint: string): string | null {
  const parts = hint
    .split(/[.。]\s*|,\s*/)
    .map((s) => s.trim().replace(/^(그리고|또한|또)\s*/, ""))
    .filter(Boolean);
  const hit = parts.find((p) => PLACE_WORD.test(p));
  if (!hit || hit.length > 46) return null;
  return hit
    .replace(/습니다$/, "다")
    .replace(/합니다$/, "하다")
    .replace(/입니다$/, "이다")
    .replace(/됩니다$/, "된다")
    .replace(존댓말, "다");
}

const PLACE: Record<FaceElement, string> = {
  wood: "배우는 자리 — 학원·스터디·동호회",
  fire: "사람이 모이는 밝은 자리 — 모임·행사·소개",
  earth: "오래 머문 자리 — 직장·동네·아는 사람의 소개",
  metal: "일로 엮이는 자리 — 업무·거래처·전문 모임",
  water: "물가나 늦은 시간, 또는 화면 너머 — 여행지·온라인",
};

/**
 * 인연 확정값 → 얼굴 카드 한 장.
 *
 * spouseOh 가 비면(명식이 덜 왔을 때) 토(土)로 앉힌다 — 다섯 중 가장 중립적인 인상이라
 * 폴백이 튀지 않는다. 얼굴을 아예 안 보여주는 것보다 낫다.
 */
export function buildPartnerFace(f: InyeonFacts): PartnerFace {
  const el = KEY_OF[f.spouseOh] ?? "earth";
  const sex: "m" | "f" = f.spouseSex === "male" ? "m" : "f";
  const type: FaceType = f.spouseType === "편" ? "pyeon" : "jeong";
  const age = ageKey(f.ageDir ?? "");
  return {
    src: `${FACE_DIR}/p-${sex}-${el}-${type}-${age}.webp`,
    legacySrc: `${LEGACY_DIR}/partner-${sex}-${el}.webp`,
    sex,
    el,
    type,
    age,
    ohKo: f.spouseOh || "토",
    look: LOOK[el],
    lookOpen: LOOK_OPEN[el],
    nature: NATURE[el][f.spouseType],
    place: placeFromHint(f.meetHint?.trim() ?? "") ?? PLACE[el],
    ageDir: f.ageDir || "연상 쪽",
  };
}

/**
 * 「멀리할 결」 한 장 — 청월당 연애비책 5장 「운명일 줄 알았는데, 아닌 사람」의 우리 판(8/22 실측).
 *
 * 저쪽은 짝과 **같은 규격의 얼굴**을 한 장 더 열어 "피해야 할 사람"으로 판다. 좋은 것만 파는 상품보다
 * 믿음이 간다 — 나쁜 소식을 같이 줘야 좋은 소식도 진짜로 읽힌다.
 *
 * 못생기게 그리지 않는다. 경고는 **글의 몫**이고, 밉게 그리는 순간 상품이 저열해진다
 * (생성 프롬프트도 "good-looking but emotionally distant" 로 박아 뒀다).
 */
export function buildWorstFace(f: InyeonFacts): {
  src: string;
  el: FaceElement;
  ohKo: string;
  /** 카드 하단 근거 한 줄 — 왜 이 얼굴이 「멀리할 결」인지 */
  why: string;
  /** 그 결이 관계에서 어떻게 나타나는지 */
  how: string;
} {
  const mine = KEY_OF[f.spouseOh] ?? "earth";
  const el = GEUK[mine];
  const sex: "m" | "f" = f.spouseSex === "male" ? "m" : "f";
  return {
    src: `${FACE_DIR}/w-${sex}-${el}.webp`,
    el,
    ohKo: OH_KO[el],
    why: `네 짝의 결(${OH_KO[mine]})을 꺾는 결(${OH_KO[el]})`,
    how: WORST_HOW[el],
  };
}

const OH_KO: Record<FaceElement, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

// 「멀리할 결」이 관계에서 드러나는 방식. 외모·직업은 한 글자도 안 쓴다(단정 금지 규칙 그대로).
const WORST_HOW: Record<FaceElement, string> = {
  wood: "밀어붙이는 힘이 세서, 처음엔 든든하지만 나중엔 내 속도를 지웁니다",
  fire: "타오를 땐 뜨겁지만 식는 것도 빨라, 온도 차에 마음이 다칩니다",
  earth: "고집이 두터워, 한 번 어긋나면 되돌리는 데 오래 걸립니다",
  metal: "옳고 그름이 분명해서, 재는 말 한마디에 마음이 베입니다",
  water: "속을 잘 안 보여, 가까워졌다 싶을 때마다 한 걸음 물러섭니다",
};
