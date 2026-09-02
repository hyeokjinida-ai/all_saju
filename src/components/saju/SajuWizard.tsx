"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { SajuTeaser } from "@/lib/saju/teaser";
import type { PartnerFace } from "@/lib/saju/partner-face";
import type { ResultView } from "@/lib/saju/result-view";
import { WebtoonPage, type WebtoonCutData } from "@/components/webtoon/WebtoonPage";
import {
  tag,
  displayOf,
  PROFILE_KEYS,
  PARTNER_OPTIONS,
  RELATIONSHIP_OPTIONS,
  JOB_OPTIONS,
  type ProfileOption,
  type OptionTone,
} from "@/lib/saju/profile-tags";
import { BgMedia } from "@/components/products/BgMedia";
import { INK_CENTERLINE, INK_STROKE } from "@/components/saju/ink-circle-path";
import { useInView } from "@/lib/use-in-view";
import { PillarChart } from "@/components/saju/PillarChart";
import { SangunBuyCard, TeaserSalesTail } from "@/components/products/SangunSalesBlocks";
import { SlotCut, InyeonCut, GlowBand, ScribbleLine, ScribbleStar, NeonMask, ComicSay, Hi } from "@/components/products/jiknyeo-ui";
// 밝은 티저 조판 부품 — 청월당 실측 규격(본문16/값16·500/헤드24 서예체/자간 -0.025em 고정)
import { T, BrushHead, BigNum, LockRow, OpenMonthCard, INK, BODY } from "@/components/products/jiknyeo-teaser-kit";
import { JiknyeoTeaserToc } from "@/components/products/jiknyeo-teaser-toc";
import { MoonGrid, Moon, GRADE_TO_PHASE } from "@/components/products/JiknyeoForecast";
import { JiknyeoTeaserPrice } from "@/components/products/jiknyeo-teaser-price";
import { JiknyeoBuyCard } from "@/components/products/jiknyeo-teaser-buycard";
import { SayEditPanel } from "@/components/products/jiknyeo-say-edit";
import { SAY_BOX_DEFAULT } from "@/lib/jiknyeo-say-box";
import { JiknyeoTeaserPoints } from "@/components/products/jiknyeo-teaser-points";
import type { AssetMap, SlotId } from "@/lib/jiknyeo-slots";

// 티저에 띄우는 원국 4기둥 — /api/saju/chart 의 view.pillars 그대로.
type Pillar = ResultView["pillars"][number];

// 기둥 수 → 글자 수를 한글로. 시 모름(3기둥)이면 "여섯 글자"다.
const GLYPH_COUNT: Record<number, string> = { 1: "두", 2: "네", 3: "여섯", 4: "여덟" };

type Gender = "male" | "female";
type Calendar = "solar" | "lunar";

// 결제 시트 옵션 — 단품 위에 얹는 패키지(0010 업셀).
// 타이트 실측 공식: 정가 앵커 + **할인율 역전**(단품 33% vs 패키지 44%) + '추천' 뱃지.
// 단품만 사면 손해처럼 보이게 만드는 것이 이 카드의 일이다.
export type BundleOption = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  /** 구성품 이름들 — "무엇이 하나 더 오는지"를 카드에서 바로 읽히게 한다 */
  includes: string[];
};

// 단일 상품 직접 구매 위저드 — 입력을 모아 바로 주문을 생성한다.
type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  /** 취소선 정가. 없으면 할인 표기를 안 한다. */
  compareAtPrice?: number | null;
  /** 결제 시트에 함께 세울 패키지들. 비어 있으면 예전처럼 단품 버튼만 나온다. */
  bundles?: BundleOption[];
  isLoggedIn?: boolean;
  // 랜딩 상태 배지(?c=…) → 고민 프리셀렉트. CONCERN_BY_SLUG 옵션에 있는 값만 반영.
  initialConcerns?: string[];
  // 결제 직전 티저 맨 위에 얹는 웹툰(어드민 /admin/webtoon 에서 만들고 켠 것). 비어 있으면 아무것도 안 나온다.
  webtoonCuts?: WebtoonCutData[];
  // "immersive": 타이트식 몰입 입력 — 카드 대신 캐릭터 배경 풀블리드 + 금색 톤(산군 전용, 로직 동일)
  variant?: "immersive";
  bgImage?: string;
  /** 입력 화면 배경 영상. 없으면 bgImage 로 내려앉는다(파일만 올리면 살아남) */
  bgVideo?: string;
  /**
   * `?demo=…` — 입력 10단계를 건너뛰고 **결제 전 티저 화면으로 바로** 들어간다.
   * 화면을 확인할 때마다 열 칸을 채우는 게 낭비라서 만든 문(형님 요청).
   *
   * 파는 것을 건드리지 않는다: 결제·주문·가격 경로는 그대로고, 채워 넣는 건 위저드가
   * 어차피 받는 값들뿐이다. 손님이 이 주소를 열어도 **무료 티저**만 보인다.
   * 만세력은 생일 단위로 캐시되므로 같은 데모 생일을 몇 번 열어도 API 콜은 처음 1회뿐이다.
   */
  demo?: DemoPreset | null;
  /** 직녀 에셋 슬롯 — 서버(page.tsx)가 디스크를 훑어 내려보낸다. 없으면 라벨 패널로 선다. */
  jiknyeoAssets?: AssetMap;
};

/** ?demo= 로 넘어온 미리보기 값. 지정 안 하면 DEMO_DEFAULT 로 채운다. */
export type DemoPreset = {
  birthDate: string; // YYYY-MM-DD
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  timeUnknown: boolean;
  name?: string;
  partner?: string;
  relationship?: string;
  job?: string;
  concerns?: string[];
};

type FormState = {
  name: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  gender: Gender | "";
  calendar: Calendar | "";
  // 결제 전에 받는 손님 상황 — [프로필] 태그로 concerns 에 실려 티저·결과지 양쪽에 흐른다.
  partner: string;      // 인연 방향(라벨) — 배우자 십성 계산을 바꾼다
  relationship: string; // 연애 상태
  job: string;          // 직업
  concerns: string[];
  concernText: string; // 직접 입력한 고민 한 줄(칩과 별개, 결과지에 정면 답변)
};

// 기본 고민 선택지 — 위저드 STEP 惑
const CONCERN_OPTIONS = ["재물", "부부·연애", "자녀", "직장·사업", "건강", "올해 운", "노후", "가족"];

// 상품별 고민 선택지 — 상품이 파는 질문과 위저드가 묻는 질문을 일치시킨다.
const CONCERN_BY_SLUG: Record<string, string[]> = {
  // 직녀 — 칩도 손님이 고르는 말이라 반말이다(직녀만 해요체로 묻는다).
  // ⚠ 이 문자열이 그대로 저장값이 된다. 고칠 때 InyeonWebtoon 의 상태 배지 `?c=` 값도 같이 고쳐야
  //   프리셀렉트가 살아 있다 — 불일치하면 SajuWizard 의 initialConcerns 필터가 조용히 버린다.
  "inyeon-saju": [
    "아직 만나는 사람이 없어",
    "썸·짝사랑 중이야",
    "사귀는 사람이 있어",
    "결혼 시기가 궁금해",
    "최근에 헤어졌어",
    "일하느라 연애가 밀렸어",
  ],
  // 결혼 축 — 인연과 질문을 가른다(인연=만날 사람이 언제 오나 / 결혼=그게 언제 결혼으로 가나)
  "marriage-saju": [
    "올해 안에 결혼하고 싶어",
    "지금 만나는 사람과 결혼하게 될까",
    "결혼이 자꾸 늦어져",
    "언제쯤 하게 될까 궁금해",
    "결혼 생각에 확신이 안 서",
    "준비를 언제 시작할지 궁금해",
  ],
  // 산군(신점) — 반말 톤 유지
  "sangun-sinjeom": [
    "돈이 궁금하다",
    "연애·결혼이 궁금하다",
    "일·이직이 궁금하다",
    "건강이 걱정된다",
    "올해 운이 궁금하다",
    "크게 바뀔 때가 궁금하다",
  ],
};

// 단계 구성 — 타이트 MZ무당과 같은 자리에 질문을 둔다(스토리 선택지는 장식, 수집은 여기서).
// 양력/음력은 생년월일 화면의 토글로 흡수해 화면 하나를 줄였다.
//
// help 에 "(선택)"·"(넘겨도 된다)" 를 적지 않는다 — optional 단계는 버튼 줄에 「건너뛰기」가
// 이미 떠 있어서 같은 말을 두 번 하는 셈이었다. help 는 **이 답이 무엇을 바꾸는가**만 말하고,
// 넘기는 방법은 버튼이 맡는다(형님이 잡아낸 중복 유형과 같다).
const STEPS: { hanja: string; q: string; help: string; optional?: boolean }[] = [
  { hanja: "名", q: "어떻게 불러드릴까요?", help: "결과지에 이 이름으로 적어드려요", optional: true },
  { hanja: "生", q: "언제 태어나셨나요?", help: "양력·음력도 함께 골라주세요" },
  { hanja: "時", q: "태어난 시각을 아시나요?", help: "시각을 알면 더 정밀한 풀이가 가능합니다" },
  { hanja: "性", q: "성별을 선택해 주세요", help: "운의 흐름 방향을 정하는 데 쓰입니다" },
  // 질문 안에 '남자/여자'를 넣는다 — 선택지를 보고 나서 "내 성별인가? 상대 성별인가?" 되짚으면 안 된다.
  // 바로 앞이 성별 질문이라 더 헷갈린다.
  { hanja: "緣", q: "마음이 가는 쪽은 남자인가요, 여자인가요?", help: "짝을 보는 자리가 이 답으로 달라집니다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나요?", help: "인연 풀이를 지금 상황에 맞춰드립니다", optional: true },
  { hanja: "業", q: "무슨 일을 하고 계신가요?", help: "일·돈 풀이를 상황에 맞춰드립니다", optional: true },
  { hanja: "惑", q: "요즘 가장 마음 쓰이는 건?", help: "복수 선택 가능 · 이 흐름을 먼저 살펴드립니다" },
  { hanja: "覽", q: "입력하신 정보를 확인해 주세요", help: "" },
  { hanja: "兆", q: "사주를 먼저 읽어봤어요", help: "여기까지는 무료예요" },
];

// 산군(신점) 전용 반말 카피 — 단계 구성·인덱스는 공용과 동일(로직 무변경), 말만 갈아끼운다.
// 사극 어미(~하거라/~느냐)는 쓰지 않는다. 경쟁사(청월당·타이트) 둘 다 현대 하대체를 쓴다.
const STEPS_SANGUN: typeof STEPS = [
  { hanja: "名", q: "이름이 뭐냐", help: "장부에 이 이름으로 적어 둔다", optional: true },
  { hanja: "生", q: "언제 태어났냐", help: "양력인지 음력인지도 같이 골라라" },
  { hanja: "時", q: "태어난 시각은 아나", help: "알면 더 깊이 본다 — 모르면 모른다 해도 된다" },
  { hanja: "性", q: "성별은", help: "남녀가 운의 흐름을 읽는 방향이 다르다" },
  { hanja: "緣", q: "마음이 가는 쪽이 남자냐, 여자냐", help: "장부에서 네 짝을 찾는 자리가 달라진다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나", help: "있으면 그 자리부터 본다", optional: true },
  { hanja: "業", q: "무엇으로 먹고사나", help: "네가 하는 일에 맞춰 돈 얘기를 한다", optional: true },
  { hanja: "惑", q: "따로 묻고 싶은 게 있나", help: "적으면 그 물음부터 정면으로 답해준다 — 없으면 그냥 다음" },
  { hanja: "覽", q: "이대로 네 장부를 찾겠다", help: "" },
  // "겉장만 펴봤다"는 겉장이 뭔지 한 번 되짚게 만들었다(형님 지적 — 버튼과 같은 병).
  // 스토리에서 이미 한 말("네 장부, 내가 먼저 봤다")을 받아 해독이 필요 없는 문장으로.
  // 부제 "여기까지는 공짜로 보여주마"는 화면 맨 위에서 **뒤(이미 본 것)를 가리키는 말**이라
  // 어긋났다(형님 지적) — 아직 아무것도 안 보여줬는데 가리킬 게 없다. 앞을 가리키는 예고로
  // 바꾼다. 맨 아래 note "여기까지는 공짜다"가 그 예고를 회수하는 짝이 된다(예고→회수).
  { hanja: "兆", q: "네 장부, 다 읽고 왔다", help: "먼저 몇 줄, 공짜로 펴 주마" },
];

// 직녀(인연) 전용 — 문항·인덱스는 공용과 똑같고 말만 갈아끼운다(엔진을 포크하지 않는다).
// 어휘 금지: 천·날실·씨실·무늬·베틀. 세계관은 견우직녀 설화 하나 — 달력과 달로만 말한다.
// 「만나는 달」은 상품명이라 아껴 쓴다: 마지막 확인 화면에서 한 번만 꺼내 기대를 세운다.
const STEPS_JIKNYEO: typeof STEPS = [
  { hanja: "名", q: "먼저 이름부터요", help: "결과지에 이 이름으로 적어 둘게요", optional: true },
  { hanja: "生", q: "언제 태어나셨어요?", help: "양력인지 음력인지도 같이 골라주세요" },
  // help 에서 "몰라도 괜찮아요"를 뺐다 — 바로 아래 버튼과 보조문이 이미 두 번 말한다.
  { hanja: "時", q: "태어난 시각도 아세요?", help: "알면 더 촘촘히 봐요" },
  { hanja: "性", q: "성별을 알려주세요", help: "운의 흐름을 읽는 방향이 달라서요" },
  { hanja: "緣", q: "마음이 가는 쪽은 남자인가요, 여자인가요?", help: "짝을 보는 자리가 이 답으로 달라져요" },
  // 질문은 선택지의 꼴을 따라간다 — 선택지가 상태("혼자야")인데 "어떤 자리"를 물으면 한 박자 되짚는다.
  { hanja: "伴", q: "지금 곁에 사람이 있어요?", help: "지금 상황에 맞춰 풀어드릴게요", optional: true },
  { hanja: "業", q: "무슨 일을 하고 계세요?", help: "만나는 자리를 더 좁혀 볼 수 있어요", optional: true },
  // 화면에 상황 칩이 먼저 뜨므로 "물어보고 싶은 것"이 아니라 마음 쓰이는 것을 묻는다.
  { hanja: "惑", q: "요즘 제일 마음 쓰이는 게 뭐예요?", help: "그 물음부터 정면으로 답할게요" },
  { hanja: "覽", q: "이대로 달력을 펴 볼게요", help: "" },
  // 兆 는 공용과 같은 말을 쓴다 — 아래 마지막 줄이 「달력은 다 폈어요」라서,
  // 여기서도 달력을 꺼내면 한 화면에서 같은 말을 두 번 읽힌다.
  { hanja: "兆", q: "사주를 먼저 읽어봤어요", help: "여기까지는 무료예요" },
];

const STEPS_BY_SLUG: Record<string, typeof STEPS> = {
  "sangun-sinjeom": STEPS_SANGUN,
  // 인연·결혼은 같은 캐릭터(직녀)라 입력 대사를 공유한다 — 달력 세계관이 같다.
  "inyeon-saju": STEPS_JIKNYEO,
  "marriage-saju": STEPS_JIKNYEO,
};

const TOTAL = STEPS.length;
const PARTNER_STEP = 4;      // 인연 방향 — 배우자 십성 계산이 여기서 갈린다
const RELATIONSHIP_STEP = 5; // 연애 상태
const JOB_STEP = 6;          // 직업
const PROFILE_STEPS = [PARTNER_STEP, RELATIONSHIP_STEP, JOB_STEP];

// 상품이 실제로 쓰는 질문만 묻는다. 안 쓰는 상품에 물으면 순수 마찰이고, 답을 받아놓고 버리는 셈이다.
// 인연 계산(computeInyeonFacts)을 쓰는 상품은 generate-result.ts 기준 inyeon-saju · sangun-sinjeom 뿐이다.
const PROFILE_ASK_BY_SLUG: Record<string, number[]> = {
  "sangun-sinjeom": PROFILE_STEPS,                      // 포괄 메인 — 전부
  "premium-saju": PROFILE_STEPS,                        // 종합 풀이 — 전부
  "inyeon-saju": [PARTNER_STEP, RELATIONSHIP_STEP],     // 인연 상품
  "marriage-saju": [PARTNER_STEP, RELATIONSHIP_STEP],   // 결혼 — 배우자성 계산이 같다
  "love-saju": [PARTNER_STEP, RELATIONSHIP_STEP],       // 부부·자녀
  "wealth-saju": [JOB_STEP],                            // 돈 상품은 하는 일만
  "monthly-luck": [JOB_STEP],
};
const CONCERN_STEP = 7;      // 고민
const CONFIRM_STEP = 8;      // 입력 확인
const TEASER_STEP = 9;       // 결제 전 무료 티저(개인화) = 결제 화면
/** 로딩 화면 최소 노출 시간 = ritual.mp4 길이(3.17초)에 맞춘다.
 *  실측: 만세력 캐시에 걸리면 응답이 1초대라 그냥 두면 영상이 한 동작도 못 보여주고 사라진다.
 *  영상보다 길게 잡으면 루프가 한 번 더 돌아 이음매(16.1)가 화면에 보인다 — 그래서 딱 맞춘다. */
const MIN_TEASER_LOADING_MS = 3200;

// 산군 스토리(비주얼노벨)에서 고른 직업·연애상태를 위저드로 넘기는 세션 키

// 비로그인 → 로그인 왕복 동안 위저드 입력을 보존하는 세션 키 (read-once)
const ORDER_DRAFT_KEY = "myeongunrok:order-wizard-draft";

// 생년월일 — 네이티브 date 입력은 연도 칸이 6자리까지 먹어 "199406년" 오입력이 남(실측 버그).
// 퍼널과 같은 숫자 8자리 마스크 방식으로 통일한다: 19940615 → 1994.06.15
function fmtBirth(digits: string) {
  const s = digits.slice(0, 8);
  return [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8)].filter(Boolean).join(".");
}
function isValidBirth(d: string) {
  if (d.length !== 8) return false;
  const y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8);
  if (y < 1930 || y > new Date().getFullYear() || m < 1 || m > 12 || day < 1 || day > 31) return false;
  const dt = new Date(y, m - 1, day);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day;
}

export function SajuWizard({
  productId,
  productSlug,
  productName,
  price,
  compareAtPrice = null,
  bundles = [],
  isLoggedIn = false,
  initialConcerns,
  webtoonCuts = [],
  variant,
  bgImage,
  bgVideo,
  demo = null,
  jiknyeoAssets,
}: Props) {
  const imm = variant === "immersive";
  // 직녀(인연)판 — 결제 시트·티저가 산군과 같은 부품을 쓰므로 색·어휘만 slug 로 가른다.
  const isInyeon = productSlug === "inyeon-saju";
  const isJiknyeoWorld = productSlug === "inyeon-saju" || productSlug === "marriage-saju";
  // `?skin=pink` — 옛 분홍 티저를 그대로 본다. 배포를 되돌리지 않고 두 판을 나란히 비교하는 문.
  const pinkSkin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("skin") === "pink";
  // 직녀 세계관 전체 — 인연·결혼 두 상품이 같은 캐릭터·같은 옷을 쓴다(청월당 백월아씨 방식).
  // **껍데기(색·대사·입력)는 여기로, 알맹이(티저 달력·인연 카피)는 isInyeon 으로** 가른다.
  // 주요 버튼(CTA) 칠 — 세 벌이 같은 자리에 반복되므로 한 곳에서 만든다.
  //   산군=금, 직녀=달빛, 그 외=기존 보라. 값은 각 세계관 랜딩의 CTA 와 같은 계열이다.
  const ctaFill = imm
    ? { on: "linear-gradient(135deg,#efe6d2,#e8c96a 60%,#a9861f)", off: "rgba(232,201,106,0.12)", ink: "#241a08", glow: "0 8px 26px rgba(201,162,39,0.35)" }
    : isJiknyeoWorld
      ? { on: "linear-gradient(180deg,#efeaf6,#d9c7e8)", off: "rgba(207,214,230,0.15)", ink: "var(--wine-deep)", glow: "0 8px 26px rgba(217,199,232,0.3)" }
      : { on: "linear-gradient(180deg,#ffffff,#f1eaff)", off: "rgba(150,90,255,0.15)", ink: "var(--wine-deep)", glow: "0 0 24px rgba(150,90,255,0.28)" };
  // 결제 시트 카드의 강조색(선택 테두리·가격·배지)
  const sheetAccent = imm ? "#e8c96a" : isJiknyeoWorld ? "#d9c7e8" : "#c9a8ff";
  /** 선택지 버튼은 **손님이 말하는 자리**라 상품별 말투가 다르다.
   *  산군=반말 하대(ban) · 직녀=손님 반말(jik) · 그 외=해요체(label). 저장값(value)은 어느 쪽이든 같다. */
  const optTone: OptionTone = imm ? "ban" : isJiknyeoWorld ? "jik" : "label";
  const optLabel = (o: ProfileOption) => displayOf([o], o.value, optTone);
  const router = useRouter();
  // 결제 시트에서 고른 것. 기본은 단품 — 패키지는 손님이 직접 고를 때만 팔린다.
  const [selectedId, setSelectedId] = useState(productId);
  const concernOptions = CONCERN_BY_SLUG[productSlug] ?? CONCERN_OPTIONS;
  const steps = STEPS_BY_SLUG[productSlug] ?? STEPS;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [birthRaw, setBirthRaw] = useState("");
  const [teaser, setTeaser] = useState<SajuTeaser | null>(null);
  const [pillars, setPillars] = useState<Pillar[] | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({}); // 웹툰 말풍선에 꽂을 손님 값
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [guestEmail, setGuestEmail] = useState(""); // 비회원 결제 — 결과 수령 이메일
  // 직녀 전용 이메일 화면(확인 → 이메일 → 티저). 단계 인덱스를 늘리지 않는다 —
  // STEPS 배열을 건드리면 산군·존댓말 4종의 건너뛰기 계산이 통째로 밀린다.
  const [emailGate, setEmailGate] = useState(false);
  const [emailSkipped, setEmailSkipped] = useState(false);
  const [form, setForm] = useState<FormState>({
    // demo 가 있으면 첫 렌더부터 채워 둔다 — setState 로 나중에 넣으면 티저 요청이
    // 빈 생일로 한 번 먼저 나가서 실패한다.
    name: demo?.name ?? "",
    birthDate: demo?.birthDate ?? "",
    birthTime: "",
    timeUnknown: demo?.timeUnknown ?? false,
    gender: demo?.gender ?? "",
    calendar: demo?.calendar ?? "",
    partner: demo?.partner ?? "",
    relationship: demo?.relationship ?? "",
    job: demo?.job ?? "",
    concerns: (demo?.concerns ?? initialConcerns ?? []).filter((c) => concernOptions.includes(c)),
    concernText: "",
  });

  // 로그인 왕복 후 복귀 시 입력 복원 (read-once: 복원하면 즉시 비움)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ORDER_DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(ORDER_DRAFT_KEY);
      const draft = JSON.parse(raw) as { slug?: string; step?: number; form?: FormState; guestEmail?: string };
      if (draft?.slug === productSlug && draft.form) {
        // 새 항목(인연 방향·연애·직업)이 없던 시절의 저장본도 그대로 복원되게 기본값을 채운다
        setForm({
          ...draft.form,
          concernText: draft.form.concernText ?? "",
          partner: draft.form.partner ?? "",
          relationship: draft.form.relationship ?? "",
          job: draft.form.job ?? "",
        });
        if (draft.guestEmail) setGuestEmail(draft.guestEmail);
        // 티저 단계는 분석 결과가 있어야 성립 → 복귀는 확인 단계까지만
        setStep(
          typeof draft.step === "number" ? Math.min(Math.max(0, draft.step), CONFIRM_STEP) : CONFIRM_STEP,
        );
      }
    } catch {
      /* 손상된 draft 는 무시 */
    }
    // 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초안 복원 등으로 birthDate가 밖에서 채워지면 마스크 입력 상태도 따라간다(타이핑 중 빈값일 땐 건드리지 않음)
  useEffect(() => {
    const digits = form.birthDate.replace(/-/g, "");
    if (digits && digits !== birthRaw) setBirthRaw(digits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.birthDate]);

  // (카카오 개통 시 복구) 로그인으로 떠나기 직전 입력을 세션에 저장하던 saveDraft 는
  // 위저드에서 로그인 경로를 걷어내며 함께 제거했다. 복원 로직은 위에 그대로 살아 있으므로,
  // 로그인 버튼을 되살릴 때 저장부만 다시 붙이면 왕복 보존이 그대로 동작한다.

  // 퍼널 추적 — 단계별 이탈 지점 파악(개인정보 없이 단계/상품/금액만 전송)
  useEffect(() => {
    track("wizard_step", { step: step + 1, total: TOTAL, slug: productSlug });
    if (step === TOTAL - 1 && !isLoggedIn) {
      track("checkout_login_wall", { slug: productSlug, value: price });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // 이 상품이 안 묻는 프로필 질문 — 화면에서 통째로 건너뛰고 진행 표시에서도 뺀다
  const skipped = useMemo(() => {
    const ask = PROFILE_ASK_BY_SLUG[productSlug] ?? [];
    return new Set(PROFILE_STEPS.filter((s) => !ask.includes(s)));
  }, [productSlug]);
  const visibleSteps = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => i).filter((i) => !skipped.has(i)),
    [skipped],
  );

  const up = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggleConcern = (c: string) =>
    setForm((f) => ({
      ...f,
      concerns: f.concerns.includes(c) ? f.concerns.filter((x) => x !== c) : [...f.concerns, c],
    }));

  const canNext = useCallback(() => {
    if (step === 1) return !!form.birthDate && !!form.calendar; // 달력을 이 화면이 흡수했다
    if (step === 3) return !!form.gender;
    if (step === PARTNER_STEP) return !!form.partner; // "아직 모르겠다"도 답이므로 고르긴 해야 한다
    return true;
  }, [step, form.birthDate, form.calendar, form.gender, form.partner]);

  // 확인 → 티저: 만세력 1콜(생일 캐시 공유 — 이 사람이 결제하면 추가 콜 없음)로
  // 명식 기반 콜드리딩 + "크게 갈리는 해"를 먼저 보여준다. 실패해도 결제는 그대로 진행.
  /** 결제 전에 받은 상황 답 — [프로필] 태그로 실어 보낸다. 티저와 결과지가 같은 값을 쓰게 하는 통로다.
   *  loadTeaser 가 의존하므로 반드시 그보다 위에 선언한다. */
  const profileTags = useCallback(
    () =>
      [
        form.partner && tag(PROFILE_KEYS.partner, form.partner),
        form.relationship && tag(PROFILE_KEYS.relationship, form.relationship),
        form.job && tag(PROFILE_KEYS.job, form.job),
      ].filter(Boolean) as string[],
    [form.partner, form.relationship, form.job],
  );

  const loadTeaser = useCallback(async () => {
    const startedAt = Date.now();
    setTeaserLoading(true);
    setStep(TEASER_STEP);
    try {
      const res = await fetch("/api/saju/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 이름이 빠져 있어서 웹툰 1컷({이름}으로 여는 칸)이 통째로 안 떴다.
          // 손님 이름으로 시작하는 자리가 이 웹툰에서 가장 개인화된 한 줄이다.
          nickname: form.name || undefined,
          birthDate: form.birthDate,
          birthTime: form.timeUnknown ? null : form.birthTime || null,
          timeUnknown: form.timeUnknown,
          gender: form.gender || "male",
          calendar: form.calendar || "solar",
          // 인연 방향이 여기 실려야 티저와 결제 후 결과지가 같은 해를 말한다
          concerns: profileTags(),
          slug: productSlug,
          teaser: true,
        }),
      });
      const json = await res.json();
      // 명식(원국)과 티저는 성패를 따로 본다. 명식은 "네 생일로 계산했다"는 유일한 증거라
      // 콜드리딩이 못 만들어져도 이것만은 띄워야 한다(묶어두면 둘 다 사라진다).
      if (json?.ok) {
        setPillars(Array.isArray(json.view?.pillars) ? (json.view.pillars as Pillar[]) : null);
      }
      if (json?.ok && json.tokens) setTokens(json.tokens as Record<string, string>);
      if (json?.ok && json.teaser) {
        setTeaser(json.teaser as SajuTeaser);
        track("teaser_view", { slug: productSlug });
      } else {
        track("teaser_fail", { slug: productSlug, reason: String(json?.reason ?? "no_teaser") });
      }
    } catch {
      track("teaser_fail", { slug: productSlug, reason: "network" });
    } finally {
      // 만세력이 캐시에 걸리면 1초 만에 끝난다. 그러면 로딩 영상이 한 동작도 못 보여주고 사라지고,
      // 10단계를 답한 손님에게 "계산했다"는 실감이 안 남는다 → 최소 시간은 붙잡아 둔다.
      // 느릴 땐 그냥 통과하므로 총 대기가 늘지는 않는다.
      const left = MIN_TEASER_LOADING_MS - (Date.now() - startedAt);
      if (left > 0) await new Promise((r) => setTimeout(r, left));
      setTeaserLoading(false);
    }
    // profileTags 를 빼면 인연 방향을 고르기 전 값이 붙잡혀 티저만 이성 기준으로 계산된다
    // → 티저와 결제 후 결과지가 다른 해를 말한다. 반드시 의존성에 남겨둘 것.
  }, [form.name, form.birthDate, form.birthTime, form.timeUnknown, form.gender, form.calendar, productSlug, profileTags]);

  const next = useCallback(() => {
    if (step === CONFIRM_STEP) {
      // 직녀만 — 결과 직전에 이메일을 폼이 아니라 대사로 한 번 묻는다(시장 1위 #45).
      // 결제까지 안 가는 손님도 여기서 남는다. 막지는 않는다 — 건너뛰면 그대로 티저로 간다.
      if (isJiknyeoWorld && !emailGate && !emailSkipped) {
        setEmailGate(true);
        return;
      }
      setEmailGate(false);
      void loadTeaser();
      return;
    }
    setStep((s) => {
      let n = s + 1;
      while (n < TOTAL - 1 && skipped.has(n)) n++; // 이 상품이 안 묻는 질문은 건너뛴다
      return Math.min(n, TOTAL - 1);
    });
  }, [step, loadTeaser, skipped, isJiknyeoWorld, emailGate, emailSkipped]);
  const prev = () =>
    setStep((s) => {
      let p = s - 1;
      while (p > 0 && skipped.has(p)) p--;
      return Math.max(0, p);
    });

  // ?demo= 로 들어왔으면 입력을 건너뛰고 티저를 바로 띄운다(형님 화면 확인용).
  // 마운트 1회만 — loadTeaser 를 의존성에 넣으면 form 이 바뀔 때마다 다시 호출된다.
  const demoFired = useRef(false);
  useEffect(() => {
    if (!demo || demoFired.current) return;
    demoFired.current = true;
    void loadTeaser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Enter 키로 다음
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canNext() && step < TOTAL - 1) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canNext, next, step]);

  function payload() {
    const concerns = [
      ...profileTags(),
      ...form.concerns,
      ...(form.concernText.trim() ? [form.concernText.trim()] : []),
    ];
    return {
      name: form.name.trim(),
      birthDate: form.birthDate,
      birthTime: form.timeUnknown ? null : form.birthTime || null,
      timeUnknown: form.timeUnknown,
      gender: (form.gender || "male") as Gender,
      calendar: (form.calendar || "solar") as Calendar,
      concerns,
    };
  }

  const guestEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail.trim());

  // ─── 결제 시트 옵션 ────────────────────────────────
  // 단품을 맨 위에 두고 패키지를 아래에 둔다. 할인율이 아래로 갈수록 커져야
  // "단품만 사면 손해"가 눈으로 읽힌다(타이트 결제 시트와 같은 배치).
  const checkoutOptions: BundleOption[] = [
    { productId, slug: productSlug, name: productName, price, compareAtPrice, includes: [] },
    ...bundles,
  ];
  const selected = checkoutOptions.find((o) => o.productId === selectedId) ?? checkoutOptions[0];
  const effectivePrice = selected.price;
  // 추천 뱃지 — 이미 받아둔 연애 상태로 가른다(타이트가 솔로에게 '솔탈 패키지'를 붙이는 자리).
  // 혼자·정리 중이면 인연 장부, 그 외(만나는 사람 있음·기혼·무응답)는 재물 장부.
  //
  // ⚠ 2상품 오픈(2026-08-11)으로 재물 번들이 내려가 **번들이 하나뿐**이다. 그대로 두면
  //   "만나는 사람 있음·기혼" 손님은 추천 뱃지가 아예 없는 결제 시트를 본다(뱃지는 선택률을
  //   끌어올리는 장치인데 절반이 못 본다). 고를 게 하나뿐이면 세그먼트를 따질 이유가 없으므로
  //   무조건 그것을 추천한다. 기혼에게도 어색하지 않다 — 산군 포괄에 인연 챕터가 이미 있고
  //   번들 카피가 "장부 한 권 더"라 세그먼트 중립이다.
  const wantsInyeon = form.relationship === "혼자" || form.relationship === "정리 중" || !form.relationship;
  const recommended =
    bundles.length === 1
      ? bundles[0]
      : bundles.find((b) => (wantsInyeon ? b.slug.includes("inyeon") : b.slug.includes("wealth")));
  const discountPct = (o: BundleOption) =>
    o.compareAtPrice && o.compareAtPrice > o.price
      ? Math.round((1 - o.price / o.compareAtPrice) * 100)
      : null;

  // 단일 상품 주문 생성 → 결제 (회원=계정 수령 / 비회원=이메일 수령)
  async function createOrder() {
    if (!form.birthDate) {
      toast.error("생년월일을 입력해 주세요");
      setStep(1);
      return;
    }
    if (!isLoggedIn && !guestEmailValid) {
      toast.error("결과 받을 이메일을 입력해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.productId, // 단품이거나 손님이 고른 패키지
          ...payload(),
          email: isLoggedIn ? undefined : guestEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "주문 생성 실패");
      track("begin_checkout", { slug: selected.slug, value: effectivePrice, currency: "KRW" });
      router.push(`/checkout/${json.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
      setSubmitting(false);
    }
  }

  const cur = steps[step];

  // 배경(영상 + 그라데이션 + 유리판)을 담는 홀더.
  //
  // 입력 단계에서는 껍데기가 한 화면(100svh)이라 `absolute inset-0` 이 곧 화면이었다.
  // 그런데 **티저 단계에서 껍데기가 14,000px 로 자라면 배경도 같이 자란다** — 실측(2026-09-01):
  // 산군 w=390 에 video 가 390×14,007 로 그려져, 프레임 가로의 4%만 10배로 늘어난 색 얼룩이 됐다.
  // 인물이 안 보이니 연출은 이미 소멸했고 GPU 로 흐리는 비용만 남는다(직녀도 같은 병, 12,670px).
  //
  // 그래서 티저에서만 홀더를 **화면에 고정**한다. 폰 기둥(ChromeGate 의 max-w-md) 안에 머물도록
  // 가로를 같은 값으로 묶는다 — `fixed inset-0` 로 두면 PC 에서 배경만 화면 전체로 퍼진다.
  // (조상에 transform 이 없어야 fixed 가 뷰포트 기준으로 선다 — 껍데기는 flex/overflow 뿐이라 안전)
  const bgHolderCls =
    step === TEASER_STEP
      ? "pointer-events-none fixed left-1/2 top-0 z-0 h-[100svh] w-full max-w-md -translate-x-1/2 overflow-hidden"
      : "contents";

  return (
    <div
      // world-sangun: 공용 --gold-*/--bone-* 토큰이 자수정 보라값이라, 이 클래스로 신당 색을 덮는다.
      // (안 덮으면 손님 이름·원국 한자 같은 핵심이 보라로 나온다 — globals.css 주석 참고)
      className={
        imm
          ? "world-sangun wizard-immersive relative flex w-full flex-col overflow-hidden"
          : isJiknyeoWorld
            // 직녀도 산군과 같은 **전체화면 몰입**으로 세운다(2026-08-23).
            // 그 전까지는 min-h-[560px] 카드였다 — 배경 영상이 카드 안에만 깔리고
            // 화면 아래 1/3 이 검은 여백으로 남았다(실측). 카드 테두리·라운드도 뗀다.
            // ⚠ `wizard-immersive` 는 쓰지 않는다 — 그 클래스의 .ap-input 이 **금색**이라
            //    직녀 화면에 산군 색이 들어온다(실측: 「名」과 입력창 테두리가 금색으로 나옴).
            //    직녀 은사판은 `.world-jiknyeo .ap-input` 이 이미 갖고 있고, 그 클래스는 부모에 있다.
            ? "relative flex w-full flex-col overflow-hidden"
            : "scene-cosmos relative overflow-hidden rounded-md border border-gold-line min-h-[560px] flex flex-col"
      }
      style={
        imm
          ? { background: "#0a090e", minHeight: "100svh" }
          : isJiknyeoWorld
            ? { background: "#0b0f1a", minHeight: "100svh" }
            : undefined
      }
    >
      {imm ? (
        <div className={bgHolderCls}>
          {/* 타이트는 입력 중에도 캐릭터 영상이 말을 건다. 영상 파일이 없으면 이미지로 내려앉으므로
              지금 상태에서도 화면이 성립하고, 파일만 올리면 살아난다.
              배경 그림이 스토리 3·4장면과 같은 face 라 영상도 face.mp4 를 같이 쓴다(영상 한 편 절약). */}
          {/* 장부를 찾는 동안만 다른 영상으로 바꾼다 — 그 3초가 손님이 아무것도 안 하고 기다리는
              유일한 구간이다. 여기까지 본 영상을 또 틀면 "기다리는 중"이라는 느낌이 안 산다.
              못 틀면 poster(altar.webp)로 내려앉으므로 검은 화면은 안 나온다. */}
          <BgMedia
            video={teaserLoading ? "/products/sangun/ritual.mp4" : (bgVideo ?? "/products/sangun/face.mp4")}
            img={teaserLoading ? "/products/sangun/altar.webp" : (bgImage ?? "/products/sangun/face.webp")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-85"
          />
          {/* 전체를 균일하게 누르면 배경이 죽고, 안 누르면 글자가 죽는다.
              그래서 전면 그라데이션은 적당히만 두고, 글자가 실제로 앉는 자리는 아래 스크림이 따로 잡는다. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(7,6,9,0.58) 0%, rgba(7,6,9,0.22) 36%, rgba(7,6,9,0.90) 74%, rgba(7,6,9,0.96) 100%)",
            }}
          />
        </div>
      ) : isJiknyeoWorld ? (
        <div className={bgHolderCls}>
          {/* 시장 1위 실측(#44·#46) — 캐릭터를 배경에 블러로 세워 두고 한 항목씩 묻는다.
              폼 화면으로 넘어가지 않아 이탈이 줄고, **자유 고민 화면에서만 블러가 풀린다**
              (「이제 진짜 듣는다」 연출).
              2026-08-23: 배경을 정지 이미지에서 **아이들 루프 영상**으로 올렸다 — 청월당이
              `?step=greeting` 부터 단계마다 캐릭터 루프를 까는 그 자리다(greeting.mp4 실측).
              손님이 10문항 동안 가장 오래 머무는 화면이라, 살아 있는 배경이 이탈을 붙든다.
              장부를 찾는 3초(teaserLoading)만 다른 영상으로 바꾼다 — 산군이 ritual.mp4 로 하는 것과 같다.
              ⚠ 블러를 <video> 자체에 걸면 모바일 GPU 가 매 프레임 다시 흐린다. 영상은 그대로 두고
                 **위에 얹은 유리판(backdrop-filter)** 이 흐림을 맡는다. 파일이 없으면 i1.webp 로 강등. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              // 어둡게 하는 일은 **아래 그라데이션 한 곳**이 맡는다. 여기서 또 누르면
              // 두 겹이 겹쳐 인물이 통째로 사라진다(실측: 유리판 0.58 + 그라데이션 → 새까만 화면).
              opacity: step === CONCERN_STEP ? 0.78 : 0.6,
              transition: "opacity .6s ease-out",
            }}
          >
            <BgMedia
              video={teaserLoading ? "/products/jiknyeo/loading.mp4" : "/products/jiknyeo/w2.mp4"}
              img="/products/inyeon/i1.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              // 유리판은 **흐림만** 맡는다(배경색 없음) — 어둡게는 위 opacity + 아래 그라데이션이 한다
              backdropFilter: step === CONCERN_STEP ? "blur(0px)" : "blur(7px)",
              WebkitBackdropFilter: step === CONCERN_STEP ? "blur(0px)" : "blur(7px)",
              transition: "backdrop-filter .6s ease-out",
            }}
          />
          {/* 글자가 앉는 자리를 눌러 준다 — 위아래를 진하게, 가운데(얼굴)는 살려서 인물이 남게 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,15,26,0.74) 0%, rgba(11,15,26,0.5) 32%, rgba(11,15,26,0.88) 72%, rgba(11,15,26,0.97) 100%)",
            }}
          />
        </div>
      ) : (
        <div className="starfield opacity-30" />
      )}

      {/* 상단: 이전 + 진행률 + N/7 (몰입형은 스테이지 상단 바 아래로 여백 확보) */}
      {/* 직녀는 무대(JiknyeoStory)가 브랜드 줄을 **화면 상단에 고정**으로 얹는다(top 16~36).
          위저드가 pt-5 로 시작하면 진행점이 top 28 에 서서 그 글자 위에 정확히 겹친다(운영 실측).
          무대가 자기 헤더 높이를 알려주는 통로가 없으므로, 세계관으로 갈라 여백을 비운다. */}
      <div className={`relative z-[2] w-full max-w-[560px] mx-auto px-5 ${imm ? "pt-14" : isJiknyeoWorld ? "pt-12" : "pt-5"}`}>
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="text-bone-soft text-[23px] leading-none disabled:opacity-30 px-1"
            aria-label="이전 단계"
          >
            ‹
          </button>
          <div className="flex items-center gap-[7px]">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-[7px] rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 22 : 7,
                  background:
                    i < step
                      ? "var(--gold-soft)"
                      : i === step
                        ? "var(--gold-bright)"
                        : imm
                          ? "rgba(232,201,106,0.18)"
                          : isJiknyeoWorld
                            ? "rgba(207,214,230,0.2)"
                            : "rgba(150,90,255,0.2)",
                  // 글로우는 세계관 액센트를 따라간다 — 보라 점에 금 글로우가 붙어 있던 기존 어긋남도 여기서 잡힌다
                  boxShadow: i === step ? `0 0 8px ${imm ? "rgba(232,200,120,0.6)" : isJiknyeoWorld ? "rgba(217,199,232,0.6)" : "rgba(180,140,255,0.55)"}` : "none",
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] text-bone-faint tracking-[0.15em]">
            {visibleSteps.indexOf(step) + 1}/{visibleSteps.length}
          </span>
        </div>
      </div>

      {/* 중앙: 질문 + 컨트롤 */}
      <div
        key={step}
        className={`svc-fade flex-1 relative z-[1] w-full max-w-[560px] mx-auto px-5 py-5 flex flex-col justify-center${imm ? " overflow-y-auto" : ""}`}
      >
        <div className="text-center mb-7">
          {!imm && (
            <span className="font-brush glow-gold block mb-4 text-gold-bright text-[40px] leading-none">
              {cur.hanja}
            </span>
          )}
          <p className="font-myeongjo glow-bone text-bone text-[23px] font-bold leading-[1.4]">
            {step === TEASER_STEP && teaserLoading
              ? imm
                ? "네 장부를 찾는 중이다"
                : isJiknyeoWorld
                  ? "만나는 달을 찾는 중이에요"
                  : "명식을 계산하고 있어요"
              : emailGate
                ? "마지막으로 하나만요"
                : cur.q}
          </p>
          {cur.help && !(step === TEASER_STEP && teaserLoading) && !emailGate && (
            <p className="font-myeongjo mt-3 text-[13px] text-bone-soft tracking-[0.06em]">{cur.help}</p>
          )}
        </div>

        {/* STEP 0 — 이름 */}
        {step === 0 && (
          <input
            autoFocus
            className="ap-input text-center"
            type="text"
            // 「홍길동」은 서식 예시의 말이라 이 화면에서 손님이 자기를 대입할 이름이 아니다.
            // 유입은 100% 3040 여성이다(메타) — 그 자리에 그들의 이름을 둔다.
            placeholder="김지은"
            value={form.name}
            onChange={(e) => up("name", e.target.value)}
            style={{ fontSize: 19 }}
          />
        )}

        {/* STEP 1 — 생년월일 (숫자 8자리 마스크: 19940615 → 1994.06.15) */}
        {step === 1 && (
          <div>
            <input
              autoFocus
              className="ap-input text-center"
              type="text"
              inputMode="numeric"
              placeholder="19940615"
              maxLength={10}
              value={fmtBirth(birthRaw)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                setBirthRaw(digits);
                up(
                  "birthDate",
                  digits.length === 8 && isValidBirth(digits)
                    ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
                    : "",
                );
              }}
              style={{ fontSize: 19, letterSpacing: "0.08em" }}
            />
            {/* 아래 두 줄은 입력을 마치려면 **반드시 읽어야 하는** 안내다 — 장식 라벨(11px)과 같은
                크기면 안 된다. 위저드 도움말과 같은 13px 로 올린다(타깃이 3040이라 11px 은 작다). */}
            {birthRaw.length > 0 && birthRaw.length < 8 && (
              <p className="mt-2 text-center text-[13px] text-bone-faint">
                숫자 여덟 자리(연4 · 월2 · 일2)를 이어서 입력해 주세요
              </p>
            )}
            {birthRaw.length === 8 && !isValidBirth(birthRaw) && (
              <p className="mt-2 text-center text-[13px]" style={{ color: "#ff9a9a" }}>
                올바른 날짜가 아니에요
              </p>
            )}

            {/* 양력/음력 — 예전엔 별도 화면이었는데 토글 하나면 되는 걸 화면 하나로 쓰고 있었다 */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {([["solar", "양력", "陽"], ["lunar", "음력", "陰"]] as const).map(([c, ko, h]) => {
                const on = form.calendar === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => up("calendar", c)}
                    className={`py-4 px-3 flex flex-col items-center gap-1.5 ${
                      on ? "border-[1.5px] border-gold bg-gold-pale" : "border border-gold-line"
                    }`}
                  >
                    <span className={`font-brush text-[30px] leading-none ${on ? "text-gold-bright glow-gold" : "text-bone"}`}>
                      {h}
                    </span>
                    <span className={`font-myeongjo text-[13px] text-bone tracking-[0.15em] ${on ? "font-bold" : ""}`}>
                      {ko}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] text-bone-faint">
              {imm ? "주민등록 생일은 보통 양력이다" : "주민등록상 생일은 보통 양력이에요"}
            </p>
          </div>
        )}

        {/* STEP 2 — 출생시각 */}
        {step === 2 && (
          <div>
            <input
              className="ap-input text-center"
              type="time"
              value={form.birthTime}
              disabled={form.timeUnknown}
              onChange={(e) => up("birthTime", e.target.value)}
              style={{ fontSize: 19, opacity: form.timeUnknown ? 0.4 : 1 }}
            />
            <button
              type="button"
              onClick={() => up("timeUnknown", !form.timeUnknown)}
              className={`w-full mt-3 py-3.5 border border-gold-line font-myeongjo text-[15px] tracking-[0.15em] flex items-center justify-center gap-2 ${
                form.timeUnknown ? "bg-gold text-wine-deep font-bold" : "bg-transparent text-bone-soft"
              }`}
            >
              <span className="w-4 h-4 border border-current inline-flex items-center justify-center text-[11px]">
                {form.timeUnknown ? "✓" : ""}
              </span>
              {/* 이 버튼도 손님 대사다 — 직녀에서만 반말(입력대본 §3/9 원문) */}
              {isJiknyeoWorld ? "시간은 잘 몰라" : "태어난 시각을 몰라요"}
            </button>
            <p className="font-myeongjo mt-3 text-center text-[11px] text-bone-faint tracking-[0.06em] leading-[1.75]">
              시각을 몰라도 괜찮아요. 시(時) 기둥만 빼고 나머지 흐름을 봐드립니다.
            </p>
          </div>
        )}

        {/* STEP 3 — 성별 */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {([["male", "남성", "乾"], ["female", "여성", "坤"]] as const).map(([g, ko, h]) => {
              const on = form.gender === g;
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => {
                    up("gender", g);
                    setTimeout(next, 220);
                  }}
                  className={`py-7 px-3 flex flex-col items-center gap-2.5 ${
                    on ? "border-[1.5px] border-gold bg-gold-pale" : "border border-gold-line"
                  }`}
                >
                  <span
                    className={`font-brush text-[44px] leading-none ${on ? "text-gold-bright glow-gold" : "text-bone"}`}
                  >
                    {h}
                  </span>
                  <span
                    className={`font-myeongjo text-[15px] text-bone tracking-[0.15em] ${on ? "font-bold" : ""}`}
                  >
                    {ko}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 4 — 인연 방향. 여기 답이 배우자 십성(관성/재성)을 정한다 — 문장 톤이 아니라 계산이 바뀐다. */}
        {step === PARTNER_STEP && (
          <div>
            <div className="grid grid-cols-3 gap-2.5">
              {PARTNER_OPTIONS.map((o) => {
                const on = form.partner === o.value;
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => { up("partner", o.value); setTimeout(next, 220); }}
                    className={`px-2 py-6 ${on ? "border-[1.5px] border-gold bg-gold-pale" : "border border-gold-line"}`}
                  >
                    <span className={`font-myeongjo text-[15px] text-bone tracking-[0.06em] ${on ? "font-bold" : ""}`}>
                      {optLabel(o)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="font-myeongjo mt-4 text-center text-[11px] text-bone-faint leading-[1.75]">
              {/* 질문이 이미 남자/여자를 말하므로 여기선 반복하지 않는다. 안 정한 사람만 안심시키면 된다. */}
              {imm ? "아직 모르겠으면 모르겠다고 해라." : "아직 정하지 않으셨다면 마지막을 골라 주세요."}
            </p>
          </div>
        )}

        {/* STEP 5 — 연애 상태(선택) */}
        {step === RELATIONSHIP_STEP && (
          <div className="grid grid-cols-2 gap-2.5">
            {RELATIONSHIP_OPTIONS.map((o) => {
              const on = form.relationship === o.value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { up("relationship", on ? "" : o.value); if (!on) setTimeout(next, 220); }}
                  className={`px-3 py-5 ${on ? "border-[1.5px] border-gold bg-gold-pale" : "border border-gold-line"}`}
                >
                  <span className={`font-myeongjo text-[13px] text-bone tracking-[0.06em] ${on ? "font-bold" : ""}`}>
                    {optLabel(o)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 6 — 직업(선택) */}
        {step === JOB_STEP && (
          <div className="grid grid-cols-2 gap-2.5">
            {JOB_OPTIONS.map((o) => {
              const on = form.job === o.value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { up("job", on ? "" : o.value); if (!on) setTimeout(next, 220); }}
                  className={`px-3 py-5 ${on ? "border-[1.5px] border-gold bg-gold-pale" : "border border-gold-line"}`}
                >
                  <span className={`font-myeongjo text-[13px] text-bone tracking-[0.06em] ${on ? "font-bold" : ""}`}>
                    {optLabel(o)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 7 — 고민. 산군(포괄)은 카테고리 칩이 상품과 안 맞아(전 영역을 어차피 다룸) 구체 물음 예시 탭으로 대체 */}
        {step === CONCERN_STEP && (
          <div>
            {productSlug === "sangun-sinjeom" ? (
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "내년에 이직해도 되나",
                  "지금 만나는 사람과 결혼하게 되나",
                  "돈은 언제 풀리나",
                  "사업을 시작해도 되나",
                ].map((ex) => {
                  const on = form.concernText === ex;
                  return (
                    <button
                      type="button"
                      key={ex}
                      onClick={() => up("concernText", on ? "" : ex)}
                      className={`border px-3.5 py-2 font-myeongjo text-[13px] ${
                        on
                          ? "border-gold bg-gold text-wine-deep font-bold"
                          : "border-gold-line bg-transparent text-bone-soft"
                      }`}
                    >
                      {ex}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 justify-center">
                {concernOptions.map((c) => {
                  const on = form.concerns.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleConcern(c)}
                      className={`px-[18px] py-3 border font-myeongjo text-[15px] tracking-[0.06em] ${
                        on
                          ? "border-gold bg-gold text-wine-deep font-bold"
                          : "border-gold-line bg-transparent text-bone-soft"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-5">
              <input
                className="ap-input text-center"
                type="text"
                maxLength={80}
                placeholder={imm ? "직접 물어봐도 된다 — 예) 내년에 이직해도 되나" : "직접 적어주셔도 돼요 — 예) 내년에 이직해도 될까요?"}
                value={form.concernText}
                onChange={(e) => up("concernText", e.target.value)}
                style={{ fontSize: 15 }}
              />
              <p className="mt-2 text-center text-[11px] text-bone-faint">
                {imm ? "적으면 그 물음부터 정면으로 답해준다" : "적어주시면 그 질문부터 정면으로 답해드려요"}
              </p>
            </div>
          </div>
        )}

        {/* STEP 8 — 확인 · 직녀는 그 뒤에 이메일 한 화면을 더 둔다 */}
        {step === CONFIRM_STEP &&
          (emailGate ? (
            <div>
              <p className="font-myeongjo text-center text-[17px] leading-[1.8]" style={{ color: "var(--bone)" }}>
                다 되면, 어디로 보내 드릴까요?
              </p>
              <p className="font-myeongjo mt-3 text-center text-[13px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
                지금 화면에서 바로 열려요.
                <br />
                이 주소로도 한 부 보내 둘게요.
              </p>
              <input
                autoFocus
                className="ap-input mt-6 text-center"
                type="email"
                inputMode="email"
                placeholder="example@gmail.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                style={{ fontSize: 15 }}
              />
              <button
                type="button"
                onClick={next}
                disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)}
                className="mt-5 w-full min-h-[56px] border-none font-bold text-[17px] tracking-[0.22em] disabled:cursor-default"
                style={{
                  fontFamily: "var(--font-serif-kr), serif",
                  background: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) ? ctaFill.on : ctaFill.off,
                  color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) ? ctaFill.ink : "var(--bone-faint)",
                  boxShadow: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) ? ctaFill.glow : "none",
                }}
              >
                여기로 보내줘
              </button>
              {/* 막지 않는다 — 여기서 세우면 무료 티저를 보러 온 손님이 그대로 나간다 */}
              <button
                type="button"
                onClick={() => {
                  setEmailSkipped(true);
                  setEmailGate(false);
                  void loadTeaser();
                }}
                className="w-full mt-2.5 font-myeongjo text-[13px] text-bone-faint tracking-[0.15em] py-2"
              >
                그냥 볼게
              </button>
            </div>
          ) : (
            <ConfirmStep
              form={form}
              onEdit={setStep}
              productName={productName}
              price={price}
              imm={imm}
              optTone={optTone}
              skipped={skipped}
            />
          ))}

        {/* STEP 7 — 결제 전 개인화 무료 티저 */}
        {step === TEASER_STEP && (
          <TeaserStep
            teaser={teaser}
            pillars={pillars}
            loading={teaserLoading}
            imm={imm}
            name={form.name.trim()}
            birthDate={form.birthDate}
            cuts={webtoonCuts}
            tokens={tokens}
            productSlug={productSlug}
            price={price}
            compareAtPrice={compareAtPrice}
            // 번들 예고 한 줄 — 추천 번들은 이 컴포넌트(부모)만 아니까 문장으로 만들어 내린다.
            bundleLine={
              recommended && recommended.includes.length > 1
                ? `직녀 연애사주까지 묶으면 ${formatKRW(recommended.price)} — 결제할 때 고를 수 있다`
                : undefined
            }
            jiknyeoAssets={jiknyeoAssets}
          />
        )}
      </div>

      {/* 하단 고정 버튼 — 장부를 찾는 동안은 통째로 감춘다.
          타이트 실측: 로딩 화면에 결제 요소가 하나도 없고, 티저를 다 보여준 뒤에 값이 처음 나온다.
          우리는 확인 화면에서 값을 뺐는데 로딩 중에 결제 버튼과 이메일 입력이 그대로 떠 있어
          "무료로 먼저 보기"를 누른 손님이 티저를 보기도 전에 19,900원을 먼저 봤다. */}
      <div id="pay" className="relative z-[2] w-full max-w-[560px] mx-auto scroll-mt-6 px-5 pb-7">
        {teaserLoading || emailGate ? null : step < TOTAL - 1 ? (
          <>
            <button
              type="button"
              onClick={next}
              disabled={!canNext() || (step === CONFIRM_STEP && teaserLoading)}
              className="w-full min-h-[56px] border-none font-bold text-[17px] tracking-[0.22em] disabled:cursor-default"
              style={{
                fontFamily: "var(--font-serif-kr), serif",
                background: canNext() ? ctaFill.on : ctaFill.off,
                color: canNext() ? ctaFill.ink : "var(--bone-faint)",
                boxShadow: canNext() ? ctaFill.glow : "none",
              }}
            >
              {/* '무료'는 반드시 남긴다 — 값이 붙어 있던 시절 모의구매 2인이
                  "이거 누르면 결제되는 줄" 알고 멈췄다. 몰입 상품은 값을 뺐지만 겁은 그대로 남는다.
                  버튼은 손님이 누르는 것이라 캐릭터 말투가 아니라 "내가 뭘 얻는지"로 쓴다.
                  "겉장부터 펴봐라"는 겉장이 뭔지 모르면 되짚게 되고, 되짚는 순간 몰입이 끊긴다. */}
              {step === CONFIRM_STEP ? "무료로 먼저 보기" : "다음"}
            </button>
            {cur.optional && (
              <button
                type="button"
                onClick={next}
                className="w-full mt-2.5 font-myeongjo text-[13px] text-bone-faint tracking-[0.15em] py-2"
              >
                건너뛰기
              </button>
            )}
          </>
        ) : (
          <>
            {/* 결제 시트 옵션 — 단품 위에 패키지를 세운다.
                할인율 역전(단품 33% ↔ 패키지 44%)이 카드 두 장 사이에서 눈으로 읽혀야 한다.
                패키지가 없으면(bundles 빈 배열) 이 블록 자체가 안 나와 예전 화면 그대로다. */}
            {bundles.length > 0 && (
              <div className="mb-4 space-y-2">
                {checkoutOptions.map((o) => {
                  const on = o.productId === selected.productId;
                  const pct = discountPct(o);
                  const isRec = !!recommended && o.productId === recommended.productId;
                  return (
                    <button
                      key={o.productId}
                      type="button"
                      onClick={() => setSelectedId(o.productId)}
                      className="relative w-full border px-4 py-3 text-left"
                      style={{
                        borderColor: on
                          ? sheetAccent
                          : imm ? "rgba(232,201,106,0.22)" : isInyeon ? "rgba(207,214,230,0.28)" : "rgba(150,90,255,0.28)",
                        background: on
                          ? imm ? "rgba(232,201,106,0.10)" : isInyeon ? "rgba(217,199,232,0.14)" : "rgba(150,90,255,0.14)"
                          : "transparent",
                      }}
                    >
                      {isRec && (
                        <span
                          className="font-myeongjo absolute -top-2 right-3 px-2 py-[1px] text-[10px] font-bold tracking-[0.1em]"
                          style={{ background: sheetAccent, color: imm ? "#241a08" : isInyeon ? "#1a1330" : "#1b1230" }}
                        >
                          추천
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className="font-myeongjo text-[14px] font-bold leading-[1.4]"
                          style={{ color: on ? (imm ? "#efe6d2" : isInyeon ? "#efe6ef" : "#efe6ff") : "var(--bone-soft)" }}
                        >
                          {o.includes.length > 1 ? o.includes.join(" + ") : o.name}
                        </span>
                        <span className="shrink-0 text-right">
                          {o.compareAtPrice && o.compareAtPrice > o.price && (
                            <span className="mr-1.5 text-[12px] line-through" style={{ color: "var(--bone-faint)" }}>
                              {formatKRW(o.compareAtPrice)}
                            </span>
                          )}
                          <span
                            className="font-myeongjo text-[15px] font-bold"
                            style={{ color: sheetAccent }}
                          >
                            {formatKRW(o.price)}
                          </span>
                        </span>
                      </div>
                      {/* 직녀 화면엔 빨강도 산군 어휘(장부)도 없다 — 같은 결제 시트를 쓰되 색과 말만 갈아낀다 */}
                      {/* 11 → 13px. 「51% 할인 · 9,000원 더 내고 결과지 하나 더」는 업셀을 파는
                          문장인데 시트에서 제일 작았다 — 묶음을 고를 이유가 여기 한 줄뿐이다. */}
                      {pct != null && (
                        <p
                          className="mt-1 text-[13px]"
                          style={{ color: pct >= 40 && !isInyeon ? "#d8563f" : "var(--bone-faint)" }}
                        >
                          {pct}% 할인
                          {o.includes.length > 1 &&
                            ` · ${formatKRW(o.price - price)} 더 내고 ${isInyeon ? "결과지 하나 더" : "장부 한 권 더"}`}
                        </p>
                      )}
                    </button>
                  );
                })}
                {/* 중복 반론 — "산군에도 인연 달이 나오잖아"에 세계관으로 답한다 */}
                {selected.includes.length > 1 && imm && (
                  <p className="font-myeongjo pt-1 text-center text-[11px] leading-[1.7]" style={{ color: "var(--bone-faint)" }}>
                    겉장은 내가 봤다. 장부 통째는 다른 얘기다.
                  </p>
                )}
              </div>
            )}

            {isLoggedIn ? (
          <button
            type="button"
            onClick={createOrder}
            disabled={submitting}
            className="w-full min-h-[58px] border-none font-bold text-[17px] tracking-[0.15em] flex items-center justify-center gap-3 disabled:opacity-70"
            style={{
              fontFamily: "var(--font-serif-kr), serif",
              background: ctaFill.on,
              color: ctaFill.ink,
              boxShadow: ctaFill.glow,
            }}
          >
            {submitting
              ? "주문 생성 중…"
              : imm
                ? `${formatKRW(Math.max(0, effectivePrice - 1900))} 내고 장부 전체 열기`
                : `${formatKRW(Math.max(0, effectivePrice - 1900))} 결제하러 가기 (회원 할인 적용)`}
            {!submitting && <span className="font-brush text-[19px]" style={{ color: ctaFill.ink }}>受</span>}
          </button>
            ) : (
          <div className="space-y-2.5">
            {/* 비회원 결제 — 이메일만 받고 바로 결제(로그인 강제 없음) */}
            <input
              className="ap-input text-center"
              type="email"
              inputMode="email"
              placeholder={imm ? "결과 장부 받을 이메일" : "결과 받을 이메일 (예: you@naver.com)"}
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              style={{ fontSize: 15 }}
            />
            <button
              type="button"
              onClick={createOrder}
              disabled={submitting || !guestEmailValid}
              className="w-full min-h-[56px] border-none font-bold text-[17px] tracking-[0.15em] disabled:opacity-45"
              style={{
                fontFamily: "var(--font-serif-kr), serif",
                background: ctaFill.on,
                color: ctaFill.ink,
                boxShadow: ctaFill.glow,
              }}
            >
              {/* '복채'는 뺐다 — 모의구매 5/6이 "돈 내는 게 아니라 갖다 바치는 걸로 들린다"고 했다.
                산군은 끝까지 반말이되 돈 얘기만 평범한 한국어로 내려온다. */}
            {submitting
                ? "주문 생성 중…"
                : imm
                  ? `${formatKRW(effectivePrice)} 내고 장부 전체 열기`
                  : `${formatKRW(effectivePrice)} 결제하고 전체 보기`}
            </button>
            {/* 카카오 로그인 넛지는 제거했다 — provider 가 아직 안 열려서, 누르면 고객에게
                "(관리자: Supabase에서 Kakao 활성화 필요)" 토스트가 그대로 떴다. 게다가 4050 은
                19,900 보다 할인가 18,000 을 먼저 누른다 = 결제 의사가 가장 높은 사람만 골라
                에러를 보여주고 내보내는 구조였다. 개통되면 이 자리에 되살린다. */}
            {/* 11 → 13px. 구독 공포를 끄는 문장이다 — 결제 버튼 바로 아래에서 제일 작으면
                안심시켜야 할 사람이 못 읽는다(각주가 아니라 마감 문구). */}
            <p className="text-[13px] text-bone-faint text-center">
              {imm
                ? "한 번만 받는다. 다달이 빠져나가는 것이 아니다."
                : "한 번만 결제돼요. 매달 빠져나가지 않아요."}
            </p>
          </div>
            )}
          </>
        )}
        {imm && (
          <p className="mt-3 text-center text-[11px]" style={{ color: "#7a8296" }}>
            토스페이먼츠 안전결제 · 결과지가 제대로 만들어지지 않으면 전액 환불
          </p>
        )}
      </div>
    </div>
  );
}

/** ▓ 연속 구간을 먹 붓자국으로 그린다 — "산군이 붓으로 그어 가린 장부".
 *  ▓ 문자를 그대로 찍으면 자리표시자로 읽혀 AI 티가 난다(형님 실측 지적).
 *  년·월 같은 단위 글자는 남겨서 "달까지 적혀 있는데 가려져 있다"가 보이게 한다.
 *  타이트도 같은 기법이다: "20██년 █월 █일" — 숫자만 지우고 단위는 남긴다. */
const INK_VARIANTS = [
  { deg: -1.6, r: "2px 7px 3px 8px / 6px 3px 7px 2px" },
  { deg: 1.2, r: "7px 2px 8px 3px / 3px 6px 2px 7px" },
  { deg: -0.8, r: "3px 8px 2px 6px / 7px 2px 6px 3px" },
];
function InkMask({ text }: { text: string }) {
  const parts = text.match(/▓+|[^▓]+/g) ?? [];
  let bar = 0;
  return (
    <span className="inline-flex items-center gap-[0.18em] whitespace-nowrap align-middle">
      {parts.map((p, i) => {
        if (!p.startsWith("▓")) {
          // 단위 글자는 색을 상속 — 어두운 카드에선 밝게, 한지 대사 띠에선 먹색으로 알아서 맞는다
          return (
            <span key={i} className="font-myeongjo text-[0.92em]" style={{ color: "inherit" }}>
              {p}
            </span>
          );
        }
        // 모양·기울기는 몇 번째 붓자국이냐로 고정 — 난수를 쓰면 SSR/하이드레이션이 어긋난다
        const v = INK_VARIANTS[bar++ % INK_VARIANTS.length];
        return (
          <span
            key={i}
            aria-hidden
            className="inline-block"
            style={{
              width: `${Math.max(1.6, p.length * 0.7)}em`,
              height: "1.02em",
              background: "linear-gradient(97deg,#2b100b,#4a1a10 30%,#33120b 62%,#1d0b07)",
              borderRadius: v.r,
              transform: `rotate(${v.deg}deg)`,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.55), 0 0 1px rgba(122,35,23,0.4)",
            }}
          />
        );
      })}
    </span>
  );
}

/* 산군 대사 "띠"(사진 없는 크림색 단독 말풍선)는 2026-08-11 폐기 — 글·사진 교차 리듬에서
 * 글 두 블록을 연속시키는 주범이었다(형님 지적). 짧은 대사는 전부 컷 위(CutSay)에 얹는다.
 * 긴 글은 판(LedgerPanel)에. 그릇을 섞지 않는다. */

/**
 * 장부 판 — 산군이 장부에서 읽어 옮긴 긴 글(콜드리딩).
 * 대사 띠와 **다른 그릇**이어야 한다: 띠는 한 마디, 판은 기록.
 * 앞서 한 번 실패한 이유는 판이 틀려서가 아니라 배경(ganji.webp)이 너무 어두워 안 보였기 때문 —
 * 왼쪽에 붉은 괘선을 세우고 테두리를 올려 "펴 놓은 장부 한 쪽"으로 읽히게 한다.
 */
function LedgerPanel({ children }: { children: React.ReactNode }) {
  return (
    // mt-6(24px) → mt-10(40px): 바로 위가 산군이 말을 거는 컷이라, 붙여 두면 대사와 기록이
    // 한 덩어리로 이어져 읽힌다(형님 지적 — "대사 바로 밑에 저런 글이 있으니 집중이 안 된다").
    // 말한 사람과 그가 읽어 주는 장부 사이에는 숨 쉬는 자리가 있어야 한다.
    <div
      className="relative mt-10 py-6 pl-7 pr-5"
      style={{
        background:
          "linear-gradient(180deg,rgba(26,20,14,0.92),rgba(14,11,8,0.96)), url(/products/sangun/ganji.webp) center/cover",
        border: "1px solid rgba(232,201,106,0.34)",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* 장부 괘선 — 세로 붉은 줄로 "적힌 것"이라는 신호를 준다.
          1px 페이드는 화면에서 거의 안 보였다 → 2px 실선(위아래만 살짝 흐림)으로 세우고,
          안쪽에 금색 실선을 하나 더 붙여 옛 장부의 이중 괘선을 만든다. 이 줄이 위 대사와
          아래 기록을 시각적으로 갈라 주는 장치다. */}
      <span
        aria-hidden
        className="absolute inset-y-3 left-3 w-[2px]"
        style={{ background: "linear-gradient(180deg,rgba(143,43,30,0.25),rgba(143,43,30,0.95) 12%,rgba(143,43,30,0.95) 88%,rgba(143,43,30,0.25))" }}
      />
      <span
        aria-hidden
        className="absolute inset-y-3 left-[18px] w-px"
        style={{ background: "linear-gradient(180deg,transparent,rgba(232,201,106,0.28),transparent)" }}
      />
      {children}
    </div>
  );
}

/**
 * 컷 위 말풍선 — 타이트 방식. 대사가 그림 아래 별도 박스가 아니라 **그 장면 안에서** 나온다.
 * 밝은 박스가 화면을 안 먹어서 어두운 신당이 끝까지 유지된다.
 * 사진은 한쪽(위/아래)이 비어 있게 발주했고(이미지지시서_티저컷 v2), 그 빈 쪽에 앉힌다.
 */
/** `invert` = **반전 절단.** 카카오웹툰 「칠흑이 삼킨 여름」 54화 실측(2026-08-29):
 *  회차 내내 흰 말풍선·먹 글자로 가다가 **마지막 대사 하나만 검정 판 + 흰 글자로 뒤집고 끊는다.**
 *  같은 옷을 한 번 뒤집는 것만으로 「지금까지와 다른 말」이 된다 — 새 부품보다 세다.
 *  티저에서 이 자리는 **가린 값을 읽다 끊는 한 줄**(▓▓년 ▓▓월 …여기까지)이다.
 *  ⚠ 한 판에 딱 한 번. 두 번 쓰면 반전이 평상복이 되고 절단이 사라진다. */
function CutSay({ at, children, invert = false }: { at: "top" | "bottom"; children: React.ReactNode; invert?: boolean }) {
  return (
    <div className={`absolute inset-x-4 ${at === "top" ? "top-4" : "bottom-4"} z-10`}>
      <div
        className="relative rounded-[5px] px-4 py-3"
        style={
          invert
            ? {
                background: "linear-gradient(180deg,#14100a,#080605)",
                border: "1px solid #8f2b1e",
                boxShadow: "0 10px 30px rgba(0,0,0,0.75)",
              }
            : {
                // 반투명 한지 — 사진이 비쳐 보여야 "그 장면 안의 말"이 된다
                background: "linear-gradient(180deg,rgba(243,234,214,0.94),rgba(233,222,194,0.92))",
                border: "1px solid rgba(201,185,142,0.8)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                backdropFilter: "blur(2px)",
              }
        }
      >
        <span
          className="absolute -top-2.5 right-2.5 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
          style={invert ? { background: "#f3e6cf", color: "#8f2b1e" } : { background: "#8f2b1e", color: "#f3e6cf" }}
        >
          산군
        </span>
        {/* 대사 크기 = **그림 폭에 비례**(4.9cqw). 375px 컷에서 17.2px 로, 웹툰 말풍선과 같다.
            처음엔 17px 고정이었는데, 웹툰 말풍선만 cqw 라 PC(820px)에서 25.5 대 17 로 갈렸다
            — 눈에 같은 부품인데 하나만 커지니 "글씨 크기가 왜 달라졌냐"가 됐다(형님 지적).
            그림 위에 얹힌 글은 그림을 따라가야 컷 안에서 비율이 안 깨진다. 본문·표는 고정 px 유지.
            상한 22px: 큰 화면에서 대사가 한 줄을 다 먹어 컷을 가리는 걸 막는다. */}
        <p
          className="font-myeongjo font-semibold leading-[1.75]"
          style={{ fontSize: "min(4.9cqw, 28px)", color: invert ? "#f3e6cf" : "#241d10" }}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

/** 티저 하단의 산군 컷 — 타이트는 끝까지 컷 → 대사 → 값 순서로 사진이 따라간다(형님 지적).
 *
 *  실측 대조(2026-08-04)에서 나온 규칙 둘. 타이트 티저 캡처를 컬럼 단위로 재보니
 *  ① **좌우 여백이 0** 이다. 컷이 화면 끝에서 끝까지 간다 — 여백이 있으면 "액자에 걸린 사진"이
 *     되고 없으면 "화면 그 자체"가 된다. 몰입형 콘텐츠에서 여백은 "이건 문서다"라는 신호다.
 *     우리는 위저드 컨테이너의 px-5(양쪽 20px)에 갇혀 화면의 80%밖에 못 썼다 → 음수 마진으로 뚫는다.
 *  ② **높이가 들쭉날쭉하다**(화면폭 대비 15%~124%). 높이가 곧 강약이다. 전부 같은 높이로 두면
 *     붉은 동그라미(에이스)와 부채 접는 컷이 같은 무게가 된다 — 강조 수단을 스스로 버리는 셈.
 */
const CUT_H = { sm: "h-[180px]", md: "h-[260px]", lg: "h-[360px]" } as const;

function TeaserCut({
  src,
  alt,
  pos = "center 30%",
  size = "md",
  /** 세로 4:5 원본(v2 발주분)이면 비율 그대로 세워 말풍선 자리를 만든다. 가로띠(v1)는 size 로. */
  tall,
  say,
  sayAt = "bottom",
  invert = false,
  lead = false,
}: {
  src: string;
  alt: string;
  pos?: string;
  /** sm=전환용 짧은 띠 · md=기본 · lg=결정적 장면(전면) */
  size?: keyof typeof CUT_H;
  tall?: boolean;
  /** 컷 위에 얹을 대사. 주면 CutSay 로 그리고, 아래 별도 대사 띠를 세울 필요가 없어진다. */
  say?: React.ReactNode;
  sayAt?: "top" | "bottom";
  /** 대사를 검정 판·흰 글자로 뒤집는다 — **티저 전체에서 딱 한 번**(가린 값을 읽다 끊는 자리) */
  invert?: boolean;
  /** 정점 앞 한 박자 — 웹툰은 결정적 컷 앞에서 여백을 크게 벌린다(칠흑 48·54화 실측).
   *  컷이 줄줄이 붙어 있으면 어느 것이 정점인지 눈이 못 고른다. */
  lead?: boolean;
}) {
  return (
    // 위저드 컨테이너의 px-5(20px)를 되물려 컬럼 끝까지 채운다.
    // 티저 본문 판의 좌우 패딩을 0으로 걷었으므로 이제 20px 만 되물리면 된다(전엔 -mx-9 = 20+16).
    <div
      className={`relative -mx-5 ${lead ? "mt-14" : "mt-6"} overflow-hidden ${tall ? "" : CUT_H[size]}`}
      // containerType: 대사(CutSay)가 이 컷의 폭을 기준으로 커지게 하는 자다.
      // 없으면 CutSay 의 cqw 가 위쪽 조상 컨테이너를 잡아 엉뚱한 크기가 된다.
      style={{ containerType: "inline-size", ...(tall ? { aspectRatio: "4 / 5" } : {}) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full select-none object-cover"
        loading="lazy"
        draggable={false}
        style={{ objectPosition: pos }}
      />
      {/* 말풍선이 앉는 쪽을 한 번 더 눌러 흰 글씨가 확실히 읽히게 한다.
          사진이 충분히 어두우면 티가 안 나고, 밝게 나온 컷에서도 대사가 안 묻힌다. */}
      {say && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              sayAt === "top"
                ? "linear-gradient(180deg,rgba(8,7,6,0.62) 0%,rgba(8,7,6,0.15) 38%,rgba(8,7,6,0) 60%)"
                : "linear-gradient(0deg,rgba(8,7,6,0.62) 0%,rgba(8,7,6,0.15) 38%,rgba(8,7,6,0) 60%)",
          }}
        />
      )}
      {say && <CutSay at={sayAt} invert={invert}>{say}</CutSay>}
    </div>
  );
}

/** 붉은 한자 섹션 헤더 — 타이트의 「大運」「財物」「戀愛」 자리. 章이 바뀐다는 신호. */
function HanjaHeader({ char }: { char: string }) {
  return (
    <div className="mt-10 text-center" aria-hidden>
      <div
        className="mx-auto h-px w-28"
        style={{ background: "linear-gradient(90deg,transparent,rgba(232,201,106,0.5),transparent)" }}
      />
      <div
        className="font-brush mt-4 text-[96px] leading-none"
        style={{ color: "rgba(143,43,30,0.92)", textShadow: "0 0 34px rgba(143,43,30,0.45)" }}
      >
        {char}
      </div>
    </div>
  );
}

/** 운명의 상대 카드 (티저판) — 타이트의 흐린 얼굴 + 부분 마스킹 프로필.
 *
 *  얼굴은 **배우자성(정·편관 / 정·편재)의 오행**으로 고른다(buildPartnerFace). 예전엔 생일
 *  문자코드로 골랐는데, 그러면 사진이 사주와 아무 상관이 없어서 결과지에서 회수할 근거가 없었다.
 *  지금은 이 얼굴이 결제 후 결과지에서 **블러만 걷힌 채 그대로** 열린다.
 *
 *  결을 뜻하는 오행 한 글자는 가리지 않는다 — 여기서 본 글자가 결과지 본문에도 그대로 나와야
 *  "계산해서 고른 얼굴"이 증명된다. 파일이 아직 없으면 실루엣으로 조용히 내려앉는다(onError). */
function DestinyCard({ face }: { face: PartnerFace }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    // max-w 280 을 걷었다 — 판이 518인데 카드가 280이면 절반만 쓰는 셈이라 "너무 작다"가 된다
    // (형님 지적). 이 카드는 티저에서 얼굴을 내미는 유일한 자리라 판을 다 써야 증거로 선다.
    <div
      className="mt-4 px-5 pb-5 pt-4"
      style={{
        backgroundImage: "url(/products/sangun/ganji.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0c0a08",
        border: "1px solid rgba(143,43,30,0.6)",
      }}
    >
      <p className="font-myeongjo text-center text-[13px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
        네 운명의 상대
      </p>
      {/* 사진 118×150 → 폭의 62%(4:5 비율) (형님: "카드 너무 작고 사진도 잘 안 보여").
          280px 카드에서 118px 이면 3분의 1도 못 쓰는 크기라 증거가 아니라 썸네일로 보였다.
          블러도 10px → 7px 로 낮췄다 — 이 카드가 파는 것은 "얼굴을 봤다"는 사실인데,
          형체가 안 잡히면 살 이유가 안 생긴다. 결제 후엔 그대로 열리므로 여기서 너무 가리면
          결제 전후의 낙차만 크고 전환은 안 는다. brightness 0.85 → 0.95 로 어둠도 덜어냈다. */}
      {/* 카드가 판 폭을 다 쓰게 되면서 62%는 다시 과해졌다 — 사진이 카드를 꽉 채우면
          "가려 둔 것"이 아니라 그냥 흐린 사진이 된다. 최대 260px 로 묶어 여백을 남긴다. */}
      <div
        className="relative mx-auto mt-3.5 w-[62%] max-w-[260px] overflow-hidden"
        style={{ background: "#151009", aspectRatio: "4 / 5" }}
      >
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face.src}
            alt=""
            onError={() => setImgOk(false)}
            className="h-full w-full select-none object-cover"
            draggable={false}
            style={{ filter: "blur(7px) brightness(0.95)" }}
          />
        ) : (
          /* 사진이 오기 전 실루엣 — 사람 형상만 어렴풋이 */
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(42% 26% at 50% 28%, rgba(210,190,160,0.5), rgba(21,16,9,0) 70%), radial-gradient(72% 42% at 50% 80%, rgba(210,190,160,0.35), rgba(21,16,9,0) 70%), #151009",
              filter: "blur(6px)",
            }}
          />
        )}
      </div>
      {/* ── 반개방 (2026-08-24) ──
          바뀌기 전엔 네 줄이 **전부** 잠겨 있었다. 그게 두 가지를 동시에 망가뜨리고 있었다:
          ① 다 가리면 손님은 「가려진 게 무엇인지」를 몰라 궁금해할 대상이 없다. 청월당 실측
             (`docs-private/청월당_정통사주_유료결과지_해부.md`)에서 저쪽은 짝 카드 태그 8개 중
             **4개를 열어 둔 채** 나머지만 흐린다 — 열린 값이 구체적일수록(161cm·은은한미소)
             가려진 값도 진짜라고 믿게 된다. 잠금이 파는 것은 **가린 자리의 모양과 개수**다.
          ② 「키가 ▓▓▓」는 **지키지 못할 약속**이었다. 우리는 키를 단정하지 않기로 했고
             (`partner-face.ts` 의 "정확한 수치 금지"), 결과지 PartnerCard 의 외모 칸도 `face.look`
             = 인상 문장이라 키가 없다. 결제하면 안 열리는 걸 가려 두면 그 자리에서 들통난다.
          그래서 위 두 줄을 열고(인상 앞머리 + 나이대) 아래 세 줄만 잠근다.
          열린 어구는 결과지 본문에 **글자 그대로** 다시 나온다 — 그게 회수다. */}
      <div className="mt-3.5 space-y-2">
        {(
          [
            // 열림 ①  결과지 face.look 의 앞 어구. 뒤를 가려 "인상"이라는 꼬리만 남긴다.
            ["외모", <span key="l">{face.lookOpen} <InkMask text="▓▓▓▓" /> 인상</span>],
            // 열림 ②  나이대는 확정값이라 통째로 연다 — 카드에서 가장 구체적인 값이 열려 있어야
            //         나머지 잠금이 "있는데 가린 것"으로 읽힌다.
            ["나이대", <span key="a">{face.ageDir}</span>],
            ["성격", <InkMask key="p" text="▓▓▓▓" />],
            ["만나는 시기", <InkMask key="t" text="20▓▓년 ▓▓월" />],
            ["장소", <InkMask key="w" text="▓▓▓▓" />],
          ] as const
        ).map(([label, val]) => (
          // 항목도 11/13 → 13/15. 카드가 커진 만큼 잔글씨만 남으면 오히려 더 비어 보인다.
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="font-myeongjo shrink-0 text-[13px] text-bone-faint">{label}</span>
            <span className="font-myeongjo text-[15px] text-bone-soft">{val}</span>
          </div>
        ))}
      </div>
      {/* 얼굴을 고른 근거. 가리지 않는 유일한 값이라 "아무 사진이나 띄웠다"는 의심을 여기서 끊는다. */}
      <p className="font-myeongjo mt-3.5 text-center text-[11px] leading-[1.6] text-bone-faint">
        네 배우자 자리는 <span style={{ color: "var(--gold-soft)" }}>{face.ohKo}</span>의 결 — 그 결로 얼굴을 골랐다
      </p>
    </div>
  );
}

// 결제 전 무료 티저 — 콜드리딩 3문장 + 크게 갈리는 해(연도만) + 잠긴 줄.
// 티저를 못 만든 경우(한도·API 장애)에도 결제 흐름은 그대로 살아 있어야 하므로 조용히 비운다.
function TeaserStep({
  teaser,
  pillars,
  loading,
  imm,
  name,
  birthDate,
  cuts,
  tokens,
  productSlug,
  price,
  compareAtPrice,
  bundleLine,
  jiknyeoAssets,
}: {
  teaser: SajuTeaser | null;
  pillars: Pillar[] | null;
  loading: boolean;
  imm: boolean;
  name: string;
  birthDate: string;
  cuts: WebtoonCutData[];
  tokens: Record<string, string>;
  productSlug: string;
  price: number; // 세일즈 꼬리의 가격 앵커용 — 하단 결제 버튼과 같은 값을 쓴다
  compareAtPrice?: number | null; // 정가 — VS 가격판의 취소선
  bundleLine?: string; // 번들 예고 한 줄 — 추천 번들 값은 부모가 만들어 내린다
  jiknyeoAssets?: AssetMap;
}) {
  // 전환점 카드의 붓 동그라미 — 손님이 그 카드에 도착했을 때 그려져야 한다.
  // 훅은 아래 `if (loading)` 조기 반환보다 위에 있어야 호출 순서가 안 깨진다.
  const { ref: inkRef, inView: inkInView } = useInView<HTMLDivElement>();
  // 직녀(인연)판인가 — polite 렌더 경로는 존댓말 상품 4종과 공유라 slug 로만 갈라야 한다.
  const isInyeon = productSlug === "inyeon-saju";
  // 인연·결혼이 같이 쓰는 껍데기(판·컷·로딩 체크리스트)는 이 가드로 연다.
  const isJiknyeoWorld = productSlug === "inyeon-saju" || productSlug === "marriage-saju";
  // `?skin=pink` — 옛 분홍 티저를 그대로 본다. 배포를 되돌리지 않고 두 판을 나란히 비교하는 문.
  const pinkSkin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("skin") === "pink";

  if (loading) {
    return (
      <div className="py-8 text-center">
        <span className="font-brush animate-pulse block text-[44px] leading-none text-gold-bright">命</span>
        <p className="font-myeongjo mt-5 text-[13px] text-bone-soft tracking-[0.06em]">
          {imm ? "만세력에서 네 여덟 글자를 꺼내는 중이다…" : "만세력에서 여덟 글자를 꺼내는 중이에요…"}
        </p>
        {/* 대기를 「기다림」이 아니라 「계산이 도는 증거」로 바꾼다 — 항목은 실제로 도는 계산들이다 */}
        {isJiknyeoWorld && <LoadingChecklist />}
      </div>
    );
  }

  // 시 모름이면 시주가 "?" 로 오므로 빼고 센다(년·월·일 = 여섯 글자).
  const shown = (pillars ?? []).slice().reverse().filter((p) => p.gan.char !== "?");

  // 콜드리딩도 명식도 없을 때만 완전 폴백. 명식만 살아 있으면 그거라도 보여준다.
  if (!teaser && shown.length === 0) {
    return (
      <p className="font-myeongjo py-6 text-center text-[13px] text-bone-soft leading-[1.75]">
        {imm
          ? "겉장은 지금 펴줄 수 없다. 장부는 그대로 열린다."
          : "미리보기는 지금 준비하지 못했어요. 결과지는 정상적으로 만들어져요."}
      </p>
    );
  }

  // 웹툰이 먼저(A안) — 스크롤로 이탈하기 전에 몰입을 걸고, 그 아래 원국표가 증거로 받친다.
  // 토큰이 비면(만세력 실패) 말풍선이 전부 빠져 그림만 남으므로 아예 안 그린다.
  // -mx-5: 웹툰도 사진 컷과 같이 컬럼 끝까지 나간다. 전엔 컬럼 안쪽(520)이라 사진 컷(558)보다
  // 좁았고, 대사 크기가 컷 폭 비례라 **같은 말풍선인데 웹툰 쪽만 작게** 나왔다.
  // 규칙: 그림(사진 컷·웹툰 컷)은 끝까지, 판·카드는 한 단 안쪽.
  const webtoon = cuts.length > 0 && Object.keys(tokens).length > 0
    ? <WebtoonPage cuts={cuts} tokens={tokens} className="-mx-5 mb-4 overflow-hidden" />
    : null;

  return (
    <>
    {webtoon}
    {/* 티저는 "펴놓은 장부" 한 장으로 앉힌다. 배경에 박수 사진이 opacity .7 로 깔려 있어서
        글자만 얹으면 얼굴·촛불 무늬가 표와 문장 사이로 비쳐 읽기가 힘들어진다.
        사진은 판 바깥으로만 보이게 두면 몰입은 유지되면서 본문은 종이처럼 읽힌다. */}
    <div
      // 밝은 티저 — 청월당은 게이트만 검정이고 결제 직전 티저는 밝다(라이브 실측).
      //
      // ⚠ 2026-08-22 수정: 「밝다」는 맞았지만 **분홍**은 틀렸다. 이 페이지는 밤 컷(직녀 일러)과
      //   밝은 조판이 번갈아 나오는 구조라 분홍이면 한 화면에서 톤이 서너 번 뒤집힌다.
      //   그래서 밝기는 유지하고 색만 달빛으로 옮겨 **밤 위에 뜬 판**으로 만들었다.
      //   `-mx-5` 를 뺀 이유: 화면 폭을 꽉 채우면 판이 아니라 그냥 배경이 된다 — 좌우 여백이 있어야 뜬다.
      //   되돌리려면 `?skin=pink` (globals.css `.teaser-pink`).
      className={isJiknyeoWorld ? `teaser-light${pinkSkin ? " teaser-pink" : ""} px-4 py-10` : undefined}
      style={
        imm && !isJiknyeoWorld
          ? {
              background: "rgba(7,6,9,0.86)",
              border: "1px solid var(--gold-pale)",
              // 좌우 패딩 16 → 0. 이 16px 때문에 화면에 좌우 끝이 **세 군데**였다(형님 지적):
              //   사진 컷 558 / 웹툰 컷 520 / 판·카드 486 (820px 기준)
              // 판 안쪽이 486으로 눌려 웹툰 컷(520)보다 좁았던 것. 패딩을 걷으면 판이 520이 되어
              // 웹툰 컷과 좌우 끝이 맞고, 사진 컷만 화면 끝까지(560) 나가는 두 단이 된다.
              // 그림은 끝까지 · 판은 한 단 안쪽 — 형님 확정.
              // ⚠ TeaserCut 의 음수 마진도 같이 줄여야 한다(-mx-9 → -mx-5). 안 그러면 32px 더 튀어나간다.
              padding: "18px 0",
              boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
            }
          : undefined
      }
    >
      {/* 타이트 티저 실측(22단계)의 핵심 — 모든 블록을 캐릭터가 대사로 소개한 뒤 보여준다.
          아래 대사 띠들이 그 연결 조직이다. 전부 확정값·고정 문구라 LLM 비용 0. */}
      {imm && (
        <>
          {/* 장부를 펴 든 손. 대사는 컷 위에 — 밝은 박스를 아래에 쌓지 않아야 신당이 어둡게 유지된다.
              말투는 혼잣말 → 손님으로 전환("가만있어 봐라" → "네 여덟 글자다"). 무당은 손님한테
              설명하기 전에 자기가 보면서 먼저 반응한다(타이트 "흥미롭네"·"흠.." 자리). */}
          <TeaserCut
            src="/products/sangun/t1-open.webp"
            alt="옛 장부를 펴 든 손"
            tall
            sayAt="top"
            say={<>가만있어 봐라. …여기 있군.<br />네 여덟 글자다.</>}
          />
        </>
      )}

      {/* 오프닝 — 청월당은 티저 첫 화면부터 캐릭터가 말을 건다. 우리도 계산을 보여주기 전에
          누가 읽었는지부터 세운다(그림 → 글 교차의 시작점). */}
      {isInyeon && (
        <InyeonCut
          id="j1"
          assets={jiknyeoAssets}
          // 좌하단 치마 위 — 얼굴(y8~40)과 세로로 완전히 갈린다. 꼬리는 위쪽 얼굴을 가리킨다.
          sayBox={SAY_BOX_DEFAULT.j1}
          say={
            <ComicSay tail="up" point="right">
              <span>{name ? `${name}님 사주,` : "사주,"}</span>
              <span>방금 다 읽었어요.</span>
            </ComicSay>
          }
        />
      )}

      {/* 헤더가 이미 headline 을 말하므로 여기선 이름만(있을 때) */}
      {name && (
        <p className={`font-myeongjo text-center text-[13px] text-gold-soft tracking-[0.15em]${imm ? " mt-4" : ""}`}>{name}</p>
      )}

      {/* 원국 4기둥 — 콜드리딩보다 먼저. "네 생일로 계산했다"는 증거가 먼저 서야 아래 세 줄이 산다.
          표시 순서는 읽기 쉬운 년→월→일→시(view.pillars 는 시→일→월→년이라 뒤집는다). */}
      {/* 원국 구역은 **자기 바탕 위에 올린다**(몰입 화면에서만).
          형님 지적 "배경색 때문인지 글자가 잘 안 보인다"의 실제 원인: 티저 전체가 배경 사진 위
          rgba(7,6,9,0.86) — 14% 가 비쳐서, 사진의 밝은 부분(촛불·호피)이 지나가는 자리의
          잔글씨(11px 회색)가 그 위로 뜬다. 대비를 재면 6.49~14.45 로 기준은 통과하지만,
          "통과"와 "편하게 읽힌다"는 다르다. 여긴 손님이 **증거를 확인하는 화면**이라
          분위기보다 판독이 우선이다 → 이 블록만 불투명 먹지로 깔고 테두리로 판을 세운다.
          (배경 사진이 비치는 연출은 컷·대사 쪽에 그대로 남는다) */}
      {shown.length > 0 && (
        <div
          className={name ? "mt-3" : ""}
          style={
            imm
              ? {
                  background: "linear-gradient(180deg,#0b0a0e,#08070a)",
                  border: "1px solid rgba(232,201,106,0.16)",
                  borderRadius: 8,
                  padding: "18px 14px 20px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                }
              : undefined
          }
        >
          {birthDate && (
            <p
              // 11 → 13px. 표의 머리글인데 표 안 어떤 글자보다도 작았다 — 「내 생일로 계산했다」를
              // 증명하는 유일한 줄이라, 증거 화면에서 이게 제일 작으면 증거가 안 선다.
              className="font-myeongjo text-center text-[13px] tracking-[0.06em]"
              // 이 줄은 표의 머리글 역할(어느 날짜에서 나온 글자인지)인데 가장 흐린 색이었다.
              style={imm ? { color: "rgba(215,206,188,0.82)" } : undefined}
            >
              {birthDate.replace(/-/g, ".")}
              {/* 시 모름이면 기둥이 셋이라 여섯 글자다. 증거로 내미는 화면에서 숫자가 틀리면 안 된다. */}
              {` — 이 날에서 나온 ${GLYPH_COUNT[shown.length] ?? `${shown.length * 2}`}${imm ? " 글자" : " 글자"}`}
            </p>
          )}
          {/* 한자와 십성·기운을 한 표로 — 타이트(MZ무당) 실측 배치를 따랐다.
              전에는 한자 카드가 위에, 십성 표가 아래에 따로 있었다. 그러면 「비견·겁재·묘」가
              어느 글자 얘긴지 알 수가 없어서 표가 붕 뜬다(형님 실사용 반응: "뭔 말인지 모르겠다").
              타이트는 戊 바로 위에 「일간(나)」, 바로 아래에 「정인」을 붙여 눈으로 잇는다.
              용어 자체는 타이트도 안 풀어준다 — 목표는 이해가 아니라 "내 생일로 진짜 계산했다"는 증거다. */}
          <PillarChart shown={shown} rows={teaser?.chartRows ?? []} />
          {/* 사실만 말한다 — 이름·물음까지 받아놓고 "생일 하나뿐"이라 하면 그 자리에서 신뢰가 깎인다.
              (시각을 모르면 기둥이 덜 선다는 안내는 여기서 뺐다 — 결제 직전에 열등감만 남긴다) */}
          {/* 인연은 이 말을 아래 발췌 카드 각주가 하므로 여기선 뺀다 — 한 화면에서 두 번 읽히면 안 된다 */}
          {!isJiknyeoWorld && (
            <p className="font-myeongjo mt-3 text-center text-[13px] leading-[1.75] text-bone-soft">
              {imm
                ? "아래는 네 이름도, 네 물음도 쓰지 않았다. 이 글자에서만 나왔다."
                : "아래는 이름도, 적어주신 물음도 쓰지 않았어요. 이 글자에서만 나왔고요."}
            </p>
          )}

          {/* 신살 — 11px 배지는 원국 판 옆에서 읽히지도 않고 뭔지도 몰랐다.
              13px 로 키우고, 무엇의 목록인지 한 줄 얹는다(타이트는 이걸 표 맨 아랫줄에 넣는다). */}
          {teaser && teaser.sinsal.length > 0 && (
            <div className="mt-3">
              {/* 라벨 11 → 13px. 바로 아래 배지가 17px 인데 「무엇의 목록인지」를 말하는 줄이
                  11px 이면, 손님은 배지만 보고 이게 뭔지 모른 채 지나간다(실측 대비도 3.0 이었다). */}
              <p className="font-myeongjo text-center text-[13px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
                {imm ? "네 글자에 붙어 있는 것" : "글자에 붙어 있는 것"}
              </p>
              {/* 배지 13 → 17px (형님: "살 부분이 더 크게 보이면 좋겠어").
                  이건 손님이 **자기 것으로 가져가는 단어**다 — 도화살·화개살은 검색해 보고
                  친구에게 옮기는 말이라, 표 안의 잔글씨가 아니라 이름표로 서야 한다.
                  테두리·여백도 같이 키워야 글자만 커져서 상자를 뚫는 꼴이 안 난다. */}
              <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">
                {teaser.sinsal.map((s) => (
                  <span
                    key={s}
                    className="font-myeongjo rounded-[3px] px-4 py-2 text-[17px] font-bold"
                    style={{
                      border: "1px solid var(--gold-line)",
                      // 직녀는 세계관 토큰에 맡긴다(은사). 산군은 기존 금색 값을 그대로 둔다.
                      background: isJiknyeoWorld ? "var(--gold-pale)" : "rgba(232,201,106,0.10)",
                      color: "var(--gold-bright)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* 못 읽는 게 정상이라고 먼저 말해준다 — 안 그러면 "나만 모르나" 부끄러움이 이탈이 된다 */}
          {teaser && teaser.chartRows.length > 0 && (
            // 11 → 13 → **15px**. "못 읽어도 된다"는 부끄러움을 걷어 주는 문장이라 실제로 읽혀야
            // 기능한다 — 가장 작고 가장 흐린 색이라 정작 안심시켜야 할 사람이 못 읽고 지나갔다.
            // 13px 도 여전히 본문(15) 아래였다. 이건 각주가 아니라 **아래 콜드리딩 전체의 근거 선언**이라
            // 본문과 같은 눈금에 세운다.
            <p
              className="font-myeongjo mt-2.5 text-center text-[15px] leading-[1.75]"
              style={imm ? { color: "rgba(215,206,188,0.78)" } : undefined}
            >
              {/* 「장부」는 산군의 물건이다 — 직녀 화면에서 이 단어를 쓰면 다른 캐릭터의 말이 된다.
                  하필 이 줄이 아래 콜드리딩 전체의 근거 선언이라 여기가 흔들리면 신뢰가 흔들린다. */}
              {imm
                ? "읽을 줄 몰라도 된다. 이것이 네 장부의 원본이고, 아래 말은 전부 여기서 나왔다."
                : isJiknyeoWorld
                  ? "읽을 줄 모르셔도 돼요. 이게 사주의 원본이고, 아래 말은 전부 여기서 나왔어요."
                  : "읽을 줄 모르셔도 돼요. 이게 장부의 원본이고, 아래 말은 전부 여기서 나왔어요."}
            </p>
          )}
        </div>
      )}

      {/* 정면 컷: 몸을 앞으로 기울여 손님을 읽는다(발주 t2) — 티저에서 산군이 얼굴을 드는 첫 순간.
          대사는 아래 콜드리딩 띠 안에 합쳐 넣는다(따로 띠를 세우면 띠 3개가 연속으로 쌓인다).
          "너한테는 아무것도 안 물었다"는 질문 없던 A안(7월) 시절의 잔재 — 지금은 방금 8문항에
          답하고 온 손님이라 대놓고 거짓말이었다(형님 지적). 콜드리딩이 답변을 안 쓰고 여덟
          글자에서만 나오는 건 사실이므로, 그 사실을 그대로 말한다. "아직"은 결제 후 결과지가
          그 답들을 쓴다는 약속까지 겸한다(惑 스텝 안내문 "그 물음부터 정면으로 답해준다"와 호응). */}
      {imm && teaser && (
        <TeaserCut
          src="/products/sangun/t2-read.webp"
          alt="탁자 너머로 고개를 숙이고 마주 앉은 산군"
          tall
          sayAt="bottom"
          say={<>네 답은 아직 들춰 보지도 않았다.<br />그런데 벌써 보이는군.</>}
        />
      )}

      {/* 콜드리딩 — 명식에서 나온 문장만.
          맨 텍스트로 두면 위(컷)·아래(카드)가 다 조판된 사이에서 여기만 배경에 묻힌다(형님 지적).
          타이트는 같은 자리(개인화 팩폭)를 병풍 액자 안에 넣는다 → 우리는 장부 종이 판에 올린다.
          그리고 승부처인 **연도를 문장에서 뽑아 크게 세운다** — "이걸 어떻게 알았지"가 나와야 하는
          자리라 숫자가 눈에 먼저 들어와야 한다. 판정 초대는 회색 잔글씨가 아니라 산군 대사로 건다. */}
      {teaser && (
        <>
          {imm ? (
            /* 콜드리딩 = 긴 글. 대사 띠(한 마디용)에 넣었더니 324px 짜리 크림색 덩어리가 되어
               신당 세계관이 하얗게 깨졌다(형님 지적, 내 오판 두 번째). **장부 판**으로 되돌린다 —
               앞서 판이 실패한 건 판이 틀려서가 아니라 배경이 너무 어두워 안 보였기 때문이다.
               괘선과 테두리를 세우고 글씨를 밝게 해서 "펴 놓은 장부 한 쪽"으로 읽히게 한다.
               말 거는 대사("너한테는 아무것도 안 물었다")는 바로 위 컷에 얹혀 있으니, 여기는
               읽어 내려가는 기록이면 된다. */
            <LedgerPanel>
              {teaser.coldRead.map((line, i) => {
                const isPast = teaser.hasPastCheck && i === 1;
                const year = isPast ? teaser.pastYear : null;
                // 승부처인 연도만 문장 안에서 크게. 숫자만 따로 떼어 놓으면 아랫문장과 끊겨 붕 뜬다.
                const body = year ? line.replace(new RegExp(`^${year}년[,\\s]*`), "") : line;
                return (
                  <p
                    key={i}
                    className={`font-myeongjo leading-[1.75] ${i > 0 ? "mt-3.5" : ""}`}
                    style={{ fontSize: 15, color: isPast ? "#f3ead6" : "var(--bone)" }}
                  >
                    {year && (
                      <span
                        className="font-serif mr-1.5"
                        style={{ fontSize: 23, fontWeight: 700, color: "var(--gold-bright)" }}
                      >
                        {year}년
                      </span>
                    )}
                    {body}
                  </p>
                );
              })}
            </LedgerPanel>
          ) : isInyeon ? (
            /* 「방금 계산 발췌」 — 청월당은 결과지 일부를 크림 카드로 떠서 실물을 보여준다.
               걔넨 예시 발췌지만 우리는 **이 손님 계산**이라 같은 카드가 더 세게 먹는다.
               밤 무대 위 밝은 종이 한 장이라 시선이 여기서 멈춘다. */
            <div className="mt-5">
              <div
                className="rounded-md px-5 py-5"
                style={{ background: "linear-gradient(180deg,#f3ead6,#e9dec2)", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
              >
                {teaser.coldRead.map((line, i) => (
                  <p
                    key={i}
                    className={`font-myeongjo text-[15px] leading-[1.8] ${i > 0 ? "mt-3" : ""}`}
                    style={
                      teaser.hasPastCheck && i === 1
                        ? { color: "#5b4f8c", fontWeight: 700 }
                        : { color: "#241d10" }
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
              {/* 11 → 13px. 각주 지위는 유지하되(별표 그대로) 읽을 수는 있어야 한다 —
                  콜드리딩 세 줄이 맞았을 때 「어떻게 알았지」의 답이 여기 있다. */}
              <p className="mt-2.5 text-center text-[13px] leading-[1.7]" style={{ color: "var(--bone-faint)" }}>
                * 이름도, 적어주신 물음도 안 썼어요 — 방금 계산된 {name ? `${name}님` : "당신"} 사주에서만 나온 문장이에요.
              </p>
            </div>
          ) : (
            <div className={`${name || pillars ? "mt-4" : ""} space-y-2.5 border-y border-gold-pale py-4`}>
              {teaser.coldRead.map((line, i) => (
                <p
                  key={i}
                  className="font-myeongjo leading-[1.75]"
                  style={
                    teaser.hasPastCheck && i === 1
                      ? { fontSize: 15, color: "var(--gold-bright)", fontWeight: 600 }
                      : { fontSize: 15, color: "var(--bone)" }
                  }
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* 판정을 손님에게 넘긴다 — 틀릴 위험을 지지 않는 문장은 맞아도 소름이 안 난다.
              콜드리딩 판 바로 밑에 말풍선을 또 세우면 글이 두 번 연속된다(형님 지적: 글·사진 교차) —
              산군이 정면으로 선 전신 컷(stand.webp, 마스터 m1 변환) 위에 대사로 얹는다.
              승부를 거는 순간이라 그림도 처음으로 몸 전체를 보여주는 대면이 맞다. */}
          {teaser.judgeInvite &&
            (imm ? (
              <TeaserCut
                src="/products/sangun/stand.webp"
                alt="장부를 덮고 정면으로 선 산군"
                tall
                pos="center 16%"
                sayAt="bottom"
                say={teaser.judgeInvite}
              />
            ) : (
              !isInyeon && (
                <p className="font-myeongjo mt-3 text-[13px] leading-[1.75] text-bone-faint">{teaser.judgeInvite}</p>
              )
            ))}

          {/* 판정을 넘기는 순간 — 회색 잔글씨로 흘리면 승부가 안 걸린다.
              산군이 전신 컷으로 하는 그 자리를 인연은 정면 컷 + 말풍선으로 받는다. */}
          {isInyeon && teaser.judgeInvite && (
            <InyeonCut
              id="w3"
              assets={jiknyeoAssets}
              // 클로즈업이라 빈 모서리가 없다 — 유일하게 눈·입이 없는 **턱 아래**로 내린다.
              // 여기 있던 좌상단 자리가 왼쪽 눈을 정통으로 덮고 있었다(운영 실측).
              sayBox={SAY_BOX_DEFAULT.w3}
              say={
                <ComicSay tail="up" point="right">
                  {/* 원본 문자열에 개행이 들어 있다(2줄 강제) — 그대로 두면 한 줄로 붙는다 */}
                  {teaser.judgeInvite.split(String.fromCharCode(10)).map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </ComicSay>
              }
              // 효과음 제거(2026-08-23): 「…딱」이 비녀 옆에 떠서 무슨 소리인지 안 읽혔다.
              // 청월당 효과음은 **집중선**(≡)이지 글자가 아니다 — 글자 효과음은 우리 그림체와 안 맞는다.
              // 기울임(tilt)도 뺐다: 사선 밑변이 **밝은 달빛 판**과 만나면 어긋남으로 읽힌다.
              // 저쪽에서 사다리꼴이 먹히는 건 페이지 바탕이 연한 종이 한 장이기 때문이다.
            />
          )}

          {/* 직녀(인연) 전용 — 죄책감 해제 → 다리문장. polite 경로는 존댓말 상품 4종과 공유라 slug 가드 필수.
              2026-08-23: 여기는 **에셋이 없던 동안의 임시 말풍선 판**이었다. 컷이 13/13 채워진 뒤에도
              안 바뀌어서, 앞 컷(w3)의 말풍선과 흰 박스 두 개가 연달아 쌓여 있었다 —
              「글 블록 두 개를 연달아 쌓지 않는다」는 우리 조판 규칙을 정면으로 어긴 화면이었다(형님 지적).
              j2 = 직녀가 **달력을 내려다보는 옆모습**. 대사가 "아래 달력"을 가리키므로 시선이 맞물린다. */}
          {productSlug === "inyeon-saju" && (
            // ⚠ 여기에 mt-* 를 주면 **밝은 판(teaser-light)이 그 틈으로 드러나 흰 가로 띠**가 된다.
            //    컷은 자기 밤 배경을 갖고 있으므로 간격은 컷 **안쪽**(InyeonCut 의 padTop)에서 준다.
            <div>
              {/* 말풍선은 **2줄**까지만(청월당 실측). 넘치면 원이 깨지고 자막이 된다.
                  j2 는 직녀가 왼쪽에서 달력을 내려다보는 옆모습 → 말풍선은 오른쪽 빈 자리, 꼬리는 아래로. */}
              <InyeonCut
                id="j2"
                assets={jiknyeoAssets}
                padTop={24}
                // 우하단 옷자락 — 왼쪽 아래 두루마리(대사가 가리키는 「아래 달력」)를 살린다.
                // 꼬리는 왼쪽 위 옆얼굴을 가리킨다.
                sayBox={SAY_BOX_DEFAULT.j2}
                say={
                  <ComicSay tail="up" point="left">
                    <span>인연이 없진 않아요.</span>
                    <span>날을 몰랐을 뿐이에요.</span>
                  </ComicSay>
                }
              />
              {/* 긴 다리문장은 말풍선에서 빼 **나레이션 맨글**로 — 글·그림 교차가 여기서 성립한다 */}
              {teaser.hasPastCheck && (
                <p
                  className="font-myeongjo mt-2 px-1 text-[15.5px] leading-[1.8]"
                  style={{ color: "var(--bone-soft)" }}
                >
                  {/* 대시에서 줄을 끊는다. 예전엔 이어 흘려서 「— 아래」까지 앞줄에 걸리고
                      하이라이트가 두 줄로 꺾였다 — 강조 상자가 반 토막 나면 강조가 아니라 사고로 보인다.
                      block 두 개로 갈라 **하이라이트가 자기 줄을 통째로** 쓰게 한다. */}
                  {/* 죄책감 해제 3단 — 4사가 예외 없이 쓰는 블록인데 우리는 마지막 단(「자책은
                      여기서」)만 갖고 있었다. 앞의 두 단이 없으면 그 말이 위로가 아니라 훈수가 된다:
                      ① 네 탓이 아니다 → ② 원인은 명식의 구간이다 → ③ 그러니 여기서 끝내라.
                      ②의 연도는 지어내지 않는다 — 과거 검증에 실제로 잡힌 해(pastYear)를 그대로 쓰고,
                      없으면 그 줄을 통째로 안 그린다. */}
                  <span className="block">지금 인연이 안 닿는 건 부족해서가 아니에요.</span>
                  <span className="mt-1.5 block">
                    {teaser.pastYear
                      ? `${teaser.pastYear}년부터 들어온 흐름이 눌러 놓은 구간이라 그래요.`
                      : "타고난 흐름이 눌러 놓은 구간이라 그래요."}
                  </span>
                  <span className="mt-3 block">자책은 여기서 끝내셔도 돼요. 그때가 맞았다면 —</span>
                  <span className="mt-1.5 block">
                    <Hi>아래 달력도 같은 사주에서 나온 거예요.</Hi>
                  </span>
                </p>
              )}
            </div>
          )}

          {/* B2·B5 — 다리문장이 "아래 달력"이라고 가리킨 그 달력. 바로 뒤에 와야 문장이 성립한다.
              숫자는 전부 computeInyeonFacts 에서 세어 온 값이다(지어내기 금지). */}
          {productSlug === "inyeon-saju" && teaser.inyeon && (
            <InyeonCalendar data={teaser.inyeon} />
          )}
        </>
      )}

      {/* 財·緣 — 타이트의 「財物」「戀愛」 자리. 값을 읽다가 스스로 끊는다(말풍선 마스킹).
          달 마스킹이 "몇 월인지 짚는다" 포지션을 목차보다 먼저 스토리로 흘린다. */}
      {imm && teaser && (
        <>
          {/* 부채를 접는 손 — 공기가 바뀌는 순간(발주 t3). 뜸들이기("…다만")는 결정적인 자리에만.
              말풍선을 위 → 아래로 내렸다. 바로 앞 전신 컷이 대사를 **아래**에 달고 있어서,
              이 컷이 위에 달면 [사진][대사][대사][사진] 으로 글 두 덩이가 맞닿는다
              (형님 지적: "그림 글 글 그림 순서라 몰입감이 깨져").
              규칙: **연속한 컷은 말풍선 방향을 같게 둔다.** 방향을 번갈아 두면 붙는다.
              t3-snap 은 상단이 더 어둡지만(2.0 vs 22.9) 말풍선이 불투명 한지 상자라 가독성은
              배경 밝기에 안 걸린다 — 아래로 내려도 부채는 컷 위쪽 2/3 에 그대로 보인다. */}
          <TeaserCut
            src="/products/sangun/t3-snap.webp"
            alt="부채를 접어 쥔 손"
            tall
            pos="center 38%"
            sayAt="bottom"
            say={<>앞일도 보인다. …다만.<br />듣기 좋은 말만 하지는 않는다.</>}
          />

          <HanjaHeader char="財" />
          {/* 엽전 꾸러미를 장부 위로 든 손(발주 t4).
              "다들 그것부터 묻더군" — 수없이 봐온 사람의 말. 무당 말투의 경험담 부품. */}
          <TeaserCut
            src="/products/sangun/t4-money.webp"
            alt="엽전 꾸러미를 장부 위로 내리는 손"
            tall
            sayAt="top"
            // 여기가 티저의 정점이다 — 값을 읽어 주다가 가린 자리에서 끊는 한 줄.
            // 웹툰이 회차 마지막 대사만 뒤집어 끊는 그 문법을 이 한 곳에만 쓴다(CutSay invert 주석).
            invert
            lead
            say={
              <>
                돈부터 볼까. 다들 그것부터 묻더군.
                <br />
                들어오는 달이 보인다 — <InkMask text="▓▓년 ▓▓월" />. &nbsp;…여기까지.
              </>
            }
          />

          <HanjaHeader char="緣" />
          {/* 새끼손가락의 붉은 실 — 설명 없이 읽히는 인연의 기호(발주 t5) */}
          <TeaserCut
            src="/products/sangun/t5-thread.webp"
            alt="손가락에 붉은 실을 감고 장부를 짚은 손"
            tall
            sayAt="top"
            say={<>네 짝 말이냐.<br />…봤다. 얼굴까지.</>}
          />
          {/* 옛 캐시(초안 복원)에는 partnerFace 가 없을 수 있다 — 없으면 카드만 조용히 건너뛴다 */}
          {teaser.partnerFace && <DestinyCard face={teaser.partnerFace} />}

          {teaser.turningYear && (
            <>
              <HanjaHeader char="命" />
              {/* 붉은 붓으로 장부 한 줄에 동그라미 — "붉게 적힌 해"를 문자 그대로 연기(발주 t6).
                  에이스 컷이라 대사도 제일 짧게. 짧을수록 그림이 산다. */}
              <TeaserCut
                src="/products/sangun/t6-mark.webp"
                alt="붉은 붓으로 장부의 한 해에 동그라미를 치는 손"
                tall
                sayAt="top"
                say={<>…여기.<br />붉게 적혀 있군.</>}
              />
            </>
          )}
        </>
      )}

      {/* 크게 갈리는 해 — 연도만 공개 */}
      {/* 문구가 "장부에 **붉게** 표시된 해"인데 카드가 금색이었다 — 말과 그림이 어긋난 결함.
          붉은 판으로 바꾸고, 연도 위에 붓 동그라미가 실제로 **그려지게** 한다.
          바로 위 t6 컷(붉은 붓으로 장부에 동그라미 치는 손)이 한 동작을 여기서 이어받는 셈이다. */}
      {/* mt-4 → mt-9, py-5 → py-7: 위아래가 전부 사진 컷이라 이 카드가 두 사진 사이에 낀
          얇은 띠처럼 보였다(형님 지적). 카드 자체가 "장부에 붉게 표시된 한 해"라는 단독 장면이니
          앞뒤로 숨 쉬는 자리를 주고, 카드 안쪽도 넓혀 판으로 서게 한다. 아래 mb-9 는 다음 컷과의 간격. */}
      {teaser?.turningYear && (
        <div
          ref={inkRef}
          // mt-9 → mt-14(56px): 칠흑 판독의 「정점 앞 큰 숨」을 티저에 번역(2026-09-02 형님
          // 「여백 활용을 못한다」 지적). 실측 36px 로 앞 컷에 붙어 있어 붉은 해가 묻혔다.
          // 눈금은 결과지에서 이미 검증한 사다리(기본 24 · 정점 56 · 최대 64)를 그대로 쓴다.
          className="mb-9 mt-14 px-4 py-7 text-center"
          style={
            isInyeon
              ? { background: "rgba(217,199,232,0.08)", border: "1px solid var(--gold-line)", borderRadius: 6 }
              : { background: "rgba(143,43,30,0.10)", border: "1px solid rgba(143,43,30,0.55)" }
          }
        >
          {/* 직녀 화면엔 산군의 장부도, 빨강도 없다(형님 확정 금기). 같은 연출을 은사 색으로만 옮긴다. */}
          {/* 라벨 11 → 13px. 이 카드의 40px 숫자가 무엇의 연도인지 말하는 유일한 줄이다. */}
          <p
            className="font-myeongjo text-[13px] tracking-[0.15em]"
            style={{ color: isInyeon ? "var(--gold-soft)" : "rgba(216,140,120,0.85)" }}
          >
            {/* 직녀는 "달력에 표시된 해"라고 못 쓴다 — 바로 위 열두 칸 달력에 이 해가 없어서
                손님이 되짚으면 어긋난다. 결과지 8장 제목과 같은 말로 둬 티저→결과지가 호응한다. */}
            {isInyeon ? "크게 바뀌는 해" : "장부에 붉게 표시된 해"}
          </p>
          {/* 좌우 여백(px-6)은 장식이 아니라 필수다 — 붓이 글자 **바깥**을 돌아야 동그라미로 읽힌다.
              좁히면 획이 숫자를 파고들어 취소선처럼 보인다(실측에서 2와 년이 잘렸다). */}
          <span className="relative mt-2 inline-block px-6 py-2">
            {/* 30 → 40px, 명조 → 붓글씨(--font-brush).
                크기: 티저에서 유일하게 가리지 않고 내주는 확정값인데, 바로 위 나레이션이 19px 라
                30px 은 1.6배밖에 안 됐다. 40px 은 연출용 눈금에 있는 다음 칸이고 2.1배가 된다.
                글씨체: font-serif 는 Tailwind 에서 var(--font-myeongjo) 로 걸려 있어 폴백은 아니었지만,
                본문·대사와 **같은 옷에 크기만 다른** 상태였다. 우리는 이미 글씨체로 역할을 가르고
                있다(말풍선=명조, 나레이션=송명조). 여기는 붓글씨 — 이 숫자를 감싸는 게 붉은 먹
                동그라미라 같은 도구(붓)로 쓴 글자여야 "장부에 붓으로 표시한 해"가 된다.
                거친 붓(East Sea Dokdo)이 대본상 후보였지만 웹툰 컷이 화면에 있을 때만 로드되는
                글씨체라 웹툰을 내리면 같이 죽는다 — 전역 next/font 인 --font-brush 를 쓴다. */}
            <p
              className="text-[40px] font-bold leading-none"
              style={{
                color: isInyeon ? "var(--gold-bright)" : "#e8695a",
                fontFamily: "var(--font-brush), 'Nanum Brush Script', cursive",
              }}
            >
              {teaser.turningYear.year}년
            </p>
            {/* 먹으로 친 동그라미 — 선이 아니라 굵기가 변하는 도형이다(ink-circle-path.ts 참고).
                마스크가 중심선을 따라 훑으며 획을 드러내서 "지금 붓이 지나간다"가 된다.
                pathLength=1 로 정규화 — 경로를 고쳐도 CSS(dasharray 1)는 그대로 맞는다.
                `is-drawn` 이 붙어야 재생된다 — 카드가 화면에 들어온 뒤에 붙는다(useInView). */}
            <svg
              aria-hidden
              viewBox="0 0 120 56"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <mask id="ink-reveal" maskUnits="userSpaceOnUse" x="-6" y="-6" width="132" height="68">
                  {/* 폭 12 = 획 최대 폭(약 4.1)보다 넉넉히 — 붓끝이 획보다 살짝 앞서 지나간다 */}
                  <path
                    className={`ink-circle${inkInView ? " is-drawn" : ""}`}
                    pathLength={1}
                    d={INK_CENTERLINE}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                </mask>
                {/* 먹의 농담 — 붓을 댄 쪽이 짙고, 들어올리는 끝이 옅다 (직녀는 은사 농담) */}
                <linearGradient id="ink-tone" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isInyeon ? "#6f61a8" : "#b0301d"} />
                  <stop offset="42%" stopColor={isInyeon ? "#a596e0" : "#d24430"} />
                  <stop offset="100%" stopColor={isInyeon ? "#5b4f8c" : "#8f2b1e"} />
                </linearGradient>
              </defs>
              {/* 번짐 — 종이에 먹이 스민 자국. 본획보다 먼저 깔린다 */}
              <path
                d={INK_STROKE}
                fill={isInyeon ? "#5b4f8c" : "#8f2b1e"}
                opacity={0.45}
                mask="url(#ink-reveal)"
                style={{ filter: "blur(1.1px)" }}
              />
              <path d={INK_STROKE} fill="url(#ink-tone)" mask="url(#ink-reveal)" />
            </svg>
          </span>
          {/* 13 → 15px. 40px 붓글씨 연도의 **뜻**을 말하는 줄(「37세에 한 번 크게 갈리세요」)인데
              각주 크기였다 — 카드의 펀치라인이라 본문 눈금에 세운다. */}
          <p className="font-myeongjo mt-3 text-[15px] leading-[1.75] text-bone">{teaser.turningYear.line}</p>
        </div>
      )}

      {/* 받을 장부의 목차 — 타이트 결과지 실측(2026-08-03)에서 가져온 형식.
          잠긴 줄 5개는 "안 주는 게 많다"로 읽혔다. 결과지 9장과 1:1 인 목차 카드로 바꾸고,
          七장(전환점)만 열어 둔다 — 하나가 열려 있어야 나머지 잠금이 미끼가 된다. */}
      {/* ▓ 문자를 그대로 찍으면 어디서나 보이는 자리표시자라 AI 티가 난다(형님 지적).
          세계관대로 "산군이 붓으로 그어 가린 자국"으로 그린다 — ▓ 연속 구간만 먹 붓자국 바로
          바꾸고 년·월 같은 단위 글자는 남긴다("달까지 적혀 있는데 가려져 있다"가 한눈에 보이게).
          모양·기울기는 위치 기반으로 고정해 SSR/하이드레이션이 어긋나지 않게 한다(난수 금지). */}
      {teaser && (
        <>
          {/* 결제 전환도 캐릭터 대사로 — 타이트의 "복채는 준비해왔어?" 자리.
              정면 대면 컷: 여기서 처음으로 산군이 손님을 마주 본다(돈 얘기는 마주 보고 한다). */}
          {imm && teaser.chapters.length > 0 && (
            <TeaserCut
              src="/products/sangun/teaser-face.webp"
              alt="정면으로 마주 앉은 산군"
              pos="center 42%"
              size="md"
              sayAt="top"
              // 「이제 복채 얘기를 하자」는 요구가 먼저 오는 문장이었다 — 모의구매 5/6이 결제
              // 시트의 「복채」를 「갖다 바치는 느낌」이라 했던 그 결이 여기서 시작된다(:1289 주석).
              // 「복채」 자체는 캐릭터의 값이라 지키고, 순서만 뒤집는다: 요구 앞에 제안을 세운다.
              // 바로 아래 4章 카드가 그 「값어치」고, 그다음 카드가 「값을 말하마」로 받는다.
              say={
                <>
                  복채 얘기를 하자.
                  <br />
                  뭘 주는지 먼저 보여주마.
                </>
              }
            />
          )}
          {teaser.chapters.length > 0 ? (
            /* 4章 카드 — 타이트 목차 실측을 부품 단위로 옮긴 것.
               간지 배너(붉은 박스) + 등급 태그 + 도발 부제 + 불릿의 회색→굵은흰색 명암.
               배경은 형님이 뽑은 먹 한지 + 붉은 잉크판 텍스처(ganji.webp) — 타이트의 붉은 잉크판 대응. */
            /* 16px → 44px: 복채 선언 컷에 붙어 「말 끝나기도 전에 진열」이었다.
               선언 뒤 한 박자 쉬고 목차가 펼쳐져야 보여주는 동작이 된다(칠흑 여백 번역).
               인라인인 이유: mt-11 은 이 리포 최초 사용이라 dev 의 Tailwind 가 생성을
               놓쳤다(실측 0px — min-h-[44px]와 같은 병). 재야 하는 값은 인라인으로 박는다. */
            <div style={{ marginTop: 44 }}>
              <p className="font-myeongjo text-center text-[11px] text-bone-faint tracking-[0.15em]">
                네 장부의 차례
              </p>
              <div className="mt-2.5 space-y-3">
                {teaser.chapters.map((c) => (
                  <div
                    key={c.no}
                    className="px-4 pb-4 pt-4"
                    style={{
                      backgroundImage: "url(/products/sangun/ganji.webp)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "#0c0a08",
                      border: "1px solid rgba(232,201,106,0.28)",
                    }}
                  >
                    {/* 간지 배너 + 태그 */}
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="font-brush px-3 pb-1 pt-1.5 text-[15px] leading-none tracking-[0.22em]"
                        style={{ background: "#7a2317", color: "#f3e6cf", textIndent: "0.28em" }}
                      >
                        {c.no}章
                      </span>
                      {c.tag && (
                        <span
                          className="font-myeongjo px-2 py-1 text-[11px] tracking-[0.06em]"
                          style={{ border: "1px solid rgba(232,201,106,0.45)", color: "var(--gold-soft)" }}
                        >
                          {c.tag}
                        </span>
                      )}
                    </div>
                    {/* 도발 부제 */}
                    <p className="font-myeongjo mt-3 text-center text-[15px] font-bold leading-[1.5]" style={{ color: "#efe6d2" }}>
                      {c.tease.map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < c.tease.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                    <div
                      className="mx-auto mt-3 h-px w-24"
                      style={{ background: "linear-gradient(90deg,transparent,rgba(232,201,106,0.55),transparent)" }}
                    />
                    {/* 불릿 — 결과지 챕터와 1:1 */}
                    <ul className="mt-3.5 space-y-2.5 text-left">
                      {c.items.map((it, i) => (
                        <li key={i} className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="mt-0.5 h-1.5 w-1.5 shrink-0 rotate-45"
                            style={{ background: "rgba(232,201,106,0.75)" }}
                          />
                          <span className="min-w-0 flex-1">
                            {it.lead && (
                              <span className="font-myeongjo block text-[11px] leading-[1.4] text-bone-faint">{it.lead}</span>
                            )}
                            <span className="font-myeongjo block text-[13px] font-bold leading-[1.4]" style={{ color: "#f3ead6" }}>
                              {it.main}
                            </span>
                          </span>
                          {(it.peek || it.mask) && (
                            <span className="shrink-0 text-right">
                              {it.peek ? (
                                <span className="font-myeongjo text-[13px] font-bold leading-[1.4]" style={{ color: "var(--gold-bright)" }}>
                                  {it.peek}
                                </span>
                              ) : (
                                <span className="text-[13px] text-bone-soft">
                                  <InkMask text={it.mask ?? ""} />
                                </span>
                              )}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 존댓말 상품은 기존 잠긴 줄 유지 — 인연만 달력과 안 겹치는 목록으로 바꿔 든다.
               인연은 밑줄 리스트가 아니라 **줄마다 판**이다: 얇은 줄 다섯 개를 쌓으면
               다섯 개 전부 가벼워 보인다(형님 「밤티」 지적의 그 병). 값은 대사 크기(17)로 세운다. */
            <div className={isJiknyeoWorld ? "mt-4 space-y-2" : "mt-4"}>
              {(productSlug === "marriage-saju"
                ? MARRIAGE_LOCKED
                : isInyeon && teaser.inyeon
                  ? teaser.inyeon.locked
                  : teaser.locked
              ).map((row, i) =>
                isJiknyeoWorld ? (
                  // 밝은 티저의 잠금 — 얇은 줄 + 가려진 값.
                  // ⚠ 가리개는 회색 ████ 이 아니라 NeonMask 다(LockRow 주석 참조):
                  //    회색 막대는 스켈레톤과 모양이 같아 「로딩 중」으로 읽혔다(2026-08-25 실측 대비 1.4).
                  //    바로 위 열린 달 카드가 쓰는 가리개와 같은 것이라, 한 화면에서 잠금 문법이 하나로 선다.
                  <LockRow key={i} label={row.label} />
                ) : (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-gold-pale py-2.5">
                    <span className="font-myeongjo text-[13px] text-bone-soft tracking-[0.06em]">{row.label}</span>
                    <span className="font-mono text-[13px] tracking-[0.15em]" style={{ color: "rgba(232,201,106,0.42)" }}>
                      {row.mask}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {/* 목차 — 청월당 POINT 4 구간. 원본은 장마다 풀이 줄을 펴서 약 30줄을 **전량 공개**한다.
              다 보여줘야 분량이 믿기고, 잠글 것은 값이지 목차가 아니다. */}
          {/* 가격 1타 — 원본은 티저 **중반**에서 한 번 치고 맨 끝에서 또 친다.
              우리는 마지막 한 번뿐이었다. 분량을 먼저 세우고(리본) 값을 말하는 순서까지 원본 그대로. */}
          {/* 산군 본문 가격 1타 — 직녀와 같은 자리(목차 뒤)에 세운다.
              여기가 없어서 산군은 16.4화면 동안 살 자리가 없었다(2026-09-01 실측). */}
          {imm && !isJiknyeoWorld && (
            <SangunBuyCard
              priceLabel={formatKRW(price)}
              compareLabel={compareAtPrice && compareAtPrice > price ? formatKRW(compareAtPrice) : undefined}
              discountPct={
                compareAtPrice && compareAtPrice > price
                  ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                  : undefined
              }
              // 다음 상품 떡밥 한 줄(청월당이 잠금 목록 끝에 쓰는 문법) — 값은 결제 시트의
              // 추천 번들에서 그대로 받는다. 번들이 없으면 줄 자체가 안 나온다.
              bundleLine={bundleLine}
              onBuy={() => document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
          )}

          {isJiknyeoWorld && (
            <JiknyeoBuyCard
              title={productSlug === "marriage-saju" ? "직녀의 결혼예보" : "직녀의 연애예보"}
              // 분량 리본(A4 몇 쪽)은 형님 지시로 걷어냈다(2026-09-02) — 리본은 받는 것의
              // 정점 하나만 말한다. 열두 달 전량 공개가 우리 차별점(경쟁은 5개만 열고 잠근다).
              volume="열두 달 전부 + 내 고민 맞춤 답변"
              bullets={
                productSlug === "marriage-saju"
                  ? [
                      "내가 결혼하는 해 — 몇 년도인지",
                      "그 해 안에서 서두를 달",
                      "함께할 사람의 태도·말투·나이대",
                      "결혼이 늦어지던 진짜 이유",
                      "피해야 할 시기",
                      "결혼 전에 정리할 것",
                      "그 사람을 알아보는 신호 셋",
                      "적어주신 물음에 대한 답",
                    ]
                  : [
                      "열두 달 중 인연이 열리는 달",
                      "그 달에 어디서 만나게 되나",
                      "내게 올 사람의 태도·말투·나이대",
                      "인연이 와도 내가 밀어내는 순간",
                      "조심할 달 — 시작하면 안 되는 시기",
                      "크게 바뀌는 해",
                      "그 사람을 알아보는 신호 셋",
                      "적어주신 물음에 대한 답",
                    ]
              }
              priceLabel={formatKRW(price)}
              compareLabel={compareAtPrice ? formatKRW(compareAtPrice) : undefined}
              discountPct={
                compareAtPrice && compareAtPrice > price
                  ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                  : undefined
              }
              discountLabel="첫 손님 할인"
              ctaText={productSlug === "marriage-saju" ? "할인받고 결혼운 보러가기" : "할인받고 연애운 보러가기"}
              onBuy={() => document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
          )}

          {isJiknyeoWorld && (
            <>
              {/* 세계관 한 컷 — 조판이 길게 이어지는 구간이라 그림으로 한 번 끊는다(글·사진 교차). */}
              <div>
                <InyeonCut id="t06" assets={jiknyeoAssets} />
              </div>

              {/* 차별점 POINT 1~3 — 원본 순서: 가격카드 → POINT → 목차(4) → 가격 VS(5) */}
              <JiknyeoTeaserPoints isMarriage={productSlug === "marriage-saju"} />
              <JiknyeoTeaserToc slug={productSlug} comments={teaser.coldRead ?? []} assets={jiknyeoAssets} />
              {/* 손 내밀기 — 값을 말하기 직전에 캐릭터가 한 번 더 선다(청월당·타이트 둘 다 마지막이 펼친 손). */}
              <InyeonCut
                id="t14"
                assets={jiknyeoAssets}
                // 좌상단 은하수 — 이 컷의 전부인 **내민 손**(y72~95)에서 최대한 멀리 띄운다.
                // 아래쪽에 있던 자리가 손을 통째로 덮고 있었다(운영 실측).
                sayBox={SAY_BOX_DEFAULT.t14}
                say={
                  <ComicSay tail="down" point="right">
                    {productSlug === "marriage-saju" ? "같이 볼까요?" : "같이 볼까요?"}
                  </ComicSay>
                }
              />

              {/* 가격은 목차 **뒤**에 온다 — 원본도 분량을 먼저 보여주고 값을 말한다(POINT 4 → 5). */}
              <JiknyeoTeaserPrice
                priceLabel={formatKRW(price)}
                compareLabel={compareAtPrice ? formatKRW(compareAtPrice) : undefined}
                isMarriage={productSlug === "marriage-saju"}
              />
              {/* 배웅 — 값을 다 말한 뒤 마지막 한 컷. 원본도 맨 끝을 캐릭터로 닫는다. */}
              <InyeonCut id="t15" assets={jiknyeoAssets} />

              {/* ⚠ 여기 있던 「밝은 판 → 검은 결제」 먹 번짐(InkFade)을 걷어냈다.
                  이 자리는 판의 끝이 아니다 — 뒤에 금기 카드·배웅 컷·마감 펀치가 **아직 밝은 판 안에서**
                  이어진다. 그래서 그라데가 판 한가운데 보라→검정 띠로 박혀 있었다(운영 실측).
                  판은 둥근 모서리로 자기 끝을 이미 말하고 있으므로 녹일 것이 없다. */}
            </>
          )}

          {/* 결제 직전 마지막 한 마디.
              타이트 대조에서 배운 것: 그들은 밑밥을 작게 깔고 펀치만 크게·붉게 세운다.
              두 박자로 끊고 뒷줄만 키운다. 손해 회피가 이득 추구보다 세게 움직이므로
              붉은 줄에 멈춤(조심할 달)을 둔다.
              "해야 할 것과 하면 안 되는 것을 날짜까지 적어 뒀다"는 웹툰 마지막 말풍선과
              토씨까지 같아서 교체(형님 지적과 같은 중복 유형) — 행동 축(무엇을) 대신
              시기 축(언제)으로 바꿔 서로 다른 말이 되게 했다.
              ⚠ 처음엔 "엎드릴 달"이었는데 형님이 잡았다(2026-09-02 「말이 어렵지 않냐」) —
              사극 말이라 1초 낭독 테스트 탈락. "조심할 달"은 목차 7장 제목 그대로라
              새 약속도 아니고 새 어휘도 아니다. "박아 뒀다"는 4章 카드("확답부터
              박는다")의 집 어휘. "날짜"는 타이트가 구조적으로 못 하는 차별점이라 유지
              (그들 26,198자 중 달 언급 1회). */}
          {productSlug === "sangun-sinjeom" && (
            /* mt-5 → mt-14(56px): 마지막 한마디는 판을 닫는 정점인데 구매 카드에 20px 로
               붙어 「카드의 각주」로 읽혔다. 한 숨 쉬고 낮은 목소리로 닫는다. */
            <div className="mt-14 text-center">
              <p className="font-myeongjo text-[13px] leading-[1.75]" style={{ color: "var(--bone-faint)" }}>
                눈앞에 펼쳐 놓고 말해주마
              </p>
              <p
                className="font-myeongjo mt-3 text-[19px] font-bold leading-[1.5]"
                style={{ color: "#f3ead6" }}
              >
                움직일 달과
                <br />
                <span style={{ color: "#d8563f" }}>조심할 달</span>을
                <br />
                날짜로 박아 뒀다
              </p>
            </div>
          )}

          {/* B8 하지 말 것 — 잠금 줄 바로 위. 두 개는 지금 쓸 수 있게 주고 세 번째만 잠근다. */}
          {isInyeon && teaser.inyeon && (
            <div
              // mt-6 → mt-14(56px): 금기 카드는 「읽어 주다 멈추는」 정점인데 24px 로 붙어
              // 있었다. 밝은 판 위 여백 = 종이의 침묵(칠흑 번역 눈금 56).
              className="mt-14 rounded-md px-4 py-5"
              // 검은 판을 하드코딩해 뒀더니 밝은 티저 안에서 이 판만 딴 페이지가 됐다(실측 1건).
              // 토큰으로 그려 어두운 무대·밝은 티저 양쪽에서 같은 역할을 하게 한다.
              style={{ background: "var(--gold-pale)", border: "1px solid var(--gold-line)" }}
            >
              {/* 제목 13 → 15px. 아래 목록이 15px 인데 제목이 13px 이라 위계가 뒤집혀 있었다
                  (제목이 본문보다 작으면 카드가 아니라 각주 뭉치로 읽힌다). */}
              <p className="font-myeongjo text-center text-[15px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
                지금 이것만은 하지 마세요
              </p>
              <ol className="mt-4 space-y-3.5">
                {teaser.inyeon.donts.map((d, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[13px] leading-[1.75]" style={{ color: "var(--gold-soft)" }}>
                      {i + 1}.
                    </span>
                    {d.locked ? (
                      <span className="font-myeongjo text-[15px] leading-[1.75]" style={{ color: "var(--bone-faint)" }}>
                        {/* 두 줄 분량이 가려져 있다는 걸 길이로 보여준다 */}
                        <span className="block py-1">
                          <NeonMask text="○○○○○○○○" />
                        </span>
                        이건 결과지에서 말씀드릴게요.
                      </span>
                    ) : (
                      <span className="font-myeongjo text-[15px] leading-[1.75]" style={{ color: "var(--bone)" }}>
                        {d.text}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 결제 직전 마지막 줄. 인연은 잔글씨 한 줄로 흘리지 않고 **컷 + 말풍선 + 펀치**로 닫는다 —
              청월당도 마지막은 캐릭터가 손을 내밀며 끝낸다(가격은 여기서 말하지 않는다). */}
          {isInyeon ? (
            <>
              <InyeonCut
                id="w7"
                assets={jiknyeoAssets}
                // 배웅 정점인데 금기 카드에 0px 로 붙어 있었다(실측). 간격은 밤 배경 안에서
                // 준다 — 바깥 margin 은 밝은 판이 드러나 흰 띠가 된다(padTop 주석 참조).
                padTop={48}
                // 좌상단 달·창 — 달력 짚는 손가락(y45~57)과 얼굴(x55~80)을 둘 다 피한다.
                // 우상단에 있던 자리가 그 손가락과 공책 모서리를 덮고 있었다(운영 실측).
                sayBox={SAY_BOX_DEFAULT.w7}
                say={
                  <ComicSay tail="down" point="right">
                    <span>{name ? `${name}님 달력,` : "달력,"}</span>
                    <span>여기까지 폈어요.</span>
                  </ComicSay>
                }
              />
              <div className="mt-7 text-center">
                <GlowBand>
                  <p className="font-gothic text-[11px] font-bold tracking-[0.2em]" style={{ color: "var(--bone-faint)" }}>
                    계산은 끝났어요
                  </p>
                  {/* ⚠ 여기 `text-moonlit`(흰→달빛 그라데 글자)이 걸려 있었다. 그건 **검은 무대**용이라
                      밝은 달빛 판 위에서는 흰 글자가 판에 묻혀 첫 줄이 통째로 안 보였다(운영 실측).
                      마감 펀치는 이 페이지에서 손님이 마지막으로 읽는 두 줄이다 — 토큰 먹색으로 세운다. */}
                  <p
                    className="font-gothic mt-3 text-[34px] leading-[1.3] tracking-[-0.02em]"
                    style={{ color: "var(--bone)", fontWeight: 900 }}
                  >
                    달 이름만,
                  </p>
                  <p className="mt-2">
                    <span
                      className="font-gothic inline-block rounded-[6px] px-3 py-1 text-[30px] leading-[1.25] tracking-[-0.02em]"
                      // 밝은 판에서 --gold-bright 는 진보라(#6B4C9A)로 뒤집힌다. 먹색 글자를 얹으면
                      // 대비가 2.6:1 까지 떨어져 강조가 아니라 얼룩이 된다 — 흰 글자로 받는다.
                      style={{ background: "var(--gold-bright)", color: "#ffffff", fontWeight: 900 }}
                    >
                      아직이에요
                    </span>
                  </p>
                </GlowBand>
              </div>
            </>
          ) : (
            <p className="font-myeongjo mt-3.5 text-center text-[11px] text-bone-faint tracking-[0.06em]">
              {teaser.note}
            </p>
          )}
        </>
      )}
    </div>

    {/* 세일즈 꼬리 — 분량·가격 앵커 → 예시 결과지 → FAQ.
        타이트는 같은 자리(무료 티저 아래)에 가격·목차·예시·후기를 다 쌓아 두고, 그게 유일한
        세일즈 페이지다. 우리는 그 자료가 별도 화면에 있었는데 스토리 탈출구를 입력 직행으로
        바꾸면서 손님 동선에서 빠졌다 — 그래서 여기로 옮겼다(2026-08-11).
        장부 판(위 검은 박스) 바깥에 두는 이유: 이건 산군의 장부가 아니라 상품 설명이다. */}
    {productSlug === "sangun-sinjeom" && teaser && <TeaserSalesTail priceLabel={formatKRW(price)} />}
    {/* B12 — 하단 고정 마감바. 결제 버튼이 화면 밖으로 나가도 가장 가까운 달이 따라다닌다.
        2026-09-01: 값만 말하고 살 수는 없던 자리에 버튼을 같이 태웠다(위 StickyBuyBar 주석). */}
    {isJiknyeoWorld && teaser?.inyeon?.nearest && (
      <StickyBuyBar
        note={
          <>
            가장 가까운 열리는 달,{" "}
            <b className="font-bold" style={{ color: "var(--gold-bright)" }}>
              {teaser.inyeon.nearest.month}월
            </b>{" "}
            — 지나가면 빠져요
          </>
        }
        buyLabel={`${formatKRW(price)} 열기`}
        onBuy={() => document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />
    )}
    {/* 산군은 이 바가 아예 없어 16.4화면 동안 살 자리가 없었다. 마감으로 재촉하지는 않는다 —
        가짜 타이머 대신 「이미 다 적혀 있다」는 사실만 말하고 버튼을 붙인다. */}
    {imm && !isJiknyeoWorld && teaser && (
      <StickyBuyBar
        dark
        note={<>네 장부 11장, 이미 다 적혀 있다</>}
        buyLabel={`${formatKRW(price)} 열기`}
        onBuy={() => document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />
    )}
    {/* 말풍선 자리 편집 — `?edit=say` 에서만 뜬다(손님 화면엔 없다) */}
    {isJiknyeoWorld && <SayEditPanel />}
    </>
  );
}

/** 결혼 상품 잠긴 줄 — 공용 polite 목록엔 「돈이 들어오는 달」·「인연이 들어오는 달」이 섞여 있어
 *  결혼 화면에 그대로 쓰면 다른 상품 말이 된다. 결과지 목차(prompt.ts)와 1:1 로 맞춘다. */
const MARRIAGE_LOCKED: { label: string; mask: string }[] = [
  { label: "결혼하는 해에 달라지는 것", mask: "▓▓▓▓▓▓▓▓▓▓" },
  { label: "서두르면 좋은 달", mask: "▓▓▓▓▓▓" },
  { label: "피해야 할 시기", mask: "▓▓▓▓▓▓" },
  { label: "함께할 사람 — 태도·말투·나이대", mask: "▓▓▓▓▓▓▓▓" },
  { label: "적어주신 물음에 대한 답", mask: "▓▓▓▓▓▓▓▓" },
];

/**
 * 가려진 값 한 칸 — ▓/█ 글리프 대신 **길이를 보존한 은사 바**로 그린다.
 *
 * 블록문자를 그대로 찍으면 폰트에 따라 회색 막대가 우둘투둘 이어져 자리표시자 티가 난다(실측).
 * 바로 그리면 "값이 여기 이만큼 있다"는 정보(길이)는 그대로 남고 화면은 깔끔해진다.
 * 길이는 마스크 문자열의 글자 수를 그대로 쓴다 — 개수가 정보다.
 */
function MaskBar({ mask }: { mask: string }) {
  const n = Math.max(2, [...mask].filter((ch) => /[▓█]/.test(ch)).length || mask.length);
  return (
    <span
      aria-label="잠긴 값"
      className="inline-block align-middle"
      style={{
        width: `${(n * 0.56).toFixed(2)}em`,
        height: "0.9em",
        borderRadius: 2,
        background: "linear-gradient(90deg, rgba(207,214,230,0.16), rgba(207,214,230,0.30))",
      }}
    />
  );
}

/**
 * B5 열두 달 달력 + B2 기회 카운트.
 *
 * 「계산은 다 보여드려요. 이름만 아직이에요」를 화면으로 만든 자리다 —
 * 등급(●◎○△)은 열두 칸 전부 열고, 달 이름은 가장 가까운 한 달만 준다.
 * 값은 전부 teaser.inyeon(=computeInyeonFacts) 에서 온다. 여기서 새로 계산하지 않는다.
 */
function InyeonCalendar({ data }: { data: NonNullable<SajuTeaser["inyeon"]> }) {
  // 2026-08-18 전면 개작 — 청월당 「연애비책」 티저 실측 조판으로 갈아끼웠다.
  //
  // 전에는 12칸 격자였다. 그건 우리가 발명한 것이고 원본에 없다. 원본은 **연월 리스트**다:
  //   「앞으로 3년,」(16/400) → 서예체 헤드(24) → 「나의 연애 기회: 9회」(숫자만 30/800/핑크)
  //   → 연월 줄(16/500) + 성격 설명(16/400) → 잠긴 줄은 ████
  // 격자를 버린 이유는 취향이 아니다 — 형님이 「전부 원본 그대로」로 확정했고(2026-08-18),
  // 격자는 375px 에서 칸이 72px 밖에 안 나와 달 이름이 감기는 문제도 계속 안고 있었다.
  //
  // ★ 숫자가 튀는 건 크기 때문이 아니라 **주변이 전부 무채색인데 혼자 컬러**라서다(실측 판독).
  //   그래서 이 블록에서 핑크는 숫자 하나뿐이다. 여기저기 칠하면 그 효과가 사라진다.
  const { ref, inView } = useInView<HTMLDivElement>();
  // 격자에 **실제로 그려진 것**을 센다. openCount(●+◎ 합)를 그대로 쓰면 노란 보름달 개수와
  // 어긋나 손님이 세어 봤을 때 틀린 숫자가 된다.
  const fullCount = data.calendar.filter((c) => c.grade === "●").length;
  const halfCount = data.calendar.filter((c) => c.grade === "◎").length;
  return (
    <div className="mt-8">
      {/* 12칸 예보 격자 — 열두 달 등급을 **하나도 가리지 않고** 편다.
          2026-08-18 에 격자를 버렸다가 2026-08-22 되살린 자리다(이유는 MoonGrid 주석 참조).
          아래 연월 리스트와 겹치지 않는다 — 격자는 "계산을 다 보여줬다"는 증거고,
          리스트는 "그중 하나만 열어준다"는 잠금이다. 둘이 붙어야 「다 보여줬는데 못 읽는」이 된다. */}
      <div className="mb-8">
        <MoonGrid
          months={data.calendar.map((c) => ({ m: `${c.month}월`, p: GRADE_TO_PHASE[c.grade] ?? "cres" }))}
        />
      </div>

      {/* 집계 = 이 구간의 표지이자 정보다.
          ⚠ 예전엔 붓 헤드가 「이 달들을 놓치지 마세요!」(정보 0 인 명령)였고, 그 아래 「나의 인연
             기회: 5회」가 따로 있었다. 그 5 는 **보름(●) + 반달(◎)** 합인데 화면에서 세면 노란
             보름달은 3 개뿐이라, 읽는 법을 못 박는 순간 숫자가 거짓말로 보인다. 그래서 등급별로
             갈라 적는다 — 세는 것과 보이는 것이 일치해야 증거가 증거로 산다.
          느낌표를 뺀 것도 의도다(직녀 보이스 1번: 재촉하지 않는다, 대신 달을 못 박는다). */}
      <div ref={ref} className="text-center">
        <T>앞으로 열두 달</T>
        <div
          className="mt-2"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .5s ease, transform .5s ease",
          }}
        >
          <BrushHead lines={[`크게 열리는 달 ${KO_NUM[fullCount] ?? fullCount}`]} />
        </div>
        {halfCount > 0 && (
          <p className="mt-3 text-[15.5px] leading-[24px]" style={{ color: BODY }}>
            자리가 생기는 달 {KO_NUM[halfCount] ?? halfCount}
          </p>
        )}
      </div>

      {/* 열린 달 = 이 화면의 결론. 잠긴 달은 **그 카드 안에** 붙여 「같은 종류의 값이 몇 개 더
          가려져 있다」로 읽히게 한다.
          ⚠ 잠긴 줄에 실값을 넣지 않는다 — openList 에 애초에 공개분만 담겨 온다.
          ⚠ 회색 막대(LockRow)를 여기서 걷어냈다. 스켈레톤과 모양이 같아 「로딩 중」으로 읽혔다 —
             잠금은 금기 카드와 같은 NeonMask(발광 테두리 + 흐린 글자)로 통일한다. 다만
             **맨 아래 항목 목록의 회색 막대는 그대로 둔다**: 발광이 일곱 개면 아무것도 안 빛난다. */}
      {data.openList.map((m, i) => (
        <OpenMonthCard
          key={i}
          year={m.year}
          month={m.month}
          desc={m.desc}
          note={
            i === 0
              // 「여기까지 무료」는 판 맨 위 「여기까지는 무료예요」와 겹치고, 붙이면 대시에서
              // 줄이 꺾여 「여기까지 무료」만 다음 줄에 떨어진다. 한 줄에 드는 만큼만 적는다.
              ? `크게 열리는 달 ${KO_NUM[fullCount] ?? fullCount} 중 가장 가까운 달이에요`
              : undefined
          }
          moon={<Moon phase="full" size={30} />}
          locks={
            i === 0
              ? Array.from({ length: data.restOpen }, (_, k) => ({
                  // 라벨은 위 격자 범례에서 쓰는 말 그대로다 — 새 약속을 만들지 않는다.
                  label: k === 0 ? "두 번째로 큰 달" : "자리가 생기는 달",
                }))
              : undefined
          }
        />
      ))}

      {data.restOpen > 0 && (
        <p className="mt-8 text-center text-[17px] leading-[26px]" style={{ color: INK, fontWeight: 700 }}>
          이런 풀이를 더 해드려요
        </p>
      )}
    </div>
  );
}

/** 개수를 **말로** 적는다 — 「3」은 표의 숫자고 「셋」은 사람이 하는 말이다.
 *  이 화면에서 아라비아 숫자는 정점(카드의 「10월」) 하나만 쓴다: 숫자가 둘이면 둘 다 안 크다. */
const KO_NUM: Record<number, string> = { 0: "없어요", 1: "하나", 2: "둘", 3: "셋", 4: "넷", 5: "다섯", 6: "여섯", 7: "일곱", 8: "여덟" };

/**
 * 로딩 체크리스트 — 항목은 **실제로 도는 계산**만 적는다(안 하는 걸 적으면 그게 거짓말이 된다).
 * 대운 시작 나이는 우리가 상용 서비스와 대조해 검증한 항목이라 티저 Q&A 의 검증 영상과 이어진다.
 */
const LOADING_STEPS = [
  "사주 원국 여덟 글자 세우기",
  "천간·지지의 충·합·형 보기",
  "대운 시작 나이 계산 (절입일 기준)",
  "앞으로 열두 달 월운 펴기",
  "배우자 자리 판정",
];

function LoadingChecklist() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    // 최소 노출 시간(MIN_TEASER_LOADING_MS) 안에 다 켜지도록 나눈다 — 로딩이 먼저 끝나도 어색하지 않다.
    const every = Math.floor(MIN_TEASER_LOADING_MS / (LOADING_STEPS.length + 1));
    const id = setInterval(() => setDone((n) => (n >= LOADING_STEPS.length ? n : n + 1)), every);
    return () => clearInterval(id);
  }, []);
  return (
    <ul className="mx-auto mt-6 max-w-[280px] space-y-2 text-left">
      {LOADING_STEPS.map((s, i) => {
        const on = i < done;
        return (
          <li key={s} className="flex items-baseline gap-2.5">
            <span
              className="font-mono text-[13px] leading-none"
              style={{ color: on ? "var(--gold-bright)" : "var(--bone-faint)" }}
            >
              {on ? "✓" : "⋯"}
            </span>
            <span
              className="font-myeongjo text-[13px] leading-[1.6]"
              style={{ color: on ? "var(--bone)" : "var(--bone-faint)", transition: "color .4s ease" }}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * B12 — 하단 고정 마감바.
 *
 * 30분 카운트다운을 걷어냈다. 이유 셋:
 *  ① 직녀 보이스 1번 규칙이 "재촉하지 않는다, 대신 달을 못 박는다"인데 카운트다운은 그 자체가 재촉이다.
 *  ② 30분이 지나도 화면은 안 닫힌다 — 「틀렸으면 여기서 닫으셔도 돼요」로 쌓은 신뢰를 결제 직전에 깎는다.
 *  ③ 우리에겐 **진짜 마감**이 이미 있다. 만세력 월운 창이 매달 미끄러져서 지나간 달은 다음 계산에서
 *     실제로 빠진다(상세페이지에 이미 박아 둔 확정 카피와 같은 말). 사실이고 그 손님 달력에서 나온 값이다.
 */
/**
 * 하단 고정바 — **값을 말하면서 동시에 살 수 있는 자리**.
 *
 * 여기 있던 30분 카운트다운을 걷어낸 판단은 그대로다(가짜 마감은 안 쓴다). 다만 걷어내면서
 * 바가 「정보만」 남아, 티저 내내 눌러서 살 곳이 없어졌다 — 실측(2026-09-01): 직녀는 중반 CTA
 * 와 결제 시트 사이가 7,700px(9.2화면), 산군은 바 자체가 없어 16.4화면이 비어 있었다.
 * 경쟁 4사가 예외 없이 하단 고정 CTA 를 쓰는 자리이기도 하다.
 *
 * 그래서 **진짜 마감(월운 창은 실제로 미끄러진다)을 말하면서 버튼을 같이 태운다.**
 */
function StickyBuyBar({
  note,
  buyLabel,
  dark,
  onBuy,
}: {
  note: React.ReactNode;
  buyLabel: string;
  dark?: boolean;
  onBuy: () => void;
}) {
  // createPortal 은 SSR 에 document 가 없다 — 마운트 후에만 그린다.
  const [mounted, setMounted] = useState(false);
  // 바닥 여백은 **재서** 맞춘다. 375px 에서 이 문장은 두 줄로 감겨 69px 가 되는데 고정값 46px 을
  // 두면 마지막 줄(환불 안내)이 가려진다 — 카피를 고칠 때마다 숫자를 다시 재게 만들지 않는다.
  const [barH, setBarH] = useState(46);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  // ⚠ body 로 빼는 이유: 위저드를 감싼 `.svc-fade` 가 스크롤 연출용 transform 을 갖고 있어서
  //   그 안에서는 position:fixed 의 기준이 뷰포트가 아니라 그 박스가 된다(실측: 화면 밖 top 2657px).
  //   연출은 공용이라 못 건드리므로 바만 포털로 꺼낸다.
  return (
    <>
    {/* 바닥 여백도 **포털로 body 끝에** 붙인다.
        ⚠ 예전엔 이 자리(티저 컴포넌트 안)에 그냥 뒀는데, 티저 **뒤에** 결제 시트가 이어지므로
        여백이 시트 앞에 끼어 아무 일도 안 했다 — 맨 끝의 결제 버튼과 「한 번만 결제돼요」가
        고정바에 그대로 덮여 있었다(운영 실측). body 마지막 자식이어야 문서 끝이 밀린다. */}
    {createPortal(<div aria-hidden style={{ height: barH }} />, document.body)}
    {createPortal(
    <div
      ref={(el) => { if (el) setBarH(el.offsetHeight); }}
      // ⚠ world-jiknyeo 를 여기 **다시** 붙인다 — 포털이 body 로 빠져나가서
      //   위저드를 감싼 세계관 래퍼의 토큰을 못 물려받는다(안 붙이면 공용 보라로 나온다).
      // 티저가 밝아졌으니 고정바도 같이 밝다 — 어두운 바가 흰 판 위에 떠 있으면 그 줄만 딴 페이지가 된다.
      // teaser-light 를 같이 붙여 토큰(값=먹색·강조=핑크)이 안에서 그대로 먹게 한다.
      // mx-auto+max-w-md: 포털이 body 로 나가 ChromeGate 폰 기둥 밖이므로 폭을 스스로 죈다
      // (fixed 는 뷰포트 기준 — 안 죄면 PC 에서 이 바만 모니터 전폭으로 뻗는다). 홈 고정 헤더와 같은 공식.
      className={`${dark ? "world-sangun" : "world-jiknyeo teaser-light"} fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center gap-2.5 px-3 py-2.5`}
      style={
        dark
          ? { background: "rgba(10,9,14,0.96)", borderTop: "1px solid var(--gold-line)", boxShadow: "0 -2px 12px rgba(0,0,0,0.5)" }
          : { background: "rgba(255,255,255,0.96)", borderTop: "1px solid var(--gold-line)", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }
      }
    >
      {/* 연도는 안 쓴다 — 바로 위 B2 가 「가장 가까운 건 ○○년 ○월이에요」로 이미 못 박았고, 이 바는 리마인더다. */}
      <span
        className="font-myeongjo min-w-0 flex-1 text-left text-[13px] leading-[1.45]"
        style={{ color: "var(--bone-soft)" }}
      >
        {note}
      </span>
      <button
        type="button"
        onClick={onBuy}
        className="shrink-0 whitespace-nowrap px-3.5 text-[13px] font-bold"
        style={{
          fontFamily: "var(--font-serif-kr), serif",
          background: "var(--gold-bright)",
          color: dark ? "#17120c" : "#ffffff",
          // 탭 타깃 44px — 스크롤 중에 엄지로 누르는 자리라 제일 놓치기 쉽다.
          // 인라인으로 두는 이유: 유틸리티 클래스(min-h-[44px])는 이 버튼에서 실측 20px 로
          // 떨어졌다(2026-09-02 DOM 실측 minHeight:auto). 값이 확실히 서야 하는 자리다.
          minHeight: 44,
        }}
      >
        {buyLabel}
      </button>
    </div>,
    document.body,
    )}
    </>
  );
}

function ConfirmStep({
  form,
  onEdit,
  productName,
  price,
  imm,
  optTone,
  skipped,
}: {
  form: FormState;
  onEdit: (s: number) => void;
  productName: string;
  price: number;
  imm: boolean; // 몰입 상품(산군)은 여기서 가격을 꺼내지 않는다
  optTone: OptionTone; // 손님이 고른 문장을 **고를 때와 같은 말투로** 되보여준다
  skipped: Set<number>; // 이 상품이 안 묻는 질문 — 확인 화면에서도 뺀다
}) {
  const concernAll = [...form.concerns, ...(form.concernText.trim() ? [form.concernText.trim()] : [])];
  const rows: [string, string, number][] = [
    ["이름", form.name || "—", 0],
    ["생년월일", form.birthDate || "—", 1],
    ["출생시각", form.timeUnknown ? "시 모름" : form.birthTime || "—", 2],
    ["성별", form.gender === "male" ? "남성" : form.gender === "female" ? "여성" : "—", 3],
    // 달력은 생년월일 화면이 흡수했으므로 '수정'도 그 화면(1)으로 보낸다
    ["달력", form.calendar === "solar" ? "양력" : form.calendar === "lunar" ? "음력" : "—", 1],
    // 저장값이 아니라 손님이 고른 문장을 그대로 되보여준다
    ["인연 방향", form.partner ? displayOf(PARTNER_OPTIONS, form.partner, optTone) : "—", PARTNER_STEP],
    ["연애 상태", form.relationship ? displayOf(RELATIONSHIP_OPTIONS, form.relationship, optTone) : "—", RELATIONSHIP_STEP],
    ["직업", form.job ? displayOf(JOB_OPTIONS, form.job, optTone) : "—", JOB_STEP],
    ["고민", concernAll.length ? concernAll.join(" · ") : "—", CONCERN_STEP],
  ].filter(([, , s]) => !skipped.has(s as number)) as [string, string, number][]; // 안 물은 질문은 확인 화면에서도 뺀다

  return (
    <div>
      <div className="flex flex-col">
        {rows.map(([k, v, s], i) => (
          <div
            key={i}
            className="flex justify-between items-center gap-3 py-3 border-b border-gold-pale"
          >
            <span className="font-myeongjo text-[13px] text-bone-faint tracking-[0.15em] shrink-0">{k}</span>
            <span className="flex-1 text-right">
              <span className="font-myeongjo text-[13px] text-bone">{v}</span>
              <button
                type="button"
                onClick={() => onEdit(s)}
                // 글자는 11px 그대로 두고 **누를 면적만** 넓힌다(실측 23×17 → 44 이상).
                // 값을 고치려고 온 손님이 제일 놓치기 쉬운 자리인데 화면에서 가장 작았다.
                // -my-3 로 늘어난 높이를 도로 먹여 줄 간격은 그대로 유지한다.
                className="-my-3 ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center font-myeongjo text-[11px] text-gold tracking-[0.15em] underline underline-offset-2"
              >
                수정
              </button>
            </span>
          </div>
        ))}
      </div>

      {/* 몰입 상품(산군)에서는 가격을 여기서 꺼내지 않는다.
          타이트 실측: 게이트·입력 어디에도 가격이 없고 티저를 다 보여준 뒤 결제 시트에서 처음 나온다.
          우리는 게이트에서 뺐는데 확인 화면에서 다시 꺼내고 있었다 — 앞뒤가 안 맞고,
          무료 티저를 보기도 전에 지갑을 떠올리게 하면 여기가 이탈 지점이 된다. */}
      {!imm && (
        <div className="mt-[18px] px-4 py-3.5 bg-gold-pale border border-gold-pale flex justify-between items-center">
          <span className="font-myeongjo text-[15px] text-bone font-semibold">{productName}</span>
          <span className="font-serif text-[19px] font-bold text-gold-bright">{formatKRW(price)}</span>
        </div>
      )}

      <p className="font-myeongjo mt-3 text-center text-[11px] text-bone-faint tracking-[0.06em]">
        적어주신 정보는 사주 계산과 결과지 만드는 데만 사용됩니다.
      </p>
    </div>
  );
}
