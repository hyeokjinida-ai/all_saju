"use client";

// 인생사주 퍼널 9화면 — 핸드오프 인생사주 전체플로우 디자인.dc.html 재구현.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { formatKRW } from "@/lib/utils";
import type { FunnelCtx, Gender, Calendar } from "@/lib/funnel/types";
import { ResultScroll } from "@/components/saju/ResultScroll";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";
import type { ResultView } from "@/lib/saju/result-view";
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

// 問 · 고민/질문 한 개 자유 입력 — 첫 화면(고민·상황·바람을 하나로 통합)
export function QuestionScreen({ ctx }: { ctx: FunnelCtx }) {
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={<PrimaryCTA label="다음" onClick={ctx.next} />}
    >
      <QuestionHead hanja="問" title={<>어떤 고민이나<br />궁금한 게 있으세요?</>} sub="고민·질문을 자유롭게 적어주세요" />
      <div className="mt-5">
        <FrostedTextarea
          value={ctx.state.situationText}
          onChange={(v) => ctx.setField("situationText", v)}
          placeholder={"예) 올해 이직해도 될까요? 지금 사람과 잘 맞을까요? 돈은 언제 풀릴까요? — 편하게 적어주세요."}
        />
        <div className="mt-3.5">
          <ReassureBanner tone="violet">
            적어주신 고민을 <b style={{ color: "#fff" }}>가장 먼저, 가장 깊게</b> 풀어드려요
          </ReassureBanner>
        </div>
      </div>
    </ScreenScaffold>
  );
}

// ④-A 名 · 호칭(선택) — 한 화면 하나씩.
export function NicknameScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
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
      <QuestionHead hanja="名" title={<>어떻게<br />불러드릴까요?</>} sub="비워도 괜찮아요 — '회원님'으로 불러드려요" />
      <div className="mt-5">
        <input
          value={p.nickname}
          onChange={(e) => ctx.setProfile("nickname", e.target.value)}
          placeholder="예) 혁진, 김대표"
          style={frostedInputStyle}
        />
      </div>
    </ScreenScaffold>
  );
}

// ④-B 人 · 성별 — 단일 선택, 고르면 220ms 후 자동 진행.
export function GenderScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  const [pending, setPending] = useState<Gender | null>(null);
  const pick = (g: Gender) => {
    if (pending) return;
    setPending(g);
    ctx.setProfile("gender", g);
    setTimeout(() => ctx.next(), 220);
  };
  return (
    <ScreenScaffold header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}>
      <QuestionHead hanja="人" title={<>성별을<br />알려주세요</>} sub="명식 계산에 꼭 필요해요" />
      <div className="mt-5 flex flex-col gap-[11px]">
        {([{ key: "M", label: "남자" }, { key: "F", label: "여자" }] as const).map((o) => {
          const sel = p.gender === o.key || pending === o.key;
          return (
            <OptionRow key={o.key} selected={sel} label={o.label} onClick={() => pick(o.key)} trailing={sel ? <span style={{ fontSize: 16, opacity: 0.8 }}>›</span> : undefined} />
          );
        })}
      </div>
      <p className="mt-5 text-center" style={{ fontSize: 12, color: "#9a8cd0" }}>고르면 다음으로 자동 이동해요</p>
    </ScreenScaffold>
  );
}

// 생년월일 0000.00.00 검증/포맷
function fmtBirth(d: string) {
  const s = d.replace(/\D/g, "").slice(0, 8);
  return [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8)].filter(Boolean).join(".");
}
function isValidBirth(d: string) {
  if (d.length !== 8) return false;
  const y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8);
  if (y < 1930 || y > 2025 || m < 1 || m > 12 || day < 1 || day > 31) return false;
  const dt = new Date(y, m - 1, day);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day;
}

// ④-C 生 · 생년월일(0000.00.00 직접 입력) + 양/음력
export function BirthScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  const [raw, setRaw] = useState(() => p.birthDate.replace(/-/g, ""));
  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    setRaw(digits);
    ctx.setProfile("birthDate", digits.length === 8 && isValidBirth(digits) ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : "");
  };
  const ready = isValidBirth(raw) && !!p.calendar;
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={<PrimaryCTA label="다음" onClick={ctx.next} disabled={!ready} />}
    >
      <QuestionHead hanja="生" title={<>생년월일을<br />입력해 주세요</>} sub="숫자 8자리 — 예) 1992.03.08" />
      <div className="mt-5">
        <input
          inputMode="numeric"
          value={fmtBirth(raw)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0000.00.00"
          style={{ ...frostedInputStyle, fontSize: 19, letterSpacing: "0.08em", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}
        />
        {raw.length > 0 && raw.length < 8 && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#9a8cd0" }}>여덟 자리(연4·월2·일2)를 모두 입력해 주세요</div>
        )}
        {raw.length === 8 && !isValidBirth(raw) && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#ff9a9a" }}>올바른 날짜가 아니에요 (1930~2025)</div>
        )}
      </div>
      <div className="mt-5">
        <FieldLabel required>양/음력</FieldLabel>
        <SegmentToggle<Calendar>
          options={[{ key: "solar", label: "양력" }, { key: "lunar", label: "음력" }]}
          value={p.calendar}
          onChange={(v) => ctx.setProfile("calendar", v)}
        />
      </div>
    </ScreenScaffold>
  );
}

// ④-D 時 · 태어난 시각(선택) + 모름
export function TimeScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  return (
    <ScreenScaffold
      header={<ProgressHeader step={ctx.step} onBack={ctx.prev} />}
      footer={<PrimaryCTA label="입력 확인하기" onClick={ctx.next} />}
    >
      <QuestionHead hanja="時" title={<>태어난 시각을<br />알려주세요</>} sub="모르면 아래 체크 — 시 기둥 빼고 봐드려요" />
      <div className="mt-5">
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
      <div className="mt-4 mb-3 flex items-center gap-3" style={{ color: "#9a8cd0", fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: "rgba(180,140,255,.2)" }} />
        또는
        <span style={{ flex: 1, height: 1, background: "rgba(180,140,255,.2)" }} />
      </div>
      <button
        type="button"
        onClick={() => ctx.setProfile("unknownTime", !p.unknownTime)}
        className="flex w-full items-center justify-between transition-transform active:scale-[0.99]"
        style={{
          padding: "16px 18px",
          borderRadius: 15,
          background: p.unknownTime ? "rgba(150,90,255,.24)" : "rgba(255,255,255,.05)",
          border: p.unknownTime ? "2px solid #b794ff" : "1px solid rgba(180,140,255,.3)",
          cursor: "pointer",
        }}
      >
        <span style={{ textAlign: "left" }}>
          <span style={{ fontSize: 15, fontWeight: p.unknownTime ? 700 : 600, color: p.unknownTime ? "#fff" : "#dcc8ff" }}>태어난 시각을 몰라요</span>
          <br />
          <span style={{ fontSize: 12, color: "#9a8cd0" }}>시 기둥은 빼고 나머지로 정확히 봐드려요</span>
        </span>
        <span
          style={{ flex: "none", width: 24, height: 24, borderRadius: 7, background: p.unknownTime ? "#b794ff" : "rgba(255,255,255,.06)", border: p.unknownTime ? "none" : "1.5px solid rgba(180,140,255,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#1b0d3c" }}
        >
          {p.unknownTime ? "✓" : ""}
        </span>
      </button>
    </ScreenScaffold>
  );
}

// ⑤ 확인
export function ConfirmScreen({ ctx }: { ctx: FunnelCtx }) {
  const { state } = ctx;
  const p = state.profile;
  const rows: { label: string; value: string; to: Parameters<typeof ctx.goTo>[0] }[] = [
    { label: "호칭", value: p.nickname.trim() || "회원님", to: "nickname" },
    { label: "성별", value: p.gender === "M" ? "남자" : p.gender === "F" ? "여자" : "—", to: "gender" },
    { label: "생년월일", value: `${p.birthDate ? p.birthDate.replace(/-/g, ".") : "—"} · ${p.calendar === "lunar" ? "음력" : "양력"}`, to: "birth" },
    { label: "태어난 시각", value: p.unknownTime ? "모름 (시 제외)" : p.birthTime ? SIJU.find((s) => s.v === p.birthTime)?.label ?? p.birthTime : "선택 안 함", to: "time" },
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
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#dcc8ff", marginBottom: 6 }}>내가 적은 고민·질문</div>
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

// ⑥ 무료 기본 분석 — 같은 결과지 디자인을 "잠금(무료)" 모드로. 점수까지 공개, 상세는 결제 후.
//    /api/saju/chart 가 명식+오행+영역별 점수까지 담은 ResultView 를 돌려준다(LLM 없음 · 만세력 1콜).
const RESULT_BG = "radial-gradient(90% 55% at 50% 0%,#16112c,#0b0816 58%,#070410)";

export function AnalysisScreen({ ctx }: { ctx: FunnelCtx }) {
  const p = ctx.state.profile;
  const [view, setView] = useState<ResultView | null>(null);
  const [failed, setFailed] = useState(false);
  const [minDone, setMinDone] = useState(false);

  // 분석중 화면(나경반+후기) 최소 노출 — 너무 빨리 지나가지 않게 기대감 형성.
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 2800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!p.birthDate || !p.gender) return;
    let alive = true;
    setFailed(false);
    fetch("/api/saju/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: p.birthDate,
        birthTime: p.birthTime || null,
        timeUnknown: p.unknownTime,
        gender: p.gender === "M" ? "male" : "female",
        calendar: p.calendar,
        nickname: p.nickname || undefined,
        concerns: ctx.state.situationText.trim() ? [ctx.state.situationText.trim()] : [],
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.ok && d.view) setView(d.view as ResultView);
        else setFailed(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [p.birthDate, p.birthTime, p.unknownTime, p.gender, p.calendar, p.nickname, ctx.state.situationText]);

  // 분석중 — 최소 노출 전이거나 결과/실패가 아직이면 회전 나경반 + 후기 화면
  if (!minDone || (!view && !failed)) {
    return <AnalyzingScreen variant="free" name={p.nickname} onBack={ctx.prev} />;
  }

  return (
    <div className="relative flex min-h-screen w-full justify-center text-white" style={{ background: RESULT_BG, backgroundColor: "#0a0715" }}>
      <div className="relative flex min-h-screen w-full max-w-[420px] flex-col">
        {/* 뒤로 */}
        <div className="flex-none px-5 pt-4">
          <button type="button" onClick={ctx.prev} aria-label="뒤로" style={{ fontSize: 22, lineHeight: 1, background: "none", border: "none", color: "#dcd0ff", cursor: "pointer" }}>
            ‹
          </button>
        </div>
        {/* 본문 — 잠금(무료) 결과지 미리보기 */}
        <div className="flex-1 overflow-y-auto">
          {view ? (
            <ResultScroll view={view} embedded locked />
          ) : (
            <div className="flex flex-col items-center justify-center px-8 text-center" style={{ minHeight: 360 }}>
              <div style={{ fontFamily: "'Ma Shan Zheng', cursive", fontSize: 42, color: "#c9a8ff" }}>命</div>
              <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#cbb8f0" }}>
                명식을 불러오지 못했어요. 그래도 전체 풀이는 받을 수 있어요.
              </div>
            </div>
          )}
        </div>
        {/* 결제 CTA */}
        <div className="flex-none px-5 pb-7 pt-3">
          <PrimaryCTA label="전체 풀이 받기" onClick={ctx.next} />
        </div>
      </div>
    </div>
  );
}

// ⑥-B 信 · 결과 받을 이메일(결제 직전) — 비회원은 이메일, 회원은 계정으로 수령.
export function EmailScreen({ ctx }: { ctx: FunnelCtx }) {
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ctx.state.email.trim());
  const header = (
    <div className="flex items-center justify-between" style={{ color: "#dcd0ff" }}>
      <button type="button" onClick={ctx.prev} aria-label="뒤로" style={{ fontSize: 22, background: "none", border: "none", color: "#dcd0ff", cursor: "pointer" }}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 700 }}>결과 받기</span>
      <span style={{ opacity: 0, fontSize: 22 }}>‹</span>
    </div>
  );

  if (ctx.isAuthed) {
    return (
      <ScreenScaffold header={header} footer={<PrimaryCTA label="다음" onClick={ctx.next} />}>
        <QuestionHead hanja="信" title={<>결과는<br />계정으로 보내드려요</>} sub="이미 로그인하셨어요 — 따로 이메일을 안 받아도 돼요" />
        <div className="mt-5">
          <ReassureBanner tone="green">회원 할인 <b style={{ color: "#dffff0" }}>1,900원</b>이 적용돼요</ReassureBanner>
        </div>
      </ScreenScaffold>
    );
  }
  return (
    <ScreenScaffold header={header} footer={<PrimaryCTA label="다음" onClick={ctx.next} disabled={!valid} />}>
      <QuestionHead hanja="信" title={<>결과 받을<br />이메일을 알려주세요</>} sub="분석이 끝나면 이 메일로 결과를 보내드려요" />
      <div className="mt-5">
        <input
          type="email"
          inputMode="email"
          value={ctx.state.email}
          onChange={(e) => ctx.setField("email", e.target.value)}
          placeholder="you@example.com"
          style={frostedInputStyle}
        />
      </div>
    </ScreenScaffold>
  );
}

// ⑦ 결제 — 옵션(상품) 선택형. 정가 → 회원 할인가(−1,900, 실제 할인) 표시. 이메일은 앞 단계(EmailScreen)에서 받음.
// 주문 생성(/api/orders/create) → 체크아웃. 가짜 할인앵커는 쓰지 않음(실제 회원 할인만 · 표시광고법 준수).
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
  const email = ctx.state.email; // 앞 단계(EmailScreen)에서 받은 결과 수령 이메일
  const sel = options.find((o) => o.id === selId) ?? ctx.product ?? options[0] ?? null;
  const basePrice = sel?.price ?? 6900;
  const discount = ctx.isAuthed ? 1900 : 0;
  const total = Math.max(0, basePrice - discount);
  const memberPrice = Math.max(0, basePrice - 1900); // 회원 할인가(정가 −1,900)
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
          concerns: ctx.state.situationText.trim() ? [ctx.state.situationText.trim()] : [],
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
                <div style={{ flex: "none", textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: on ? "#fff" : "#dcc8ff" }}>{formatKRW(o.price)}</div>
                  <div style={{ fontSize: 10.5, color: "#9fe1cb", marginTop: 2 }}>회원가 {formatKRW(Math.max(0, o.price - 1900))}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 가격 요약 — 정가 → 회원 할인가(실제 할인) */}
      <div className="mt-4" style={{ borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(180,140,255,.2)", padding: 14 }}>
        <div className="flex items-center justify-between" style={{ fontSize: 13, color: "#cbb8f0" }}>
          <span>정가</span>
          <span style={ctx.isAuthed ? { textDecoration: "line-through", color: "#9a8cd0" } : undefined}>{formatKRW(basePrice)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between" style={{ fontSize: 13, color: "#9fe1cb" }}>
          <span>회원 할인{ctx.isAuthed ? "" : " (로그인 시)"}</span>
          <span>− {formatKRW(1900)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(180,140,255,.18)", paddingTop: 10 }}>
          <span style={{ fontSize: 13, color: "#cbb8f0" }}>최종 결제금액</span>
          <span className="flex items-baseline gap-1.5">
            {ctx.isAuthed && <span style={{ fontSize: 13, textDecoration: "line-through", color: "#9a8cd0" }}>{formatKRW(basePrice)}</span>}
            <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{formatKRW(total)}</span>
          </span>
        </div>
        {!ctx.isAuthed && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5" style={{ fontSize: 12, color: "#ffd9e2", background: "rgba(255,143,168,.12)", border: "1px solid rgba(255,143,168,.3)", borderRadius: 10, padding: "8px 10px" }}>
            🎁 로그인하면 <span style={{ textDecoration: "line-through", color: "#caa" }}>{formatKRW(basePrice)}</span> → <b style={{ color: "#fff" }}>{formatKRW(memberPrice)}</b>
          </div>
        )}
      </div>

      {/* 결과 수령 안내 — 이메일은 앞 단계(EmailScreen)에서 받음 */}
      {!ctx.isAuthed ? (
        <div className="mt-4">
          {email && (
            <div style={{ fontSize: 12.5, color: "#cbb8f0", marginBottom: 10 }}>
              결과는 <b style={{ color: "#fff" }}>{email}</b> 로 보내드려요
            </div>
          )}
          <button
            type="button"
            onClick={loginKakao}
            className="flex w-full items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
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
