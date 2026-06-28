"use client";

// 자수정(amethyst) 랜딩 — SAJU LAB. 핸드오프 종합사주 랜딩.dc.html 재구현.
// 풀스크린 그라데이션 + 나경반 시그니처 + 흰색 CTA + 라이브 인원.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Naegyeongban } from "./Naegyeongban";

const CHIPS = ["총운", "재물운", "애정운", "직업운", "건강운"];
// 샘플 후기(예시) — 실제 후기가 쌓이면 DB로 교체. 한글 이름·나이대로 현실감.
const REVIEWS = [
  { name: "김지현", tag: "34 · 서울", body: "올해 흐름을 짚어주는데 소름 돋았어요. 막연하던 게 또렷해졌어요." },
  { name: "이서연", tag: "29", body: "재물 파트 보고 마음이 한결 가벼워졌어요. 추천합니다!" },
  { name: "박준호", tag: "41 · 부산", body: "이직 고민이었는데 시기까지 콕 집어줘서 결정에 도움됐어요." },
  { name: "정민아", tag: "37", body: "친구 추천으로 봤는데 디테일이 확실히 다르네요." },
  { name: "최성훈", tag: "32", body: "성향 부분 읽다가 웃었어요. 완전 제 얘기더라고요." },
  { name: "한지우", tag: "45 · 대구", body: "엄마 선물로 해드렸는데 정말 좋아하셨어요." },
  { name: "윤서영", tag: "27", body: "적어둔 고민 그대로 답해줘서 신기했어요." },
  { name: "강도윤", tag: "39", body: "돈 흐름 설명이 현실적이라 믿음이 가요." },
];

export function SajuLabLanding() {
  const [live, setLive] = useState(25);
  useEffect(() => {
    const t = setInterval(() => {
      setLive((n) => {
        let v = n + (Math.random() < 0.5 ? -1 : 1);
        if (v < 18) v = 19;
        if (v > 41) v = 40;
        return v;
      });
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative flex min-h-screen w-full justify-center overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(120% 62% at 50% 4%, #7b3ff2 0%, #5223b8 24%, #3a1a8a 48%, #25115c 70%, #160a36 100%)",
        backgroundColor: "#160a36",
      }}
    >
      <div className="relative flex min-h-screen w-full max-w-[420px] flex-col">
        {/* top glow */}
        <div
          className="pointer-events-none absolute z-[1]"
          style={{
            top: -90,
            left: "50%",
            marginLeft: -260,
            width: 520,
            height: 360,
            background: "radial-gradient(closest-side, rgba(150,90,255,.5), rgba(150,90,255,0) 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* app bar */}
        <div className="relative z-30 flex flex-none items-center justify-center pb-1 pt-6">
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: ".24em", textIndent: ".24em", color: "#eaf1ff" }}>
            SAJU LAB
          </div>
        </div>

        {/* hero title */}
        <div className="relative z-20 flex-none px-6 pt-4 text-center">
          <div className="relative inline-block">
            <h1
              style={{
                margin: 0,
                fontFamily: "'Wanted Sans','Pretendard',sans-serif",
                fontWeight: 900,
                fontSize: 56,
                lineHeight: 0.98,
                letterSpacing: "-.03em",
                background: "linear-gradient(180deg,#ffffff 30%,#dcc9ff 78%,#b08cff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 4px 22px rgba(150,90,255,.55))",
              }}
            >
              종합사주
            </h1>
            <span
              style={{
                position: "absolute",
                right: -10,
                bottom: 0,
                background: "#241047",
                color: "#cdb4ff",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: ".04em",
                padding: "4px 9px",
                borderRadius: 7,
                border: "1px solid rgba(180,140,255,.35)",
                boxShadow: "0 4px 12px rgba(0,0,0,.4)",
              }}
            >
              2026
            </span>
          </div>
          <p
            style={{
              margin: "14px auto 0",
              maxWidth: 300,
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.55,
              color: "#cdb8f5",
              letterSpacing: "-.01em",
            }}
          >
            별과 운명이 만나는 자리,
            <br />내 삶의 답이 있을까?
          </p>
        </div>

        {/* hero orb */}
        <div className="relative z-10 flex min-h-[300px] flex-1 items-center justify-center">
          {/* backdrop wordmark */}
          <div
            className="pointer-events-none absolute select-none"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              fontFamily: "'Wanted Sans',sans-serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 108,
              lineHeight: 1,
              letterSpacing: "-.04em",
              color: "rgba(206,180,255,.10)",
              whiteSpace: "nowrap",
            }}
          >
            運命
          </div>
          {/* glow */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 280,
              height: 260,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(150,90,255,.7), rgba(150,90,255,0) 70%)",
              filter: "blur(6px)",
              animation: "glowpulse 4.5s ease-in-out infinite",
            }}
          />
          <div className="relative z-10">
            <Naegyeongban size={250} />
          </div>
        </div>

        {/* category chips */}
        <div className="relative z-20 flex flex-none flex-wrap justify-center gap-[7px] px-4 pb-3">
          {CHIPS.map((c, i) => (
            <span
              key={c}
              style={{
                padding: "7px 13px",
                borderRadius: 999,
                background: i === 0 ? "rgba(160,120,255,.18)" : "rgba(160,120,255,.1)",
                border: `1px solid ${i === 0 ? "rgba(180,140,255,.32)" : "rgba(180,140,255,.22)"}`,
                fontSize: 12.5,
                fontWeight: i === 0 ? 700 : 600,
                color: i === 0 ? "#e6dbff" : "#cbb8f0",
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {/* review marquee — 옆으로 끊김 없이 흐르는 후기 */}
        <div className="relative z-20 flex-none overflow-hidden pb-3">
          <div
            className="review-marquee"
            style={{ display: "flex", gap: 10, width: "max-content", animation: "marquee 40s linear infinite" }}
          >
            {[...REVIEWS, ...REVIEWS].map((r, i) => (
              <div
                key={i}
                style={{ flex: "none", width: 236, padding: "13px 14px", borderRadius: 14, background: "rgba(40,20,80,.6)", border: "1px solid rgba(160,120,255,.24)" }}
              >
                <div className="mb-2 flex items-center gap-2.5">
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(160deg,#8a6bf2,#6541f2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flex: "none" }}>
                    {r.name[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#efe6ff" }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: "#9b86cb" }}>{r.tag}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 10, color: "#ffce73", letterSpacing: "0.5px" }}>★★★★★</div>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: "#d4c6f0" }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA + live pill */}
        <div className="relative z-20 flex-none px-[18px] pb-6">
          <Link
            href="/funnel"
            className="block w-full text-center transition-transform active:scale-[0.98]"
            style={{
              padding: 18,
              borderRadius: 18,
              background: "linear-gradient(180deg,#ffffff,#f1eaff)",
              color: "#3a1a8a",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-.01em",
              boxShadow: "0 14px 30px rgba(120,60,240,.4), 0 1px 0 rgba(255,255,255,.9) inset",
            }}
          >
            내 사주 여덟 글자, 종합 풀이 받기
          </Link>
          <div className="mt-3 flex justify-center">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 15px",
                borderRadius: 999,
                background: "rgba(30,14,62,.8)",
                border: "1px solid rgba(160,120,255,.3)",
                fontSize: 12,
                fontWeight: 600,
                color: "#cdb8f5",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#3ce07a",
                  boxShadow: "0 0 8px #3ce07a",
                  animation: "livedot 1.4s ease-in-out infinite",
                }}
              />
              현재 <b style={{ color: "#fff", margin: "0 1px" }}>{live}</b>명이 사주를 보는 중이에요
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
