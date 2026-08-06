// =====================================================
// 짝의 얼굴 — 결제 전 티저 카드와 결제 후 결과지가 **같은 얼굴·같은 문장**을 쓰게 하는 매핑.
// =====================================================
// 왜 오행으로 고르나: 예전엔 생일 문자코드 % 4 로 골랐다. 그러면 사진이 사주와 아무 상관이 없어서
// "얼굴까지 봤다"가 순전한 연출로만 남고, 결과지에서 회수할 근거도 없다. 배우자성(정·편관 / 정·편재)이
// 붙은 글자의 오행으로 고르면 ① 같은 명식이면 언제 봐도 같은 얼굴이고 ② 왜 이 얼굴인지 댈 근거가 있고
// ③ 티저에서 흐리게 본 그 얼굴이 결과지에서 그대로 열린다.
//
// 장수: 오행 5 × 상대 성별 2 = **10장 고정**. 사람마다 생성하지 않는다 —
// 결과 1건당 비용 0·대기 0이고, 재접속해도 얼굴이 바뀌지 않는다(바뀌면 그 자리에서 들통난다).
// 이미지가 아직 없으면 카드는 실루엣으로 조용히 내려앉는다(컴포넌트 onError).
import type { InyeonFacts } from "./saju-api";

export type FaceElement = "wood" | "fire" | "earth" | "metal" | "water";

export type PartnerFace = {
  /** 얼굴 이미지 경로 — 없으면 컴포넌트가 실루엣으로 폴백 */
  src: string;
  sex: "m" | "f";
  el: FaceElement;
  /** 목/화/토/금/수 — 카드 하단 근거 한 줄에 그대로 쓴다 */
  ohKo: string;
  /** 외모 — "정확한 수치 금지" 규칙에 맞춰 인상만 그린다(키 몇 cm 같은 건 절대 쓰지 않는다) */
  look: string;
  nature: string;
  /** 만나기 쉬운 자리 */
  place: string;
};

const KEY_OF: Record<string, FaceElement> = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };

// 오행별 인상. 상품이 "운명의 상대"라 인물은 매력적으로 그린다 — 다만 오행마다 매력의 결이 달라야
// 열 명이 열 명 다르게 읽힌다("잘생겼다" 한 줄로 통일하면 열 장이 한 장처럼 보인다).
const LOOK: Record<FaceElement, string> = {
  wood: "키가 크고 선이 곧은, 늘씬한 인상",
  fire: "이목구비가 또렷하고 눈빛이 살아 있는 화사한 인상",
  earth: "이목구비가 순하고 살결이 고운, 보고 있으면 편안한 인상",
  metal: "피부가 희고 이목구비가 정갈한, 단정하고 세련된 인상",
  water: "눈매가 깊고 살결이 맑은, 분위기 있는 인상",
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
  return {
    src: `/products/sangun/partner-${sex}-${el}.webp`,
    sex,
    el,
    ohKo: f.spouseOh || "토",
    look: LOOK[el],
    nature: NATURE[el][f.spouseType],
    place: placeFromHint(f.meetHint?.trim() ?? "") ?? PLACE[el],
  };
}
