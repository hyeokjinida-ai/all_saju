"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { SajuTeaser } from "@/lib/saju/teaser";
import type { ResultView } from "@/lib/saju/result-view";
import { WebtoonPage, type WebtoonCutData } from "@/components/webtoon/WebtoonPage";
import { tag, displayOf, PROFILE_KEYS, PARTNER_OPTIONS, RELATIONSHIP_OPTIONS, JOB_OPTIONS } from "@/lib/saju/profile-tags";
import { BgMedia } from "@/components/products/BgMedia";

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
  { hanja: "緣", q: "인연은 어느 쪽으로 보실까요?", help: "이 답으로 인연 풀이의 기준이 달라집니다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나요?", help: "인연 풀이를 지금 상황에 맞춰드립니다 (선택)", optional: true },
  { hanja: "業", q: "무슨 일을 하고 계신가요?", help: "일·돈 풀이를 상황에 맞춰드립니다 (선택)", optional: true },
  { hanja: "惑", q: "요즘 가장 마음 쓰이는 건?", help: "복수 선택 가능 · 이 흐름을 먼저 살펴드립니다" },
  { hanja: "覽", q: "입력하신 정보를 확인해 주세요", help: "" },
  { hanja: "兆", q: "겉장만 먼저 펼쳐봤어요", help: "여기까지는 무료예요" },
];

// 산군(신점) 전용 반말 카피 — 단계 구성·인덱스는 공용과 동일(로직 무변경), 말만 갈아끼운다.
// 사극 어미(~하거라/~느냐)는 쓰지 않는다. 경쟁사(청월당·타이트) 둘 다 현대 하대체를 쓴다.
const STEPS_SANGUN: typeof STEPS = [
  { hanja: "名", q: "이름이 뭐냐", help: "장부에 적을 이름이다 (안 적어도 된다)", optional: true },
  { hanja: "生", q: "언제 태어났냐", help: "양력인지 음력인지도 같이 골라라" },
  { hanja: "時", q: "태어난 시각은 아나", help: "알면 더 깊이 본다 — 모르면 모른다 해도 된다" },
  { hanja: "性", q: "성별은", help: "기운의 방향이 여기서 갈린다" },
  { hanja: "緣", q: "네 인연은 어느 쪽에 적혀 있냐", help: "장부에서 볼 자리가 여기서 갈린다" },
  { hanja: "伴", q: "지금 곁에 사람이 있나", help: "있으면 그 자리부터 본다 (없으면 그냥 넘겨라)", optional: true },
  { hanja: "業", q: "무엇으로 먹고사나", help: "일과 돈을 그 자리에 맞춰 본다 (넘겨도 된다)", optional: true },
  { hanja: "惑", q: "따로 묻고 싶은 게 있나", help: "적으면 그 물음부터 정면으로 답해준다 — 없으면 그냥 다음" },
  { hanja: "覽", q: "이대로 네 장부를 찾겠다", help: "" },
  { hanja: "兆", q: "네 장부, 겉장만 펴봤다", help: "여기까지는 값을 안 받는다" },
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
    setTeaserLoading(true);
    setStep(TEASER_STEP);
    try {
      const res = await fetch("/api/saju/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      setTeaserLoading(false);
    }
    // profileTags 를 빼면 인연 방향을 고르기 전 값이 붙잡혀 티저만 이성 기준으로 계산된다
    // → 티저와 결제 후 결과지가 다른 해를 말한다. 반드시 의존성에 남겨둘 것.
  }, [form.birthDate, form.birthTime, form.timeUnknown, form.gender, form.calendar, productSlug, profileTags]);

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
      className={
        imm
          ? "wizard-immersive relative flex w-full flex-col overflow-hidden"
          : "scene-cosmos relative overflow-hidden rounded-md border border-gold-line min-h-[560px] flex flex-col"
      }
      style={imm ? { background: "#0a090e", minHeight: "100svh" } : undefined}
    >
      {imm ? (
        <>
          {/* 타이트는 입력 중에도 캐릭터 영상이 말을 건다. 영상 파일이 없으면 이미지로 내려앉으므로
              지금 상태에서도 화면이 성립하고, 파일만 올리면 살아난다. */}
          <BgMedia
            video={bgVideo ?? "/products/sangun/input.mp4"}
            img={bgImage ?? "/products/sangun/face.webp"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(7,6,9,0.74) 0%, rgba(7,6,9,0.35) 36%, rgba(7,6,9,0.92) 74%, rgba(7,6,9,0.97) 100%)",
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
            className="text-bone-soft text-2xl leading-none disabled:opacity-30 px-1"
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
          <p className="font-myeongjo glow-bone text-bone text-[23px] font-bold leading-snug tracking-[0.03em]">
            {step === TEASER_STEP && teaserLoading ? (imm ? "네 장부를 찾는 중이다" : "명식을 계산하고 있어요") : cur.q}
          </p>
          {cur.help && !(step === TEASER_STEP && teaserLoading) && (
            <p className="font-myeongjo mt-3 text-[12.5px] text-bone-soft tracking-[0.04em]">{cur.help}</p>
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
            style={{ fontSize: 18 }}
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
            {birthRaw.length > 0 && birthRaw.length < 8 && (
              <p className="mt-2 text-center text-[11.5px] text-bone-faint">
                숫자 여덟 자리(연4 · 월2 · 일2)를 이어서 입력해 주세요
              </p>
            )}
            {birthRaw.length === 8 && !isValidBirth(birthRaw) && (
              <p className="mt-2 text-center text-[11.5px]" style={{ color: "#ff9a9a" }}>
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
                    <span className={`font-brush text-[28px] leading-none ${on ? "text-gold-bright glow-gold" : "text-bone"}`}>
                      {h}
                    </span>
                    <span className={`font-myeongjo text-[13px] text-bone tracking-[0.15em] ${on ? "font-bold" : ""}`}>
                      {ko}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11.5px] text-bone-faint">
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
              style={{ fontSize: 18, opacity: form.timeUnknown ? 0.4 : 1 }}
            />
            <button
              type="button"
              onClick={() => up("timeUnknown", !form.timeUnknown)}
              className={`w-full mt-3 py-3.5 border border-gold-line font-myeongjo text-sm tracking-[0.1em] flex items-center justify-center gap-2 ${
                form.timeUnknown ? "bg-gold text-wine-deep font-bold" : "bg-transparent text-bone-soft"
              }`}
            >
              <span className="w-4 h-4 border border-current inline-flex items-center justify-center text-[11px]">
                {form.timeUnknown ? "✓" : ""}
              </span>
              태어난 시각을 몰라요
            </button>
            <p className="font-myeongjo mt-3 text-center text-[11.5px] text-bone-faint tracking-[0.04em] leading-relaxed">
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
                    <span className={`font-myeongjo text-[14px] text-bone tracking-[0.06em] ${on ? "font-bold" : ""}`}>
                      {imm ? o.ban : o.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="font-myeongjo mt-4 text-center text-[11.5px] text-bone-faint leading-relaxed">
              {imm
                ? "장부에서 네 짝이 적힌 자리가 여기서 갈린다. 모르겠으면 모르겠다고 해라."
                : "인연을 보는 자리가 이 답으로 달라집니다. 모르시면 마지막을 골라 주세요."}
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
                  <span className={`font-myeongjo text-[13.5px] text-bone tracking-[0.04em] ${on ? "font-bold" : ""}`}>
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
                  <span className={`font-myeongjo text-[13.5px] text-bone tracking-[0.04em] ${on ? "font-bold" : ""}`}>
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
                      className={`border px-3.5 py-2 font-myeongjo text-[12.5px] tracking-[0.02em] ${
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
                      className={`px-[18px] py-3 border font-myeongjo text-sm tracking-[0.06em] ${
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
              <p className="mt-2 text-center text-[11.5px] text-bone-faint">
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

      {/* 하단 고정 버튼 */}
      <div className="relative z-[2] w-full max-w-[560px] mx-auto px-5 pb-7">
        {step < TOTAL - 1 ? (
          <>
            <button
              type="button"
              onClick={next}
              disabled={!canNext() || (step === CONFIRM_STEP && teaserLoading)}
              className="w-full min-h-[56px] border-none font-bold text-base tracking-[0.25em] disabled:cursor-default"
              style={{
                fontFamily: "'Noto Serif KR', serif",
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
              {/* (무료) 표기 필수 — 바로 위에 19,900원이 크게 떠 있어서 모의구매 2인이
                  "이거 누르면 결제되는 줄" 알고 멈췄다. */}
              {step === CONFIRM_STEP ? (imm ? "겉장부터 펴봐라 (무료)" : "겉장 먼저 보기 (무료)") : "다음"}
            </button>
            {cur.optional && (
              <button
                type="button"
                onClick={next}
                className="w-full mt-2.5 font-myeongjo text-[12.5px] text-bone-faint tracking-[0.15em] py-2"
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
            className="w-full min-h-[58px] border-none font-bold text-base tracking-[0.16em] flex items-center justify-center gap-3 disabled:opacity-70"
            style={{
              fontFamily: "'Noto Serif KR', serif",
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
            {!submitting && <span className="font-brush text-xl" style={{ color: imm ? "#241a08" : "var(--wine-deep)" }}>受</span>}
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
              className="w-full min-h-[56px] border-none font-bold text-base tracking-[0.1em] disabled:opacity-45"
              style={{
                fontFamily: "'Noto Serif KR', serif",
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
      <p className="font-myeongjo py-6 text-center text-[13px] text-bone-soft leading-relaxed">
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
      {/* 헤더가 이미 headline 을 말하므로 여기선 이름만(있을 때) */}
      {name && (
        <p className="font-myeongjo text-center text-[12px] text-gold-soft tracking-[0.14em]">{name}</p>
      )}

      {/* 원국 4기둥 — 콜드리딩보다 먼저. "네 생일로 계산했다"는 증거가 먼저 서야 아래 세 줄이 산다.
          표시 순서는 읽기 쉬운 년→월→일→시(view.pillars 는 시→일→월→년이라 뒤집는다). */}
      {shown.length > 0 && (
        <div className={name ? "mt-3" : ""}>
          {birthDate && (
            <p className="font-myeongjo text-center text-[11.5px] text-bone-faint tracking-[0.06em]">
              {birthDate.replace(/-/g, ".")}
              {/* 시 모름이면 기둥이 셋이라 여섯 글자다. 증거로 내미는 화면에서 숫자가 틀리면 안 된다. */}
              {` — 이 날에서 나온 ${GLYPH_COUNT[shown.length] ?? `${shown.length * 2}`}${imm ? " 글자" : " 글자"}`}
            </p>
          )}
          <div className="mt-2.5 flex justify-center gap-2">
            {shown.map((p, i) => (
              <div
                key={i}
                className="flex-1 max-w-[74px] py-2 text-center"
                style={{
                  background: p.isDay ? "rgba(232,201,106,0.13)" : "rgba(255,255,255,0.035)",
                  border: `1px solid ${p.isDay ? "var(--gold)" : "var(--gold-pale)"}`,
                }}
              >
                <span className="font-brush block text-[26px] leading-none text-gold-bright">{p.gan.char}</span>
                <span className="font-brush block text-[26px] leading-none text-gold-bright mt-0.5">{p.ji.char}</span>
                <span className="font-myeongjo mt-1.5 block text-[10px] text-bone-faint">
                  {p.gan.read}
                  {p.ji.read}
                </span>
              </div>
            ))}
          </div>
          {/* 사실만 말한다 — 이름·물음까지 받아놓고 "생일 하나뿐"이라 하면 그 자리에서 신뢰가 깎인다.
              (시각을 모르면 기둥이 덜 선다는 안내는 여기서 뺐다 — 결제 직전에 열등감만 남긴다) */}
          <p className="font-myeongjo mt-3 text-center text-[12.5px] leading-relaxed text-bone-soft">
            {imm
              ? "아래는 네 이름도, 네 물음도 쓰지 않았다. 이 글자에서만 나왔다."
              : "아래는 이름도, 적어주신 물음도 쓰지 않았어요. 이 글자에서만 나왔고요."}
          </p>

          {/* 원국 표 — 십성·12운성. 읽을 줄 몰라도 되는 게 핵심이다(못 읽는 글자라 계산의 증거로 읽힌다).
              배경에 박수 사진이 opacity .7 로 깔려 있어 투명하게 두면 얼굴·촛불 무늬가 글자 사이로 비친다
              → 어두운 판을 깔아 사진 위에 '종이'처럼 앉힌다. */}
          {teaser && teaser.chartRows.length > 0 && (
            <div
              className="mt-3 border border-gold-pale"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {teaser.chartRows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 text-[11.5px]"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--gold-pale)",
                    background: r.pos === "나" ? "rgba(232,201,106,0.09)" : "transparent",
                  }}
                >
                  <span className="font-myeongjo w-8 shrink-0 text-bone-faint">{r.pos}</span>
                  <span className="font-myeongjo flex-1 text-bone-soft">{r.ganSip || "—"}</span>
                  <span className="font-myeongjo flex-1 text-bone-soft">{r.jiSip || "—"}</span>
                  <span className="font-myeongjo w-12 shrink-0 text-right" style={{ color: "var(--gold-soft)" }}>
                    {r.fortune || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {teaser && teaser.sinsal.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {teaser.sinsal.map((s) => (
                <span
                  key={s}
                  className="font-myeongjo px-2 py-1 text-[11px]"
                  style={{ border: "1px solid var(--gold-pale)", color: "var(--gold-soft)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {/* 못 읽는 게 정상이라고 먼저 말해준다 — 안 그러면 "나만 모르나" 부끄러움이 이탈이 된다 */}
          {teaser && teaser.chartRows.length > 0 && (
            <p className="font-myeongjo mt-2.5 text-center text-[11.5px] leading-relaxed text-bone-faint">
              {imm
                ? "읽을 줄 몰라도 된다. 이것이 네 장부의 원본이고, 아래 말은 전부 여기서 나왔다."
                : "읽을 줄 모르셔도 돼요. 이게 장부의 원본이고, 아래 말은 전부 여기서 나왔어요."}
            </p>
          )}
        </div>
      )}

      {/* 콜드리딩 — 명식에서 나온 문장만. 2번째 줄은 연도가 박힌 과거 문장이라 강조한다. */}
      {teaser && (
        <div className={`${name || pillars ? "mt-4" : ""} space-y-2.5 border-y border-gold-pale py-4`}>
          {teaser.coldRead.map((line, i) => {
            const isPast = teaser.hasPastCheck && i === 1;
            return (
              <p
                key={i}
                className="font-myeongjo leading-[1.75] tracking-[0.01em]"
                style={
                  isPast
                    ? { fontSize: 16, color: "var(--gold-bright)", fontWeight: 600 }
                    : { fontSize: 15, color: "var(--bone)" }
                }
              >
                {line}
              </p>
            );
          })}
          {/* 판정을 손님에게 넘긴다 — 틀릴 위험을 지지 않는 문장은 맞아도 소름이 안 난다 */}
          {teaser.judgeInvite && (
            <p className="font-myeongjo pt-1 text-[12.5px] leading-relaxed text-bone-faint">
              {teaser.judgeInvite}
            </p>
          )}
        </div>
      )}

      {/* 크게 갈리는 해 — 연도만 공개 */}
      {teaser?.turningYear && (
        <div
          className="mt-4 px-4 py-4 text-center"
          style={{ background: "rgba(232,201,106,0.07)", border: "1px solid var(--gold-pale)" }}
        >
          <p className="font-myeongjo text-[11.5px] text-bone-faint tracking-[0.16em]">
            {imm ? "장부에 붉게 표시된 해" : "장부에 붉게 표시된 해"}
          </p>
          <p className="font-serif mt-1.5 text-[27px] font-bold text-gold-bright leading-none">
            {teaser.turningYear.year}년
          </p>
          <p className="font-myeongjo mt-2 text-[13.5px] text-bone leading-relaxed">{teaser.turningYear.line}</p>
        </div>
      )}

      {/* 잠긴 줄 */}
      {teaser && (
        <>
          <div className="mt-4">
            {teaser.locked.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-gold-pale py-2.5">
                <span className="font-myeongjo text-[12.5px] text-bone-soft tracking-[0.04em]">{row.label}</span>
                <span className="font-mono text-[13px] tracking-[0.1em]" style={{ color: "rgba(232,201,106,0.42)" }}>
                  {row.mask}
                </span>
              </div>
            ))}
          </div>

          {/* 받을 것을 한 줄로 — 타이트가 "5만 자·100페이지"를 박는 자리다.
              우린 분량으로는 못 이긴다(2,900자 vs 5만 자). 대신 확답 개수로 뒤집는다.
              "일곱"은 프롬프트 구조상 보장되는 하한이다(돈 3 + 인연 2 + 고민 1 + 당부 1). */}
          {productSlug === "sangun-sinjeom" && (
            <p className="font-myeongjo mt-3.5 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--gold-soft)" }}>
              두루뭉술한 말은 한 줄도 없다.
              <br />
              <b>하라 · 말라</b>를 <b>일곱 번 이상</b> 못 박아 뒀다.
            </p>
          )}

          <p className="font-myeongjo mt-3.5 text-center text-[11.5px] text-bone-faint tracking-[0.04em]">
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
            <span className="font-myeongjo text-xs text-bone-faint tracking-[0.12em] shrink-0">{k}</span>
            <span className="flex-1 text-right">
              <span className="font-myeongjo text-[13.5px] text-bone tracking-[0.02em]">{v}</span>
              <button
                type="button"
                onClick={() => onEdit(s)}
                className="ml-2.5 font-myeongjo text-[11px] text-gold tracking-[0.1em] underline underline-offset-2"
              >
                수정
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-[18px] px-4 py-3.5 bg-gold-pale border border-gold-pale flex justify-between items-center">
        <span className="font-myeongjo text-sm text-bone font-semibold">{productName}</span>
        <span className="font-serif text-xl font-bold text-gold-bright">{formatKRW(price)}</span>
      </div>

      <p className="font-myeongjo mt-3 text-center text-[11px] text-bone-faint tracking-[0.04em]">
        적어주신 정보는 사주 계산과 결과지 만드는 데만 사용됩니다.
      </p>
    </div>
  );
}
