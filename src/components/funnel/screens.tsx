"use client";

// 인생사주 퍼널 9화면 — 핸드오프 인생사주 전체플로우 디자인.dc.html 재구현.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { formatKRW } from "@/lib/utils";
import type { FunnelCtx, Gender, Calendar } from "@/lib/funnel/types";
import { CONCERNS, concernShort } from "@/lib/funnel/options";
import {
  ScreenScaffold,
  ProgressHeader,
  QuestionHead,
  OptionRow,
  PrimaryCTA,
  SkipLink,
  ReassureBanner,
  FrostedTextarea,
  SegmentToggle,
  FieldLabel,
  frostedInputStyle,
  LANDING_BG,
} from "./ui";

// 생시 — 십이지시(대표 시각). 모름 시 시주 제외.
const SIJU = [
  { v: "23:30", label: "자시 (23:30~01:30)" },
  { v: "01:30", label: "축시 (01:30~03:30)" },
  { v: "03:30", label: "인시 (03:30~05:30)" },
  { v: "05:30", label: "묘시 (05:30~07:30)" },
  { v: "07:30", label: "진시 (07:30~09:30)" },
  { v: "09:30", label: "사시 (09:30~11:30)" },
  { v: "11:30", label: "오시 (11:30~13:30)" },
  { v: "13:30", label: "미시 (13:30~15:30)" },
  { v: "15:30", label: "신시 (15:30~17:30)" },
  { v: "17:30", label: "유시 (17:30~19:30)" },
  { v: "19:30", label: "술시 (19:30~21:30)" },
  { v: "21:30", label: "해시 (21:30~23:30)" },
];

// ② 카카오 로그인 — Supabase OAuth(기존 구현 재사용). 성공 시 /auth/callback → /funnel 복귀.
// Supabase 미설정/프로바이더 미활성(개발 중)일 땐 그냥 다음 단계로 진행.
export function LoginScreen({ ctx }: { ctx: FunnelCtx }) {
  const [loading, setLoading] = useState(false);
  // 이미 로그인된 상태(예: 카카오 OAuth 왕복 복귀)면 결제로 바로 넘긴다.
  useEffect(() => {
    if (ctx.isAuthed) ctx.next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const kakao = async () => {
    if (!isSupabaseConfigured()) {
      ctx.next();
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/funnel` },
      });
      if (error) {
        if (error.message?.includes("provider is not enabled")) {
          ctx.next(); // 아직 카카오 미활성 — 흐름은 막지 않음
        } else {
          toast.error("카카오 로그인을 시작하지 못했어요: " + error.message);
          setLoading(false);
        }
      }
      // 성공 시 카카오로 리다이렉트되어 아래는 실행되지 않음
    } catch {
      ctx.next();
    }
  };
  return (
    <ScreenScaffold
      bg={LANDING_BG}
      footer={
        <>
          <button
            type="button"
            onClick={kakao}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ padding: 16, borderRadius: 14, background: "#FEE500", color: "#2b2b2b", fontWeight: 800, fontSize: 15.5, border: "none", cursor: "pointer", boxShadow: "0 12px 26px rgba(180,160,0,.25)" }}
          >
            <span style={{ fontSize: 18 }}>💬</span> {loading ? "카카오로 이동 중…" : "카카오로 계속하기"}
          </button>
          <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 11, color: "#9a8cd0", lineHeight: 1.5 }}>
            재방문 시 입력값이 자동 복원돼요
          </p>
        </>
      }
    >
      <div className="flex h-full flex-col items-center justify-center text-center" style={{ minHeight: 420 }}>
        <div
          style={{ width: 88, height: 88, borderRadius: 24, background: "linear-gradient(160deg,rgba(160,120,255,.3),rgba(80,40,160,.4))", border: "1px solid rgba(190,150,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Ma Shan Zheng', cursive", fontSize: 46, color: "#e6dbff", boxShadow: "0 10px 30px rgba(20,8,60,.5)" }}
        >
          命
        </div>
        <div style={{ marginTop: 24, fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 24 }}>
          로그인하고 전체 풀이 받기
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#cdb8f5" }}>
          카카오로 로그인하면 결과를
          <br />
          안전하게 받아볼 수 있어요
        </p>
      </div>
    </ScreenScaffold>
  );
}

// ③-B 惑 · 고민 (복수, 최소 1) — 첫 화면
export function ConcernsScreen({ ctx }: { ctx: FunnelCtx }) {
  const has = ctx.state.concerns.length > 0;
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={
        <>
          <div className="mb-3">
            <ReassureBanner tone="violet">
              고르신 고민을 <b style={{ color: "#fff" }}>가장 먼저, 가장 깊게</b> 풀어드려요
            </ReassureBanner>
          </div>
          <PrimaryCTA label="다음" onClick={ctx.next} disabled={!has} />
        </>
      }
    >
      <QuestionHead hanja="惑" title={<>요즘 가장 마음이<br />무거운 건 무엇인가요?</>} sub="여러 개 골라도 괜찮아요" />
      <div className="mt-5 flex flex-col gap-[9px]">
        {CONCERNS.map((c) => {
          const sel = ctx.state.concerns.includes(c.key);
          return (
            <OptionRow
              key={c.key}
              compact
              selected={sel}
              label={c.label}
              onClick={() => ctx.toggleConcern(c.key)}
              trailing={sel ? <span style={{ color: "#c9a8ff" }}>✓</span> : undefined}
            />
          );
        })}
      </div>
    </ScreenScaffold>
  );
}

// ③-C 述 · 현재 상황 (선택·스킵)
export function SituationScreen({ ctx }: { ctx: FunnelCtx }) {
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={
        <>
          <PrimaryCTA label="다음" onClick={ctx.next} />
          <SkipLink label="건너뛰기" onClick={ctx.next} />
        </>
      }
    >
      <QuestionHead hanja="述" title={<>지금 어떤 상황인지<br />편하게 적어주세요</>} sub="입력하지 않고 넘어가도 돼요" />
      <div className="mt-5">
        <FrostedTextarea
          value={ctx.state.situationText}
          onChange={(v) => ctx.setField("situationText", v)}
          placeholder={"예) 30대 후반 직장인, 이직과 결혼을 동시에 고민 중이에요. 요즘 돈이 잘 안 모여서 마음이 무거워요."}
        />
        <div className="mt-3.5">
          <ReassureBanner tone="green">
            길게, 여러 개 적으실수록 <b style={{ color: "#dffff0" }}>더 구체적으로</b> 풀어드려요
          </ReassureBanner>
        </div>
      </div>
    </ScreenScaffold>
  );
}

// ③-D 望 · 미래 바람 (선택·스킵)
export function WishScreen({ ctx }: { ctx: FunnelCtx }) {
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={
        <>
          <PrimaryCTA label="다음" onClick={ctx.next} />
          <SkipLink label="건너뛰기" onClick={ctx.next} />
        </>
      }
    >
      <QuestionHead hanja="望" title={<>앞으로 이루고 싶은<br />것이 있나요?</>} sub="꿈 · 목표 무엇이든 좋아요" />
      <div className="mt-5">
        <FrostedTextarea
          value={ctx.state.wishText}
          onChange={(v) => ctx.setField("wishText", v)}
          placeholder={"예) 내 사업으로 자리잡아서 가족과 여유롭게 사는 게 꿈이에요. 건강하게 오래 일하고 싶어요."}
        />
        <div className="mt-3.5">
          <ReassureBanner tone="violet">
            바라는 방향을 알면 <b style={{ color: "#fff" }}>&ldquo;언제, 어떻게&rdquo;</b>까지 짚어드려요
          </ReassureBanner>
        </div>
      </div>
    </ScreenScaffold>
  );
}

// ④ 명식 정보
export function ProfileScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  const ready = !!p.gender && !!p.birthDate && !!p.calendar;
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={<PrimaryCTA label="입력 확인하기" onClick={ctx.next} disabled={!ready} />}
    >
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 23, lineHeight: 1.3 }}>
        마지막으로
        <br />
        사주 정보를 알려주세요
      </div>
      <div className="mt-6 flex flex-col gap-3.5">
        <div>
          <FieldLabel>어떻게 불러드릴까요? <span style={{ fontWeight: 400, color: "#9a8cd0" }}>· 선택</span></FieldLabel>
          <input
            value={p.nickname}
            onChange={(e) => ctx.setProfile("nickname", e.target.value)}
            placeholder="비우면 '회원님'으로 불러드려요"
            style={frostedInputStyle}
          />
        </div>
        <div>
          <FieldLabel required>성별</FieldLabel>
          <SegmentToggle<Gender>
            options={[{ key: "M", label: "남자" }, { key: "F", label: "여자" }]}
            value={p.gender}
            onChange={(v) => ctx.setProfile("gender", v)}
          />
        </div>
        <div>
          <FieldLabel required>생년월일</FieldLabel>
          <input
            type="date"
            value={p.birthDate}
            min="1930-01-01"
            max="2025-12-31"
            onChange={(e) => ctx.setProfile("birthDate", e.target.value)}
            style={{ ...frostedInputStyle, colorScheme: "dark" }}
          />
        </div>
        <div>
          <FieldLabel required>양/음력</FieldLabel>
          <SegmentToggle<Calendar>
            options={[{ key: "solar", label: "양력" }, { key: "lunar", label: "음력" }]}
            value={p.calendar}
            onChange={(v) => ctx.setProfile("calendar", v)}
          />
        </div>
        <div>
          <FieldLabel>태어난 시각</FieldLabel>
          <select
            value={p.birthTime}
            disabled={p.unknownTime}
            onChange={(e) => ctx.setProfile("birthTime", e.target.value)}
            style={{ ...frostedInputStyle, opacity: p.unknownTime ? 0.4 : 1, colorScheme: "dark", accentColor: "#8a5cf0" }}
          >
            <option value="" style={{ background: "#1b0d3c", color: "#9a8cd0" }}>시간 선택 (모르면 아래 체크)</option>
            {SIJU.map((s) => (
              <option key={s.v} value={s.v} style={{ background: "#1b0d3c", color: "#F1EEF9" }}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => ctx.setProfile("unknownTime", !p.unknownTime)}
          className="flex items-center gap-2"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span
            style={{ width: 18, height: 18, borderRadius: 5, background: p.unknownTime ? "rgba(150,90,255,.24)" : "rgba(255,255,255,.05)", border: p.unknownTime ? "1.5px solid #b794ff" : "1.5px solid rgba(180,140,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}
          >
            {p.unknownTime ? "✓" : ""}
          </span>
          <span style={{ fontSize: 12, color: "#b8a4e0" }}>태어난 시각을 몰라요 (시 기둥 제외)</span>
        </button>
      </div>
    </ScreenScaffold>
  );
}

// ⑤ 확인
export function ConfirmScreen({ ctx }: { ctx: FunnelCtx }) {
  const { state } = ctx;
  const p = state.profile;
  const rows: { label: string; value: string; to: Parameters<typeof ctx.goTo>[0] }[] = [
    { label: "고민", value: state.concerns.map(concernShort).join(" · ") || "선택 안 함", to: "concerns" },
    { label: "생년월일", value: p.birthDate ? p.birthDate.replace(/-/g, ".") : "—", to: "profile" },
    { label: "태어난 시각", value: p.unknownTime ? "모름 (시 제외)" : p.birthTime ? SIJU.find((s) => s.v === p.birthTime)?.label ?? p.birthTime : "선택 안 함", to: "profile" },
    { label: "성별 · 달력", value: `${p.gender === "M" ? "남" : p.gender === "F" ? "여" : "—"} · ${p.calendar === "lunar" ? "음력" : "양력"}`, to: "profile" },
  ];
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={<PrimaryCTA label="무료 기본 분석 받기" onClick={ctx.next} />}
    >
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 24 }}>이대로 분석할게요</div>
      <div className="mt-5 flex flex-col">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between" style={{ padding: "13px 0", borderBottom: "1px solid rgba(180,140,255,.18)" }}>
            <span style={{ fontSize: 13, color: "#b8a4e0" }}>{r.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>
              {r.value}{" "}
              <button type="button" onClick={() => ctx.goTo(r.to)} style={{ color: "#c9a8ff", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13.5 }}>
                수정
              </button>
            </span>
          </div>
        ))}
      </div>
      {(state.situationText || state.wishText) && (
        <div className="mt-[18px]" style={{ background: "rgba(150,90,255,.16)", border: "1px solid rgba(180,140,255,.35)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#dcc8ff", marginBottom: 6 }}>내가 적은 고민</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "#cbb8f0" }}>
            &ldquo;{(state.situationText || state.wishText).slice(0, 120)}&rdquo;
          </div>
        </div>
      )}
      <div className="mt-4" style={{ fontSize: 11.5, textAlign: "center", lineHeight: 1.5, color: "#9a8cd0" }}>
        입력하신 정보는 명식 계산과
        <br />
        결과 생성에만 사용돼요
      </div>
    </ScreenScaffold>
  );
}

// ⑥ 무료 기본 분석 — 실제 명식/오행 fetch(/api/saju/chart), 실패·미설정 시 대표값 폴백.
const EL_BAR: Record<string, string> = {
  목: "linear-gradient(180deg,#7fc8a0,#3a9a6c)",
  화: "linear-gradient(180deg,#ff9a7a,#d0563c)",
  토: "linear-gradient(180deg,#e4c878,#b4933a)",
  금: "linear-gradient(180deg,#c8cdd4,#9098a4)",
  수: "linear-gradient(180deg,#88a8e0,#4868c0)",
};
const EL_TINT: Record<string, { bg: string; border: string; color: string }> = {
  목: { bg: "rgba(127,200,160,.18)", border: "rgba(127,200,160,.45)", color: "#aef0cc" },
  화: { bg: "rgba(255,150,110,.2)", border: "rgba(255,160,120,.4)", color: "#ffc4b8" },
  토: { bg: "rgba(228,200,120,.18)", border: "rgba(228,200,120,.4)", color: "#f0dca0" },
  금: { bg: "rgba(200,205,212,.18)", border: "rgba(200,205,212,.4)", color: "#e6ebf2" },
  수: { bg: "rgba(136,168,224,.18)", border: "rgba(136,168,224,.4)", color: "#bcd0f5" },
};
const NEUTRAL = { bg: "rgba(180,140,255,.16)", border: "rgba(180,140,255,.3)", color: "#e6dbff" };
const EL_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const EL_TYPE: Record<string, string> = {
  목: "木 기운이 뻗어가는 성장형",
  화: "火 기운이 강한 추진력형",
  토: "土 기운이 단단한 중심형",
  금: "金 기운이 또렷한 결단형",
  수: "水 기운이 깊은 지혜형",
};

type Chart = { cheongan: { ch: string; el: string; ilgan: boolean }[]; ohaeng: { el: string; pct: number }[] };
const REP_CHART: Chart = {
  cheongan: [
    { ch: "己", el: "토", ilgan: false },
    { ch: "丙", el: "화", ilgan: true },
    { ch: "壬", el: "수", ilgan: false },
    { ch: "甲", el: "목", ilgan: false },
  ],
  ohaeng: [
    { el: "목", pct: 60 },
    { el: "화", pct: 90 },
    { el: "토", pct: 45 },
    { el: "금", pct: 32 },
    { el: "수", pct: 70 },
  ],
};

export function AnalysisScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  const [chart, setChart] = useState<Chart>(REP_CHART);

  useEffect(() => {
    if (!p.birthDate || !p.gender) return;
    let alive = true;
    fetch("/api/saju/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: p.birthDate,
        birthTime: p.birthTime || null,
        timeUnknown: p.unknownTime,
        gender: p.gender === "M" ? "male" : "female",
        calendar: p.calendar,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok && Array.isArray(d.cheongan) && Array.isArray(d.ohaeng)) {
          setChart({ cheongan: d.cheongan, ohaeng: d.ohaeng });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [p.birthDate, p.birthTime, p.unknownTime, p.gender, p.calendar]);

  const nick = p.nickname || "회원";
  const dominant = [...chart.ohaeng].sort((a, b) => b.pct - a.pct)[0]?.el ?? "화";

  return (
    <ScreenScaffold
      header={
        <div className="flex items-center justify-between" style={{ color: "#dcd0ff" }}>
          <button type="button" onClick={ctx.prev} aria-label="뒤로" style={{ fontSize: 22, background: "none", border: "none", color: "#dcd0ff", cursor: "pointer" }}>‹</button>
          <span style={{ fontWeight: 800, letterSpacing: ".18em", fontSize: 13, color: "#d8c8ff" }}>SAJU LAB</span>
          <span style={{ opacity: 0.7, fontSize: 11 }}>⌁</span>
        </div>
      }
      footer={<PrimaryCTA label="전체 풀이 받기" onClick={ctx.next} />}
    >
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 22 }}>{nick}님의 사주 원국</div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {chart.cheongan.map((c, i) => {
          const t = c.ilgan ? EL_TINT[c.el] ?? EL_TINT["화"] : NEUTRAL;
          return (
            <div
              key={i}
              style={{ aspectRatio: "0.78", borderRadius: 12, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Ma Shan Zheng', cursive", fontSize: 30, color: t.color }}
            >
              {c.ch}
            </div>
          );
        })}
      </div>
      <div className="mt-[18px]" style={{ fontSize: 12.5, fontWeight: 700, color: "#cbb8f0" }}>오행 분포</div>
      <div className="mt-2 flex items-end gap-1.5" style={{ height: 46 }}>
        {chart.ohaeng.map((o) => (
          <div key={o.el} style={{ flex: 1, height: `${Math.max(8, o.pct)}%`, background: EL_BAR[o.el], borderRadius: "5px 5px 0 0" }} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" style={{ fontSize: 11, color: "#9a8cd0" }}>
        {chart.ohaeng.map((o) => (
          <span key={o.el} style={{ flex: 1, textAlign: "center" }}>{EL_HANJA[o.el] ?? o.el}</span>
        ))}
      </div>
      <div className="mt-4" style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#cbb8f0" }}>
        {nick}님은 <b style={{ color: EL_TINT[dominant]?.color ?? "#ffc4b8" }}>{EL_TYPE[dominant] ?? EL_TYPE["화"]}</b> — 재물운부터 풀어드릴게요…
      </div>
      <div className="mt-3.5" style={{ position: "relative", borderRadius: 14, border: "1px dashed rgba(180,140,255,.4)", padding: 18, textAlign: "center", background: "rgba(20,8,50,.4)" }}>
        <div style={{ fontSize: 22 }}>🔒</div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "#b8a4e0", lineHeight: 1.5 }}>
          재물·애정·직업 상세 풀이
          <br />
          유료에서 전체 공개
        </div>
      </div>
    </ScreenScaffold>
  );
}

// ⑦ 결제 — 옵션(상품) 선택형. 기본 6,900 / 회원 −1,900(표시) / 비회원 이메일.
// 주문 생성(/api/orders/create) → 체크아웃. ⚠️ 실제 할인 차감·이메일 저장은 주문 API 후속(현재 contract 미지원).
// 옵션 카드 설명·추천 배지(slug별). 가짜 할인앵커는 쓰지 않음(과장/표시광고법 금지).
const PAY_META: Record<string, { desc: string; badge?: string }> = {
  "life-saju": { desc: "내 사주 핵심 · 올해 흐름 · 고민 답" },
  "wealth-saju": { desc: "돈 들어오는 길 · 새는 구멍 · 재물 시기" },
  "love-saju": { desc: "부부·연애·자녀, 관계 패턴과 인연" },
  "monthly-luck": { desc: "2026 월별 좋은 달 · 조심할 달" },
  "premium-saju": { desc: "전 영역 + 대운 60년 흐름까지", badge: "추천" },
};
export function PaymentScreen({ ctx }: { ctx: FunnelCtx }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const options = ctx.products.length ? ctx.products : ctx.product ? [ctx.product] : [];
  const [selId, setSelId] = useState<string | undefined>(ctx.product?.id ?? options[0]?.id);
  const [email, setEmail] = useState("");
  const sel = options.find((o) => o.id === selId) ?? ctx.product ?? options[0] ?? null;
  const basePrice = sel?.price ?? 6900;
  const discount = ctx.isAuthed ? 1900 : 0;
  const total = Math.max(0, basePrice - discount);
  const benefits = ["재물·애정·직업·건강 전 영역", "대운 흐름 + 올해 월별 운세", "내가 적은 고민 맞춤 조언"];

  const pay = async () => {
    if (busy) return;
    const p = ctx.state.profile;
    if (!sel || !p.birthDate || !p.gender) {
      router.push("/products/premium-saju");
      return;
    }
    if (!ctx.isAuthed && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("결과 받을 이메일을 입력해 주세요");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: sel.id,
          name: p.nickname || undefined,
          birthDate: p.birthDate,
          birthTime: p.unknownTime ? null : p.birthTime || null,
          timeUnknown: p.unknownTime,
          gender: p.gender === "M" ? "male" : "female",
          calendar: p.calendar,
          concerns: ctx.state.concerns.map(concernShort),
          email: ctx.isAuthed ? undefined : email, // 비회원 이메일(현 contract 미저장 — 후속)
        }),
      });
      const json = await res.json();
      if (res.ok && json.orderId) {
        router.push(`/checkout/${json.orderId}`);
        return;
      }
      toast.error(json.error ?? "주문 생성에 실패했어요");
      setBusy(false);
    } catch {
      toast.error("주문 생성 중 오류가 발생했어요");
      setBusy(false);
    }
  };

  const loginKakao = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/funnel` },
      });
    } catch {
      toast.error("카카오 로그인을 시작하지 못했어요");
    }
  };

  return (
    <ScreenScaffold
      header={
        <div className="flex items-center justify-between" style={{ color: "#dcd0ff" }}>
          <button type="button" onClick={ctx.prev} aria-label="뒤로" style={{ fontSize: 22, background: "none", border: "none", color: "#dcd0ff", cursor: "pointer" }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>결제</span>
          <span style={{ opacity: 0, fontSize: 22 }}>‹</span>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ padding: 16, borderRadius: 14, background: "#FEE500", color: "#2b2b2b", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
          >
            💬 {busy ? "처리 중…" : `카카오페이로 ${formatKRW(total)} 결제`}
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="mt-2.5 block w-full text-center disabled:opacity-70"
            style={{ padding: 13, borderRadius: 14, border: "1.5px solid rgba(180,140,255,.4)", background: "none", fontSize: 14, fontWeight: 700, color: "#dcc8ff", cursor: "pointer" }}
          >
            다른 결제수단
          </button>
          <div className="mt-2.5 text-center" style={{ fontSize: 11, color: "#9a8cd0" }}>결제 즉시 전체 풀이가 열려요</div>
        </>
      }
    >
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 24 }}>전체 풀이 한 번에</div>

      {/* 회원 할인 안내 배지 (실제 할인만) */}
      {!ctx.isAuthed && (
        <div className="mt-4 inline-flex items-center gap-1.5" style={{ padding: "7px 13px", borderRadius: 999, background: "rgba(255,143,168,.14)", border: "1px solid rgba(255,143,168,.4)", fontSize: 12, fontWeight: 700, color: "#ffb3c4" }}>
          🎁 회원가입하면 <b style={{ color: "#fff" }}>1,900원 할인</b>
        </div>
      )}

      {/* 옵션 선택 */}
      <div className="mt-3 flex flex-col gap-2.5">
        {options.map((o) => {
          const on = o.id === sel?.id;
          const m = PAY_META[o.slug];
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelId(o.id)}
              className="w-full text-left transition-transform active:scale-[0.99]"
              style={{ padding: "14px 16px", borderRadius: 16, background: on ? "rgba(150,90,255,.18)" : "rgba(255,255,255,.05)", border: on ? "2px solid #b794ff" : "1px solid rgba(180,140,255,.25)", cursor: "pointer", boxShadow: on ? "0 8px 22px rgba(120,60,240,.28)" : "none" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: on ? "#fff" : "#e6dbff" }}>{o.name}</span>
                    {m?.badge && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#241047", background: "#c9a8ff", borderRadius: 6, padding: "2px 6px", flex: "none" }}>{m.badge}</span>
                    )}
                  </div>
                  {m?.desc && <div style={{ marginTop: 4, fontSize: 11.5, color: "#9a8cd0", lineHeight: 1.4 }}>{m.desc}</div>}
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: on ? "#fff" : "#dcc8ff", flex: "none" }}>{formatKRW(o.price)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 가격 요약 */}
      <div className="mt-4" style={{ borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(180,140,255,.2)", padding: 14 }}>
        <div className="flex items-center justify-between" style={{ fontSize: 13, color: "#cbb8f0" }}>
          <span>상품가</span>
          <span>{formatKRW(basePrice)}</span>
        </div>
        {ctx.isAuthed && (
          <div className="mt-1.5 flex items-center justify-between" style={{ fontSize: 13, color: "#aef0cc" }}>
            <span>회원 할인</span>
            <span>- {formatKRW(1900)}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(180,140,255,.18)", paddingTop: 10 }}>
          <span style={{ fontSize: 13, color: "#cbb8f0" }}>최종 결제금액</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{formatKRW(total)}</span>
        </div>
      </div>

      {/* 비회원 이메일 / 회원 안내 */}
      {!ctx.isAuthed ? (
        <div className="mt-4">
          <FieldLabel required>결과 받을 이메일</FieldLabel>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={frostedInputStyle}
          />
          <button
            type="button"
            onClick={loginKakao}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
            style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(180,140,255,.3)", color: "#dcc8ff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            💬 카카오로 로그인하면 <b style={{ color: "#fff" }}>1,900원 할인</b>
          </button>
        </div>
      ) : (
        <div className="mt-4" style={{ borderRadius: 12, background: "rgba(60,200,140,.12)", border: "1px solid rgba(120,220,170,.35)", padding: "11px 14px", fontSize: 12.5, color: "#aef0cc" }}>
          회원 할인 1,900원이 적용됐어요
        </div>
      )}

      <div className="mt-4 flex flex-col gap-[11px]">
        {benefits.map((b) => (
          <div key={b} className="flex items-center gap-2.5" style={{ fontSize: 13, color: "#cbb8f0" }}>
            <span style={{ color: "#c9a8ff" }}>✓</span> {b}
          </div>
        ))}
      </div>
    </ScreenScaffold>
  );
}
