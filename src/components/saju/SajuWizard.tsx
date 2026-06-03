"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { SAJU_INPUT_KEY } from "@/components/saju/FreeResult";

type Gender = "male" | "female";
type Calendar = "solar" | "lunar";

export type Tier = {
  productId: string;
  slug: string;
  name: string;
  price: number;
};

// flow="free"  → 메인 퍼널 입구. 입력만 모아 무료 결과 페이지(/free-result)로 보냅니다.
//                (주문 생성·로그인·결제는 무료 결과 이후로 미룹니다.)
// flow="order" → 연애·오늘의 운세 등 단일 상품 직접 구매. 바로 주문을 생성합니다.
type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  isLoggedIn?: boolean;
  flow?: "free" | "order";
  // 호환용(미사용)
  tiers?: Tier[];
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

// freeReading.ts 의 CONCERN_TEASER 키와 정확히 일치 (4050 현실 고민)
const CONCERN_OPTIONS = ["재물", "부부·연애", "자녀", "직장·사업", "건강", "올해 운", "노후", "가족"];

const STEPS: { hanja: string; q: string; help: string; optional?: boolean }[] = [
  { hanja: "名", q: "어떻게 불러드릴까요?", help: "결과지에 표시될 이름입니다 (선택)", optional: true },
  { hanja: "生", q: "언제 태어나셨나요?", help: "정확한 명식을 위해 꼭 필요합니다" },
  { hanja: "時", q: "태어난 시각을 아시나요?", help: "시각을 알면 더 정밀한 풀이가 가능합니다" },
  { hanja: "性", q: "성별을 선택해 주세요", help: "대운의 방향을 정하는 데 쓰입니다" },
  { hanja: "曆", q: "양력인가요, 음력인가요?", help: "주민등록상 생일은 보통 양력입니다" },
  { hanja: "惑", q: "요즘 가장 마음 쓰이는 건?", help: "복수 선택 가능 · 이 흐름을 먼저 살펴드립니다" },
  { hanja: "覽", q: "입력하신 정보를 확인해 주세요", help: "" },
];

const TOTAL = STEPS.length;

// 비로그인 → 로그인 왕복 동안 위저드 입력을 보존하는 세션 키 (read-once)
const ORDER_DRAFT_KEY = "myeongunrok:order-wizard-draft";

export function SajuWizard({
  productId,
  productSlug,
  productName,
  price,
  isLoggedIn = false,
  flow = "order",
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    birthDate: "",
    birthTime: "",
    timeUnknown: false,
    gender: "",
    calendar: "",
    concerns: [],
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
    return {
      name: form.name.trim(),
      birthDate: form.birthDate,
      birthTime: form.timeUnknown ? null : form.birthTime || null,
      timeUnknown: form.timeUnknown,
      gender: (form.gender || "male") as Gender,
      calendar: (form.calendar || "solar") as Calendar,
      concerns: form.concerns,
    };
  }

  // flow="free": 입력을 세션에 저장하고 무료 결과 페이지로 이동
  function goFreeResult() {
    if (!form.birthDate) {
      toast.error("생년월일을 입력해 주세요");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      sessionStorage.setItem(SAJU_INPUT_KEY, JSON.stringify(payload()));
      router.push("/free-result");
    } catch {
      toast.error("결과 페이지로 이동하지 못했습니다. 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  // flow="order": 단일 상품 주문 생성 → 결제
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
      router.push(`/checkout/${json.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
      setSubmitting(false);
    }
  }

  const cur = STEPS[step];

  return (
    <div className="scene-cosmos relative overflow-hidden rounded-md border border-gold-line min-h-[560px] flex flex-col">
      <div className="starfield opacity-30" />

      {/* 상단: 이전 + 진행률 + N/7 */}
      <div className="relative z-[2] w-full max-w-[560px] mx-auto px-5 pt-5">
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
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-[7px] rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 22 : 7,
                  background:
                    i < step ? "var(--gold-soft)" : i === step ? "var(--gold-bright)" : "rgba(212,175,106,0.2)",
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
        className="svc-fade flex-1 relative z-[1] w-full max-w-[560px] mx-auto px-5 py-5 flex flex-col justify-center"
      >
        <div className="text-center mb-7">
          <span className="font-brush glow-gold block mb-4 text-gold-bright text-[40px] leading-none">
            {cur.hanja}
          </span>
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
            {CONCERN_OPTIONS.map((c) => {
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
          <ConfirmStep form={form} onEdit={setStep} flow={flow} productName={productName} price={price} />
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
                background: canNext() ? "linear-gradient(180deg,#e8c878,#d4af6a)" : "rgba(212,175,106,0.15)",
                color: canNext() ? "var(--wine-deep)" : "var(--bone-faint)",
                boxShadow: canNext() ? "0 0 24px rgba(212,175,106,0.28)" : "none",
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
        ) : flow === "free" ? (
          <button
            type="button"
            onClick={goFreeResult}
            disabled={submitting}
            className="w-full min-h-[58px] border-none font-bold text-base tracking-[0.12em] flex items-center justify-center gap-3 disabled:opacity-70"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              background: "linear-gradient(180deg,#e8c878,#d4af6a)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 24px rgba(212,175,106,0.3)",
            }}
          >
            {submitting ? "명식을 세우는 중…" : "이 정보로 무료 결과 보기"}
            {!submitting && <span className="font-brush text-xl text-wine-deep">覽</span>}
          </button>
        ) : isLoggedIn ? (
          <button
            type="button"
            onClick={createOrder}
            disabled={submitting}
            className="w-full min-h-[58px] border-none font-bold text-base tracking-[0.16em] flex items-center justify-center gap-3 disabled:opacity-70"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              background: "linear-gradient(180deg,#e8c878,#d4af6a)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 24px rgba(212,175,106,0.3)",
            }}
          >
            {submitting ? "주문 생성 중…" : `${formatKRW(price)} 결제하러 가기`}
            {!submitting && <span className="font-brush text-xl text-wine-deep">受</span>}
          </button>
        ) : (
          <div className="space-y-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(`/products/${productSlug}`)}`}
              onClick={saveDraft}
              className="w-full min-h-[58px] flex items-center justify-center gap-3 font-bold text-base tracking-[0.16em]"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                background: "linear-gradient(180deg,#e8c878,#d4af6a)",
                color: "var(--wine-deep)",
                boxShadow: "0 0 24px rgba(212,175,106,0.3)",
              }}
            >
              로그인하고 결제하기
            </Link>
            <p className="text-xs text-bone-soft text-center">
              결과는 로그인 후 <span className="text-gold">마이페이지</span>에서 확인할 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmStep({
  form,
  onEdit,
  flow,
  productName,
  price,
}: {
  form: FormState;
  onEdit: (s: number) => void;
  flow: "free" | "order";
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

      {flow === "free" ? (
        <div className="mt-6 text-center">
          <span className="font-brush text-gold-soft/70 text-[22px] leading-none block mb-2">命</span>
          <p className="font-myeongjo text-[13px] text-bone-soft leading-relaxed tracking-[0.02em]">
            바로 다음 화면에서 <span className="text-gold-bright">내 명식 여덟 글자</span>와
            오행 균형, 올해 흐름까지 <span className="text-gold-bright">무료</span>로 확인할 수 있어요.
          </p>
        </div>
      ) : (
        <div className="mt-[18px] px-4 py-3.5 bg-gold-pale border border-gold-pale flex justify-between items-center">
          <span className="font-myeongjo text-sm text-bone font-semibold">{productName}</span>
          <span className="font-serif text-xl font-bold text-gold-bright">{formatKRW(price)}</span>
        </div>
      )}

      <p className="font-myeongjo mt-3 text-center text-[11px] text-bone-faint tracking-[0.04em]">
        입력하신 정보는 명식 계산과 결과 생성에만 사용됩니다.
      </p>
    </div>
  );
}
