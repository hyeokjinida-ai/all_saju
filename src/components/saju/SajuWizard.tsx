"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { SajuTeaser } from "@/lib/saju/teaser";
import type { PartnerFace } from "@/lib/saju/partner-face";
import type { ResultView } from "@/lib/saju/result-view";
import { WebtoonPage, type WebtoonCutData } from "@/components/webtoon/WebtoonPage";
import { tag, displayOf, PROFILE_KEYS, PARTNER_OPTIONS, RELATIONSHIP_OPTIONS, JOB_OPTIONS } from "@/lib/saju/profile-tags";
import { BgMedia } from "@/components/products/BgMedia";
import { INK_CENTERLINE, INK_STROKE } from "@/components/saju/ink-circle-path";

// 티저에 띄우는 원국 4기둥 — /api/saju/chart 의 view.pillars 그대로.
type Pillar = ResultView["pillars"][number];

// 기둥 수 → 글자 수를 한글로. 시 모름(3기둥)이면 "여섯 글자"다.
const GLYPH_COUNT: Record<number, string> = { 1: "두", 2: "네", 3: "여섯", 4: "여덟" };

type Gender = "male" | "female";
type Calendar = "solar" | "lunar";

// 단일 상품 직접 구매 위저드 — 입력을 모아 바로 주문을 생성한다.
type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
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
  "inyeon-saju": [
    "아직 만나는 사람이 없어요",
    "썸·짝사랑 중이에요",
    "사귀는 사람이 있어요",
    "결혼 시기가 궁금해요",
    "최근에 헤어졌어요",
    "일하느라 연애가 밀려요",
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
const STEPS: { hanja: string; q: string; help: string; optional?: boolean }[] = [
  { hanja: "名", q: "어떻게 불러드릴까요?", help: "결과지에 표시될 이름입니다 (선택)", optional: true },
  { hanja: "生", q: "언제 태어나셨나요?", help: "양력·음력도 함께 골라주세요" },
  { hanja: "時", q: "태어난 시각을 아시나요?", help: "시각을 알면 더 정밀한 풀이가 가능합니다" },
  { hanja: "性", q: "성별을 선택해 주세요", help: "운의 흐름 방향을 정하는 데 쓰입니다" },
  // 질문 안에 '남자/여자'를 넣는다 — 선택지를 보고 나서 "내 성별인가? 상대 성별인가?" 되짚으면 안 된다.
  // 바로 앞이 성별 질문이라 더 헷갈린다.
  { hanja: "緣", q: "마음이 가는 쪽은 남자인가요, 여자인가요?", help: "짝을 보는 자리가 이 답으로 달라집니다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나요?", help: "인연 풀이를 지금 상황에 맞춰드립니다 (선택)", optional: true },
  { hanja: "業", q: "무슨 일을 하고 계신가요?", help: "일·돈 풀이를 상황에 맞춰드립니다 (선택)", optional: true },
  { hanja: "惑", q: "요즘 가장 마음 쓰이는 건?", help: "복수 선택 가능 · 이 흐름을 먼저 살펴드립니다" },
  { hanja: "覽", q: "입력하신 정보를 확인해 주세요", help: "" },
  { hanja: "兆", q: "사주를 먼저 읽어봤어요", help: "여기까지는 무료예요" },
];

// 산군(신점) 전용 반말 카피 — 단계 구성·인덱스는 공용과 동일(로직 무변경), 말만 갈아끼운다.
// 사극 어미(~하거라/~느냐)는 쓰지 않는다. 경쟁사(청월당·타이트) 둘 다 현대 하대체를 쓴다.
const STEPS_SANGUN: typeof STEPS = [
  { hanja: "名", q: "이름이 뭐냐", help: "장부에 적을 이름이다 (안 적어도 된다)", optional: true },
  { hanja: "生", q: "언제 태어났냐", help: "양력인지 음력인지도 같이 골라라" },
  { hanja: "時", q: "태어난 시각은 아나", help: "알면 더 깊이 본다 — 모르면 모른다 해도 된다" },
  { hanja: "性", q: "성별은", help: "남녀가 운의 흐름을 읽는 방향이 다르다" },
  { hanja: "緣", q: "마음이 가는 쪽이 남자냐, 여자냐", help: "장부에서 네 짝을 찾는 자리가 달라진다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나", help: "있으면 그 자리부터 본다 (없으면 그냥 넘겨라)", optional: true },
  { hanja: "業", q: "무엇으로 먹고사나", help: "네가 하는 일에 맞춰 돈 얘기를 한다 (넘겨도 된다)", optional: true },
  { hanja: "惑", q: "따로 묻고 싶은 게 있나", help: "적으면 그 물음부터 정면으로 답해준다 — 없으면 그냥 다음" },
  { hanja: "覽", q: "이대로 네 장부를 찾겠다", help: "" },
  // "겉장만 펴봤다"는 겉장이 뭔지 한 번 되짚게 만들었다(형님 지적 — 버튼과 같은 병).
  // 스토리에서 이미 한 말("네 장부, 내가 먼저 봤다")을 받아 해독이 필요 없는 문장으로.
  { hanja: "兆", q: "네 장부, 다 읽고 왔다", help: "여기까지는 공짜로 보여주마" },
];

const STEPS_BY_SLUG: Record<string, typeof STEPS> = {
  "sangun-sinjeom": STEPS_SANGUN,
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
  isLoggedIn = false,
  initialConcerns,
  webtoonCuts = [],
  variant,
  bgImage,
  bgVideo,
}: Props) {
  const imm = variant === "immersive";
  const router = useRouter();
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
  const [form, setForm] = useState<FormState>({
    name: "",
    birthDate: "",
    birthTime: "",
    timeUnknown: false,
    gender: "",
    calendar: "",
    partner: "",
    relationship: "",
    job: "",
    concerns: (initialConcerns ?? []).filter((c) => concernOptions.includes(c)),
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
      void loadTeaser();
      return;
    }
    setStep((s) => {
      let n = s + 1;
      while (n < TOTAL - 1 && skipped.has(n)) n++; // 이 상품이 안 묻는 질문은 건너뛴다
      return Math.min(n, TOTAL - 1);
    });
  }, [step, loadTeaser, skipped]);
  const prev = () =>
    setStep((s) => {
      let p = s - 1;
      while (p > 0 && skipped.has(p)) p--;
      return Math.max(0, p);
    });

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
          productId,
          ...payload(),
          email: isLoggedIn ? undefined : guestEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "주문 생성 실패");
      track("begin_checkout", { slug: productSlug, value: price, currency: "KRW" });
      router.push(`/checkout/${json.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
      setSubmitting(false);
    }
  }

  const cur = steps[step];

  return (
    <div
      // world-sangun: 공용 --gold-*/--bone-* 토큰이 자수정 보라값이라, 이 클래스로 신당 색을 덮는다.
      // (안 덮으면 손님 이름·원국 한자 같은 핵심이 보라로 나온다 — globals.css 주석 참고)
      className={
        imm
          ? "world-sangun wizard-immersive relative flex w-full flex-col overflow-hidden"
          : "scene-cosmos relative overflow-hidden rounded-md border border-gold-line min-h-[560px] flex flex-col"
      }
      style={imm ? { background: "#0a090e", minHeight: "100svh" } : undefined}
    >
      {imm ? (
        <>
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
        </>
      ) : (
        <div className="starfield opacity-30" />
      )}

      {/* 상단: 이전 + 진행률 + N/7 (몰입형은 스테이지 상단 바 아래로 여백 확보) */}
      <div className={`relative z-[2] w-full max-w-[560px] mx-auto px-5 ${imm ? "pt-14" : "pt-5"}`}>
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
                          : "rgba(150,90,255,0.2)",
                  boxShadow: i === step ? "0 0 8px rgba(232,200,120,0.6)" : "none",
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
            {step === TEASER_STEP && teaserLoading ? (imm ? "네 장부를 찾는 중이다" : "명식을 계산하고 있어요") : cur.q}
          </p>
          {cur.help && !(step === TEASER_STEP && teaserLoading) && (
            <p className="font-myeongjo mt-3 text-[13px] text-bone-soft tracking-[0.06em]">{cur.help}</p>
          )}
        </div>

        {/* STEP 0 — 이름 */}
        {step === 0 && (
          <input
            autoFocus
            className="ap-input text-center"
            type="text"
            placeholder="홍길동"
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
              태어난 시각을 몰라요
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
                      {imm ? o.ban : o.label}
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
                    {imm ? o.ban : o.label}
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
                    {imm ? o.ban : o.label}
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

        {/* STEP 8 — 확인 */}
        {step === CONFIRM_STEP && (
          <ConfirmStep form={form} onEdit={setStep} productName={productName} price={price} imm={imm} skipped={skipped} />
        )}

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
          />
        )}
      </div>

      {/* 하단 고정 버튼 — 장부를 찾는 동안은 통째로 감춘다.
          타이트 실측: 로딩 화면에 결제 요소가 하나도 없고, 티저를 다 보여준 뒤에 값이 처음 나온다.
          우리는 확인 화면에서 값을 뺐는데 로딩 중에 결제 버튼과 이메일 입력이 그대로 떠 있어
          "무료로 먼저 보기"를 누른 손님이 티저를 보기도 전에 19,900원을 먼저 봤다. */}
      <div className="relative z-[2] w-full max-w-[560px] mx-auto px-5 pb-7">
        {teaserLoading ? null : step < TOTAL - 1 ? (
          <>
            <button
              type="button"
              onClick={next}
              disabled={!canNext() || (step === CONFIRM_STEP && teaserLoading)}
              className="w-full min-h-[56px] border-none font-bold text-[17px] tracking-[0.22em] disabled:cursor-default"
              style={{
                fontFamily: "var(--font-serif-kr), serif",
                background: canNext()
                  ? imm
                    ? "linear-gradient(135deg,#efe6d2,#e8c96a 60%,#a9861f)"
                    : "linear-gradient(180deg,#ffffff,#f1eaff)"
                  : imm
                    ? "rgba(232,201,106,0.12)"
                    : "rgba(150,90,255,0.15)",
                color: canNext() ? (imm ? "#241a08" : "var(--wine-deep)") : "var(--bone-faint)",
                boxShadow: canNext()
                  ? imm
                    ? "0 8px 26px rgba(201,162,39,0.35)"
                    : "0 0 24px rgba(150,90,255,0.28)"
                  : "none",
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
        ) : isLoggedIn ? (
          <button
            type="button"
            onClick={createOrder}
            disabled={submitting}
            className="w-full min-h-[58px] border-none font-bold text-[17px] tracking-[0.15em] flex items-center justify-center gap-3 disabled:opacity-70"
            style={{
              fontFamily: "var(--font-serif-kr), serif",
              background: imm
                ? "linear-gradient(135deg,#efe6d2,#e8c96a 60%,#a9861f)"
                : "linear-gradient(180deg,#ffffff,#f1eaff)",
              color: imm ? "#241a08" : "var(--wine-deep)",
              boxShadow: imm ? "0 8px 26px rgba(201,162,39,0.35)" : "0 0 24px rgba(150,90,255,0.3)",
            }}
          >
            {submitting
              ? "주문 생성 중…"
              : imm
                ? `${formatKRW(Math.max(0, price - 1900))} 내고 장부 전체 열기`
                : `${formatKRW(Math.max(0, price - 1900))} 결제하러 가기 (회원 할인 적용)`}
            {!submitting && <span className="font-brush text-[19px]" style={{ color: imm ? "#241a08" : "var(--wine-deep)" }}>受</span>}
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
                background: imm
                  ? "linear-gradient(135deg,#efe6d2,#e8c96a 60%,#a9861f)"
                  : "linear-gradient(180deg,#ffffff,#f1eaff)",
                color: imm ? "#241a08" : "var(--wine-deep)",
                boxShadow: imm ? "0 8px 26px rgba(201,162,39,0.35)" : "0 0 24px rgba(150,90,255,0.28)",
              }}
            >
              {/* '복채'는 뺐다 — 모의구매 5/6이 "돈 내는 게 아니라 갖다 바치는 걸로 들린다"고 했다.
                산군은 끝까지 반말이되 돈 얘기만 평범한 한국어로 내려온다. */}
            {submitting
                ? "주문 생성 중…"
                : imm
                  ? `${formatKRW(price)} 내고 장부 전체 열기`
                  : `${formatKRW(price)} 결제하고 전체 보기`}
            </button>
            {/* 카카오 로그인 넛지는 제거했다 — provider 가 아직 안 열려서, 누르면 고객에게
                "(관리자: Supabase에서 Kakao 활성화 필요)" 토스트가 그대로 떴다. 게다가 4050 은
                19,900 보다 할인가 18,000 을 먼저 누른다 = 결제 의사가 가장 높은 사람만 골라
                에러를 보여주고 내보내는 구조였다. 개통되면 이 자리에 되살린다. */}
            <p className="text-[11px] text-bone-faint text-center">
              {imm
                ? "한 번만 받는다. 다달이 빠져나가는 것이 아니다."
                : "한 번만 결제돼요. 매달 빠져나가지 않아요."}
            </p>
          </div>
        )}
        {imm && (
          <p className="mt-3 text-center text-[11px]" style={{ color: "#5b6274" }}>
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

/** 산군 대사 띠 — 스토리 화면의 대사창(SangunWebtoon Bubble)과 같은 옷.
 *  타이트 티저 실측(22단계)의 정체는 "모든 블록을 캐릭터가 대사로 소개한 뒤에 보여준다"였다.
 *  우리는 웹툰 5컷이 끝나면 산군이 화면에서 사라졌다 — 이 띠가 블록 사이의 연결 조직이다.
 *
 *  ⚠ **한 마디만 담는다.** 문단을 여럿 넣으면 띠가 아니라 문서 카드가 되고, 밝은 크림색 박스가
 *  화면을 먹어 검정+금 신당 세계관이 결제 직전에서 하얗게 깨진다(형님 지적, 내 오판 두 번).
 *  긴 글은 판(LedgerPanel)에, 짧은 대사는 컷 위(CutSay)나 이 띠에. 그릇을 섞지 않는다. */
function SangunSay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mt-6 rounded-[5px] px-5 py-4"
      style={{
        background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
        border: "1px solid #c9b98e",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45), inset 0 0 34px rgba(216,201,163,0.35)",
      }}
    >
      <span
        className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
        style={{ background: "#8f2b1e", color: "#f3e6cf" }}
      >
        산군
      </span>
      <p className="font-myeongjo text-[15px] font-semibold leading-[1.75] text-[#241d10]">{children}</p>
    </div>
  );
}

/**
 * 장부 판 — 산군이 장부에서 읽어 옮긴 긴 글(콜드리딩).
 * 대사 띠와 **다른 그릇**이어야 한다: 띠는 한 마디, 판은 기록.
 * 앞서 한 번 실패한 이유는 판이 틀려서가 아니라 배경(ganji.webp)이 너무 어두워 안 보였기 때문 —
 * 왼쪽에 붉은 괘선을 세우고 테두리를 올려 "펴 놓은 장부 한 쪽"으로 읽히게 한다.
 */
function LedgerPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mt-6 py-5 pl-6 pr-5"
      style={{
        background:
          "linear-gradient(180deg,rgba(26,20,14,0.92),rgba(14,11,8,0.96)), url(/products/sangun/ganji.webp) center/cover",
        border: "1px solid rgba(232,201,106,0.34)",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* 장부 괘선 — 세로 붉은 줄 하나로 "적힌 것"이라는 신호를 준다 */}
      <span
        aria-hidden
        className="absolute inset-y-4 left-3 w-px"
        style={{ background: "linear-gradient(180deg,transparent,rgba(143,43,30,0.85),transparent)" }}
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
function CutSay({ at, children }: { at: "top" | "bottom"; children: React.ReactNode }) {
  return (
    <div className={`absolute inset-x-4 ${at === "top" ? "top-4" : "bottom-4"} z-10`}>
      <div
        className="relative rounded-[5px] px-4 py-3"
        style={{
          // 반투명 한지 — 사진이 비쳐 보여야 "그 장면 안의 말"이 된다
          background: "linear-gradient(180deg,rgba(243,234,214,0.94),rgba(233,222,194,0.92))",
          border: "1px solid rgba(201,185,142,0.8)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
      >
        <span
          className="absolute -top-2.5 right-2.5 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
          style={{ background: "#8f2b1e", color: "#f3e6cf" }}
        >
          산군
        </span>
        <p className="font-myeongjo text-[15px] font-semibold leading-[1.75] text-[#241d10]">{children}</p>
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
}) {
  return (
    // 컷을 감싼 패딩 두 겹(위저드 px-5=20 + 티저 본문 판 16)을 되물려 컬럼 끝까지 채운다.
    // 음수 마진 36px = 20+16. 판 패딩을 바꾸면 여기도 같이 바꿔야 한다(안 그러면 여백이 남는다).
    <div
      className={`relative -mx-9 mt-6 overflow-hidden ${tall ? "" : CUT_H[size]}`}
      style={tall ? { aspectRatio: "4 / 5" } : undefined}
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
      {say && <CutSay at={sayAt}>{say}</CutSay>}
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
    <div
      className="mx-auto mt-4 max-w-[280px] px-5 pb-5 pt-4"
      style={{
        backgroundImage: "url(/products/sangun/ganji.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0c0a08",
        border: "1px solid rgba(143,43,30,0.6)",
      }}
    >
      <p className="font-myeongjo text-center text-[11px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
        네 운명의 상대
      </p>
      <div className="relative mx-auto mt-3 h-[150px] w-[118px] overflow-hidden" style={{ background: "#151009" }}>
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face.src}
            alt=""
            onError={() => setImgOk(false)}
            className="h-full w-full select-none object-cover"
            draggable={false}
            style={{ filter: "blur(10px) brightness(0.85)" }}
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
      <div className="mt-3.5 space-y-2">
        {(
          [
            ["만나는 시기", <InkMask key="t" text="20▓▓년 ▓▓월" />],
            ["외모", <span key="l" className="inline-flex items-center gap-1">키가 <InkMask text="▓▓▓" /></span>],
            ["성격", <InkMask key="p" text="▓▓▓▓" />],
            ["장소", <InkMask key="w" text="▓▓▓▓" />],
          ] as const
        ).map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="font-myeongjo shrink-0 text-[11px] text-bone-faint">{label}</span>
            <span className="font-myeongjo text-[13px] text-bone-soft">{val}</span>
          </div>
        ))}
      </div>
      {/* 얼굴을 고른 근거. 가리지 않는 유일한 값이라 "아무 사진이나 띄웠다"는 의심을 여기서 끊는다. */}
      <p className="font-myeongjo mt-3.5 text-center text-[10px] leading-[1.6] text-bone-faint">
        네 배우자 자리는 <span style={{ color: "var(--gold-soft)" }}>{face.ohKo}</span>의 결 — 그 결로 얼굴을 골랐다
      </p>
    </div>
  );
}

/** 오행 → 한자 칸 바탕색.
 *  타이트는 오행을 금·빨강·초록 원색 카드로 칠한다. 우리는 먹+금 세계관이라 그대로 쓰면
 *  배경 사진(촛불·놋쇠의 호박색)과 UI 가 따로 논다 — 색상만 빌리고 채도를 낮춰 은은하게 깐다.
 *  글자는 금색을 유지해 신당 톤을 지킨다. */
const ELEMENT_TINT: Record<string, string> = {
  wood: "rgba(96,150,116,0.20)",
  fire: "rgba(160,54,38,0.26)",
  earth: "rgba(232,201,106,0.15)",
  metal: "rgba(198,204,212,0.14)",
  water: "rgba(96,118,168,0.22)",
};

/** 원국 한 판 — 한자·십성·기운을 기둥별 세로줄로 세운다.
 *
 *  실측(2026-08-06)으로 배운 것: 한자 카드와 십성 표를 따로 두면 「비견·겁재·묘」가
 *  어느 글자 얘긴지 연결이 끊긴다. 타이트는 글자 바로 위아래에 십성을 붙여 눈으로 잇는다.
 *
 *      해      달      나      ← 기둥
 *     비견    겁재  나 자신    ← 천간이 무슨 자리인지
 *     [甲]    [己]    [戊]     ← 천간 (오행 바탕)
 *     [戌]    [巳]    [午]     ← 지지 (오행 바탕)
 *     갑술    기사    무오     ← 한글 읽기
 *     비견    편인    정인     ← 지지가 무슨 자리인지
 *   ─────────────────
 *      묘     건록    제왕     ← 12운성
 *
 *  rows(십성·기운)는 없을 수 있다(티저 생성 실패). 그때도 한자 판은 서야 하므로 빈칸으로 둔다. */
function PillarChart({ shown, rows }: { shown: Pillar[]; rows: { pos: string; ganSip: string; jiSip: string; fortune: string }[] }) {
  if (shown.length === 0) return null;
  // shown 은 년→월→일(→시), rows 도 같은 순서로 만들어진다(teaser.ts buildChartRows).
  // 시 모름일 때 거르는 조건이 서로 달라 길이가 어긋날 수 있으므로 인덱스로만 조심해서 집는다.
  const cols = shown.map((p, i) => ({ p, r: rows[i] }));
  const hasMeta = rows.length > 0;
  const grid = { display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` } as const;

  const Glyph = ({ char, element, isDay }: { char: string; element: string; isDay?: boolean }) => (
    <span
      className="font-brush block py-1.5 text-[26px] leading-none text-gold-bright"
      style={{
        background: ELEMENT_TINT[element] ?? "rgba(255,255,255,0.035)",
        border: `1px solid ${isDay ? "var(--gold)" : "var(--gold-pale)"}`,
      }}
    >
      {char}
    </span>
  );

  return (
    <div className="mt-2.5 border border-gold-pale px-2 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div style={grid} className="gap-x-1.5 gap-y-1 text-center">
        {/* 기둥 이름 — 일주는 "나" 라서 내가 어디인지 바로 보인다(타이트의 「일간(나)」와 같은 자리) */}
        {cols.map(({ p, r }, i) => (
          <span key={`pos-${i}`} className="font-myeongjo text-[11px]" style={{ color: p.isDay ? "var(--gold-bright)" : "var(--gold-soft)" }}>
            {r?.pos ?? "—"}
          </span>
        ))}
        {hasMeta &&
          cols.map(({ r }, i) => (
            <span key={`gs-${i}`} className="font-myeongjo text-[13px] text-bone-soft">{r?.ganSip || "—"}</span>
          ))}
        {cols.map(({ p }, i) => (
          <Glyph key={`g-${i}`} char={p.gan.char} element={p.gan.element} isDay={p.isDay} />
        ))}
        {cols.map(({ p }, i) => (
          <Glyph key={`j-${i}`} char={p.ji.char} element={p.ji.element} isDay={p.isDay} />
        ))}
        {cols.map(({ p }, i) => (
          <span key={`r-${i}`} className="font-myeongjo text-[11px] text-bone-faint">
            {p.gan.read}
            {p.ji.read}
          </span>
        ))}
        {hasMeta &&
          cols.map(({ r }, i) => (
            <span key={`js-${i}`} className="font-myeongjo text-[13px] text-bone-soft">{r?.jiSip || "—"}</span>
          ))}
        {hasMeta && (
          <>
            {/* 구분선은 표 전체 폭으로 한 번만 — 기운은 글자가 아니라 그 자리의 세기라 성격이 다르다 */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--gold-pale)", marginTop: 4 }} />
            {cols.map(({ r }, i) => (
              <span key={`f-${i}`} className="font-myeongjo text-[13px]" style={{ color: "var(--gold-soft)" }}>
                {r?.fortune || "—"}
              </span>
            ))}
          </>
        )}
      </div>
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
}) {
  if (loading) {
    return (
      <div className="py-8 text-center">
        <span className="font-brush animate-pulse block text-[44px] leading-none text-gold-bright">命</span>
        <p className="font-myeongjo mt-5 text-[13px] text-bone-soft tracking-[0.06em]">
          {imm ? "만세력에서 네 여덟 글자를 꺼내는 중이다…" : "만세력에서 여덟 글자를 꺼내는 중이에요…"}
        </p>
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
  const webtoon = cuts.length > 0 && Object.keys(tokens).length > 0
    ? <WebtoonPage cuts={cuts} tokens={tokens} className="mb-4 overflow-hidden rounded-[2px]" />
    : null;

  return (
    <>
    {webtoon}
    {/* 티저는 "펴놓은 장부" 한 장으로 앉힌다. 배경에 박수 사진이 opacity .7 로 깔려 있어서
        글자만 얹으면 얼굴·촛불 무늬가 표와 문장 사이로 비쳐 읽기가 힘들어진다.
        사진은 판 바깥으로만 보이게 두면 몰입은 유지되면서 본문은 종이처럼 읽힌다. */}
    <div
      style={
        imm
          ? {
              background: "rgba(7,6,9,0.86)",
              border: "1px solid var(--gold-pale)",
              padding: "18px 16px",
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

      {/* 헤더가 이미 headline 을 말하므로 여기선 이름만(있을 때) */}
      {name && (
        <p className={`font-myeongjo text-center text-[13px] text-gold-soft tracking-[0.15em]${imm ? " mt-4" : ""}`}>{name}</p>
      )}

      {/* 원국 4기둥 — 콜드리딩보다 먼저. "네 생일로 계산했다"는 증거가 먼저 서야 아래 세 줄이 산다.
          표시 순서는 읽기 쉬운 년→월→일→시(view.pillars 는 시→일→월→년이라 뒤집는다). */}
      {shown.length > 0 && (
        <div className={name ? "mt-3" : ""}>
          {birthDate && (
            <p className="font-myeongjo text-center text-[11px] text-bone-faint tracking-[0.06em]">
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
          <p className="font-myeongjo mt-3 text-center text-[13px] leading-[1.75] text-bone-soft">
            {imm
              ? "아래는 네 이름도, 네 물음도 쓰지 않았다. 이 글자에서만 나왔다."
              : "아래는 이름도, 적어주신 물음도 쓰지 않았어요. 이 글자에서만 나왔고요."}
          </p>

          {/* 신살 — 11px 배지는 원국 판 옆에서 읽히지도 않고 뭔지도 몰랐다.
              13px 로 키우고, 무엇의 목록인지 한 줄 얹는다(타이트는 이걸 표 맨 아랫줄에 넣는다). */}
          {teaser && teaser.sinsal.length > 0 && (
            <div className="mt-3">
              <p className="font-myeongjo text-center text-[11px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
                {imm ? "네 글자에 붙어 있는 것" : "글자에 붙어 있는 것"}
              </p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                {teaser.sinsal.map((s) => (
                  <span
                    key={s}
                    className="font-myeongjo px-3 py-1.5 text-[13px]"
                    style={{ border: "1px solid var(--gold-line)", background: "rgba(232,201,106,0.08)", color: "var(--gold-bright)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* 못 읽는 게 정상이라고 먼저 말해준다 — 안 그러면 "나만 모르나" 부끄러움이 이탈이 된다 */}
          {teaser && teaser.chartRows.length > 0 && (
            <p className="font-myeongjo mt-2.5 text-center text-[11px] leading-[1.75] text-bone-faint">
              {imm
                ? "읽을 줄 몰라도 된다. 이것이 네 장부의 원본이고, 아래 말은 전부 여기서 나왔다."
                : "읽을 줄 모르셔도 돼요. 이게 장부의 원본이고, 아래 말은 전부 여기서 나왔어요."}
            </p>
          )}
        </div>
      )}

      {/* 정면 컷: 몸을 앞으로 기울여 손님을 읽는다(발주 t2) — 티저에서 산군이 얼굴을 드는 첫 순간.
          대사는 아래 콜드리딩 띠 안에 합쳐 넣는다(따로 띠를 세우면 띠 3개가 연속으로 쌓인다). */}
      {imm && teaser && (
        <TeaserCut
          src="/products/sangun/t2-read.webp"
          alt="탁자 너머로 고개를 숙이고 마주 앉은 산군"
          tall
          sayAt="bottom"
          say={<>너한테는 아무것도 안 물었다.<br />그런데 보이는군.</>}
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
              산군이 직접 거는 승부라 대사 띠로 세운다(몰입 상품에서만). */}
          {teaser.judgeInvite &&
            (imm ? (
              <SangunSay>{teaser.judgeInvite}</SangunSay>
            ) : (
              <p className="font-myeongjo mt-3 text-[13px] leading-[1.75] text-bone-faint">{teaser.judgeInvite}</p>
            ))}
        </>
      )}

      {/* 財·緣 — 타이트의 「財物」「戀愛」 자리. 값을 읽다가 스스로 끊는다(말풍선 마스킹).
          달 마스킹이 "몇 월인지 짚는다" 포지션을 목차보다 먼저 스토리로 흘린다. */}
      {imm && teaser && (
        <>
          {/* 부채를 접는 손 — 공기가 바뀌는 순간(발주 t3). 뜸들이기("…다만")는 결정적인 자리에만. */}
          <TeaserCut
            src="/products/sangun/t3-snap.webp"
            alt="부채를 접어 쥔 손"
            tall
            sayAt="top"
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
      {teaser?.turningYear && (
        <div
          className="mt-4 px-4 py-5 text-center"
          style={{ background: "rgba(143,43,30,0.10)", border: "1px solid rgba(143,43,30,0.55)" }}
        >
          <p className="font-myeongjo text-[11px] tracking-[0.15em]" style={{ color: "rgba(216,140,120,0.85)" }}>
            장부에 붉게 표시된 해
          </p>
          {/* 좌우 여백(px-6)은 장식이 아니라 필수다 — 붓이 글자 **바깥**을 돌아야 동그라미로 읽힌다.
              좁히면 획이 숫자를 파고들어 취소선처럼 보인다(실측에서 2와 년이 잘렸다). */}
          <span className="relative mt-2 inline-block px-6 py-2">
            <p className="font-serif text-[30px] font-bold leading-none" style={{ color: "#e8695a" }}>
              {teaser.turningYear.year}년
            </p>
            {/* 먹으로 친 동그라미 — 선이 아니라 굵기가 변하는 도형이다(ink-circle-path.ts 참고).
                마스크가 중심선을 따라 훑으며 획을 드러내서 "지금 붓이 지나간다"가 된다.
                pathLength=1 로 정규화 — 경로를 고쳐도 CSS(dasharray 1)는 그대로 맞는다. */}
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
                    className="ink-circle"
                    pathLength={1}
                    d={INK_CENTERLINE}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                </mask>
                {/* 먹의 농담 — 붓을 댄 쪽이 짙고, 들어올리는 끝이 옅다 */}
                <linearGradient id="ink-tone" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b0301d" />
                  <stop offset="42%" stopColor="#d24430" />
                  <stop offset="100%" stopColor="#8f2b1e" />
                </linearGradient>
              </defs>
              {/* 번짐 — 종이에 먹이 스민 자국. 본획보다 먼저 깔린다 */}
              <path
                d={INK_STROKE}
                fill="#8f2b1e"
                opacity={0.45}
                mask="url(#ink-reveal)"
                style={{ filter: "blur(1.1px)" }}
              />
              <path d={INK_STROKE} fill="url(#ink-tone)" mask="url(#ink-reveal)" />
            </svg>
          </span>
          <p className="font-myeongjo mt-3 text-[13px] leading-[1.75] text-bone">{teaser.turningYear.line}</p>
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
              say={<>이제 복채 얘기를 하자.</>}
            />
          )}
          {teaser.chapters.length > 0 ? (
            /* 4章 카드 — 타이트 목차 실측을 부품 단위로 옮긴 것.
               간지 배너(붉은 박스) + 등급 태그 + 도발 부제 + 불릿의 회색→굵은흰색 명암.
               배경은 형님이 뽑은 먹 한지 + 붉은 잉크판 텍스처(ganji.webp) — 타이트의 붉은 잉크판 대응. */
            <div className="mt-4">
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
            /* 존댓말 상품은 기존 잠긴 줄 유지 */
            <div className="mt-4">
              {teaser.locked.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-gold-pale py-2.5">
                  <span className="font-myeongjo text-[13px] text-bone-soft tracking-[0.06em]">{row.label}</span>
                  <span className="font-mono text-[13px] tracking-[0.15em]" style={{ color: "rgba(232,201,106,0.42)" }}>
                    {row.mask}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 결제 직전 마지막 한 마디.
              타이트 대조에서 배운 것: 그들은 밑밥("눈 앞에 선하게 펼쳐지도록 말해줄 수 있어")을
              작게 깔고 펀치("적나라하게 말이야")만 크게·붉게 세운다. 우리는 두 줄이 같은 무게라
              눈이 멈출 곳이 없었다 → 두 박자로 끊고 뒷줄만 키운다.
              말은 평소 쓰는 말로만: "하라·말라"(명령형 인용)·"못 박아 뒀다"(관용어)는 한 박자
              해석이 걸린다(형님 지적) → "해야 할 것 / 하면 안 되는 것 / 적어 뒀다".
              손해 회피가 이득 추구보다 세게 움직이므로 뒷줄에 금지를 둔다.
              "날짜까지"는 타이트가 구조적으로 못 하는 지점이다(그들 26,198자 중 달 언급 1회). */}
          {productSlug === "sangun-sinjeom" && (
            <div className="mt-5 text-center">
              <p className="font-myeongjo text-[13px] leading-[1.75]" style={{ color: "var(--bone-faint)" }}>
                눈앞에 펼쳐 놓고 말해주마
              </p>
              <p
                className="font-myeongjo mt-3 text-[19px] font-bold leading-[1.5]"
                style={{ color: "#f3ead6" }}
              >
                해야 할 것과
                <br />
                <span style={{ color: "#d8563f" }}>하면 안 되는 것</span>을
                <br />
                날짜까지 적어 뒀다
              </p>
            </div>
          )}

          <p className="font-myeongjo mt-3.5 text-center text-[11px] text-bone-faint tracking-[0.06em]">
            {teaser.note}
          </p>
        </>
      )}
    </div>
    </>
  );
}

function ConfirmStep({
  form,
  onEdit,
  productName,
  price,
  imm,
  skipped,
}: {
  form: FormState;
  onEdit: (s: number) => void;
  productName: string;
  price: number;
  imm: boolean; // 산군(반말)이면 선택지 문장도 반말로 되보여준다
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
    ["인연 방향", form.partner ? displayOf(PARTNER_OPTIONS, form.partner, imm) : "—", PARTNER_STEP],
    ["연애 상태", form.relationship ? displayOf(RELATIONSHIP_OPTIONS, form.relationship, imm) : "—", RELATIONSHIP_STEP],
    ["직업", form.job ? displayOf(JOB_OPTIONS, form.job, imm) : "—", JOB_STEP],
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
                className="ml-2.5 font-myeongjo text-[11px] text-gold tracking-[0.15em] underline underline-offset-2"
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
