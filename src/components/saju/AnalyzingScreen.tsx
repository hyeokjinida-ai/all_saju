"use client";

// 분석중 화면 — 회전 나경반 + 진행바 + 먼저 받아본 분들의 후기로 대기 시간을 채운다.
// variant: "paid"(결제 후 ⑧) / "free"(무료 분석 로딩). 핸드오프 디자인 재현.
// ⚠️ 핸드오프의 "★4.9 · 2,418명" 가짜 집계는 표시광고법 리스크라 넣지 않음(후기 카드만).
import { useEffect, useState } from "react";
import { Naegyeongban } from "@/components/landing/saju-lab/Naegyeongban";

// 진행바(pct)에 맞춰 하나씩 체크되는 실제 작업 단계. 실제로 서버가 하는 일 순서 그대로다.
const WORKING_STEPS: { at: number; label: string }[] = [
  { at: 0, label: "만세력에서 여덟 글자를 꺼내는 중" },
  { at: 30, label: "대운·세운을 맞춰보는 중" },
  { at: 55, label: "돈과 인연이 들어오는 달을 셈하는 중" },
  { at: 78, label: "적어주신 물음에 답을 적는 중" },
];

// 산군 금색 — 위저드의 gold-bright(#e8c96a) 계열. 결제 직전 화면과 같은 색이어야 세계관이 이어진다.
const SANGUN_GOLD = "#e8c96a";

export function AnalyzingScreen({
  name,
  variant = "paid",
  theme,
  onBack,
}: {
  name?: string | null;
  variant?: "paid" | "free";
  // "sangun": 산군 신점 전용 — 결제 직전까지 검정+금+반말(신당 세계관)인데 대기 화면만
  // 보라 나경반+존댓말이면 세계관이 끊긴다(타이트는 결제 후 로딩에도 같은 캐릭터가 말을 건다).
  theme?: "sangun";
  onBack?: () => void;
}) {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    const t = setInterval(() => {
      setPct((p) => (p >= 92 ? 92 : p + Math.max(1, Math.round((92 - p) * 0.06))));
    }, 700);
    return () => clearInterval(t);
  }, []);

  const who = name?.trim() ? `${name.trim()}님` : "회원님";
  const paid = variant === "paid";
  const sangun = theme === "sangun";
  // 포인트 색 — 기본은 보라, 산군은 금. 구조는 같고 칠만 갈아입는다.
  const accent = sangun ? SANGUN_GOLD : "#c9a8ff";

  return (
    <div
      className="relative flex min-h-screen w-full justify-center overflow-hidden text-white"
      style={
        sangun
          ? { background: "#0a0908" } // 신당의 어둠 — 위저드와 같은 검정 바닥
          : { background: "radial-gradient(120% 62% at 50% 0%, #1d1432, #110b22 54%, #070414)", backgroundColor: "#0a0715" }
      }
    >
      {sangun ? (
        <>
          {/* 산군 얼굴 — 결제 직전 위저드와 같은 배경을 이어받아 세계관을 유지 */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: "url(/products/sangun/face.webp)",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: 0.5,
            }}
          />
          {/* 어두운 그라데이션 — 글자 자리 가독 확보. 위저드 오버레이 값 그대로 */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: "linear-gradient(rgba(7,6,9,0.58) 0%, rgba(7,6,9,0.22) 36%, rgba(7,6,9,0.9) 74%)" }}
          />
        </>
      ) : (
        <>
          {/* 배경 나경반(회전) */}
          <div className="pointer-events-none absolute left-1/2 top-[16%] z-0 -translate-x-1/2" style={{ opacity: 0.42 }}>
            <Naegyeongban size={360} />
          </div>
          {/* 스크림 — 하단으로 갈수록 진하게(후기 가독성) */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: "linear-gradient(180deg,rgba(10,7,20,.25) 0%,rgba(10,7,20,.55) 42%,rgba(10,7,20,.94) 100%)" }}
          />
        </>
      )}

      <div className="relative z-10 flex min-h-screen w-full max-w-[420px] flex-col px-7 pb-8 pt-5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="뒤로" className="flex-none self-start" style={{ fontSize: 22, lineHeight: 1, background: "none", border: "none", color: "#dcd0ff", cursor: "pointer" }}>
            ‹
          </button>
        )}

        {/* 상단 — 칩 + 제목 + 진행바 */}
        <div className="flex-none" style={{ marginTop: onBack ? 8 : 24, textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 999,
              background: sangun ? "rgba(232,201,106,.13)" : paid ? "rgba(80,210,150,.16)" : "rgba(150,90,255,.18)",
              border: `1px solid ${sangun ? "rgba(232,201,106,.4)" : paid ? "rgba(120,220,170,.4)" : "rgba(180,140,255,.4)"}`,
              fontSize: 12,
              fontWeight: 700,
              color: sangun ? SANGUN_GOLD : paid ? "#aef0cc" : "#dcc8ff",
            }}
          >
            {paid ? "✓ 결제 완료" : "✦ 무료 분석"}
          </span>
          {/* 나경반 대신 — 위저드 로딩과 같은 금색 命 (SajuWizard의 animate-pulse 패턴 재사용) */}
          {sangun && (
            <span className="font-brush animate-pulse block leading-none" style={{ marginTop: 18, fontSize: 44, color: SANGUN_GOLD }}>
              命
            </span>
          )}
          <h1 style={{ marginTop: 16, fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 24, lineHeight: 1.35 }}>
            {sangun ? (
              "네 장부를 쓰는 중이다"
            ) : (
              <>
                {who}의 여덟 글자를
                <br />
                깊이 읽고 있어요
              </>
            )}
          </h1>
          <p style={{ marginTop: 10, fontSize: 13, color: sangun ? "#cfc0a0" : "#cbb8f0" }}>
            {sangun ? "산군이 붓을 들었다. 잠시 기다려라." : paid ? "잠시만요, 약 15초면 완성돼요" : "잠시만요, 곧 결과가 나와요"}
          </p>
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: sangun ? "linear-gradient(90deg,#9a7a2e,#e8c96a)" : "linear-gradient(90deg,#8a5cf0,#c9a8ff)", transition: "width .6s ease" }} />
            </div>
            <div style={{ marginTop: 7, fontSize: 12, color: sangun ? "#b3a374" : "#b8a4e0", textAlign: "right" }}>{pct}%</div>
          </div>
        </div>

        <div className="flex-1" style={{ minHeight: 24 }} />

        {/* 하단 — 지금 실제로 하는 일.
            원래 여기에 lib/reviews.ts 의 샘플 후기 2장(이름·날짜·별점 전부 지어낸 값)이 떴다.
            SHOW_SOCIAL_PROOF 게이트를 안 타서 결제한 사람이 반드시 봤다. 실후기가 쌓이기 전까지
            거짓을 띄우느니 진행 상황을 보여주는 편이 대기 이탈에도 낫다. */}
        <div className="flex-none">
          <div style={{ fontSize: 12.5, fontWeight: 700, color: sangun ? "#cfc0a0" : "#cbb8f0", marginBottom: 10 }}>지금 하는 일</div>
          <div className="flex flex-col gap-2">
            {WORKING_STEPS.map((s, i) => {
              const done = pct >= s.at;
              // 산군 테마: 구조는 그대로, 칠만 보라→금. "적어주신"만은 존댓말이라 반말로 바꾼다
              // (한 단어라도 존댓말이 섞이면 세계관이 깨진다).
              const label = sangun && s.label === "적어주신 물음에 답을 적는 중" ? "네 물음에 답을 적는 중" : s.label;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5"
                  style={{
                    padding: "11px 13px",
                    borderRadius: 12,
                    background: sangun
                      ? done ? "rgba(46,36,14,.55)" : "rgba(46,36,14,.28)"
                      : done ? "rgba(40,22,72,.55)" : "rgba(40,22,72,.28)",
                    border: `1px solid ${
                      sangun
                        ? done ? "rgba(232,201,106,.30)" : "rgba(232,201,106,.14)"
                        : done ? "rgba(160,120,255,.30)" : "rgba(160,120,255,.14)"
                    }`,
                    transition: "background .4s, border-color .4s",
                  }}
                >
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: "50%", flex: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      color: done ? (sangun ? "#1a1408" : "#0f0a1c") : sangun ? "#8a7b55" : "#7a6aa8",
                      background: done ? accent : "transparent",
                      border: done ? "none" : `1px solid ${sangun ? "rgba(232,201,106,.35)" : "rgba(160,120,255,.35)"}`,
                    }}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span style={{ fontSize: 12, color: done ? (sangun ? "#f0e6cc" : "#e4dbff") : sangun ? "#8a7b55" : "#8f81bd" }}>{label}</span>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.5, color: sangun ? "#a08c60" : "#9a8cd0", textAlign: "center" }}>
            {sangun ? "창을 닫아도 네 장부는 남는다" : "창을 닫아도 결과는 안전하게 저장돼요"}
          </p>
        </div>
      </div>
    </div>
  );
}
