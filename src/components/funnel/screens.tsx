"use client";

// 인생사주 퍼널 9화면 — 핸드오프 인생사주 전체플로우 디자인.dc.html 재구현.
import Link from "next/link";
import type { FunnelCtx, Gender, Calendar } from "@/lib/funnel/types";
import { LIFE_STAGES, CONCERNS, lifeStageShort, concernShort } from "@/lib/funnel/options";
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

// ② 카카오 로그인
export function LoginScreen({ ctx }: { ctx: FunnelCtx }) {
  return (
    <ScreenScaffold
      bg={LANDING_BG}
      footer={
        <>
          <button
            type="button"
            onClick={ctx.next}
            className="flex w-full items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
            style={{ padding: 16, borderRadius: 14, background: "#FEE500", color: "#2b2b2b", fontWeight: 800, fontSize: 15.5, border: "none", cursor: "pointer", boxShadow: "0 12px 26px rgba(180,160,0,.25)" }}
          >
            <span style={{ fontSize: 18 }}>💬</span> 카카오로 계속하기
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
          3초 만에 시작하기
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#cdb8f5" }}>
          로그인하면 입력하던 내용이
          <br />
          자동으로 저장돼요
        </p>
      </div>
    </ScreenScaffold>
  );
}

// ③-A 状 · 인생 단계 (단일 선택 → 220ms 자동 진행)
export function StateScreen({ ctx }: { ctx: FunnelCtx }) {
  const pick = (key: (typeof LIFE_STAGES)[number]["key"]) => {
    ctx.setLifeStage(key);
    setTimeout(() => ctx.next(), 220);
  };
  return (
    <ScreenScaffold
      header={<ProgressHeader step={1} onBack={ctx.prev} />}
      footer={<div style={{ textAlign: "center", fontSize: 12, color: "#9a8cd0" }}>고르면 다음으로 자동 이동해요</div>}
    >
      <QuestionHead hanja="状" title={<>지금, 인생의<br />어느 길목에 계신가요?</>} sub="한 가지만 골라 주세요" />
      <div className="mt-7 flex flex-col gap-[11px]">
        {LIFE_STAGES.map((s) => (
          <OptionRow
            key={s.key}
            selected={ctx.state.lifeStage === s.key}
            label={s.label}
            onClick={() => pick(s.key)}
            trailing={ctx.state.lifeStage === s.key ? <span style={{ fontSize: 16 }}>›</span> : undefined}
          />
        ))}
      </div>
    </ScreenScaffold>
  );
}

// ③-B 惑 · 고민 (복수, 최소 1)
export function ConcernsScreen({ ctx }: { ctx: FunnelCtx }) {
  const has = ctx.state.concerns.length > 0;
  return (
    <ScreenScaffold
      header={<ProgressHeader step={2} onBack={ctx.prev} />}
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
      header={<ProgressHeader step={3} onBack={ctx.prev} />}
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
      header={<ProgressHeader step={4} onBack={ctx.prev} />}
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
      header={<ProgressHeader step={5} onBack={ctx.prev} />}
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
        <div className="flex gap-2.5">
          <div className="flex-1">
            <FieldLabel required>양/음력</FieldLabel>
            <SegmentToggle<Calendar>
              compact
              options={[{ key: "solar", label: "양" }, { key: "lunar", label: "음" }]}
              value={p.calendar}
              onChange={(v) => ctx.setProfile("calendar", v)}
            />
          </div>
          <div className="flex-1">
            <FieldLabel>태어난 시각</FieldLabel>
            <select
              value={p.birthTime}
              disabled={p.unknownTime}
              onChange={(e) => ctx.setProfile("birthTime", e.target.value)}
              style={{ ...frostedInputStyle, padding: 9, fontSize: 13, opacity: p.unknownTime ? 0.4 : 1, colorScheme: "dark" }}
            >
              <option value="">선택</option>
              {SIJU.map((s) => (
                <option key={s.v} value={s.v}>{s.label}</option>
              ))}
            </select>
          </div>
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
    { label: "인생 단계", value: lifeStageShort(state.lifeStage) || "선택 안 함", to: "state" },
    { label: "고민", value: state.concerns.map(concernShort).join(" · ") || "선택 안 함", to: "concerns" },
    { label: "생년월일", value: p.birthDate ? p.birthDate.replace(/-/g, ".") : "—", to: "profile" },
    { label: "성별 · 달력", value: `${p.gender === "M" ? "남" : p.gender === "F" ? "여" : "—"} · ${p.calendar === "lunar" ? "음력" : "양력"}`, to: "profile" },
  ];
  return (
    <ScreenScaffold
      header={<ProgressHeader step={6} onBack={ctx.prev} />}
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

// ⑥ 무료 기본 분석 — ⚠️ 명식/오행은 대표값(placeholder). 실제 명식 API 연동은 후속.
const PILLARS = [
  { ch: "己", fire: false },
  { ch: "丙", fire: true },
  { ch: "壬", fire: false },
  { ch: "甲", fire: false },
];
const OHAENG = [
  { label: "木", h: 60, c: "linear-gradient(180deg,#7fc8a0,#3a9a6c)" },
  { label: "火", h: 90, c: "linear-gradient(180deg,#ff9a7a,#d0563c)" },
  { label: "土", h: 45, c: "linear-gradient(180deg,#e4c878,#b4933a)" },
  { label: "金", h: 32, c: "linear-gradient(180deg,#c8cdd4,#9098a4)" },
  { label: "水", h: 70, c: "linear-gradient(180deg,#88a8e0,#4868c0)" },
];
export function AnalysisScreen({ ctx }: { ctx: FunnelCtx }) {
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
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 22 }}>
        {ctx.state.profile.nickname || "회원"}님의 사주 원국
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {PILLARS.map((p, i) => (
          <div
            key={i}
            style={{ aspectRatio: "0.78", borderRadius: 12, background: p.fire ? "rgba(255,150,110,.2)" : "rgba(180,140,255,.16)", border: `1px solid ${p.fire ? "rgba(255,160,120,.4)" : "rgba(180,140,255,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Ma Shan Zheng', cursive", fontSize: 30, color: p.fire ? "#ffc4b8" : "#e6dbff" }}
          >
            {p.ch}
          </div>
        ))}
      </div>
      <div className="mt-[18px]" style={{ fontSize: 12.5, fontWeight: 700, color: "#cbb8f0" }}>오행 분포</div>
      <div className="mt-2 flex items-end gap-1.5" style={{ height: 46 }}>
        {OHAENG.map((o) => (
          <div key={o.label} style={{ flex: 1, height: `${o.h}%`, background: o.c, borderRadius: "5px 5px 0 0" }} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" style={{ fontSize: 11, color: "#9a8cd0" }}>
        {OHAENG.map((o) => (
          <span key={o.label} style={{ flex: 1, textAlign: "center" }}>{o.label}</span>
        ))}
      </div>
      <div className="mt-4" style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, color: "#cbb8f0" }}>
        {ctx.state.profile.nickname || "회원"}님은 <b style={{ color: "#ffc4b8" }}>火 기운이 강한 추진력형</b> — 재물운부터 풀어드릴게요…
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

// ⑦ 결제 — 결제 연동은 후속. 지금은 기존 체크아웃으로 연결.
export function PaymentScreen({ ctx }: { ctx: FunnelCtx }) {
  const benefits = ["재물·애정·직업·건강 전 영역", "대운 흐름 + 올해 월별 운세", "내가 적은 고민 맞춤 조언"];
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
          <Link href="/products/premium-saju" className="flex w-full items-center justify-center gap-2 transition-transform active:scale-[0.98]" style={{ padding: 16, borderRadius: 14, background: "#FEE500", color: "#2b2b2b", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
            💬 카카오페이로 결제
          </Link>
          <Link href="/products/premium-saju" className="mt-2.5 block w-full text-center" style={{ padding: 13, borderRadius: 14, border: "1.5px solid rgba(180,140,255,.4)", fontSize: 14, fontWeight: 700, color: "#dcc8ff", textDecoration: "none" }}>
            다른 결제수단
          </Link>
          <div className="mt-2.5 text-center" style={{ fontSize: 11, color: "#9a8cd0" }}>결제 즉시 전체 풀이가 열려요</div>
        </>
      }
    >
      <div style={{ fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 24 }}>전체 풀이 한 번에</div>
      <div className="mt-5" style={{ borderRadius: 18, border: "2px solid #b794ff", background: "rgba(150,90,255,.16)", padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#dcc8ff" }}>인생사주 종합 풀이</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span style={{ fontWeight: 800, fontSize: 30, color: "#fff" }}>14,900원</span>
          <span style={{ fontSize: 14, color: "#9a8cd0", textDecoration: "line-through" }}>29,000원</span>
        </div>
        <div className="mt-1" style={{ fontSize: 11.5, color: "#b8a4e0" }}>단일가 · 평생 다시 보기</div>
      </div>
      <div className="mt-5 flex flex-col gap-[11px]">
        {benefits.map((b) => (
          <div key={b} className="flex items-center gap-2.5" style={{ fontSize: 13, color: "#cbb8f0" }}>
            <span style={{ color: "#c9a8ff" }}>✓</span> {b}
          </div>
        ))}
      </div>
    </ScreenScaffold>
  );
}
