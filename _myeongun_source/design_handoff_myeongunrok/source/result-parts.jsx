// 명운록 — 결과 화면 부분들 (FourPillars, OhaengSection, IljuReading, DaeunPreview)

// ──────────────────────────────────────────────────────
// FOUR PILLARS — 명식판 (사주 8자)
// ──────────────────────────────────────────────────────
function FourPillars({ pillars }) {
  // Display order: 時 日 月 年 (right-to-left, traditional)
  const cols = [
    { key: 'hour',  label: '時柱', sub: '시주', role: '말년/자식' },
    { key: 'day',   label: '日柱', sub: '일주', role: '자신/배우자', highlight: true },
    { key: 'month', label: '月柱', sub: '월주', role: '청년/부모' },
    { key: 'year',  label: '年柱', sub: '연주', role: '초년/조상' },
  ];

  const E_COLOR = window.Ohaeng.E_COLOR;

  return (
    <div className="ink-fade ink-fade-d2" style={{ padding: '0 16px', marginBottom: 30 }}>
      {/* column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 4 }}>
        {cols.map(c => (
          <div key={c.key} style={{ textAlign: 'center', padding: '4px 0' }}>
            <div className="brush" style={{
              fontSize: 18, color: c.highlight ? 'var(--seal)' : 'var(--ink-soft)',
              lineHeight: 1, letterSpacing: '0.04em',
            }}>{c.label}</div>
            <div className="myeongjo" style={{
              fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.2em', marginTop: 3,
            }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="ink-rule-thick" style={{ marginBottom: 0 }}/>

      {/* 천간 row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 6 }}>
        {cols.map(c => {
          const p = pillars[c.key];
          return (
            <PillarCell key={c.key} char={p.stemH} ko={p.stem}
              element={p.stemElement} elementH={p.stemElementH}
              yin={p.stemYin} color={E_COLOR[p.stemElement]}
              highlight={c.highlight} type="천간"
            />
          );
        })}
      </div>

      {/* 지지 row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4 }}>
        {cols.map(c => {
          const p = pillars[c.key];
          return (
            <PillarCell key={c.key} char={p.branchH} ko={p.branch}
              element={p.branchElement} elementH={p.branchElementH}
              yin={p.branchYin} color={E_COLOR[p.branchElement]}
              highlight={c.highlight} type="지지"
            />
          );
        })}
      </div>

      <div className="ink-rule" style={{ margin: '8px 0 6px' }}/>

      {/* roles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {cols.map(c => (
          <div key={c.key} className="myeongjo" style={{
            textAlign: 'center', fontSize: 9, letterSpacing: '0.15em',
            color: c.highlight ? 'var(--seal)' : 'var(--ink-faint)',
            padding: '4px 0',
          }}>{c.role}</div>
        ))}
      </div>
    </div>
  );
}

function PillarCell({ char, ko, element, elementH, yin, color, highlight, type }) {
  return (
    <div style={{
      position: 'relative',
      background: highlight ? 'rgba(139,30,30,0.04)' : 'rgba(237,228,212,0.5)',
      border: highlight ? '1px solid rgba(139,30,30,0.25)' : '1px solid var(--line-soft)',
      padding: '12px 6px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      {/* yin/yang tiny mark */}
      <div className="myeongjo" style={{
        position: 'absolute', top: 4, left: 6, fontSize: 8,
        color: 'var(--ink-faint)', letterSpacing: '0.1em',
      }}>
        {yin === '양' ? '⊕' : '⊖'}
      </div>
      {/* element dot, top-right */}
      <div style={{
        position: 'absolute', top: 5, right: 5,
        width: 8, height: 8, borderRadius: '50%', background: color,
      }}/>

      {/* big hanja */}
      <div className="brush" style={{
        fontSize: 34, lineHeight: 1, color: color, letterSpacing: 0,
      }}>{char}</div>

      {/* korean reading */}
      <div className="myeongjo" style={{
        fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em',
      }}>{ko}</div>

      {/* element label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, marginTop: 2,
      }}>
        <span className="brush" style={{ fontSize: 11, color: color, lineHeight: 1 }}>{elementH}</span>
        <span className="myeongjo" style={{ fontSize: 8, color: 'var(--ink-faint)', letterSpacing: '0.15em' }}>
          {element}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// OHAENG SECTION
// ──────────────────────────────────────────────────────
function OhaengSection({ counts, style, onTweak }) {
  const { OhaengPentagon, OhaengCircularFlow, OhaengBars, OhaengCards } = window.Ohaeng;

  const styleConfig = {
    pentagon: { label: '오각성', sub: '相生相剋', Comp: OhaengPentagon },
    circular: { label: '환형 상생도', sub: '相生', Comp: OhaengCircularFlow },
    bars:     { label: '균형 막대', sub: '量', Comp: OhaengBars },
    cards:    { label: '오행 낱장', sub: '五行', Comp: OhaengCards },
  };
  const cur = styleConfig[style] || styleConfig.pentagon;
  const Comp = cur.Comp;

  return (
    <div className="ink-fade ink-fade-d3" style={{
      padding: '0 24px', marginBottom: 30,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div>
          <div className="brush" style={{ fontSize: 24, color: 'var(--ink)', lineHeight: 1, letterSpacing: '0.04em' }}>
            五行
          </div>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.2em', marginTop: 4,
          }}>
            오행 분포 · {cur.sub}
          </div>
        </div>
        <button onClick={onTweak} style={{
          background: 'transparent', border: '1px solid var(--line)',
          padding: '6px 10px', cursor: 'pointer',
          fontFamily: "'Nanum Myeongjo', serif", fontSize: 10,
          color: 'var(--ink-soft)', letterSpacing: '0.2em',
        }}>
          {cur.label} ↻
        </button>
      </div>

      <div style={{
        background: 'rgba(237,228,212,0.55)',
        border: '1px solid var(--line-soft)',
        padding: '16px 12px 18px',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 240,
      }}>
        <Comp counts={counts}/>
      </div>

      {/* legend / summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 10,
      }}>
        {['목','화','토','금','수'].map(el => (
          <div key={el} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 0',
          }}>
            <div style={{
              width: '100%', height: 3, background: window.Ohaeng.E_COLOR[el],
              opacity: (counts[el] || 0) === 0 ? 0.2 : 1,
            }}/>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
              {String(counts[el] || 0).padStart(2,'0')}
            </div>
            <div className="myeongjo" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.15em' }}>
              {window.Ohaeng.E_KO[el]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 일주(일간) 해설
// ──────────────────────────────────────────────────────
const ILGAN_READINGS = {
  '갑': { metaphor: '큰 나무', desc: '곧게 자라는 우두머리의 기질. 신념이 단단하고 추진력이 빠릅니다.', advise: '뿌리를 깊이 두는 일에 시간을 들이세요.' },
  '을': { metaphor: '풀과 덩굴', desc: '부드럽지만 끈질긴 생명력. 사람들 사이를 휘감으며 자랍니다.', advise: '의지처를 잘 고르는 일이 곧 운입니다.' },
  '병': { metaphor: '태양', desc: '밝고 뜨겁게 비추는 성정. 무대 위에서 빛납니다.', advise: '그늘에 머무는 시간도 의식적으로 가지세요.' },
  '정': { metaphor: '촛불·등불', desc: '섬세하고 따뜻한 빛. 가까운 이들을 비추는 데 능합니다.', advise: '자기 심지를 태우지 않도록 살피세요.' },
  '무': { metaphor: '큰 산', desc: '무게 있고 신뢰감이 깊은 토양. 중심을 잡는 사람.', advise: '움직임이 굳어지지 않게 흐름을 받아들이세요.' },
  '기': { metaphor: '논·밭의 흙', desc: '품어 길러내는 보드라운 흙. 보살핌의 기운.', advise: '내 안의 씨앗 한 줄에도 햇볕을 주세요.' },
  '경': { metaphor: '강철·도끼', desc: '단단하고 결단력 있는 금속의 성정. 옳고 그름을 가립니다.', advise: '날을 갈 때와 거둘 때를 구분하세요.' },
  '신': { metaphor: '보석·세공된 금', desc: '예민하고 정교한 감각. 다듬어진 아름다움을 추구합니다.', advise: '자신의 예민함을 무기로도 약점으로도 두지 마세요.' },
  '임': { metaphor: '강물·바다', desc: '큰 흐름을 만드는 물. 지혜롭고 변화에 능합니다.', advise: '깊이 흐를 곳을 분명히 정하세요.' },
  '계': { metaphor: '이슬·빗물', desc: '맑고 섬세한 물. 스며들어 닿게 하는 힘.', advise: '메마름과 범람 사이에서 자기 결을 지키세요.' },
};

function IljuReading({ ilgan, dominant, weakest }) {
  const r = ILGAN_READINGS[ilgan.stem] || { metaphor: '—', desc: '', advise: '' };
  const E_HANJA = window.Ohaeng.E_HANJA;
  const E_KO = window.Ohaeng.E_KO;

  return (
    <div className="ink-fade ink-fade-d4" style={{ padding: '0 24px', marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div className="brush" style={{ fontSize: 24, color: 'var(--ink)', lineHeight: 1 }}>日主</div>
        <div className="myeongjo" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.2em' }}>
          일주 — 당신의 본래 결
        </div>
      </div>

      <div className="brush-border" style={{
        padding: '20px 18px', background: 'rgba(237,228,212,0.55)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--paper-warm)',
          }}>
            <span className="brush" style={{ fontSize: 32, lineHeight: 1 }}>{ilgan.stemH}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="myeongjo" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.2em' }}>
              일간 · {ilgan.stem}({ilgan.stemH})
            </div>
            <div className="myeongjo" style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 700, marginTop: 4, letterSpacing: '0.04em' }}>
              {r.metaphor}
            </div>
            <div className="myeongjo" style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.15em', marginTop: 2 }}>
              {ilgan.stemYin}의 {ilgan.stemElement}({ilgan.stemElementH})
            </div>
          </div>
        </div>

        <div className="myeongjo" style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink-soft)' }}>
          {r.desc}
        </div>

        <div className="ink-rule" style={{ margin: '14px 0' }}/>

        <div className="myeongjo" style={{ fontSize: 11, color: 'var(--seal)', letterSpacing: '0.2em', marginBottom: 6 }}>
          訣 · 다스리는 결
        </div>
        <div className="myeongjo" style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink)' }}>
          {r.advise}
        </div>
      </div>

      {/* 강한/약한 오행 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <SummaryChip label="가장 풍성한" hanja={E_HANJA[dominant[0]]} ko={E_KO[dominant[0]]} count={dominant[1]} color="var(--seal)"/>
        <SummaryChip label="가장 빈약한" hanja={E_HANJA[weakest[0]]} ko={E_KO[weakest[0]]} count={weakest[1]} color="var(--ink-soft)"/>
      </div>
    </div>
  );
}

function SummaryChip({ label, hanja, ko, count, color }) {
  return (
    <div style={{
      border: '1px solid var(--line)', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div className="brush" style={{ fontSize: 28, color, lineHeight: 1 }}>{hanja}</div>
      <div style={{ flex: 1 }}>
        <div className="myeongjo" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.2em' }}>
          {label}
        </div>
        <div className="myeongjo" style={{ fontSize: 13, color: 'var(--ink)', letterSpacing: '0.08em', marginTop: 2 }}>
          {ko} · {count}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 대운 미리보기 (10년 단위)
// ──────────────────────────────────────────────────────
function DaeunPreview({ pillars, input }) {
  const STEMS_H = window.SajuLib.STEMS_H;
  const BRANCHES_H = window.SajuLib.BRANCHES_H;
  const STEM_ELEMENT = window.SajuLib.STEM_ELEMENT;
  const BRANCH_ELEMENT = window.SajuLib.BRANCH_ELEMENT;
  const E_COLOR = window.Ohaeng.E_COLOR;

  // 대운 방향: 양남음녀 순행, 음남양녀 역행. 데모용 간단화.
  const yearStemYin = window.SajuLib.STEM_ELEMENT; // ignore
  const monthIdx = { s: pillars.month.sIdx, b: pillars.month.bIdx };
  const isForward = (input.gender === '남성') === (pillars.year.stemYin === '양');
  const dir = isForward ? 1 : -1;

  // 시작 나이 (데모용 고정 3세)
  const startAge = 3;
  const ages = [startAge, startAge + 10, startAge + 20, startAge + 30, startAge + 40, startAge + 50];

  const daeun = ages.map((age, i) => {
    const off = i + 1;
    const s = ((monthIdx.s + dir * off) % 10 + 10) % 10;
    const b = ((monthIdx.b + dir * off) % 12 + 12) % 12;
    return {
      age, stemH: STEMS_H[s], branchH: BRANCHES_H[b],
      stemEl: STEM_ELEMENT[s], branchEl: BRANCH_ELEMENT[b],
    };
  });

  return (
    <div className="ink-fade ink-fade-d4" style={{ padding: '0 0 0 24px', marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, paddingRight: 24 }}>
        <div className="brush" style={{ fontSize: 24, color: 'var(--ink)', lineHeight: 1 }}>大運</div>
        <div className="myeongjo" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.2em' }}>
          대운 — 10년의 흐름
        </div>
      </div>

      {/* horizontal scroll */}
      <div style={{ overflowX: 'auto', paddingRight: 24, scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'min-content' }}>
          {daeun.map((d, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 64,
              background: 'rgba(237,228,212,0.55)',
              border: '1px solid var(--line-soft)',
              padding: '10px 6px', textAlign: 'center',
            }}>
              <div className="mono" style={{
                fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.15em',
              }}>
                {String(d.age).padStart(2,'0')}歲
              </div>
              <div className="brush" style={{
                fontSize: 26, color: E_COLOR[d.stemEl], lineHeight: 1.1, marginTop: 8,
              }}>{d.stemH}</div>
              <div className="brush" style={{
                fontSize: 26, color: E_COLOR[d.branchEl], lineHeight: 1.1,
              }}>{d.branchH}</div>
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 3, marginTop: 6,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: E_COLOR[d.stemEl] }}/>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: E_COLOR[d.branchEl] }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FourPillars, OhaengSection, IljuReading, DaeunPreview });
