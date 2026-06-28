// 자수정 퍼널 공통 프리미티브 — 핸드오프 design_handoff_saju_flow 토큰 기준.
import type { CSSProperties, ReactNode } from "react";

export const LANDING_BG =
  "radial-gradient(120% 60% at 50% 4%, #5a2db0, #34186e 46%, #1b0d3c 72%, #120726)";
export const FUNNEL_BG =
  "radial-gradient(120% 60% at 50% 4%, #4a2da0, #2c1668 50%, #14092e)";

// 화면 골격 — 풀스크린 그라데이션 + 모바일 컬럼(헤더/본문/푸터 3슬롯)
export function ScreenScaffold({
  bg = FUNNEL_BG,
  header,
  footer,
  children,
}: {
  bg?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen w-full justify-center overflow-hidden text-white"
      style={{ background: bg, backgroundColor: "#160a36" }}
    >
      <div className="relative flex min-h-screen w-full max-w-[420px] flex-col">
        {header && <div className="flex-none px-[22px] pt-4">{header}</div>}
        <div className="flex-1 overflow-y-auto px-[26px] pt-6">{children}</div>
        {footer && <div className="flex-none px-6 pb-7 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

// 상단 진행 인디케이터(6점) + 뒤로 + n/6
export function ProgressHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between" style={{ color: "#dcd0ff" }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로"
        className="text-[22px] leading-none"
        style={{ color: "#dcd0ff", background: "none", border: "none", cursor: onBack ? "pointer" : "default", width: 24, textAlign: "left" }}
      >
        ‹
      </button>
      <div className="flex items-center gap-[5px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: i === step ? 18 : 5,
              height: 5,
              borderRadius: 3,
              background: i === step ? "#c9a8ff" : i < step ? "#9a6cff" : "rgba(200,170,255,.3)",
              transition: "width .2s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#b8a4e0" }}>{step}/3</span>
    </div>
  );
}

// 한자 헤더(状惑述望) + 질문(명조) + 보조
export function QuestionHead({ hanja, title, sub }: { hanja: string; title: ReactNode; sub: string }) {
  return (
    <>
      <div style={{ fontFamily: "'Ma Shan Zheng', cursive", fontSize: 44, color: "#c9a8ff", lineHeight: 1 }}>{hanja}</div>
      <div
        style={{ marginTop: 13, fontFamily: "'Nanum Myeongjo', serif", fontWeight: 800, fontSize: 24, lineHeight: 1.3 }}
      >
        {title}
      </div>
      <div style={{ marginTop: 7, fontSize: 13.5, color: "#b8a4e0" }}>{sub}</div>
    </>
  );
}

// 선택 옵션 행 (단일=› · 복수=✓)
export function OptionRow({
  selected,
  label,
  onClick,
  trailing,
  compact,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between text-left transition-transform active:scale-[0.99]"
      style={{
        padding: compact ? "14px 16px" : "17px 18px",
        borderRadius: compact ? 14 : 15,
        background: selected ? "rgba(150,90,255,.24)" : "rgba(255,255,255,.05)",
        border: selected ? "2px solid #b794ff" : "1px solid rgba(180,140,255,.25)",
        fontSize: compact ? 14.5 : 15,
        fontWeight: selected ? 700 : 600,
        color: selected ? "#fff" : "#cbb8f0",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      {trailing}
    </button>
  );
}

// 흰색 Primary CTA
export function PrimaryCTA({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full text-center transition-transform active:scale-[0.98]"
      style={{
        padding: 16,
        borderRadius: 16,
        background: disabled ? "rgba(255,255,255,.18)" : "linear-gradient(180deg,#fff,#f1eaff)",
        color: disabled ? "rgba(255,255,255,.5)" : "#3a1a8a",
        fontWeight: 800,
        fontSize: 15.5,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 12px 26px rgba(120,60,240,.4)",
      }}
    >
      {label}
    </button>
  );
}

export function SkipLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-2.5 text-center">
      <button
        type="button"
        onClick={onClick}
        style={{ fontSize: 13, fontWeight: 600, color: "#9a8cd0", background: "none", border: "none", cursor: "pointer" }}
      >
        {label}
      </button>
    </div>
  );
}

// 안심 배너 — 보라(violet) / 녹색(green)
export function ReassureBanner({ tone, children }: { tone: "violet" | "green"; children: ReactNode }) {
  const v = tone === "violet";
  return (
    <div
      style={{
        padding: "11px 14px",
        borderRadius: 12,
        background: v ? "rgba(150,90,255,.16)" : "rgba(60,200,140,.12)",
        border: `1px solid ${v ? "rgba(180,140,255,.35)" : "rgba(120,220,170,.35)"}`,
        fontSize: 12.5,
        lineHeight: 1.45,
        color: v ? "#dcc8ff" : "#aef0cc",
      }}
    >
      {children}
    </div>
  );
}

// 프로스티드 텍스트영역 + 글자수
export function FrostedTextarea({
  value,
  onChange,
  placeholder,
  max = 500,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        rows={5}
        style={{
          width: "100%",
          boxSizing: "border-box",
          borderRadius: 16,
          background: "rgba(255,255,255,.06)",
          border: "1.5px solid rgba(180,140,255,.3)",
          padding: 16,
          minHeight: 130,
          fontSize: 14,
          lineHeight: 1.7,
          color: "#fff",
          outline: "none",
          resize: "none",
          fontFamily: "'Pretendard', sans-serif",
        }}
      />
      <div style={{ textAlign: "right", marginTop: 8, fontSize: 11, color: "#9a8cd0" }}>
        {value.length} / {max}
      </div>
    </div>
  );
}

// 2분할 세그먼트 토글
export function SegmentToggle<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: { key: T; label: string }[];
  value?: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex" style={{ gap: compact ? 5 : 8 }}>
      {options.map((o) => {
        const sel = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              flex: 1,
              borderRadius: compact ? 10 : 12,
              background: sel ? "rgba(150,90,255,.24)" : "rgba(255,255,255,.05)",
              border: sel ? "2px solid #b794ff" : "1px solid rgba(180,140,255,.25)",
              padding: compact ? 9 : 12,
              textAlign: "center",
              fontSize: compact ? 13 : 14,
              fontWeight: sel ? 700 : 600,
              color: sel ? "#fff" : "#cbb8f0",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#cbb8f0", marginBottom: 7 }}>
      {children}
      {required && <span style={{ color: "#ff8fa8" }}> *</span>}
    </div>
  );
}

export const frostedInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(180,140,255,.28)",
  padding: "13px 14px",
  fontSize: 13.5,
  color: "#fff",
  outline: "none",
  fontFamily: "'Pretendard', sans-serif",
};
