// 명운록 — 시네마틱 배경 일러스트 (SVG)

// ──────────────────────────────────────────────────────
// MOUNTAIN SCENE — multi-layer fog mountains
// ──────────────────────────────────────────────────────
function MountainScene({ withLantern = false, height = 240 }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice"
         width="100%" height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1a0810" stopOpacity="0"/>
          <stop offset="80%" stopColor="#1a0810" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="#0d0608" stopOpacity="0.95"/>
        </linearGradient>
        <linearGradient id="mt-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a0a14"/>
          <stop offset="100%" stopColor="#1a0810"/>
        </linearGradient>
        <linearGradient id="mt-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0810"/>
          <stop offset="100%" stopColor="#0d0608"/>
        </linearGradient>
        <linearGradient id="mt-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0608"/>
          <stop offset="100%" stopColor="#050204"/>
        </linearGradient>
        <radialGradient id="moon-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#d4af6a" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lantern-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd066" stopOpacity="0.95"/>
          <stop offset="30%" stopColor="#e8a040" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#a04a18" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* sky/atmosphere */}
      <rect width="400" height="240" fill="url(#sky-grad)"/>

      {/* distant moon */}
      <circle cx="310" cy="60" r="42" fill="url(#moon-g)"/>
      <circle cx="310" cy="60" r="14" fill="#f0e6d2" opacity="0.18"/>

      {/* far mountains */}
      <path d="M0 160 L40 130 L80 145 L120 110 L160 130 L200 100 L240 120 L290 90 L340 115 L400 100 L400 240 L0 240 Z" fill="url(#mt-far)" opacity="0.7"/>

      {/* fog band over far mountains */}
      <rect x="0" y="120" width="400" height="60" fill="#1a0810" opacity="0.45"/>

      {/* mid mountains */}
      <path d="M-20 180 L30 150 L70 170 L120 140 L170 160 L220 130 L280 155 L340 135 L400 160 L400 240 L-20 240 Z" fill="url(#mt-mid)" opacity="0.85"/>

      {/* near mountains (front) */}
      <path d="M-10 210 L40 185 L90 205 L140 175 L200 200 L260 180 L320 200 L400 185 L400 240 L-10 240 Z" fill="url(#mt-near)"/>

      {/* lantern glow */}
      {withLantern && (
        <g>
          <circle cx="200" cy="218" r="38" fill="url(#lantern-g)"/>
          <circle cx="200" cy="218" r="4" fill="#ffd066"/>
        </g>
      )}

      {/* dust/mist particles */}
      <g opacity="0.4">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i * 23 + 11) % 400;
          const y = 130 + ((i * 7) % 70);
          return <circle key={i} cx={x} cy={y} r="0.6" fill="#d4af6a"/>;
        })}
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// GALAXY — radial spiral, dense stars
// ──────────────────────────────────────────────────────
function GalaxyScene({ size = 280 }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="gxy-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="1"/>
          <stop offset="15%" stopColor="#e8c878" stopOpacity="0.85"/>
          <stop offset="40%" stopColor="#d4af6a" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="gxy-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5a1822" stopOpacity="0"/>
          <stop offset="50%" stopColor="#5a1822" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#0d0608" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* halo */}
      <circle cx="200" cy="200" r="180" fill="url(#gxy-halo)"/>

      {/* spiral arms */}
      <g fill="none" stroke="#d4af6a" strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: 5 }).map((_, i) => {
          const rot = i * 72;
          return (
            <path key={i}
              d="M 200 200 Q 260 150 280 200 Q 290 270 220 290 Q 150 290 130 230 Q 120 180 180 165"
              transform={`rotate(${rot} 200 200)`}
              opacity={0.18 + 0.06 * (i % 3)}
            />
          );
        })}
      </g>

      {/* spiral dust trails */}
      <g fill="#d4af6a">
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 0.32);
          const radius = 30 + i * 2.6;
          const x = 200 + Math.cos(angle) * radius;
          const y = 200 + Math.sin(angle) * radius;
          const opacity = Math.max(0.1, 0.9 - i * 0.013);
          const r = 0.4 + (i % 5 === 0 ? 0.5 : 0);
          return <circle key={i} cx={x} cy={y} r={r} opacity={opacity}/>;
        })}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = Math.PI + i * 0.32;
          const radius = 30 + i * 2.6;
          const x = 200 + Math.cos(angle) * radius;
          const y = 200 + Math.sin(angle) * radius;
          const opacity = Math.max(0.1, 0.9 - i * 0.013);
          const r = 0.4 + (i % 5 === 0 ? 0.5 : 0);
          return <circle key={`b${i}`} cx={x} cy={y} r={r} opacity={opacity} fill="#f0e6d2"/>;
        })}
      </g>

      {/* core */}
      <circle cx="200" cy="200" r="50" fill="url(#gxy-core)"/>
      <circle cx="200" cy="200" r="6" fill="#f0e6d2"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// SMOKE WISP — atmospheric smoke/mist
// ──────────────────────────────────────────────────────
function SmokeBand({ height = 120, opacity = 0.3 }) {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none"
         width="100%" height={height} style={{ display: 'block' }}>
      <defs>
        <filter id="smk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence baseFrequency="0.012" numOctaves="2" seed="3"/>
          <feColorMatrix values="0 0 0 0 0.9
                                  0 0 0 0 0.78
                                  0 0 0 0 0.65
                                  0 0 0 1.4 -0.4"/>
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <linearGradient id="smk-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="white" stopOpacity="0"/>
          <stop offset="50%" stopColor="white" stopOpacity={opacity}/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <mask id="smk-mask"><rect width="400" height="120" fill="url(#smk-fade)"/></mask>
      </defs>
      <g mask="url(#smk-mask)">
        <rect width="400" height="120" filter="url(#smk)" opacity={opacity * 1.6}/>
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// SUN RADIANT — golden sunburst (for CTA section)
// ──────────────────────────────────────────────────────
function SunRadiant({ size = 360 }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="sun-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.95"/>
          <stop offset="20%" stopColor="#e8c878" stopOpacity="0.7"/>
          <stop offset="55%" stopColor="#d4af6a" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* radiant lines */}
      <g stroke="#d4af6a" strokeOpacity="0.4" strokeWidth="0.6">
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i * 10) * Math.PI / 180;
          const r1 = 50, r2 = 180;
          const x1 = 200 + Math.cos(a) * r1, y1 = 200 + Math.sin(a) * r1;
          const x2 = 200 + Math.cos(a) * r2, y2 = 200 + Math.sin(a) * r2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={i % 2 ? 0.5 : 1}/>;
        })}
      </g>
      {/* core */}
      <circle cx="200" cy="200" r="70" fill="url(#sun-core)"/>
      <circle cx="200" cy="200" r="20" fill="#f0e6d2" opacity="0.6"/>
    </svg>
  );
}

// 명운록 — 추가 시너리: 전통(Heritage) + 정밀(Precision) 용

// ──────────────────────────────────────────────────────
// LUNAR MANSION CHART — 二十八宿 천문도
// ──────────────────────────────────────────────────────
function LunarMansionChart({ size = 280, highlight }) {
  // 28 mansions, 7 per cardinal direction
  const mansions = [
    // 東方 青龍 (top, since we'll start at -90deg = up)
    // We arrange clockwise starting from East = right side
    { h: '角', dir: 'E' }, { h: '亢', dir: 'E' }, { h: '氐', dir: 'E' },
    { h: '房', dir: 'E' }, { h: '心', dir: 'E' }, { h: '尾', dir: 'E' }, { h: '箕', dir: 'E' },
    { h: '斗', dir: 'N' }, { h: '牛', dir: 'N' }, { h: '女', dir: 'N' }, { h: '虛', dir: 'N' },
    { h: '危', dir: 'N' }, { h: '室', dir: 'N' }, { h: '壁', dir: 'N' },
    { h: '奎', dir: 'W' }, { h: '婁', dir: 'W' }, { h: '胃', dir: 'W' }, { h: '昴', dir: 'W' },
    { h: '畢', dir: 'W' }, { h: '觜', dir: 'W' }, { h: '參', dir: 'W' },
    { h: '井', dir: 'S' }, { h: '鬼', dir: 'S' }, { h: '柳', dir: 'S' }, { h: '星', dir: 'S' },
    { h: '張', dir: 'S' }, { h: '翼', dir: 'S' }, { h: '軫', dir: 'S' },
  ];

  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.46;
  const rRing  = size * 0.40;
  const rInner = size * 0.28;
  const rCore  = size * 0.16;

  const N = mansions.length;
  const step = 360 / N;
  const startAngle = -90 - step / 2; // so first mansion is at top center

  const dirGuardians = [
    { angle: 0,   h: '青龍', label: '東' },
    { angle: 90,  h: '玄武', label: '北' },
    { angle: 180, h: '白虎', label: '西' },
    { angle: 270, h: '朱雀', label: '南' },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="lm-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0810" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0d0608" stopOpacity="0.9"/>
        </radialGradient>
        <radialGradient id="lm-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8c878" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* outer rings */}
      <circle cx={cx} cy={cy} r={rOuter} fill="url(#lm-bg)"/>
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(212,175,106,0.6)" strokeWidth="0.8"/>
      <circle cx={cx} cy={cy} r={rRing}  fill="none" stroke="rgba(212,175,106,0.35)" strokeWidth="0.6"/>
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(212,175,106,0.4)" strokeWidth="0.6"/>
      <circle cx={cx} cy={cy} r={rCore}  fill="none" stroke="rgba(212,175,106,0.6)" strokeWidth="0.8"/>

      {/* radial dividers (every 7th = direction) */}
      {[0, 7, 14, 21].map(i => {
        const a = (startAngle + i * step) * Math.PI / 180;
        return (
          <line key={`div-${i}`}
            x1={cx + Math.cos(a) * rCore} y1={cy + Math.sin(a) * rCore}
            x2={cx + Math.cos(a) * rOuter} y2={cy + Math.sin(a) * rOuter}
            stroke="rgba(212,175,106,0.55)" strokeWidth="0.8"
          />
        );
      })}

      {/* 28 mansion hanja */}
      {mansions.map((m, i) => {
        const a = (startAngle + (i + 0.5) * step) * Math.PI / 180;
        const r = (rRing + rOuter) / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const isHi = highlight && highlight.includes(m.h);
        return (
          <text key={i} x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                fontFamily="'Ma Shan Zheng', 'Nanum Myeongjo', serif"
                fontSize={size * 0.045}
                fill={isHi ? '#e8c878' : 'rgba(240,230,210,0.85)'}
                style={{ filter: isHi ? 'drop-shadow(0 0 4px rgba(232,200,120,0.7))' : 'none' }}>
            {m.h}
          </text>
        );
      })}

      {/* 4 cardinal guardians inner */}
      {dirGuardians.map((g, i) => {
        const a = (g.angle - 90) * Math.PI / 180;
        const r = (rCore + rInner) / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        return (
          <g key={i}>
            <text x={x} y={y - 4}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Ma Shan Zheng', serif"
                  fontSize={size * 0.052}
                  fill="#d4af6a">
              {g.h}
            </text>
            <text x={x} y={y + 12}
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Nanum Myeongjo', serif"
                  fontSize={size * 0.028}
                  letterSpacing="0.15em"
                  fill="rgba(212,175,106,0.6)">
              {g.label}
            </text>
          </g>
        );
      })}

      {/* core circle with 太 */}
      <circle cx={cx} cy={cy} r={rCore - 4} fill="url(#lm-core)"/>
      <text x={cx} y={cy}
            textAnchor="middle" dominantBaseline="central"
            fontFamily="'Ma Shan Zheng', serif"
            fontSize={size * 0.10}
            fill="#0d0608">
        太
      </text>

      {/* outer tick marks every degree-ish (decorative) */}
      {Array.from({ length: 56 }).map((_, i) => {
        const a = (i * (360 / 56) - 90) * Math.PI / 180;
        const x1 = cx + Math.cos(a) * (rOuter + 2);
        const y1 = cy + Math.sin(a) * (rOuter + 2);
        const x2 = cx + Math.cos(a) * (rOuter + (i % 7 === 0 ? 7 : 4));
        const y2 = cy + Math.sin(a) * (rOuter + (i % 7 === 0 ? 7 : 4));
        return <line key={`t-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                     stroke="rgba(212,175,106,0.45)" strokeWidth={i % 7 === 0 ? 0.9 : 0.5}/>;
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// ALMANAC PAGE — 만세력 페이지 mock (vertical columns)
// ──────────────────────────────────────────────────────
function AlmanacPage({ width = 220, height = 280 }) {
  // Each column shows year + 甲子-style stems vertically
  const cols = [
    { year: '丁未', months: ['壬寅','癸卯','甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑'] },
    { year: '戊申', months: ['甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥','甲子','乙丑'] },
    { year: '己酉', months: ['丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉','甲戌','乙亥','丙子','丁丑'] },
    { year: '庚戌', months: ['戊寅','己卯','庚辰','辛巳','壬午','癸未','甲申','乙酉','丙戌','丁亥','戊子','己丑'] },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="alm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8dfd0"/>
          <stop offset="100%" stopColor="#d4c8af"/>
        </linearGradient>
        <filter id="alm-noise">
          <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3"/>
          <feColorMatrix values="0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.15 0"/>
        </filter>
      </defs>
      {/* paper */}
      <rect x="0" y="0" width={width} height={height} fill="url(#alm-bg)"/>
      <rect x="0" y="0" width={width} height={height} filter="url(#alm-noise)" opacity="0.5"/>

      {/* border */}
      <rect x="6" y="6" width={width - 12} height={height - 12} fill="none" stroke="#3a2a1a" strokeWidth="1"/>
      <rect x="9" y="9" width={width - 18} height={height - 18} fill="none" stroke="#3a2a1a" strokeWidth="0.5" opacity="0.5"/>

      {/* title bar */}
      <text x={width / 2} y="22"
            textAnchor="middle" dominantBaseline="central"
            fontFamily="'Ma Shan Zheng', serif" fontSize="13"
            fill="#3a2a1a" letterSpacing="0.2em">
        萬歲曆
      </text>
      <line x1="20" y1="30" x2={width - 20} y2="30" stroke="#3a2a1a" strokeWidth="0.5"/>

      {/* columns of stems */}
      {cols.map((col, ci) => {
        const colW = (width - 28) / cols.length;
        const x = 14 + ci * colW + colW / 2;
        return (
          <g key={ci}>
            {/* year header */}
            <text x={x} y="44"
                  textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Ma Shan Zheng', serif" fontSize="11"
                  fill="#8b1e1e">
              {col.year}
            </text>
            <line x1={x - colW * 0.35} y1="52" x2={x + colW * 0.35} y2="52" stroke="#8b1e1e" strokeWidth="0.4"/>

            {/* months vertical */}
            {col.months.map((m, mi) => (
              <text key={mi} x={x} y={62 + mi * 16}
                    textAnchor="middle" dominantBaseline="central"
                    fontFamily="'Nanum Myeongjo', serif" fontSize="10"
                    fill="#3a2a1a">
                {m}
              </text>
            ))}

            {/* divider lines between columns */}
            {ci < cols.length - 1 && (
              <line x1={x + colW / 2} y1="38" x2={x + colW / 2} y2={height - 20}
                    stroke="#3a2a1a" strokeWidth="0.3" opacity="0.4" strokeDasharray="2 2"/>
            )}
          </g>
        );
      })}

      {/* seal at bottom right */}
      <g transform={`translate(${width - 32}, ${height - 32}) rotate(-6)`}>
        <rect x="-14" y="-14" width="28" height="28" fill="#8b1e1e"/>
        <rect x="-12" y="-12" width="24" height="24" fill="none" stroke="#ede4d4" strokeWidth="1"/>
        <text x="0" y="0" textAnchor="middle" dominantBaseline="central"
              fontFamily="'Ma Shan Zheng', serif" fontSize="10" fill="#ede4d4">
          古
        </text>
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// BIG LANDSCAPE — 동양화 산수도 with pavilion + scholar
// ──────────────────────────────────────────────────────
function BigLandscape({ height = 320 }) {
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice"
         width="100%" height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a0d18" stopOpacity="0"/>
          <stop offset="60%" stopColor="#1a0810" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#0d0608" stopOpacity="0.95"/>
        </linearGradient>
        <radialGradient id="moon2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e6d2" stopOpacity="0.95"/>
          <stop offset="30%" stopColor="#e8c878" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#d4af6a" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="mt-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a0d18"/>
          <stop offset="100%" stopColor="#0d0608"/>
        </linearGradient>
      </defs>

      {/* sky + moon */}
      <rect width="400" height="320" fill="url(#sky2)"/>
      <circle cx="80" cy="60" r="34" fill="url(#moon2)"/>
      <circle cx="80" cy="60" r="14" fill="#f0e6d2" opacity="0.4"/>

      {/* tiny stars */}
      {[[160,40,0.6],[200,30,0.8],[250,55,0.5],[300,40,0.7],[340,72,0.5],[120,90,0.4],[280,90,0.5]].map(([x,y,o],i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="#f0e6d2" opacity={o}/>
      ))}

      {/* far mountains (faint, misty) */}
      <path d="M0 140 L40 120 L80 130 L130 95 L180 115 L220 90 L270 110 L320 88 L360 105 L400 95 L400 320 L0 320 Z"
            fill="rgba(58,13,24,0.55)"/>

      {/* fog band over far */}
      <rect x="0" y="110" width="400" height="50" fill="#1a0810" opacity="0.45"/>

      {/* mid mountains */}
      <path d="M-20 180 L30 150 L70 165 L120 140 L170 165 L220 130 L280 155 L340 130 L400 155 L400 320 L-20 320 Z"
            fill="url(#mt-deep)" opacity="0.85"/>

      {/* fog band mid */}
      <rect x="0" y="175" width="400" height="35" fill="#0d0608" opacity="0.4"/>

      {/* pavilion on mid-right hilltop */}
      <g transform="translate(280, 168)">
        {/* base */}
        <rect x="-12" y="-4" width="24" height="8" fill="#1a0810" stroke="#d4af6a" strokeWidth="0.5"/>
        {/* roof */}
        <path d="M-16 -4 L-2 -14 L2 -14 L16 -4 Z" fill="#1a0810" stroke="#d4af6a" strokeWidth="0.5"/>
        <path d="M-18 -4 L-13 -4 M18 -4 L13 -4" stroke="#d4af6a" strokeWidth="0.5"/>
        {/* roof finial */}
        <line x1="0" y1="-14" x2="0" y2="-18" stroke="#d4af6a" strokeWidth="0.5"/>
        {/* lantern glow inside */}
        <circle cx="0" cy="0" r="2" fill="#ffd066" opacity="0.8"/>
      </g>

      {/* near mountains (front, darker) */}
      <path d="M-10 230 L40 205 L90 220 L140 195 L200 215 L260 190 L320 210 L400 195 L400 320 L-10 320 Z"
            fill="#050204"/>

      {/* lone pine tree on near-left */}
      <g transform="translate(80, 220)">
        <line x1="0" y1="0" x2="0" y2="-35" stroke="#0d0608" strokeWidth="2"/>
        <path d="M-1 -10 Q -8 -15 -10 -25 Q -5 -22 0 -25 Q 5 -22 10 -25 Q 8 -15 1 -10 Z" fill="#1a0810"/>
        <path d="M-1 -20 Q -10 -25 -14 -38 Q -6 -34 0 -38 Q 6 -34 14 -38 Q 10 -25 1 -20 Z" fill="#0d0608"/>
        <path d="M-1 -30 Q -8 -34 -11 -45 Q -5 -42 0 -45 Q 5 -42 11 -45 Q 8 -34 1 -30 Z" fill="#0d0608"/>
      </g>

      {/* tiny scholar figure on near hill */}
      <g transform="translate(140, 215)">
        <ellipse cx="0" cy="-2" rx="2.5" ry="3" fill="#0d0608"/>
        <path d="M-3 0 Q -3 6 -2 8 L 2 8 Q 3 6 3 0 Z" fill="#0d0608"/>
      </g>

      {/* dust particles in fog */}
      <g opacity="0.35">
        {Array.from({ length: 20 }).map((_, i) => {
          const x = (i * 27 + 11) % 400;
          const y = 110 + ((i * 11) % 80);
          return <circle key={i} cx={x} cy={y} r="0.5" fill="#d4af6a"/>;
        })}
      </g>
    </svg>
  );
}

Object.assign(window, { MountainScene, GalaxyScene, SmokeBand, SunRadiant, LunarMansionChart, AlmanacPage, BigLandscape });
