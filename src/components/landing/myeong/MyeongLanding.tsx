"use client";

// 명운록 — 시네마틱 상세페이지 (14 섹션). 핸드오프 landing-1/2/3/5.jsx 이식.
// 프로토타입의 카카오 상담 CTA / window.__autoFlowStart 는 모두 우리 퍼널 진입(/products)으로 교체.

import Link from "next/link";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import {
  MountainScene,
  GalaxyScene,
  SmokeBand,
  SunRadiant,
  LunarMansionChart,
  AlmanacPage,
  BigLandscape,
} from "./Scenery";

const FUNNEL_HREF = "/products/basic-saju";

// ──────────────────────────────────────────────────────
// 공통 atoms
// ──────────────────────────────────────────────────────
function GoldDivider({ width = 80 }: { width?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
      <div className="gold-rule" style={{ width }} />
    </div>
  );
}

function SectionLabel({
  index,
  hanja,
  label,
  color = "var(--gold)",
}: {
  index: string;
  hanja: string;
  label: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color,
        marginBottom: 18,
      }}
    >
      <div style={{ width: 24, height: 1, background: "currentColor", opacity: 0.5 }} />
      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.4em" }}>{index}</span>
      <span className="brush" style={{ fontSize: 18, letterSpacing: 0, lineHeight: 1 }}>{hanja}</span>
      <span className="myeongjo" style={{ fontSize: 10, letterSpacing: "0.3em" }}>{label}</span>
      <div style={{ width: 24, height: 1, background: "currentColor", opacity: 0.5 }} />
    </div>
  );
}

// 골드 CTA — 무료 명식 퍼널 입구(/products/basic-saju)로 이동
function CTAButton({ sub, label = "내 사주 풀이 보기" }: { sub?: string; label?: string }) {
  return (
    <Link
      href={FUNNEL_HREF}
      style={{
        width: "100%",
        minHeight: 58,
        background: "linear-gradient(180deg, #e8c878 0%, #d4af6a 100%)",
        color: "var(--wine-deep)",
        border: "none",
        cursor: "pointer",
        fontFamily: "'Noto Serif KR', serif",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: "0.12em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: "0 0 24px rgba(212,175,106,0.3)",
        textDecoration: "none",
      }}
    >
      <span>{label}</span>
      <span className="brush" style={{ fontSize: 20, letterSpacing: 0 }}>命</span>
      {sub && (
        <span style={{ fontWeight: 400, fontSize: 11, letterSpacing: "0.2em", opacity: 0.7 }}>{sub}</span>
      )}
    </Link>
  );
}

// 보조 링크 — 결과 예시(샘플) 섹션으로 스크롤
function SecondaryLink({ href = "#sample", label }: { href?: string; label: string }) {
  return (
    <div style={{ marginTop: 14, textAlign: "center" }}>
      <Link
        href={href}
        className="myeongjo"
        style={{ fontSize: 12.5, color: "var(--bone-soft)", letterSpacing: "0.1em", textDecorationLine: "underline", textUnderlineOffset: 4 }}
      >
        {label}
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 01 — HERO
// ──────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section
      className="scene-wine"
      style={{
        position: "relative",
        minHeight: 800,
        overflow: "hidden",
        padding: "76px 26px 50px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="starfield" style={{ opacity: 0.4 }} />
      <div className="vignette" />

      <div
        className="fade-up"
        style={{
          position: "relative",
          zIndex: 2,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div style={{ width: 18, height: 1, background: "var(--gold)" }} />
        <div className="mono" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.4em" }}>EST · 2026</div>
        <div style={{ width: 18, height: 1, background: "var(--gold)" }} />
      </div>

      <div className="fade-up" style={{ position: "relative", zIndex: 2 }}>
        <div
          className="gold-frame"
          style={{ margin: "0 auto", maxWidth: 280, padding: "28px 18px 24px", background: "rgba(13,6,8,0.35)" }}
        >
          <div
            className="brush glow-gold"
            style={{ fontSize: 64, lineHeight: 1.05, color: "var(--gold-bright)", letterSpacing: "0.08em" }}
          >
            命運錄
          </div>
          <div
            className="myeongjo"
            style={{ fontSize: 14, color: "var(--bone-soft)", letterSpacing: "0.5em", marginTop: 6, fontWeight: 500 }}
          >
            명 · 운 · 록
          </div>
          <div className="gold-rule" style={{ width: "60%", margin: "14px auto" }} />
          <div
            className="myeongjo"
            style={{ fontSize: 11, color: "var(--bone-soft)", letterSpacing: "0.25em", lineHeight: 1.7 }}
          >
            四柱 · 命理 · 諮問
          </div>
        </div>
      </div>

      <div className="fade-up ink-fade-d1" style={{ marginTop: 40, position: "relative", zIndex: 2 }}>
        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 28, color: "var(--bone)", fontWeight: 700, lineHeight: 1.5, letterSpacing: "0.04em" }}
        >
          지금 그 답답함엔<br />
          분명한<br />
          <span style={{ color: "var(--gold-bright)" }}>이유가 있습니다.</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "22px 0" }}>
          <span className="gold-diamond" />
        </div>

        <div
          className="myeongjo"
          style={{ fontSize: 15, color: "var(--bone-soft)", lineHeight: 2, letterSpacing: "0.16em" }}
        >
          돈·사람·때 — 여덟 글자가<br />
          당신의 다음 길을 보여줍니다
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 40 }} />

      <div className="fade-up ink-fade-d2" style={{ marginTop: 40, position: "relative", zIndex: 2 }}>
        <CTAButton sub="· 7,900원" />
        <SecondaryLink label="결과 예시 먼저 보기 →" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 16,
            color: "var(--bone-faint)",
          }}
        >
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.25em" }}>누적 11,300명 확인 · 생년월일만 · 1분</span>
        </div>
      </div>

      <div
        className="fade-up"
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          color: "var(--gold)",
          opacity: 0.7,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div className="myeongjo" style={{ fontSize: 9, letterSpacing: "0.4em" }}>SCROLL</div>
        <div style={{ width: 1, height: 24, background: "currentColor" }} />
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 02 — HERITAGE
// ──────────────────────────────────────────────────────
function HeritageSection() {
  const lineage = [
    { era: "周", y: "B.C. 1000", name: "周易", desc: "음양의 시작" },
    { era: "漢", y: "A.D. 100", name: "太初曆", desc: "천간지지 정립" },
    { era: "唐", y: "李虚中", name: "三柱命理", desc: "연·월·일주의 학문화" },
    { era: "宋", y: "徐子平", name: "子平命理", desc: "시주 추가, 사주 완성" },
    { era: "明清", y: "萬曆", name: "萬歲曆", desc: "정밀 역법의 표준화" },
    { era: "今", y: "2026", name: "命運錄", desc: "현대 알고리즘과의 결합", hi: true },
  ];

  return (
    <section className="scene-cosmos" style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
      <div style={{ position: "relative", height: 320 }}>
        <BigLandscape height={320} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(6,3,6,0.3) 0%, transparent 30%, rgba(6,3,6,0.95) 100%)",
          }}
        />
        <div
          className="brush glow-gold"
          style={{
            position: "absolute",
            top: 36,
            right: 22,
            writingMode: "vertical-rl",
            textOrientation: "upright",
            fontSize: 28,
            color: "var(--gold-bright)",
            letterSpacing: "0.1em",
            lineHeight: 1.1,
            textShadow: "0 0 12px rgba(232,200,120,0.4), 0 2px 4px rgba(0,0,0,0.6)",
          }}
        >
          千年<br />한줄기
        </div>
      </div>

      <div style={{ padding: "0 24px 70px", position: "relative", zIndex: 1, marginTop: -40 }}>
        <SectionLabel index="一" hanja="傳" label="천 년의 계보" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          명운록은<br />
          <span style={{ color: "var(--gold-bright)" }}>천 년</span>을 거쳐 온<br />
          명리의 줄기 끝에 있습니다.
        </div>

        <GoldDivider width={60} />

        <div style={{ background: "rgba(13,6,8,0.6)", border: "1px solid var(--gold-pale)", padding: "20px 16px", textAlign: "left" }}>
          <div
            className="mono"
            style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.3em", marginBottom: 14, textAlign: "center" }}
          >
            · 命 理 系 譜 ·
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
            <div style={{ position: "absolute", left: 38, top: 8, bottom: 8, width: 1, background: "var(--gold-line)" }} />
            {lineage.map((l, i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: "32px 14px 1fr auto", gap: 10, alignItems: "center", padding: "8px 0" }}
              >
                <div
                  className="brush glow-gold"
                  style={{
                    fontSize: l.hi ? 22 : 18,
                    color: l.hi ? "var(--gold-bright)" : "var(--gold-soft)",
                    lineHeight: 1,
                    textAlign: "center",
                  }}
                >
                  {l.era}
                </div>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: l.hi ? "var(--gold-bright)" : "var(--gold-pale)",
                    border: l.hi ? "1px solid var(--gold-bright)" : "1px solid var(--gold-line)",
                    boxShadow: l.hi ? "0 0 8px rgba(232,200,120,0.7)" : "none",
                    margin: "0 auto",
                  }}
                />
                <div>
                  <div
                    className="myeongjo"
                    style={{
                      fontSize: l.hi ? 14 : 13,
                      fontWeight: l.hi ? 700 : 500,
                      color: l.hi ? "var(--gold-bright)" : "var(--bone)",
                      letterSpacing: "0.1em",
                      lineHeight: 1.3,
                    }}
                  >
                    {l.name}
                  </div>
                  <div className="myeongjo" style={{ fontSize: 10, color: "var(--bone-faint)", letterSpacing: "0.1em", marginTop: 2 }}>
                    {l.desc}
                  </div>
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 9, color: l.hi ? "var(--gold)" : "var(--gold-soft)", letterSpacing: "0.15em" }}
                >
                  {l.y}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 30 }}>
          <div className="myeongjo" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.3em", marginBottom: 12 }}>
            萬歲曆 · 만세력 표본
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AlmanacPage width={260} height={300} />
          </div>
          <div
            className="myeongjo"
            style={{ marginTop: 12, fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.04em", lineHeight: 1.7 }}
          >
            천 년간 이어진 정밀 역법 — 명운록은<br />
            이 만세력을 기반으로 명식을 세웁니다.
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 03 — COSMOS
// ──────────────────────────────────────────────────────
function CosmosSection() {
  return (
    <section
      className="scene-wine"
      style={{ position: "relative", minHeight: 700, overflow: "hidden", padding: "80px 24px 60px", textAlign: "center" }}
    >
      <div className="starfield" />

      <div style={{ position: "relative", zIndex: 2 }}>
        <SectionLabel index="二" hanja="生" label="태어난 순간" />
        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          당신이 태어난 그 순간,<br />
          <span style={{ color: "var(--gold-bright)" }}>하늘과 땅</span>이<br />
          여덟 글자를 새겼습니다.
        </div>
      </div>

      <div style={{ margin: "40px 0 32px", position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <GalaxyScene size={300} />
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          className="brush glow-gold"
          style={{ fontSize: 64, color: "var(--gold-bright)", lineHeight: 1, letterSpacing: "0.1em", marginBottom: 18 }}
        >
          八字
        </div>
        <div className="myeongjo" style={{ fontSize: 14.5, color: "var(--bone-soft)", lineHeight: 2, letterSpacing: "0.14em" }}>
          年 · 月 · 日 · 時<br />
          하늘의 글자(天干) 넷<br />
          땅의 글자(地支) 넷<br />
          <br />
          그 여덟 글자가<br />
          <strong style={{ color: "var(--bone)" }}>곧 당신입니다.</strong>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 04 — LIMIT (자동 사주의 한계)
// ──────────────────────────────────────────────────────
function LimitSection() {
  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 70px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" style={{ opacity: 0.3 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="三" hanja="異" label="자동 사주의 한계" />
        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          왜 자동 사주는<br />
          <span style={{ color: "var(--gold-bright)" }}>다 비슷한 답</span>을 할까요?
        </div>

        <GoldDivider width={60} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid var(--gold-pale)", background: "rgba(13,6,8,0.5)", padding: "22px 14px", opacity: 0.9 }}>
            <div className="myeongjo" style={{ fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.2em", marginBottom: 10 }}>
              자동 · AI 사주
            </div>
            <div className="brush" style={{ fontSize: 40, color: "var(--bone-soft)", lineHeight: 1 }}>
              60<span style={{ fontSize: 15 }}>개</span>
            </div>
            <div className="myeongjo" style={{ fontSize: 11.5, color: "var(--bone-faint)", lineHeight: 1.7, marginTop: 12 }}>
              일주(日柱) 하나로<br />정해진 답 중 하나
            </div>
          </div>
          <div style={{ border: "1px solid var(--gold)", background: "rgba(212,175,106,0.06)", padding: "22px 14px" }}>
            <div className="myeongjo" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.2em", marginBottom: 10 }}>명운록</div>
            <div className="brush glow-gold" style={{ fontSize: 40, color: "var(--gold-bright)", lineHeight: 1 }}>
              8<span style={{ fontSize: 15 }}>글자</span>
            </div>
            <div className="myeongjo" style={{ fontSize: 11.5, color: "var(--bone-soft)", lineHeight: 1.7, marginTop: 12 }}>
              같은 답을 가진<br />사람은 없습니다
            </div>
          </div>
        </div>

        <div style={{ marginTop: 26, padding: "22px 18px", borderTop: "1px solid var(--gold-line)", borderBottom: "1px solid var(--gold-line)" }}>
          <div className="myeongjo" style={{ fontSize: 14, color: "var(--bone)", lineHeight: 1.9, letterSpacing: "0.02em" }}>
            무료 앱은 당신의 생일이 정해지면<br />그 <strong style={{ color: "var(--bone)" }}>60개 안에서</strong> 답을 고릅니다.<br />
            <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}>한 줄 운세에 운명을 묻지 마세요.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 05 — PROBLEM
// ──────────────────────────────────────────────────────
function ProblemSection() {
  const worries = [
    { hanja: "業", label: "진로", text: "지금 일을 계속해야 할지 한 해째 갈피가 잡히지 않으세요?" },
    { hanja: "緣", label: "인연", text: "맞지 않는 사람만 자꾸 만난다 느끼시나요?" },
    { hanja: "財", label: "재물", text: "돈은 들어오는데 머물지 않고 흩어지나요?" },
    { hanja: "時", label: "시기", text: "지금이 움직일 때인지, 기다릴 때인지 모르시겠나요?" },
  ];

  return (
    <section className="scene-wine" style={{ position: "relative", overflow: "hidden", padding: "0 0 70px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 480, pointerEvents: "none", zIndex: 0 }}>
        <MountainScene height={480} withLantern />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(58,13,24,0.0) 0%, rgba(58,13,24,0.0) 40%, rgba(58,13,24,0.55) 70%, var(--wine) 100%)",
          }}
        />
      </div>

      <div style={{ padding: "320px 26px 0", textAlign: "center", position: "relative", zIndex: 1 }}>
        <SectionLabel index="四" hanja="惑" label="혹시 이런 마음" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          혹시,<br />
          이런 마음에<br />
          <span style={{ color: "var(--gold-bright)" }}>막혀 계신가요.</span>
        </div>

        <GoldDivider width={60} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {worries.map((w, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 14,
                alignItems: "center",
                background: "rgba(13,6,8,0.45)",
                border: "1px solid var(--gold-pale)",
                padding: "14px 14px",
              }}
            >
              <div style={{ width: 48, height: 48, border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="brush glow-gold" style={{ fontSize: 26, color: "var(--gold-bright)", lineHeight: 1 }}>{w.hanja}</span>
              </div>
              <div>
                <div className="myeongjo" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.3em", marginBottom: 4 }}>{w.label}</div>
                <div className="myeongjo" style={{ fontSize: 14.5, color: "var(--bone-soft)", lineHeight: 1.75, letterSpacing: "0.02em" }}>{w.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <span className="gold-diamond" />
        </div>

        <div className="myeongjo" style={{ marginTop: 24, fontSize: 14, color: "var(--bone)", lineHeight: 1.85, letterSpacing: "0.04em" }}>
          답이 보이지 않을 때<br />
          <strong style={{ color: "var(--gold-bright)" }}>먼저 길을 본 사람</strong>의<br />
          말을 들어야 합니다.
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 06 — CONCEPT (명식 8자)
// ──────────────────────────────────────────────────────
function ConceptSection() {
  const cols = [
    { col: "時", char1: "丁", char2: "酉", role: "말년" },
    { col: "日", char1: "己", char2: "巳", role: "자신", hi: true },
    { col: "月", char1: "己", char2: "未", role: "청년" },
    { col: "年", char1: "癸", char2: "酉", role: "초년" },
  ];

  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 70px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" style={{ opacity: 0.5 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <SectionLabel index="五" hanja="命" label="네 기둥 여덟 글자" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          사주는 <span style={{ color: "var(--gold-bright)" }}>점</span>이 아니라<br />
          당신의 <span style={{ color: "var(--gold-bright)" }}>지도</span>입니다.
        </div>

        <div className="myeongjo" style={{ marginTop: 14, fontSize: 12, color: "var(--bone-faint)", letterSpacing: "0.18em", lineHeight: 1.9 }}>
          정해진 미래가 아닌<br />
          당신이 흐를 결을 보는 일
        </div>

        <div className="gold-frame" style={{ marginTop: 40, padding: "24px 14px 22px", background: "rgba(13,6,8,0.6)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.35em", marginBottom: 18 }}>
            · 四 柱 命 式 ·
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 4 }}>
            {cols.map((c, i) => (
              <div key={`l-${i}`} style={{ textAlign: "center", padding: "4px 0", color: c.hi ? "var(--gold-bright)" : "var(--gold-soft)" }}>
                <div className="brush" style={{ fontSize: 16, lineHeight: 1 }}>{c.col}</div>
              </div>
            ))}
          </div>
          <div className="gold-rule" style={{ marginBottom: 8 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {cols.map((c, i) => (
              <div
                key={`c-${i}`}
                style={{
                  textAlign: "center",
                  background: c.hi ? "rgba(212,175,106,0.10)" : "rgba(240,230,210,0.04)",
                  border: c.hi ? "1px solid var(--gold)" : "1px solid rgba(240,230,210,0.10)",
                  padding: "10px 4px",
                }}
              >
                <div className="brush glow-bone" style={{ fontSize: 30, lineHeight: 1.15, color: c.hi ? "var(--gold-bright)" : "var(--bone)" }}>{c.char1}</div>
                <div className="brush glow-bone" style={{ fontSize: 30, lineHeight: 1.15, color: c.hi ? "var(--gold-bright)" : "var(--bone)" }}>{c.char2}</div>
                <div className="myeongjo" style={{ fontSize: 8.5, color: "var(--bone-faint)", letterSpacing: "0.2em", marginTop: 6 }}>{c.role}</div>
              </div>
            ))}
          </div>

          <div className="myeongjo" style={{ fontSize: 10, color: "var(--bone-faint)", textAlign: "center", marginTop: 16, letterSpacing: "0.2em", lineHeight: 1.7 }}>
            年柱 · 月柱 · 日柱 · 時柱
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <span className="gold-diamond" />
        </div>

        <div className="myeongjo" style={{ fontSize: 15, color: "var(--bone)", lineHeight: 1.95, letterSpacing: "0.04em", marginTop: 20 }}>
          명운록은 이 여덟 글자를<br />
          <strong style={{ color: "var(--gold-bright)" }}>당신의 언어</strong>로<br />
          풀어드립니다.
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 07 — PRECISION (정밀 산출)
// ──────────────────────────────────────────────────────
function FlowDiagram() {
  const steps = [
    { h: "生", label: "입력", sub: "생년월일시" },
    { h: "曆", label: "만세력", sub: "천간지지 변환" },
    { h: "時", label: "시 보정", sub: "진태양시·절기" },
    { h: "式", label: "명식", sub: "8자 산출" },
    { h: "解", label: "풀이", sub: "AI 결과지" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
      {steps.map((s, i) => (
        <Fragment key={i}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 30,
                height: 30,
                border: "1px solid var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(212,175,106,0.08)",
              }}
            >
              <span className="brush" style={{ fontSize: 16, color: "var(--gold-bright)", lineHeight: 1 }}>{s.h}</span>
            </div>
            <div className="myeongjo" style={{ fontSize: 9.5, color: "var(--bone)", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</div>
            <div className="myeongjo" style={{ fontSize: 8, color: "var(--bone-faint)", letterSpacing: "0.05em", textAlign: "center", lineHeight: 1.3 }}>{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flexShrink: 0, color: "var(--gold)", marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, opacity: 0.7 }}>›</div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function PrecisionSection() {
  const methods = [
    { hanja: "曆", label: "만세력 정밀계산", desc: "1900-2100년 만세력 분단위로 산출" },
    { hanja: "時", label: "진태양시 자동 보정", desc: "출생 도시의 경도 차이를 분 단위로 환산" },
    { hanja: "節", label: "절기 입절시각 적용", desc: "입춘·경칩 등 절입 시각까지 정밀 반영" },
    { hanja: "子", label: "子時 경계 일주 처리", desc: "23시 이후 출생 시 일주 자동 보정" },
  ];

  const stats = [
    { n: "99.7", unit: "%", label: "명식 산출 정확도", sub: "11,300건 검증" },
    { n: "87.2", unit: "%", label: "일주 본질 적중률", sub: "자체 추적 데이터" },
    { n: "11,300", unit: "+", label: "검증 케이스", sub: "6년 누적" },
    { n: "1,000", unit: "+년", label: "학문의 두께", sub: "子平命理 정립 이래" },
  ];

  const principle = [
    { h: "命", t: "정밀한 8글자 산출", d: "만세력·진태양시·절기 보정으로 좌표를 세웁니다" },
    { h: "行", t: "음양오행의 균형 분석", d: "목·화·토·금·수의 강약왕쇠로 기질의 결을 봅니다" },
    { h: "星", t: "십성(十星) 구조 분석", d: "자아·표현·재물·관계·사유의 뿌리 패턴을 봅니다" },
    { h: "合", t: "합·충·형·해 관계 분석", d: "8글자 사이의 끌림과 충돌, 반복되는 패턴의 원인" },
    { h: "運", t: "대운·세운의 시간 흐름", d: "10년·1년 단위로 어떤 결이 강해지는지 봅니다" },
  ];

  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 70px", overflow: "hidden", textAlign: "center" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="六" hanja="精" label="정밀한 산출" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          전통의 학문을<br />
          <span style={{ color: "var(--gold-bright)" }}>과학적 정밀함</span>으로<br />
          풀어냅니다.
        </div>

        <div className="myeongjo" style={{ marginTop: 14, fontSize: 12, color: "var(--bone-faint)", letterSpacing: "0.2em" }}>
          東洋 天文 × 現代 알고리즘
        </div>

        <div style={{ margin: "36px 0 30px", display: "flex", justifyContent: "center" }}>
          <LunarMansionChart size={280} />
        </div>

        <div className="myeongjo" style={{ fontSize: 11, color: "var(--gold-soft)", letterSpacing: "0.3em", marginBottom: 6 }}>
          · 二 十 八 宿 ·
        </div>
        <div className="myeongjo" style={{ fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.1em", lineHeight: 1.7 }}>
          하늘을 28구역으로 나눈 동양 천문도.<br />
          명운록의 모든 산출은 이 천문 좌표 위에서 시작합니다.
        </div>

        <GoldDivider width={60} />

        <div className="myeongjo" style={{ fontSize: 13, color: "var(--gold-bright)", letterSpacing: "0.3em", marginBottom: 6, fontWeight: 600 }}>
          · 분 석 원 리 · 五 段 階 ·
        </div>
        <div className="myeongjo" style={{ fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.15em", marginBottom: 20 }}>
          천 년 전 자평(子平)의 표준 분석법
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative", textAlign: "left", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 26, top: 24, bottom: 24, width: 1, background: "var(--gold-line)" }} />
          {principle.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "11px 0" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: "1px solid var(--gold)",
                  background: "var(--wine-deep)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <span className="brush glow-gold" style={{ fontSize: 26, color: "var(--gold-bright)", lineHeight: 1 }}>{s.h}</span>
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div className="myeongjo" style={{ fontSize: 14, fontWeight: 700, color: "var(--bone)", letterSpacing: "0.03em" }}>{s.t}</div>
                <div className="myeongjo" style={{ fontSize: 13.5, color: "var(--bone-soft)", lineHeight: 1.7, marginTop: 4 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <GoldDivider width={60} />

        <div className="myeongjo" style={{ fontSize: 13, color: "var(--gold-bright)", letterSpacing: "0.3em", marginBottom: 18, fontWeight: 600 }}>
          · 산 출 방 법 ·
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          {methods.map((m, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                gap: 14,
                alignItems: "center",
                background: "rgba(13,6,8,0.5)",
                border: "1px solid var(--gold-pale)",
                padding: "14px 14px",
              }}
            >
              <div style={{ width: 44, height: 44, border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="brush glow-gold" style={{ fontSize: 24, color: "var(--gold-bright)", lineHeight: 1 }}>{m.hanja}</span>
              </div>
              <div>
                <div className="myeongjo" style={{ fontSize: 13, color: "var(--bone)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>{m.label}</div>
                <div className="myeongjo" style={{ fontSize: 13, color: "var(--bone-soft)", lineHeight: 1.65, letterSpacing: "0.02em" }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <GoldDivider width={60} />

        <div className="myeongjo" style={{ fontSize: 13, color: "var(--gold-bright)", letterSpacing: "0.3em", marginBottom: 18, fontWeight: 600 }}>
          · 검 증 된 정 밀 도 ·
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--gold-pale)", background: "rgba(13,6,8,0.55)", padding: "18px 10px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                <span className="brush glow-gold" style={{ fontSize: 30, color: "var(--gold-bright)", lineHeight: 1, letterSpacing: 0 }}>{s.n}</span>
                <span className="myeongjo" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, letterSpacing: "0.05em" }}>{s.unit}</span>
              </div>
              <div className="myeongjo" style={{ fontSize: 11.5, color: "var(--bone)", fontWeight: 600, letterSpacing: "0.05em", marginTop: 8 }}>{s.label}</div>
              <div className="myeongjo" style={{ fontSize: 9, color: "var(--bone-faint)", letterSpacing: "0.15em", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: "18px 14px", border: "1px dashed var(--gold-line)", background: "rgba(13,6,8,0.4)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.3em", marginBottom: 14 }}>
            · PIPELINE · 산출 흐름 ·
          </div>
          <FlowDiagram />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 08 — CHAPTERS (다섯 개의 장)
// ──────────────────────────────────────────────────────
function ChaptersSection() {
  const chapters = [
    { n: "Chapter 1", t: "성격의 결", d: "내가 편하게 느끼는 방식과 강점" },
    { n: "Chapter 2", t: "관계의 반복", d: "가까워지는 방식과 반복되는 지점" },
    { n: "Chapter 3", t: "재물의 흐름", d: "돈을 대하는 태도와 머무는 구조" },
    { n: "Chapter 4", t: "애정의 온도", d: "마음이 열리는 방식과 인연의 결" },
    { n: "Chapter 5", t: "다음 선택의 방향", d: "지금의 흐름에서 참고할 만한 지점" },
  ];
  const hanja = ["一", "二", "三", "四", "五"];

  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 70px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" style={{ opacity: 0.3 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="七" hanja="章" label="다섯 개의 장" />
        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 25, color: "var(--bone)", fontWeight: 700, lineHeight: 1.5, letterSpacing: "0.04em" }}
        >
          기록은 다섯 개의 장으로<br />이어집니다
        </div>
        <GoldDivider width={60} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {chapters.map((c, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 16, alignItems: "center", border: "1px solid var(--gold-pale)", background: "rgba(13,6,8,0.5)", padding: "16px 16px" }}
            >
              <div style={{ width: 44, height: 44, flexShrink: 0, border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="brush glow-gold" style={{ fontSize: 22, color: "var(--gold-bright)", lineHeight: 1 }}>{hanja[i]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--gold-soft)", letterSpacing: "0.25em", marginBottom: 4 }}>{c.n}</div>
                <div className="myeongjo" style={{ fontSize: 15, fontWeight: 700, color: "var(--bone)", letterSpacing: "0.04em" }}>{c.t}</div>
                <div className="myeongjo" style={{ fontSize: 13.5, color: "var(--bone-soft)", lineHeight: 1.65, marginTop: 3 }}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 09 — HOW IT WORKS (자동 4단계)
// ──────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { n: "一", en: "STEP 01", title: "생년월일을 입력하세요", desc: "이름·생년월일·시각·고민을\n한 단계씩 가볍게 입력합니다.", hanja: "記" },
    { n: "二", en: "STEP 02", title: "정통 만세력으로 명식 산출", desc: "절기·진태양시까지 반영해\n내 사주 여덟 글자를 정밀하게 세웁니다.", hanja: "覽" },
    { n: "三", en: "STEP 03", title: "더 자세한 풀이를 선택", desc: "마음에 들면 기본 풀이 결과지로\n성향·올해·고민을 깊게 풉니다.", hanja: "解" },
    { n: "四", en: "STEP 04", title: "결과지를 즉시 확인", desc: "정통 만세력 엔진과 AI가\n수 분 내 기록을 생성합니다.", hanja: "受" },
  ];

  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 60px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" style={{ opacity: 0.5 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="八" hanja="行" label="진행 방식" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          네 걸음이면<br />
          <span style={{ color: "var(--gold-bright)" }}>당신의 흐름</span>이<br />
          도착합니다.
        </div>

        <div className="myeongjo" style={{ marginTop: 14, fontSize: 12, color: "var(--bone-faint)", letterSpacing: "0.2em" }}>
          입력 → 명식 산출 → 자세한 풀이까지 수 분이면 충분합니다
        </div>

        <GoldDivider width={60} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ padding: "20px 18px", position: "relative", overflow: "hidden", background: "rgba(13,6,8,0.6)", border: "1px solid var(--gold-pale)" }}>
              <div className="brush" style={{ position: "absolute", right: -6, bottom: -24, fontSize: 110, lineHeight: 1, color: "rgba(212,175,106,0.07)", pointerEvents: "none" }}>
                {s.hanja}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <span className="brush glow-gold" style={{ fontSize: 32, color: "var(--gold-bright)", lineHeight: 1 }}>{s.n}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--gold-soft)", letterSpacing: "0.3em" }}>{s.en}</span>
              </div>
              <div className="myeongjo" style={{ fontSize: 16, color: "var(--bone)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 8 }}>{s.title}</div>
              <div className="myeongjo" style={{ fontSize: 14, color: "var(--bone-soft)", lineHeight: 1.85, letterSpacing: "0.02em", whiteSpace: "pre-line" }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <CTAButton label="내 고민으로 사주 흐름 보기" />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 10 — PREVIEW (내 기록 미리보기)
// ──────────────────────────────────────────────────────
function PreviewSection() {
  const parts = [
    { n: "PART 1", t: "성격의 결", body: "겉으로는 차분해 보여도, 내면에는 스스로 정한 기준을 지키려는 힘이 강한 편입니다." },
    { n: "PART 2", t: "관계의 반복", body: "빠른 친밀감보다 신뢰가 쌓이는 시간을 중요하게 여기는 흐름이 나타납니다." },
    { n: "PART 3", t: "재물의 흐름", body: "돈이 들어오는 순간보다, 머물 수 있는 구조를 만드는 것이 더 중요하게 작용합니다." },
    { n: "PART 4", t: "애정의 온도", body: "마음이 열리기까지 시간이 필요하지만, 한 번 깊어진 관계는 오래 이어가려는 성향이 있습니다." },
  ];
  return (
    <section id="sample" className="scene-wine" style={{ position: "relative", padding: "80px 24px 70px", overflow: "hidden", textAlign: "center", scrollMarginTop: 20 }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="九" hanja="覽" label="내 기록 미리보기" />
        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 25, color: "var(--bone)", fontWeight: 700, lineHeight: 1.5, letterSpacing: "0.04em" }}
        >
          내 기록에는<br />이런 문장이 담깁니다
        </div>
        <div className="myeongjo" style={{ marginTop: 12, fontSize: 11, color: "var(--gold-soft)", letterSpacing: "0.3em" }}>· 샘플 미리보기 ·</div>

        <div
          style={{
            marginTop: 28,
            background: "linear-gradient(180deg, #f4ecd8 0%, #ece1c8 100%)",
            padding: "28px 22px 26px",
            position: "relative",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            border: "1px solid rgba(212,175,106,0.5)",
          }}
        >
          <div style={{ textAlign: "center", position: "relative", zIndex: 1, paddingBottom: 18, borderBottom: "1.5px solid rgba(58,42,26,0.3)" }}>
            <span className="brush" style={{ fontSize: 30, color: "#8b1e1e", letterSpacing: "0.06em" }}>命 運 錄</span>
            <div className="myeongjo" style={{ fontSize: 14, fontWeight: 700, color: "#3a2a1a", letterSpacing: "0.1em", marginTop: 10 }}>명운록 기본 사주 기록</div>
            <div className="myeongjo" style={{ fontSize: 10.5, color: "rgba(58,42,26,0.65)", letterSpacing: "0.25em", marginTop: 6 }}>성격 · 관계 · 재물 · 애정</div>
          </div>
          <div style={{ position: "relative", zIndex: 1, marginTop: 18, display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {parts.map((p, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                  <span className="mono" style={{ fontSize: 9, color: "#8b1e1e", letterSpacing: "0.15em", fontWeight: 600 }}>{p.n}</span>
                  <span className="myeongjo" style={{ fontSize: 13, fontWeight: 700, color: "#3a2a1a", letterSpacing: "0.04em" }}>{p.t}</span>
                </div>
                <div className="myeongjo" style={{ fontSize: 12, color: "rgba(32,26,20,0.82)", lineHeight: 1.85 }}>{p.body}</div>
              </div>
            ))}
          </div>
          <div className="seal" style={{ position: "absolute", bottom: 18, right: 18, width: 46, height: 46, fontSize: 15, transform: "rotate(-7deg)", zIndex: 2 }}>
            <span style={{ position: "relative", zIndex: 2 }}>命錄</span>
          </div>
        </div>

        <div className="myeongjo" style={{ marginTop: 16, fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          실제 기록은 신청 정보에 맞춰 개별 내용으로 정리됩니다.<br />
          결제 후 결과지로 바로 확인하실 수 있습니다.
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 11 — REVIEWS
// ──────────────────────────────────────────────────────
function ReviewsSection() {
  const reviews = [
    { tag: "진로", age: "32 · 여", quote: "이직 시기를 두고 일 년을 고민했는데,\n선생님 풀이 듣고 두 달 만에 결정했어요.\n결정의 이유가 명확해지는 느낌.", pillar: "己巳" },
    { tag: "인연", age: "29 · 여", quote: "\"왜 같은 사람만 만나지?\" 그 답을 들었어요.\n인연이 끊긴 게 아니라\n내 흐름이 거기 머물러 있었던 거였어요.", pillar: "丁未" },
    { tag: "재물", age: "41 · 남", quote: "돈에 대한 압박감이 컸는데,\n무엇을 기다리고 무엇을 움직일지\n시기를 알게 된 게 가장 컸어요.", pillar: "甲子" },
  ];

  return (
    <section className="scene-wine" style={{ position: "relative", padding: "80px 24px 60px", overflow: "hidden", textAlign: "center" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="十" hanja="證" label="실제 후기" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          먼저 받아본 분들의<br />
          <span style={{ color: "var(--gold-bright)" }}>실제 후기</span>.
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 14, marginTop: 22, marginBottom: 28 }}>
          <div className="brush glow-gold" style={{ fontSize: 44, color: "var(--gold-bright)", lineHeight: 1 }}>4.96</div>
          <div style={{ textAlign: "left" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.2em" }}>★★★★★</div>
            <div className="myeongjo" style={{ fontSize: 10, color: "var(--bone-faint)", letterSpacing: "0.2em", marginTop: 2 }}>누적 1,247 건</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: "rgba(13,6,8,0.55)", border: "1px solid var(--gold-pale)", padding: "18px 16px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(180deg,#e8c878,#caa862)",
                      color: "var(--wine-deep)",
                      fontFamily: "'Nanum Myeongjo', serif",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {r.tag.charAt(0)}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                    <span
                      style={{
                        background: "var(--gold)",
                        color: "var(--wine-deep)",
                        fontSize: 10,
                        padding: "2px 8px",
                        letterSpacing: "0.2em",
                        fontFamily: "'Nanum Myeongjo', serif",
                        fontWeight: 700,
                      }}
                    >
                      {r.tag}
                    </span>
                    <span className="myeongjo" style={{ fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.15em" }}>{r.age}</span>
                  </div>
                </div>
                <div className="brush glow-gold" style={{ fontSize: 18, color: "var(--gold-bright)", letterSpacing: 0 }}>{r.pillar}</div>
              </div>
              <div className="myeongjo" style={{ fontSize: 14.5, color: "var(--bone)", lineHeight: 1.95, letterSpacing: "0.02em", whiteSpace: "pre-line" }}>
                {r.quote}
              </div>
              <div className="mono" style={{ marginTop: 10, fontSize: 10, color: "var(--gold)", letterSpacing: "0.25em" }}>★★★★★</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 12 — PRICING
// ──────────────────────────────────────────────────────
function PricingSection() {
  // 무료로 확인할 수 있는 것 (결제 전)
  const freeItems = [
    "내 사주 여덟 글자 (명식)",
    "일간 중심 성향 한 줄",
    "오행 균형 · 강한/부족한 기운",
    "올해 흐름 한 줄 · 고민 맛보기",
  ];
  // 기본 풀이 결과지 (메인 ₩7,900) 에 담기는 것
  const basicItems = [
    "성향의 결을 내 언어로 자세히",
    "올해 흐름과 조심할 시기",
    "선택한 고민에 맞춘 풀이",
  ];

  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "80px 24px 60px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" style={{ opacity: 0.45 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel index="十一" hanja="覽" label="7,900원으로 시작" />

        <div
          className="myeongjo glow-bone"
          style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
        >
          <span style={{ color: "var(--gold-bright)" }}>7,900원</span>으로<br />
          내 사주를 풀어보세요
        </div>

        <div className="myeongjo" style={{ marginTop: 12, fontSize: 12, color: "var(--bone-faint)", letterSpacing: "0.1em", lineHeight: 1.7 }}>
          생년월일만 입력하면<br />정통 만세력으로 바로 풀이를 받아보실 수 있어요.
        </div>

        <GoldDivider width={60} />

        {/* 기본 풀이에 담기는 것 */}
        <div style={{ padding: "22px 20px", border: "1px solid var(--gold-pale)", background: "rgba(13,6,8,0.55)", textAlign: "left" }}>
          <div className="myeongjo" style={{ fontSize: 13, color: "var(--gold-bright)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>
            기본 풀이에 담기는 것
          </div>
          <div className="myeongjo" style={{ fontSize: 11, color: "var(--bone-faint)", letterSpacing: "0.04em", marginBottom: 14 }}>
            내 사주 기본 풀이 · 7,900원
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {freeItems.map((d, j) => (
              <li key={j} className="myeongjo" style={{ fontSize: 14.5, color: "var(--bone-soft)", letterSpacing: "0.02em", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ flexShrink: 0, color: "var(--gold)", marginTop: 2, fontSize: 9 }}>◆</span>
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 18 }}>
          <CTAButton sub="· 7,900원" />
          <SecondaryLink label="결과 예시 먼저 보기 →" />
        </div>

        <GoldDivider width={60} />

        {/* 내 사주 기본 풀이 — 메인 유료(₩7,900). 가격은 한글 라벨, 한자는 장식만. */}
        <div
          style={{
            padding: "24px 20px",
            position: "relative",
            border: "1.5px solid var(--gold)",
            background: "linear-gradient(180deg, rgba(212,175,106,0.10) 0%, rgba(13,6,8,0.65) 100%)",
            boxShadow: "0 0 24px rgba(212,175,106,0.15)",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span className="brush glow-gold" style={{ fontSize: 32, color: "var(--gold-bright)", lineHeight: 1 }}>簡命</span>
            <div>
              <div className="myeongjo" style={{ fontSize: 16, color: "var(--bone)", fontWeight: 700, letterSpacing: "0.1em" }}>내 사주 기본 풀이</div>
              <div className="myeongjo" style={{ fontSize: 10.5, color: "var(--bone-faint)", letterSpacing: "0.1em", marginTop: 2 }}>내 사주를 깊이 있게 풀어드립니다</div>
            </div>
          </div>

          <div className="gold-rule" style={{ margin: "14px 0" }} />

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {basicItems.map((d, j) => (
              <li key={j} className="myeongjo" style={{ fontSize: 14.5, color: "var(--bone-soft)", letterSpacing: "0.02em", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ flexShrink: 0, color: "var(--gold)", marginTop: 2, fontSize: 9 }}>◆</span>
                {d}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div className="myeongjo" style={{ fontSize: 28, fontWeight: 700, color: "var(--gold-bright)", letterSpacing: "0.02em" }}>7,900원</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--gold-soft)", letterSpacing: "0.2em" }}>즉시 결과 생성</div>
          </div>
        </div>

        {/* 인생 종합 풀이(₩49,900) 은 결과를 본 뒤 선택하는 보조 옵션으로만 노출 */}
        <div className="myeongjo" style={{ marginTop: 12, fontSize: 11.5, color: "var(--bone-faint)", letterSpacing: "0.03em", lineHeight: 1.7 }}>
          고민을 하나 더 깊게 보고 싶다면, 결과지에서 <span style={{ color: "var(--bone-soft)" }}>인생 종합 풀이(49,900원)</span>로<br />이어서 보실 수 있어요.
        </div>

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link
            href="/products"
            className="myeongjo"
            style={{ fontSize: 12, color: "var(--bone-soft)", letterSpacing: "0.12em", textDecorationLine: "underline", textUnderlineOffset: 4 }}
          >
            재물·관계, 월별 운 캘린더 등 다른 풀이도 보기 →
          </Link>
        </div>

        <div style={{ marginTop: 22, padding: "14px 16px", border: "1px dashed var(--gold-line)", textAlign: "center" }}>
          <div className="myeongjo" style={{ fontSize: 11, color: "var(--gold-bright)", letterSpacing: "0.2em", marginBottom: 6 }}>
            · 안심하고 시작하세요 ·
          </div>
          <div className="myeongjo" style={{ fontSize: 11, color: "var(--bone-soft)", letterSpacing: "0.03em", lineHeight: 1.7 }}>
            정통 만세력으로 정밀 산출 · 입력 정보는 명식 계산에만 사용됩니다
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 13 — FAQ
// ──────────────────────────────────────────────────────
function FAQItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--gold-pale)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "18px 4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          textAlign: "left",
          color: "var(--bone)",
        }}
      >
        <span className="brush glow-gold" style={{ fontSize: 18, color: "var(--gold-bright)", lineHeight: 1.1, flexShrink: 0, minWidth: 16 }}>問</span>
        <span className="myeongjo" style={{ flex: 1, fontSize: 14.5, color: "var(--bone)", lineHeight: 1.6, letterSpacing: "0.02em", fontWeight: 600 }}>{q}</span>
        <span
          className="myeongjo"
          style={{ fontSize: 18, color: "var(--gold-soft)", lineHeight: 1, marginTop: 2, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }}
        >
          ⌄
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 4px 20px 28px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="brush" style={{ fontSize: 18, color: "var(--gold-soft)", lineHeight: 1.1, flexShrink: 0, minWidth: 16 }}>答</span>
          <span className="myeongjo" style={{ fontSize: 14, color: "var(--bone-soft)", lineHeight: 1.85, letterSpacing: "0.02em" }}>{a}</span>
        </div>
      )}
    </div>
  );
}

function FAQSection() {
  const faqs = [
    { q: "태어난 시각을 모르면 상담이 어려운가요?", a: "시(時)를 모르셔도 일주 중심으로 충분히 풀이 가능합니다. 단, 결혼·자녀 등 시주가 중요한 질문은 정확도가 다소 낮아질 수 있어요." },
    { q: "음력만 알고 있는데 괜찮나요?", a: "괜찮습니다. 입력 단계에서 음력으로 선택해 주시면 명운록이 양력으로 환산해 명식을 세웁니다." },
    { q: "결과는 어떻게 받아보나요?", a: "결제 후 결과지 페이지에서 바로 확인하실 수 있습니다. 명식·오행·풀이가 한 화면에 정리됩니다." },
    { q: "결과는 언제 도착하나요?", a: "정통 만세력 엔진과 AI가 결제 직후 수 분 내로 기록을 생성합니다." },
    { q: "추가 질문도 할 수 있나요?", a: "인생 종합 풀이 패키지는 3일간 무제한입니다. 풀이를 받고 떠오른 추가 질문을 편하게 보내주세요." },
  ];

  return (
    <section className="scene-wine" style={{ position: "relative", padding: "80px 24px 60px", overflow: "hidden", textAlign: "center" }}>
      <SectionLabel index="十二" hanja="問" label="자주 묻는 물음" />

      <div
        className="myeongjo glow-bone"
        style={{ fontSize: 26, color: "var(--bone)", fontWeight: 700, lineHeight: 1.55, letterSpacing: "0.04em" }}
      >
        자주 묻는<br />
        <span style={{ color: "var(--gold-bright)" }}>물음들</span>.
      </div>

      <GoldDivider width={60} />

      <div style={{ textAlign: "left" }}>
        {faqs.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 14 — FINAL CTA
// ──────────────────────────────────────────────────────
function FinalCTASection() {
  return (
    <section className="scene-cosmos" style={{ position: "relative", padding: "90px 26px 110px", overflow: "hidden", textAlign: "center" }}>
      <div className="starfield" />

      <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 0, opacity: 0.85, pointerEvents: "none" }}>
        <SunRadiant size={320} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="brush glow-gold" style={{ fontSize: 52, color: "var(--gold-bright)", lineHeight: 1, letterSpacing: "0.1em", marginBottom: 18 }}>問命</div>
        <div className="myeongjo" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.4em", marginBottom: 30 }}>· 명을 묻다 ·</div>

        <div className="myeongjo glow-bone" style={{ fontSize: 22, color: "var(--bone)", fontWeight: 700, lineHeight: 1.6, letterSpacing: "0.04em" }}>
          당신의 흐름은<br />
          이미 정해진 것이 아닙니다.
        </div>

        <div className="myeongjo" style={{ marginTop: 14, fontSize: 14.5, color: "var(--bone-soft)", letterSpacing: "0.04em", lineHeight: 1.95 }}>
          어떻게 흐를지<br />
          <span style={{ color: "var(--gold-bright)" }}>지금</span> 함께 헤아립시다.
        </div>

        <GoldDivider width={60} />

        <CTAButton sub="· 7,900원" label="지금 내 흐름 확인하기" />

        <div className="mono" style={{ marginTop: 18, fontSize: 9, color: "var(--bone-faint)", letterSpacing: "0.3em" }}>· 7,900원 · 정통 만세력 풀이 ·</div>

        <div className="myeongjo" style={{ marginTop: 40, fontSize: 10, color: "var(--bone-faint)", letterSpacing: "0.15em", lineHeight: 1.9, opacity: 0.5 }}>
          ⓒ 命運錄 · 2026<br />
          사업자 등록 / 통신판매업<br />
          개인정보처리방침
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// STICKY BAR (window 스크롤 기준)
// ──────────────────────────────────────────────────────
function StickyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const wrap: CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "0 14px 14px",
    transform: show ? "translateY(0)" : "translateY(140%)",
    transition: "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
    pointerEvents: show ? "auto" : "none",
    zIndex: 70,
  };

  return (
    <div style={wrap}>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          background: "rgba(13, 6, 8, 0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 14,
          padding: "8px 8px 8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
          border: "1px solid var(--gold-line)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="myeongjo" style={{ fontSize: 12.5, color: "var(--gold-bright)", letterSpacing: "0.18em", lineHeight: 1.2, fontWeight: 700 }}>
            내 사주 풀이 보기
          </div>
          <div className="myeongjo" style={{ fontSize: 12, color: "var(--bone-soft)", letterSpacing: "0.1em", marginTop: 2 }}>
            생년월일만 · 7,900원
          </div>
        </div>
        <Link
          href={FUNNEL_HREF}
          style={{
            background: "linear-gradient(180deg,#e8c878,#d4af6a)",
            color: "var(--wine-deep)",
            border: "none",
            padding: "12px 16px",
            fontFamily: "'Noto Serif KR', serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 10,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          풀이 보기
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 전체 랜딩
// ──────────────────────────────────────────────────────
export function MyeongLanding() {
  return (
    <div style={{ position: "relative" }}>
      <HeroSection />
      <HeritageSection />
      <CosmosSection />
      <LimitSection />
      <ProblemSection />
      <ConceptSection />
      <PrecisionSection />
      <ChaptersSection />
      <HowItWorksSection />
      <PreviewSection />
      <ReviewsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <StickyBar />
    </div>
  );
}

export default MyeongLanding;
