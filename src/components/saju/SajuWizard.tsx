"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";

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
];

// 산군(신점) 전용 반말 카피 — 단계 구성·인덱스는 공용과 동일(로직 무변경), 말만 갈아끼운다.
const STEPS_SANGUN: typeof STEPS = [
  { hanja: "名", q: "네 이름이 무엇이냐", help: "장부에 적을 이름이다 (안 적어도 된다)", optional: true },
  { hanja: "生", q: "언제 태어났느냐", help: "네 장부를 찾으려면 꼭 필요하다" },
  { hanja: "時", q: "태어난 시각은 아느냐", help: "알면 더 깊이 본다 — 모르면 모른다 해도 된다" },
  { hanja: "性", q: "성별은 무엇이냐", help: "기운의 방향이 여기서 갈린다" },
  { hanja: "曆", q: "양력이냐, 음력이냐", help: "주민등록 생일은 보통 양력이다" },
  { hanja: "惑", q: "따로 물어보고 싶은 것이 있느냐", help: "고르면 그 물음부터 답해주마 (여러 개도 된다)" },
  { hanja: "覽", q: "이대로 네 장부를 찾겠다", help: "" },
];

const STEPS_BY_SLUG: Record<string, typeof STEPS> = {
  "sangun-sinjeom": STEPS_SANGUN,
};

const TOTAL = STEPS.length;

// 산군 스토리(비주얼노벨)에서 고른 직업·연애상태를 위저드로 넘기는 세션 키
const SANGUN_PROFILE_KEY = "myeongunrok:sangun-profile";

// 비로그인 → 로그인 왕복 동안 위저드 입력을 보존하는 세션 키 (read-once)
const ORDER_DRAFT_KEY = "myeongunrok:order-wizard-draft";

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
  const [form, setForm] = useState<FormState>({
    name: "",
    birthDate: "",
    birthTime: "",
    timeUnknown: false,
    gender: "",
    calendar: "",
    concerns: (initialConcerns ?? []).filter((c) => concernOptions.includes(c)),
  });

  // 로그인 왕복 후 복귀 시 입력 복원 (read-once: 복원하면 즉시 비움)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ORDER_DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(ORDER_DRAFT_KEY);
      const draft = JSON.parse(raw) as { slug?: string; step?: number; form?: FormState };
      if (draft?.slug === productSlug && draft.form) {
        setForm(draft.form);
        setStep(
          typeof draft.step === "number" ? Math.min(Math.max(0, draft.step), TOTAL - 1) : TOTAL - 1,
        );
      }
    } catch {
      /* 손상된 draft 는 무시 */
    }
    // 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인으로 떠나기 직전, 현재 입력을 세션에 저장해 복귀 후 복원되게 함
  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify({ slug: productSlug, step, form }));
    } catch {
      /* 저장 실패해도 흐름은 계속 */
    }
  }, [productSlug, step, form]);

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

  const next = useCallback(() => {
    setStep((s) => (s < TOTAL - 1 ? s + 1 : s));
  }, []);
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
    // 산군: 스토리 선택지(직업·연애상태)를 [프로필] 태그로 실어 결과지 개인화에 쓴다(prompt.ts에서 고민과 분리 처리)
    let concerns = form.concerns;
    if (productSlug === "sangun-sinjeom") {
      try {
        const raw = sessionStorage.getItem(SANGUN_PROFILE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as { job?: string; love?: string };
          const tags = [
            p.job ? `[프로필] 직업: ${p.job}` : null,
            p.love ? `[프로필] 연애상태: ${p.love}` : null,
          ].filter((t): t is string => !!t);
          concerns = [...form.concerns, ...tags];
        }
      } catch {
        /* 프로필 없이도 흐름은 계속 */
      }
    }
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

  // 단일 상품 주문 생성 → 결제
  async function createOrder() {
    if (!form.birthDate) {
      toast.error("생년월일을 입력해 주세요");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...payload() }),
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
            {cur.q}
          </p>
          {cur.help && (
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

        {/* STEP 1 — 생년월일 */}
        {step === 1 && (
          <input
            autoFocus
            className="ap-input text-center"
            type="date"
            value={form.birthDate}
            onChange={(e) => up("birthDate", e.target.value)}
            style={{ fontSize: 18 }}
          />
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

        {/* STEP 5 — 고민 */}
        {step === 5 && (
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

        {/* STEP 6 — 확인 */}
        {step === 6 && (
          <ConfirmStep form={form} onEdit={setStep} productName={productName} price={price} />
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="relative z-[2] w-full max-w-[560px] mx-auto px-5 pb-7">
        {step < TOTAL - 1 ? (
          <>
            <button
              type="button"
              onClick={next}
              disabled={!canNext()}
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
              다음
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
            {submitting ? "주문 생성 중…" : imm ? `${formatKRW(price)} 복채 내고 장부 열기` : `${formatKRW(price)} 결제하러 가기`}
            {!submitting && <span className="font-brush text-xl" style={{ color: imm ? "#241a08" : "var(--wine-deep)" }}>受</span>}
          </button>
        ) : (
          <div className="space-y-2.5">
            {/* 카카오 원탭 — 마찰 최소화(입력은 저장돼 로그인 후 그대로 복원) */}
            <KakaoLoginButton
              redirect={`/products/${productSlug}`}
              label={`카카오로 3초 로그인 후 결제 · ${formatKRW(price)}`}
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
              입력하신 내용은 그대로 저장돼요. 로그인 후 바로 이어서 결제합니다.
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
  const rows: [string, string, number][] = [
    ["이름", form.name || "—", 0],
    ["생년월일", form.birthDate || "—", 1],
    ["출생시각", form.timeUnknown ? "시 모름" : form.birthTime || "—", 2],
    ["성별", form.gender === "male" ? "남성" : form.gender === "female" ? "여성" : "—", 3],
    ["달력", form.calendar === "solar" ? "양력" : form.calendar === "lunar" ? "음력" : "—", 4],
    ["고민", form.concerns.length ? form.concerns.join(" · ") : "—", 5],
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
