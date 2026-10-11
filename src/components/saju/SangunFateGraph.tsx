"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FateFlow, FateFlowPoint } from "@/lib/saju/fate-flow";

const LEVEL: Record<FateFlowPoint["favor"], number> = { 유리: 43, 보통: 116, 조심: 158, 무거움: 194 };
const NUMERIC = '"Pretendard Variable", Pretendard, sans-serif';

export function SangunFateGraph({ flow }: { flow?: FateFlow | null }) {
  const id = useId().replace(/:/g, "");
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(327);
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const resize = () => setWidth(Math.max(200, plot.clientWidth));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [flow]);
  if (!flow || flow.points.length < 2) return null;
  const points = flow.points;
  const current = points.find(point => point.current);
  const firstAge = points[0].ageStart;
  const ageSpan = points[points.length - 1].ageStart - firstAge;
  if (ageSpan <= 0) return null;
  const x = (point: FateFlowPoint) => 48 + (width - 68) * (point.ageStart - firstAge) / ageSpan;
  // Horizontal controls soften each join without overshooting the source levels.
  const path = points.reduce((line, point, index) => {
    if (index === 0) return `M ${x(point)} ${LEVEL[point.favor]}`;
    const previous = points[index - 1];
    const mid = (x(previous) + x(point)) / 2;
    return `${line} C ${mid} ${LEVEL[previous.favor]}, ${mid} ${LEVEL[point.favor]}, ${x(point)} ${LEVEL[point.favor]}`;
  }, "");
  const area = `${path} L ${x(points[points.length - 1])} 220 L ${x(points[0])} 220 Z`;
  const currentX = current ? x(current) : null;
  const split = currentX !== null ? currentX / width : 0;

  return (
    <section data-sangun-fate-flow className="font-myeongjo" aria-labelledby={`${id}-title`}
      style={{ position: "relative", margin: "36px -20px 0", padding: "28px 24px 26px", overflow: "hidden",
        background: "radial-gradient(ellipse at 70% 62%,rgba(159,117,42,.09),transparent 65%),linear-gradient(145deg,#171311,#0b0a0d 52%,#111011)",
        borderTop: "1px solid rgba(225,193,120,.3)", borderBottom: "1px solid rgba(225,193,120,.15)" }}>
      <div aria-hidden style={{ position: "absolute", left: 24, right: 24, top: 0, height: 1,
        background: "linear-gradient(90deg,transparent,#e3c27b,transparent)", opacity: .65 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h3 id={`${id}-title`} style={{ fontSize: 28, lineHeight: 1.3, fontWeight: 700, letterSpacing: "-.04em", color: "#f3e8d1" }}>운명 그래프</h3>
        <span style={{ fontSize: 16, color: "#baaa8e", whiteSpace: "nowrap" }}>10년 단위</span>
      </div>
      {current && <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
        <span style={{ padding: "5px 9px", border: "1px solid #ad6654", color: "#edbaa8", fontSize: 16, lineHeight: 1.3,
          background: "rgba(133,48,37,.16)" }}>지금</span>
        <p style={{ fontFamily: NUMERIC, fontSize: 36, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-.04em", color: "#fff0d2", fontVariantNumeric: "tabular-nums" }}>
          {current.ageStart}<span style={{ color: "#ad9673", padding: "0 4px", fontWeight: 300 }}>–</span>{current.ageEnd}
          <span className="font-myeongjo" style={{ fontSize: 20, marginLeft: 4 }}>세</span>
        </p>
      </div>}
      <div ref={plotRef} style={{ position: "relative", marginTop: current ? 16 : 28 }}>
        <svg viewBox={`0 0 ${width} 220`} role="img"
          aria-label={`10년 단위 운의 흐름. ${points.map(p => `${p.ageStart}~${p.ageEnd}세 ${p.favor}${p.current ? ', 현재 구간' : ''}`).join('. ')}`}
          style={{ display: "block", width: "100%", height: 220, overflow: "visible" }}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d5a852" stopOpacity=".2" />
              <stop offset="100%" stopColor="#d5a852" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-line`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
              <stop offset="0" stopColor={current ? "#84715a" : "#dfb765"} />
              <stop offset={split} stopColor={current ? "#b39b71" : "#dfb765"} />
              <stop offset={split} stopColor="#efd39a" />
              <stop offset="1" stopColor="#e6b85c" />
            </linearGradient>
            <linearGradient id={`${id}-now`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c36c4f" stopOpacity="0" />
              <stop offset=".5" stopColor="#c36c4f" stopOpacity=".15" />
              <stop offset="1" stopColor="#c36c4f" stopOpacity=".03" />
            </linearGradient>
          </defs>
          {[43, 116, 194].map(y => <line key={y} x1="46" y1={y} x2={width - 4} y2={y} stroke="#d8c39f" strokeOpacity=".1" />)}
          {currentX !== null && <rect x={currentX - 15} y="5" width="30" height="215" fill={`url(#${id}-now)`} />}
          <path d={area} fill={`url(#${id}-fill)`} />
          <path d={path} fill="none" stroke="#e4bf7c" strokeWidth="8" opacity=".055" strokeLinecap="round" />
          <path d={path} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2.75" strokeLinecap="round" />
          {current && <line x1={x(current)} y1={LEVEL[current.favor] + 16} x2={x(current)} y2="224" stroke="#b86a50" strokeOpacity=".65" strokeDasharray="2 5" />}
          {points.map(point => {
            const isPast = !!current && point.ageStart < current.ageStart;
            return point.current ? <g key={point.ageStart}>
              <circle cx={x(point)} cy={LEVEL[point.favor]} r="15" fill="#ad5138" fillOpacity=".13" />
              <circle cx={x(point)} cy={LEVEL[point.favor]} r="9" fill="#a4533e" stroke="#d38d6b" strokeWidth="1" />
              <circle cx={x(point)} cy={LEVEL[point.favor]} r="3.5" fill="#fff2d8" />
            </g> : <circle key={point.ageStart} cx={x(point)} cy={LEVEL[point.favor]} r="3.5" fill="#171311"
              stroke={isPast ? "#9b8461" : "#e7c27c"} strokeWidth="1.5" />;
          })}
        </svg>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", fontSize: 15, color: "#b7aa93" }}>
          <span style={{ position: "absolute", top: 31 }}>좋음</span>
          <span style={{ position: "absolute", top: 104 }}>보통</span>
          <span style={{ position: "absolute", top: 182 }}>주의</span>
        </div>
        <div aria-hidden style={{ position: "relative", height: 28, marginTop: 10, fontFamily: NUMERIC }}>
          {points.map(point => <span key={point.ageStart} style={{ position: "absolute", left: `${x(point) / width * 100}%`, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 16,
            color: point.current ? "#f2c5ae" : "#bfae92", fontWeight: point.current ? 700 : 400 }}>{point.ageStart}세</span>)}
        </div>
      </div>
    </section>
  );
}
