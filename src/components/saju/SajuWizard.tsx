"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import type { SajuTeaser } from "@/lib/saju/teaser";

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
  // "immersive": 타이트식 몰입 입력 — 카드 대신 캐릭터 배경 풀블리드 + 금색 톤(산군 전용, 로직 동일)
  variant?: "immersive";
  bgImage?: string;
};

type FormState = {
  name: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  gender: Gender | "";
  calendar: Calendar | "";
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

const STEPS: { hanja: string; q: string; help: string; optional?: boolean }[] = [
  { hanja: "名", q: "어떻게 불러드릴까요?", help: "결과지에 표시될 이름입니다 (선택)", optional: true },
  { hanja: "生", q: "언제 태어나셨나요?", help: "정확한 사주 계산에 꼭 필요합니다" },
  { hanja: "時", q: "태어난 시각을 아시나요?", help: "시각을 알면 더 정밀한 풀이가 가능합니다" },
  { hanja: "性", q: "성별을 선택해 주세요", help: "운의 흐름 방향을 정하는 데 쓰입니다" },
  { hanja: "曆", q: "양력인가요, 음력인가요?", help: "주민등록상 생일은 보통 양력입니다" },
  { hanja: "惑", q: "요즘 가장 마음 쓰이는 건?", help: "복수 선택 가능 · 이 흐름을 먼저 살펴드립니다" },
  { hanja: "覽", q: "입력하신 정보를 확인해 주세요", help: "" },
  { hanja: "兆", q: "겉장만 먼저 펼쳐봤어요", help: "여기까지는 무료예요" },
];

// 산군(신점) 전용 반말 카피 — 단계 구성·인덱스는 공용과 동일(로직 무변경), 말만 갈아끼운다.
const STEPS_SANGUN: typeof STEPS = [
  { hanja: "名", q: "네 이름이 무엇이냐", help: "장부에 적을 이름이다 (안 적어도 된다)", optional: true },
  { hanja: "生", q: "언제 태어났느냐", help: "네 장부를 찾으려면 꼭 필요하다" },
  { hanja: "時", q: "태어난 시각은 아느냐", help: "알면 더 깊이 본다 — 모르면 모른다 해도 된다" },
  { hanja: "性", q: "성별은 무엇이냐", help: "기운의 방향이 여기서 갈린다" },
  { hanja: "曆", q: "양력이냐, 음력이냐", help: "주민등록 생일은 보통 양력이다" },
  { hanja: "惑", q: "따로 물어보고 싶은 것이 있느냐", help: "적으면 그 물음부터 정면으로 답해주마 — 없으면 그냥 다음" },
  { hanja: "覽", q: "이대로 네 장부를 찾겠다", help: "" },
  { hanja: "兆", q: "네 장부, 겉장만 펴봤다", help: "여기까지는 값을 안 받는다" },
];

const STEPS_BY_SLUG: Record<string, typeof STEPS> = {
  "sangun-sinjeom": STEPS_SANGUN,
};

const TOTAL = STEPS.length;
const CONFIRM_STEP = 6; // 입력 확인
const TEASER_STEP = 7;  // 결제 전 무료 티저(개인화) = 결제 화면

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
  variant,
  bgImage,
}: Props) {
  const imm = variant === "immersive";
  const router = useRouter();
  const concernOptions = CONCERN_BY_SLUG[productSlug] ?? CONCERN_OPTIONS;
  const steps = STEPS_BY_SLUG[productSlug] ?? STEPS;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [birthRaw, setBirthRaw] = useState("");
  const [teaser, setTeaser] = useState<SajuTeaser | null>(null);
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [guestEmail, setGuestEmail] = useState(""); // 비회원 결제 — 결과 수령 이메일
  const [form, setForm] = useState<FormState>({
    name: "",
    birthDate: "",
    birthTime: "",
    timeUnknown: false,
    gender: "",
    calendar: "",
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
        setForm({ ...draft.form, concernText: draft.form.concernText ?? "" });
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

  // 로그인으로 떠나기 직전, 현재 입력을 세션에 저장해 복귀 후 복원되게 함
  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify({ slug: productSlug, step, form, guestEmail }));
    } catch {
      /* 저장 실패해도 흐름은 계속 */
    }
  }, [productSlug, step, form, guestEmail]);

  // 퍼널 추적 — 단계별 이탈 지점 파악(개인정보 없이 단계/상품/금액만 전송)
  useEffect(() => {
    track("wizard_step", { step: step + 1, total: TOTAL, slug: productSlug });
    if (step === TOTAL - 1 && !isLoggedIn) {
      track("checkout_login_wall", { slug: productSlug, value: price });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const up = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggleConcern = (c: string) =>
    setForm((f) => ({
      ...f,
      concerns: f.concerns.includes(c) ? f.concerns.filter((x) => x !== c) : [...f.concerns, c],
    }));

  const canNext = useCallback(() => {
    if (step === 1) return !!form.birthDate;
    if (step === 3) return !!form.gender;
    if (step === 4) return !!form.calendar;
    return true;
  }, [step, form.birthDate, form.gender, form.calendar]);

  // 확인 → 티저: 만세력 1콜(생일 캐시 공유 — 이 사람이 결제하면 추가 콜 없음)로
  // 명식 기반 콜드리딩 + "크게 갈리는 해"를 먼저 보여준다. 실패해도 결제는 그대로 진행.
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
          slug: productSlug,
          teaser: true,
        }),
      });
      const json = await res.json();
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
  }, [form.birthDate, form.birthTime, form.timeUnknown, form.gender, form.calendar, productSlug]);

  const next = useCallback(() => {
    if (step === CONFIRM_STEP) {
      void loadTeaser();
      return;
    }
    setStep((s) => (s < TOTAL - 1 ? s + 1 : s));
  }, [step, loadTeaser]);
  const prev = () => setStep((s) => Math.max(0, s - 1));

  // Enter 키로 다음
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canNext() && step < TOTAL - 1) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canNext, next, step]);

  function payload() {
    // 결제 전에는 아무것도 캐묻지 않는다(A안) — 직접 적은 물음만 고민으로 합류.
    // [프로필] 태그 파이프(prompt.ts)는 추후 '결제 후 질문'용으로 유지.
    const concerns = form.concernText.trim() ? [...form.concerns, form.concernText.trim()] : form.concerns;
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage ?? "/products/sangun/face.webp"}
            alt=""
            aria-hidden
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
            {step + 1}/{TOTAL}
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

        {/* STEP 4 — 달력 */}
        {step === 4 && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {([["solar", "양력", "陽"], ["lunar", "음력", "陰"]] as const).map(([c, ko, h]) => {
                const on = form.calendar === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      up("calendar", c);
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
            <p className="font-myeongjo mt-4 text-center text-[11.5px] text-bone-faint tracking-[0.04em] leading-relaxed">
              주민등록상 생일은 보통 <span className="text-gold-soft">양력</span>입니다.
              음력으로 기억하신다면 음력을 골라 주세요 — 정밀하게 환산해 드립니다.
            </p>
          </div>
        )}

        {/* STEP 5 — 고민. 산군(포괄)은 카테고리 칩이 상품과 안 맞아(전 영역을 어차피 다룸) 구체 물음 예시 탭으로 대체 */}
        {step === 5 && (
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
                {imm ? "적으면 그 물음부터 정면으로 답해주마" : "적어주시면 그 질문부터 정면으로 답해드려요"}
              </p>
            </div>
          </div>
        )}

        {/* STEP 6 — 확인 */}
        {step === 6 && (
          <ConfirmStep form={form} onEdit={setStep} productName={productName} price={price} />
        )}

        {/* STEP 7 — 결제 전 개인화 무료 티저 */}
        {step === TEASER_STEP && (
          <TeaserStep teaser={teaser} loading={teaserLoading} imm={imm} name={form.name.trim()} />
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
              {step === CONFIRM_STEP ? (imm ? "겉장부터 펴봐라" : "겉장 먼저 보기 (무료)") : "다음"}
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
                ? `${formatKRW(Math.max(0, price - 1900))} 복채 내고 장부 열기`
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
              {submitting
                ? "주문 생성 중…"
                : imm
                  ? `${formatKRW(price)} 복채 내고 장부 열기`
                  : `${formatKRW(price)} 바로 결제하기`}
            </button>
            <div className="flex items-center gap-3 py-0.5" style={{ color: "var(--bone-faint)", fontSize: 11 }}>
              <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
              또는
              <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
            </div>
            {/* 카카오 로그인 — 실제 서버 할인(−1,900) 넛지 */}
            <KakaoLoginButton
              redirect={`/products/${productSlug}`}
              label={`카카오 로그인하면 1,900원 할인 · ${formatKRW(Math.max(0, price - 1900))}`}
              onBeforeRedirect={saveDraft}
            />
            <Link
              href={`/login?redirect=${encodeURIComponent(`/products/${productSlug}`)}`}
              onClick={saveDraft}
              className="block text-center text-xs text-bone-soft underline underline-offset-4 tracking-[0.04em] py-1"
            >
              이메일로 로그인하고 결제하기
            </Link>
            <p className="text-[11px] text-bone-faint text-center">
              로그인해도 입력하신 내용은 그대로 저장돼요. 결과지는 이메일/마이페이지로 받아요.
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
  loading,
  imm,
  name,
}: {
  teaser: SajuTeaser | null;
  loading: boolean;
  imm: boolean;
  name: string;
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

  if (!teaser) {
    return (
      <p className="font-myeongjo py-6 text-center text-[13px] text-bone-soft leading-relaxed">
        {imm
          ? "겉장은 지금 펴줄 수 없다. 장부는 그대로 열린다."
          : "미리보기는 지금 준비하지 못했어요. 결과지는 정상적으로 만들어져요."}
      </p>
    );
  }

  return (
    <div>
      {/* 헤더가 이미 headline 을 말하므로 여기선 이름만(있을 때) */}
      {name && (
        <p className="font-myeongjo text-center text-[12px] text-gold-soft tracking-[0.14em]">{name}</p>
      )}

      {/* 콜드리딩 — 명식에서 나온 문장만 */}
      <div className={`${name ? "mt-3" : ""} space-y-2.5 border-y border-gold-pale py-4`}>
        {teaser.coldRead.map((line, i) => (
          <p key={i} className="font-myeongjo text-[15px] leading-[1.75] text-bone tracking-[0.01em]">
            {line}
          </p>
        ))}
      </div>

      {/* 크게 갈리는 해 — 연도만 공개 */}
      {teaser.turningYear && (
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

      <p className="font-myeongjo mt-3.5 text-center text-[11.5px] text-bone-faint tracking-[0.04em]">
        {teaser.note}
      </p>
    </div>
  );
}

function ConfirmStep({
  form,
  onEdit,
  productName,
  price,
}: {
  form: FormState;
  onEdit: (s: number) => void;
  productName: string;
  price: number;
}) {
  const concernAll = [...form.concerns, ...(form.concernText.trim() ? [form.concernText.trim()] : [])];
  const rows: [string, string, number][] = [
    ["이름", form.name || "—", 0],
    ["생년월일", form.birthDate || "—", 1],
    ["출생시각", form.timeUnknown ? "시 모름" : form.birthTime || "—", 2],
    ["성별", form.gender === "male" ? "남성" : form.gender === "female" ? "여성" : "—", 3],
    ["달력", form.calendar === "solar" ? "양력" : form.calendar === "lunar" ? "음력" : "—", 4],
    ["고민", concernAll.length ? concernAll.join(" · ") : "—", 5],
  ];

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
