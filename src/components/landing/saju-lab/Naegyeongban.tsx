// 나경반(羅經盤) — 자수정 랜딩 시그니처 나침반.
// 핸드오프: _myeongun_source/design_handoff_saju_flow/designs/종합사주 랜딩.dc.html 이식.
// 다층 회전 링(십이지 90s · 팔괘 60s 역회전 · 자침 20s 역회전) + 부유(orbfloat 7s).
// 접근성: prefers-reduced-motion 시 .naegyeong 하위 애니메이션 정지(globals.css).
import type { CSSProperties } from "react";

const JIJI: { ch: string; pos: CSSProperties }[] = [
  { ch: "子", pos: { top: 2, left: "50%", marginLeft: -7 } },
  { ch: "丑", pos: { top: 18, right: 42 } },
  { ch: "寅", pos: { top: 42, right: 18 } },
  { ch: "卯", pos: { right: 2, top: "50%", marginTop: -8 } },
  { ch: "辰", pos: { bottom: 42, right: 18 } },
  { ch: "巳", pos: { bottom: 18, right: 42 } },
  { ch: "午", pos: { bottom: 2, left: "50%", marginLeft: -7 } },
  { ch: "未", pos: { bottom: 18, left: 42 } },
  { ch: "申", pos: { bottom: 42, left: 18 } },
  { ch: "酉", pos: { left: 2, top: "50%", marginTop: -8 } },
  { ch: "戌", pos: { top: 42, left: 18 } },
  { ch: "亥", pos: { top: 18, left: 42 } },
];

const PALGWAE: { ch: string; pos: CSSProperties }[] = [
  { ch: "☰", pos: { top: 3, left: "50%", marginLeft: -7 } },
  { ch: "☷", pos: { bottom: 3, left: "50%", marginLeft: -7 } },
  { ch: "☵", pos: { left: 4, top: "50%", marginTop: -9 } },
  { ch: "☲", pos: { right: 4, top: "50%", marginTop: -9 } },
];

export function Naegyeongban({ size = 250 }: { size?: number }) {
  return (
    <div
      className="naegyeong"
      style={{ position: "relative", width: size, height: size, animation: "orbfloat 7s ease-in-out infinite" }}
    >
      {/* outer disc */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 30%, #3a2080, #251258 60%, #160a36 100%)",
          border: "2px solid rgba(190,150,255,.5)",
          boxShadow:
            "0 20px 44px rgba(15,6,44,.6),0 0 52px rgba(150,90,255,.45),inset 0 4px 14px rgba(255,255,255,.22),inset 0 -14px 30px rgba(14,4,44,.7)",
        }}
      />
      {/* 십이지 ring (clockwise) */}
      <div
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: "50%",
          animation: "spinwheel 90s linear infinite",
          fontFamily: "'Ma Shan Zheng', cursive",
          fontSize: 15,
          color: "#dcc8ff",
          fontWeight: 700,
        }}
      >
        {JIJI.map((j) => (
          <span key={j.ch} style={{ position: "absolute", ...j.pos }}>
            {j.ch}
          </span>
        ))}
      </div>
      {/* tick ring */}
      <div style={{ position: "absolute", inset: 42, borderRadius: "50%", border: "1px solid rgba(190,150,255,.35)" }} />
      {/* 八卦 ring (counter-clockwise) */}
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: "50%",
          border: "1px solid rgba(190,150,255,.3)",
          animation: "rspin 60s linear infinite",
          fontSize: 13,
          color: "rgba(220,200,255,.8)",
        }}
      >
        {PALGWAE.map((p) => (
          <span key={p.ch} style={{ position: "absolute", ...p.pos }}>
            {p.ch}
          </span>
        ))}
      </div>
      {/* inner well (core) */}
      <div
        style={{
          position: "absolute",
          inset: 92,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 32%, #f6efff, #c9b0ff 30%, #8a5cf0 66%, #4321a0 100%)",
          boxShadow: "inset 0 -6px 14px rgba(14,4,44,.6),inset 0 5px 12px rgba(255,255,255,.55),0 0 20px rgba(150,90,255,.5)",
        }}
      />
      {/* needle (pink / violet, counter-clockwise) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 7,
          height: 150,
          margin: "-75px 0 0 -3.5px",
          animation: "rspin 20s linear infinite",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 7,
            height: 75,
            background: "linear-gradient(#ff8fd0,#c0398f)",
            clipPath: "polygon(50% 0,100% 100%,0 100%)",
            boxShadow: "0 0 10px rgba(255,140,210,.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 7,
            height: 75,
            background: "linear-gradient(#7b3ff2,#c9b0ff)",
            clipPath: "polygon(0 0,100% 0,50% 100%)",
            boxShadow: "0 0 10px rgba(150,90,255,.6)",
          }}
        />
      </div>
      {/* hub */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 14,
          height: 14,
          margin: "-7px 0 0 -7px",
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 32%, #ffffff, #e3d2ff 55%, #a47fff)",
          boxShadow: "0 0 10px rgba(220,200,255,.9),0 2px 4px rgba(30,10,70,.5)",
        }}
      />
      {/* top sheen */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 40,
          width: 84,
          height: 52,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255,255,255,.45), rgba(255,255,255,0))",
          filter: "blur(3px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
