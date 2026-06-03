// 오행(五行) 시각화 — 4 styles
// 木 火 土 金 水. Each style accepts { counts, highlightElement }.

const ELEMENTS = ['목','화','토','금','수'];
const E_HANJA = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };
const E_KO    = { 목:'나무', 화:'불', 토:'흙', 금:'쇠', 수:'물' };
const E_COLOR = { 목:'#4a6b3a', 화:'#8b1e1e', 토:'#a8896b', 금:'#c9b896', 수:'#1f2937' };

// ─────────────────────────────────────────────────────────
// Style 1 — 오각성 (pentagon + pentagram, 상생/상극)
// ─────────────────────────────────────────────────────────
function OhaengPentagon({ counts, showSangguk = true, size = 280 }) {
  // Position by traditional placement: 火 top, then clockwise 土→金→水→木
  const order = ['화','토','금','수','목'];
  const r = size * 0.36;
  const cx = size / 2, cy = size / 2 + 6;
  const angles = order.map((_, i) => (-90 + i * 72) * Math.PI / 180);
  const points = angles.map(a => [cx + r * Math.cos(a), cy + r * Math.sin(a)]);

  const max = Math.max(1, ...Object.values(counts));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* outer ink ring */}
      <circle cx={cx} cy={cy} r={r + 24} fill="none" stroke="rgba(58,42,26,0.12)" strokeWidth="1"/>
      {/* sangsaeng — pentagon perimeter */}
      <polygon
        points={points.map(p => p.join(',')).join(' ')}
        fill="none" stroke="rgba(58,42,26,0.5)" strokeWidth="1"
      />
      {/* sanggeuk — pentagram (inner star) */}
      {showSangguk && [0,1,2,3,4].map(i => {
        const a = points[i], b = points[(i+2) % 5];
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                     stroke="rgba(139,30,30,0.35)" strokeWidth="0.8" strokeDasharray="2 3"/>;
      })}
      {/* element nodes */}
      {order.map((el, i) => {
        const [x, y] = points[i];
        const ct = counts[el] || 0;
        const nodeR = 22 + (ct / max) * 14;
        return (
          <g key={el}>
            <circle cx={x} cy={y} r={nodeR} fill={E_COLOR[el]} opacity={ct === 0 ? 0.18 : 0.92}/>
            <circle cx={x} cy={y} r={nodeR} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
            <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Ma Shan Zheng', 'Nanum Myeongjo', serif"
                  fontSize={nodeR * 1.15} fill="#ede4d4">
              {E_HANJA[el]}
            </text>
            {/* count badge */}
            <g transform={`translate(${x + nodeR - 4}, ${y - nodeR + 4})`}>
              <circle r="10" fill="#14110d"/>
              <text textAnchor="middle" dominantBaseline="central"
                    fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="#ede4d4">
                {ct}
              </text>
            </g>
          </g>
        );
      })}
      {/* legend rings */}
      <circle cx={cx} cy={cy} r="3" fill="#14110d"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Style 2 — 환형 상생도 (circular sangsaeng flow)
// ─────────────────────────────────────────────────────────
function OhaengCircularFlow({ counts, size = 280 }) {
  // Sangsaeng order: 木→火→土→金→水→木 (clockwise from top)
  const order = ['목','화','토','금','수'];
  const cx = size / 2, cy = size / 2;
  const ringR = size * 0.36;
  const angles = order.map((_, i) => (-90 + i * 72) * Math.PI / 180);
  const points = angles.map(a => [cx + ringR * Math.cos(a), cy + ringR * Math.sin(a)]);
  const max = Math.max(1, ...Object.values(counts));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* faint outer ring */}
      <circle cx={cx} cy={cy} r={ringR + 28} fill="none" stroke="rgba(58,42,26,0.08)"/>
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="rgba(58,42,26,0.35)" strokeWidth="0.8"/>
      {/* sangsaeng arrows along ring */}
      {order.map((el, i) => {
        const a1 = angles[i], a2 = angles[(i+1) % 5];
        // arc from a1+offset to a2-offset
        const off = 0.28;
        const x1 = cx + ringR * Math.cos(a1 + off), y1 = cy + ringR * Math.sin(a1 + off);
        const x2 = cx + ringR * Math.cos(a2 - off), y2 = cy + ringR * Math.sin(a2 - off);
        return <path key={i} d={`M ${x1} ${y1} A ${ringR} ${ringR} 0 0 1 ${x2} ${y2}`}
                     fill="none" stroke="rgba(58,42,26,0.45)" strokeWidth="1" markerEnd="url(#arrowhead)"/>;
      })}
      <defs>
        <marker id="arrowhead" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="rgba(58,42,26,0.55)"/>
        </marker>
      </defs>
      {/* nodes — paper discs with elements */}
      {order.map((el, i) => {
        const [x, y] = points[i];
        const ct = counts[el] || 0;
        const baseR = 26;
        return (
          <g key={el}>
            {/* paper disc */}
            <circle cx={x} cy={y} r={baseR + 4} fill="#ede4d4"/>
            <circle cx={x} cy={y} r={baseR} fill={E_COLOR[el]} opacity={ct === 0 ? 0.18 : 1}/>
            <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="central"
                  fontFamily="'Ma Shan Zheng', 'Nanum Myeongjo', serif"
                  fontSize="30" fill="#ede4d4">
              {E_HANJA[el]}
            </text>
            <text x={x} y={y + baseR + 18} textAnchor="middle"
                  fontFamily="'Nanum Myeongjo', serif" fontSize="11" fill="#3a2a1a" letterSpacing="0.15em">
              {E_KO[el]} · {ct}
            </text>
          </g>
        );
      })}
      {/* center hanja */}
      <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="central"
            fontFamily="'Ma Shan Zheng', serif" fontSize="44" fill="rgba(58,42,26,0.18)">
        相生
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Style 3 — 균형 막대 (vertical balance bars)
// ─────────────────────────────────────────────────────────
function OhaengBars({ counts, width = 280, height = 240 }) {
  const order = ['목','화','토','금','수'];
  const max = Math.max(1, ...Object.values(counts), 4);
  const colW = (width - 28) / 5;
  const barW = colW * 0.62;
  const baseY = height - 50;
  const topY = 24;
  const maxH = baseY - topY;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {/* gridlines */}
      {[0, 1, 2, 3, 4].map(g => {
        const y = baseY - (g / 4) * maxH;
        return <line key={g} x1="14" y1={y} x2={width - 14} y2={y}
                     stroke="rgba(58,42,26,0.12)" strokeDasharray={g === 0 ? 'none' : '2 4'}/>;
      })}
      {/* baseline label */}
      {[0, 2, 4].map(g => (
        <text key={g} x="8" y={baseY - (g / 4) * maxH + 3}
              fontFamily="'JetBrains Mono', monospace" fontSize="8" fill="rgba(58,42,26,0.5)">
          {g}
        </text>
      ))}
      {/* bars */}
      {order.map((el, i) => {
        const ct = counts[el] || 0;
        const h = (ct / max) * maxH;
        const x = 14 + i * colW + (colW - barW) / 2;
        const y = baseY - h;
        return (
          <g key={el}>
            {/* ghost bar */}
            <rect x={x} y={topY} width={barW} height={maxH} fill="rgba(58,42,26,0.04)"/>
            {/* actual bar */}
            <rect x={x} y={y} width={barW} height={h} fill={E_COLOR[el]} opacity={ct === 0 ? 0.2 : 0.95}/>
            {/* count atop */}
            <text x={x + barW / 2} y={y - 6} textAnchor="middle"
                  fontFamily="'JetBrains Mono', monospace" fontSize="12" fill="#14110d">
              {ct}
            </text>
            {/* hanja label */}
            <text x={x + barW / 2} y={baseY + 22} textAnchor="middle"
                  fontFamily="'Ma Shan Zheng', serif" fontSize="22" fill="#3a2a1a">
              {E_HANJA[el]}
            </text>
            {/* korean */}
            <text x={x + barW / 2} y={baseY + 38} textAnchor="middle"
                  fontFamily="'Nanum Myeongjo', serif" fontSize="9" fill="rgba(58,42,26,0.7)" letterSpacing="0.15em">
              {E_KO[el]}
            </text>
          </g>
        );
      })}
      {/* baseline */}
      <line x1="14" y1={baseY} x2={width - 14} y2={baseY} stroke="#3a2a1a" strokeWidth="1.2"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Style 4 — 낱장 카드 (five vertical hanji cards)
// ─────────────────────────────────────────────────────────
function OhaengCards({ counts }) {
  const order = ['목','화','토','금','수'];
  const max = Math.max(1, ...Object.values(counts));

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 6, padding: '4px 0',
    }}>
      {order.map(el => {
        const ct = counts[el] || 0;
        const intensity = ct / max;
        return (
          <div key={el} style={{
            position: 'relative',
            aspectRatio: '0.62 / 1',
            background: '#ede4d4',
            border: '1px solid rgba(58,42,26,0.22)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '10px 4px 8px',
            justifyContent: 'space-between',
            boxShadow: ct > 0 ? '0 1px 0 rgba(20,17,13,0.06)' : 'none',
          }}>
            {/* corner ticks */}
            <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderTop: '1px solid #3a2a1a', borderLeft: '1px solid #3a2a1a' }}/>
            <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderTop: '1px solid #3a2a1a', borderRight: '1px solid #3a2a1a' }}/>
            <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, borderBottom: '1px solid #3a2a1a', borderLeft: '1px solid #3a2a1a' }}/>
            <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderBottom: '1px solid #3a2a1a', borderRight: '1px solid #3a2a1a' }}/>
            {/* hanja, vertical */}
            <div style={{
              fontFamily: "'Ma Shan Zheng', 'Nanum Myeongjo', serif",
              fontSize: 34, lineHeight: 1, color: E_COLOR[el],
              opacity: ct === 0 ? 0.28 : 1, marginTop: 6,
            }}>
              {E_HANJA[el]}
            </div>
            {/* korean */}
            <div style={{
              fontFamily: "'Nanum Myeongjo', serif", fontSize: 9, letterSpacing: '0.2em',
              color: '#3a2a1a', opacity: 0.7,
            }}>
              {E_KO[el]}
            </div>
            {/* count dots */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: i < ct ? E_COLOR[el] : 'rgba(58,42,26,0.15)',
                }}/>
              ))}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: 'rgba(58,42,26,0.6)',
            }}>
              {String(ct).padStart(2, '0')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.Ohaeng = { OhaengPentagon, OhaengCircularFlow, OhaengBars, OhaengCards, E_HANJA, E_KO, E_COLOR };
