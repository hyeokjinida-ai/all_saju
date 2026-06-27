// 명운록 — 시네마틱 배경 일러스트 (SVG). 핸드오프 scenery.jsx 이식.
import { Fragment } from "react";

// 삼각함수 좌표는 Node/브라우저 간 부동소수점 표기가 미세하게 달라
// SSR 하이드레이션 불일치를 유발한다. 동일 문자열이 나오도록 반올림.
const rnd = (n: number) => Math.round(n * 1000) / 1000;

export function MountainScene({ withLantern = false, height = 240 }: { withLantern?: boolean; height?: number }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15172E" stopOpacity="0" />
          <stop offset="80%" stopColor="#15172E" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0E1020" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="mt-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1430" />
          <stop offset="100%" stopColor="#15172E" />
        </linearGradient>
        <linearGradient id="mt-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15172E" />
          <stop offset="100%" stopColor="#0E1020" />
        </linearGradient>
        <linearGradient id="mt-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E1020" />
          <stop offset="100%" stopColor="#050204" />
        </linearGradient>
        <radialGradient id="moon-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#E1C17B" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#E1C17B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lantern-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd066" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#e8a040" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a04a18" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#sky-grad)" />
      <circle cx="310" cy="60" r="42" fill="url(#moon-g)" />
      <circle cx="310" cy="60" r="14" fill="#f0e6d2" opacity="0.18" />
      <path d="M0 160 L40 130 L80 145 L120 110 L160 130 L200 100 L240 120 L290 90 L340 115 L400 100 L400 240 L0 240 Z" fill="url(#mt-far)" opacity="0.7" />
      <rect x="0" y="120" width="400" height="60" fill="#15172E" opacity="0.45" />
      <path d="M-20 180 L30 150 L70 170 L120 140 L170 160 L220 130 L280 155 L340 135 L400 160 L400 240 L-20 240 Z" fill="url(#mt-mid)" opacity="0.85" />
      <path d="M-10 210 L40 185 L90 205 L140 175 L200 200 L260 180 L320 200 L400 185 L400 240 L-10 240 Z" fill="url(#mt-near)" />
      {withLantern && (
        <g>
          <circle cx="200" cy="218" r="38" fill="url(#lantern-g)" />
          <circle cx="200" cy="218" r="4" fill="#ffd066" />
        </g>
      )}
      <g opacity="0.4">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i * 23 + 11) % 400;
          const y = 130 + ((i * 7) % 70);
          return <circle key={i} cx={x} cy={y} r="0.6" fill="#E1C17B" />;
        })}
      </g>
    </svg>
  );
}

export function GalaxyScene({ size = 280 }: { size?: number }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id="gxy-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="1" />
          <stop offset="15%" stopColor="#E7C27D" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#E1C17B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E1C17B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gxy-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A2350" stopOpacity="0" />
          <stop offset="50%" stopColor="#2A2350" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0E1020" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#gxy-halo)" />
      <g fill="none" stroke="#E1C17B" strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: 5 }).map((_, i) => {
          const rot = i * 72;
          return (
            <path
              key={i}
              d="M 200 200 Q 260 150 280 200 Q 290 270 220 290 Q 150 290 130 230 Q 120 180 180 165"
              transform={`rotate(${rot} 200 200)`}
              opacity={0.18 + 0.06 * (i % 3)}
            />
          );
        })}
      </g>
      <g fill="#E1C17B">
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = i * 0.32;
          const radius = 30 + i * 2.6;
          const x = 200 + Math.cos(angle) * radius;
          const y = 200 + Math.sin(angle) * radius;
          const opacity = rnd(Math.max(0.1, 0.9 - i * 0.013));
          const r = 0.4 + (i % 5 === 0 ? 0.5 : 0);
          return <circle key={i} cx={rnd(x)} cy={rnd(y)} r={r} opacity={opacity} />;
        })}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = Math.PI + i * 0.32;
          const radius = 30 + i * 2.6;
          const x = 200 + Math.cos(angle) * radius;
          const y = 200 + Math.sin(angle) * radius;
          const opacity = rnd(Math.max(0.1, 0.9 - i * 0.013));
          const r = 0.4 + (i % 5 === 0 ? 0.5 : 0);
          return <circle key={`b${i}`} cx={rnd(x)} cy={rnd(y)} r={r} opacity={opacity} fill="#f0e6d2" />;
        })}
      </g>
      <circle cx="200" cy="200" r="50" fill="url(#gxy-core)" />
      <circle cx="200" cy="200" r="6" fill="#f0e6d2" />
    </svg>
  );
}

export function SmokeBand({ height = 120, opacity = 0.3 }: { height?: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none" width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <filter id="smk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence baseFrequency="0.012" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.78  0 0 0 0 0.65  0 0 0 1.4 -0.4" />
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id="smk-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity={opacity} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="smk-mask">
          <rect width="400" height="120" fill="url(#smk-fade)" />
        </mask>
      </defs>
      <g mask="url(#smk-mask)">
        <rect width="400" height="120" filter="url(#smk)" opacity={opacity * 1.6} />
      </g>
    </svg>
  );
}

export function SunRadiant({ size = 360 }: { size?: number }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id="sun-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#E7C27D" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#E1C17B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E1C17B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="#E1C17B" strokeOpacity="0.4" strokeWidth="0.6">
        {Array.from({ length: 36 }).map((_, i) => {
          const a = ((i * 10) * Math.PI) / 180;
          const r1 = 50,
            r2 = 180;
          const x1 = rnd(200 + Math.cos(a) * r1),
            y1 = rnd(200 + Math.sin(a) * r1);
          const x2 = rnd(200 + Math.cos(a) * r2),
            y2 = rnd(200 + Math.sin(a) * r2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={i % 2 ? 0.5 : 1} />;
        })}
      </g>
      <circle cx="200" cy="200" r="70" fill="url(#sun-core)" />
      <circle cx="200" cy="200" r="20" fill="#f0e6d2" opacity="0.6" />
    </svg>
  );
}

export function LunarMansionChart({ size = 280, highlight }: { size?: number; highlight?: string[] }) {
  const mansions = [
    { h: "角" }, { h: "亢" }, { h: "氐" }, { h: "房" }, { h: "心" }, { h: "尾" }, { h: "箕" },
    { h: "斗" }, { h: "牛" }, { h: "女" }, { h: "虛" }, { h: "危" }, { h: "室" }, { h: "壁" },
    { h: "奎" }, { h: "婁" }, { h: "胃" }, { h: "昴" }, { h: "畢" }, { h: "觜" }, { h: "參" },
    { h: "井" }, { h: "鬼" }, { h: "柳" }, { h: "星" }, { h: "張" }, { h: "翼" }, { h: "軫" },
  ];
  const cx = size / 2,
    cy = size / 2;
  const rOuter = size * 0.46;
  const rRing = size * 0.4;
  const rInner = size * 0.28;
  const rCore = size * 0.16;
  const N = mansions.length;
  const step = 360 / N;
  const startAngle = -90 - step / 2;
  const dirGuardians = [
    { angle: 0, h: "青龍", label: "東" },
    { angle: 90, h: "玄武", label: "北" },
    { angle: 180, h: "白虎", label: "西" },
    { angle: 270, h: "朱雀", label: "南" },
  ];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id="lm-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#15172E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0E1020" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id="lm-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E7C27D" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E1C17B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rOuter} fill="url(#lm-bg)" />
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(225,193,123,0.6)" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={rRing} fill="none" stroke="rgba(225,193,123,0.35)" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(225,193,123,0.4)" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={rCore} fill="none" stroke="rgba(225,193,123,0.6)" strokeWidth="0.8" />
      {[0, 7, 14, 21].map((i) => {
        const a = ((startAngle + i * step) * Math.PI) / 180;
        return (
          <line
            key={`div-${i}`}
            x1={rnd(cx + Math.cos(a) * rCore)}
            y1={rnd(cy + Math.sin(a) * rCore)}
            x2={rnd(cx + Math.cos(a) * rOuter)}
            y2={rnd(cy + Math.sin(a) * rOuter)}
            stroke="rgba(225,193,123,0.55)"
            strokeWidth="0.8"
          />
        );
      })}
      {mansions.map((m, i) => {
        const a = ((startAngle + (i + 0.5) * step) * Math.PI) / 180;
        const r = (rRing + rOuter) / 2;
        const x = rnd(cx + Math.cos(a) * r);
        const y = rnd(cy + Math.sin(a) * r);
        const isHi = highlight && highlight.includes(m.h);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Ma Shan Zheng', 'Nanum Myeongjo', serif"
            fontSize={size * 0.045}
            fill={isHi ? "#E7C27D" : "rgba(241,238,249,0.85)"}
            style={{ filter: isHi ? "drop-shadow(0 0 4px rgba(232,200,120,0.7))" : "none" }}
          >
            {m.h}
          </text>
        );
      })}
      {dirGuardians.map((g, i) => {
        const a = ((g.angle - 90) * Math.PI) / 180;
        const r = (rCore + rInner) / 2;
        const x = rnd(cx + Math.cos(a) * r);
        const y = rnd(cy + Math.sin(a) * r);
        return (
          <g key={i}>
            <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="central" fontFamily="'Ma Shan Zheng', serif" fontSize={size * 0.052} fill="#E1C17B">
              {g.h}
            </text>
            <text x={x} y={y + 12} textAnchor="middle" dominantBaseline="central" fontFamily="'Nanum Myeongjo', serif" fontSize={size * 0.028} letterSpacing="0.15em" fill="rgba(225,193,123,0.6)">
              {g.label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={rCore - 4} fill="url(#lm-core)" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="'Ma Shan Zheng', serif" fontSize={size * 0.1} fill="#0E1020">
        太
      </text>
      {Array.from({ length: 56 }).map((_, i) => {
        const a = ((i * (360 / 56) - 90) * Math.PI) / 180;
        const x1 = rnd(cx + Math.cos(a) * (rOuter + 2));
        const y1 = rnd(cy + Math.sin(a) * (rOuter + 2));
        const x2 = rnd(cx + Math.cos(a) * (rOuter + (i % 7 === 0 ? 7 : 4)));
        const y2 = rnd(cy + Math.sin(a) * (rOuter + (i % 7 === 0 ? 7 : 4)));
        return <line key={`t-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(225,193,123,0.45)" strokeWidth={i % 7 === 0 ? 0.9 : 0.5} />;
      })}
    </svg>
  );
}

export function AlmanacPage({ width = 220, height = 280 }: { width?: number; height?: number }) {
  const cols = [
    { year: "丁未", months: ["壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑"] },
    { year: "戊申", months: ["甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥", "甲子", "乙丑"] },
    { year: "己酉", months: ["丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉", "甲戌", "乙亥", "丙子", "丁丑"] },
    { year: "庚戌", months: ["戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未", "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑"] },
  ];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="alm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E2140" />
          <stop offset="100%" stopColor="#181530" />
        </linearGradient>
        <filter id="alm-noise">
          <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.15 0" />
        </filter>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#alm-bg)" />
      <rect x="0" y="0" width={width} height={height} filter="url(#alm-noise)" opacity="0.12" />
      <rect x="6" y="6" width={width - 12} height={height - 12} fill="none" stroke="#343865" strokeWidth="1" />
      <rect x="9" y="9" width={width - 18} height={height - 18} fill="none" stroke="#343865" strokeWidth="0.5" opacity="0.5" />
      <text x={width / 2} y="22" textAnchor="middle" dominantBaseline="central" fontFamily="'Ma Shan Zheng', serif" fontSize="13" fill="#E8E6F2" letterSpacing="0.2em">
        萬歲曆
      </text>
      <line x1="20" y1="30" x2={width - 20} y2="30" stroke="#343865" strokeWidth="0.5" />
      {cols.map((col, ci) => {
        const colW = (width - 28) / cols.length;
        const x = 14 + ci * colW + colW / 2;
        return (
          <g key={ci}>
            <text x={x} y="44" textAnchor="middle" dominantBaseline="central" fontFamily="'Ma Shan Zheng', serif" fontSize="11" fill="#E1C17B">
              {col.year}
            </text>
            <line x1={x - colW * 0.35} y1="52" x2={x + colW * 0.35} y2="52" stroke="#E1C17B" strokeWidth="0.4" opacity="0.6" />
            {col.months.map((m, mi) => (
              <text key={mi} x={x} y={62 + mi * 16} textAnchor="middle" dominantBaseline="central" fontFamily="'Nanum Myeongjo', serif" fontSize="10" fill="#C9C6DC">
                {m}
              </text>
            ))}
            {ci < cols.length - 1 && (
              <line x1={x + colW / 2} y1="38" x2={x + colW / 2} y2={height - 20} stroke="#343865" strokeWidth="0.3" opacity="0.4" strokeDasharray="2 2" />
            )}
          </g>
        );
      })}
      <g transform={`translate(${width - 32}, ${height - 32}) rotate(-6)`}>
        <rect x="-14" y="-14" width="28" height="28" fill="#8b1e1e" />
        <rect x="-12" y="-12" width="24" height="24" fill="none" stroke="#ede4d4" strokeWidth="1" />
        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontFamily="'Ma Shan Zheng', serif" fontSize="10" fill="#ede4d4">
          古
        </text>
      </g>
    </svg>
  );
}

export function BigLandscape({ height = 320 }: { height?: number }) {
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" width="100%" height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1430" stopOpacity="0" />
          <stop offset="60%" stopColor="#15172E" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0E1020" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="moon2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#E7C27D" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E1C17B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mt-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1430" />
          <stop offset="100%" stopColor="#0E1020" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#sky2)" />
      <circle cx="80" cy="60" r="34" fill="url(#moon2)" />
      <circle cx="80" cy="60" r="14" fill="#f0e6d2" opacity="0.4" />
      {[[160, 40, 0.6], [200, 30, 0.8], [250, 55, 0.5], [300, 40, 0.7], [340, 72, 0.5], [120, 90, 0.4], [280, 90, 0.5]].map(([x, y, o], i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="#f0e6d2" opacity={o} />
      ))}
      <path d="M0 140 L40 120 L80 130 L130 95 L180 115 L220 90 L270 110 L320 88 L360 105 L400 95 L400 320 L0 320 Z" fill="rgba(58,13,24,0.55)" />
      <rect x="0" y="110" width="400" height="50" fill="#15172E" opacity="0.45" />
      <path d="M-20 180 L30 150 L70 165 L120 140 L170 165 L220 130 L280 155 L340 130 L400 155 L400 320 L-20 320 Z" fill="url(#mt-deep)" opacity="0.85" />
      <rect x="0" y="175" width="400" height="35" fill="#0E1020" opacity="0.4" />
      <g transform="translate(280, 168)">
        <rect x="-12" y="-4" width="24" height="8" fill="#15172E" stroke="#E1C17B" strokeWidth="0.5" />
        <path d="M-16 -4 L-2 -14 L2 -14 L16 -4 Z" fill="#15172E" stroke="#E1C17B" strokeWidth="0.5" />
        <path d="M-18 -4 L-13 -4 M18 -4 L13 -4" stroke="#E1C17B" strokeWidth="0.5" />
        <line x1="0" y1="-14" x2="0" y2="-18" stroke="#E1C17B" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="2" fill="#ffd066" opacity="0.8" />
      </g>
      <path d="M-10 230 L40 205 L90 220 L140 195 L200 215 L260 190 L320 210 L400 195 L400 320 L-10 320 Z" fill="#050204" />
      <g transform="translate(80, 220)">
        <line x1="0" y1="0" x2="0" y2="-35" stroke="#0E1020" strokeWidth="2" />
        <path d="M-1 -10 Q -8 -15 -10 -25 Q -5 -22 0 -25 Q 5 -22 10 -25 Q 8 -15 1 -10 Z" fill="#15172E" />
        <path d="M-1 -20 Q -10 -25 -14 -38 Q -6 -34 0 -38 Q 6 -34 14 -38 Q 10 -25 1 -20 Z" fill="#0E1020" />
        <path d="M-1 -30 Q -8 -34 -11 -45 Q -5 -42 0 -45 Q 5 -42 11 -45 Q 8 -34 1 -30 Z" fill="#0E1020" />
      </g>
      <g transform="translate(140, 215)">
        <ellipse cx="0" cy="-2" rx="2.5" ry="3" fill="#0E1020" />
        <path d="M-3 0 Q -3 6 -2 8 L 2 8 Q 3 6 3 0 Z" fill="#0E1020" />
      </g>
      <g opacity="0.35">
        {Array.from({ length: 20 }).map((_, i) => {
          const x = (i * 27 + 11) % 400;
          const y = 110 + ((i * 11) % 80);
          return <circle key={i} cx={x} cy={y} r="0.5" fill="#E1C17B" />;
        })}
      </g>
    </svg>
  );
}

export { Fragment };
