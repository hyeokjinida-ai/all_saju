// 명운록 自動 — 결과 화면 (명식 + 오행 + AI 해설 + 카톡 업셀)

const { useState: rUseState, useEffect: rUseEffect, useRef: rUseRef } = React;

// ──────────────────────────────────────────────────────
// 명식 8자판 (와인/골드)
// ──────────────────────────────────────────────────────
function AutoFourPillars({ pillars }) {
  const E_COLOR = window.Ohaeng.E_COLOR;
  const cols = [
    { key: 'hour',  label: '時柱', role: '말년' },
    { key: 'day',   label: '日柱', role: '자신', hi: true },
    { key: 'month', label: '月柱', role: '청년' },
    { key: 'year',  label: '年柱', role: '초년' },
  ];

  return (
    <div className="gold-frame" style={{ padding: '20px 12px 16px', background: 'rgba(13,6,8,0.55)' }}>
      <div className="mono" style={{
        fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em', textAlign: 'center', marginBottom: 14,
      }}>· 四 柱 命 式 ·</div>

      {/* headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 4 }}>
        {cols.map(c => (
          <div key={c.key} style={{ textAlign: 'center', padding: '2px 0' }}>
            <div className="brush" style={{
              fontSize: 15, lineHeight: 1, color: c.hi ? 'var(--gold-bright)' : 'var(--gold-soft)',
            }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div className="gold-rule" style={{ marginBottom: 6 }}/>

      {/* 천간 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {cols.map(c => {
          const p = pillars[c.key];
          return <APillarCell key={c.key} char={p.stemH} ko={p.stem}
            elementH={p.stemElementH} element={p.stemElement}
            color={E_COLOR[p.stemElement]} hi={c.hi}/>;
        })}
      </div>
      {/* 지지 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4 }}>
        {cols.map(c => {
          const p = pillars[c.key];
          return <APillarCell key={c.key} char={p.branchH} ko={p.branch}
            elementH={p.branchElementH} element={p.branchElement}
            color={E_COLOR[p.branchElement]} hi={c.hi}/>;
        })}
      </div>

      {/* roles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 8 }}>
        {cols.map(c => (
          <div key={c.key} className="myeongjo" style={{
            textAlign: 'center', fontSize: 9, letterSpacing: '0.15em',
            color: c.hi ? 'var(--gold-bright)' : 'var(--bone-faint)',
          }}>{c.role}</div>
        ))}
      </div>
    </div>
  );
}

function APillarCell({ char, ko, elementH, element, color, hi }) {
  return (
    <div style={{
      background: hi ? 'rgba(212,175,106,0.10)' : 'rgba(240,230,210,0.03)',
      border: hi ? '1px solid var(--gold)' : '1px solid rgba(240,230,210,0.08)',
      padding: '10px 4px 8px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 3, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: color }}/>
      <div className="brush glow-bone" style={{ fontSize: 30, lineHeight: 1, color: hi ? 'var(--gold-bright)' : 'var(--bone)' }}>{char}</div>
      <div className="myeongjo" style={{ fontSize: 10, color: 'var(--bone-soft)', letterSpacing: '0.05em' }}>{ko}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span className="brush" style={{ fontSize: 10, color, lineHeight: 1 }}>{elementH}</span>
        <span className="myeongjo" style={{ fontSize: 8, color: 'var(--bone-faint)', letterSpacing: '0.1em' }}>{element}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 오행 분포 (cosmos용 막대 — 항상 잘 읽힘)
// ──────────────────────────────────────────────────────
function AutoOhaeng({ counts }) {
  const order = ['목','화','토','금','수'];
  const E_COLOR = window.Ohaeng.E_COLOR;
  const E_HANJA = window.Ohaeng.E_HANJA;
  const E_KO = window.Ohaeng.E_KO;
  const max = Math.max(1, ...Object.values(counts), 4);

  return (
    <div style={{
      background: 'rgba(13,6,8,0.5)', border: '1px solid var(--gold-pale)',
      padding: '18px 14px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, alignItems: 'end', height: 120 }}>
        {order.map(el => {
          const ct = counts[el] || 0;
          const h = Math.max(6, (ct / max) * 100);
          return (
            <div key={el} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--bone)', marginBottom: 4 }}>{ct}</div>
              <div style={{
                width: '70%', height: `${h}px`,
                background: `linear-gradient(180deg, ${E_COLOR[el]} 0%, ${E_COLOR[el]}99 100%)`,
                opacity: ct === 0 ? 0.25 : 1,
                boxShadow: ct === max ? `0 0 12px ${E_COLOR[el]}` : 'none',
              }}/>
            </div>
          );
        })}
      </div>
      <div className="gold-rule" style={{ margin: '10px 0 8px' }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {order.map(el => (
          <div key={el} style={{ textAlign: 'center' }}>
            <div className="brush" style={{ fontSize: 18, color: E_COLOR[el], lineHeight: 1 }}>{E_HANJA[el]}</div>
            <div className="myeongjo" style={{ fontSize: 9, color: 'var(--bone-faint)', letterSpacing: '0.1em', marginTop: 3 }}>{E_KO[el]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// AI 해설 (window.claude.complete)
// ──────────────────────────────────────────────────────
const ILGAN_META = {
  '갑':'큰 나무','을':'풀과 덩굴','병':'태양','정':'촛불','무':'큰 산',
  '기':'논밭의 흙','경':'강철','신':'보석','임':'강물','계':'이슬비',
};

function AIReading({ result }) {
  const [status, setStatus] = rUseState('loading'); // loading | done | error
  const [text, setText] = rUseState('');
  const startedRef = rUseRef(false);

  rUseEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    generate();
  }, []);

  const generate = async () => {
    setStatus('loading');
    const { pillars, counts, input } = result;
    const ilgan = pillars.day;
    const dominant = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const weakest  = Object.entries(counts).sort((a,b)=>a[1]-b[1])[0];

    const prompt = `당신은 정통 사주명리(子平命理) 상담가입니다. 아래 명식을 바탕으로 차분하고 품격 있는 풀이를 작성하세요.

[명식]
- 일간(日干): ${ilgan.stem}(${ilgan.stemH}) — ${ILGAN_META[ilgan.stem] || ''}, ${ilgan.stemYin}의 ${ilgan.stemElement}
- 네 기둥: 연주 ${pillars.year.stemH}${pillars.year.branchH} / 월주 ${pillars.month.stemH}${pillars.month.branchH} / 일주 ${pillars.day.stemH}${pillars.day.branchH} / 시주 ${pillars.hour.stemH}${pillars.hour.branchH}
- 오행 분포: 목${counts.목} 화${counts.화} 토${counts.토} 금${counts.금} 수${counts.수}
- 가장 강한 오행: ${dominant[0]}, 가장 약한 오행: ${weakest[0]}
- 성별: ${input.gender}

[작성 규칙]
- 한국어. 존댓말. 차분하고 따뜻하되 신비로운 톤.
- 정확히 3개 문단. 각 문단은 2~3문장.
- 1문단: 일간을 중심으로 본 타고난 결(성정).
- 2문단: 오행의 기울기가 만드는 삶의 흐름(관계·일).
- 3문단: 다스리면 좋은 결(조언) 한 가지.
- 금지: "100% 적중", "운명을 바꾼다", "불운", "궁중 비법", 공포 조장.
- 점치듯 단정하지 말고 '경향', '흐름'으로 표현.
- 머리말/제목 없이 본문만. 마크다운 기호 쓰지 말 것.`;

    try {
      const out = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
      setText((out || '').trim());
      setStatus('done');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(212,175,106,0.06) 0%, rgba(13,6,8,0.6) 100%)',
      border: '1px solid var(--gold-line)', padding: '20px 18px', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="brush glow-gold" style={{ fontSize: 24, color: 'var(--gold-bright)', lineHeight: 1 }}>解</span>
        <div>
          <div className="myeongjo" style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 700, letterSpacing: '0.1em' }}>
            명운록 자동 풀이
          </div>
          <div className="mono" style={{ fontSize: 8.5, color: 'var(--gold-soft)', letterSpacing: '0.2em', marginTop: 2 }}>
            AI · 命理 ALGORITHM
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div style={{ padding: '12px 0' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              height: 11, marginBottom: 9, borderRadius: 2,
              background: 'linear-gradient(90deg, rgba(212,175,106,0.18) 0%, rgba(212,175,106,0.05) 50%, rgba(212,175,106,0.18) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s ease-in-out infinite',
              width: ['100%','92%','78%'][i],
            }}/>
          ))}
          <div className="myeongjo" style={{ fontSize: 11, color: 'var(--gold-soft)', letterSpacing: '0.2em', marginTop: 10 }}>
            여덟 글자를 읽는 중…
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="myeongjo" style={{
          fontSize: 13.5, color: 'var(--bone)', lineHeight: 1.95, letterSpacing: '0.02em',
          whiteSpace: 'pre-wrap', textWrap: 'pretty',
        }}>
          {text}
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '8px 0' }}>
          <div className="myeongjo" style={{ fontSize: 12.5, color: 'var(--bone-soft)', lineHeight: 1.8 }}>
            풀이 생성이 잠시 지연되고 있습니다.
          </div>
          <button onClick={generate} style={{
            marginTop: 12, background: 'transparent', border: '1px solid var(--gold-line)',
            color: 'var(--gold)', padding: '8px 16px', cursor: 'pointer',
            fontFamily: "'Nanum Myeongjo', serif", fontSize: 12, letterSpacing: '0.2em',
          }}>다시 시도</button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// RESULT 전체
// ──────────────────────────────────────────────────────
function AutoResult({ result, onBack }) {
  const { pillars, counts, input } = result;
  const ilgan = pillars.day;

  return (
    <section className="scene-cosmos" data-screen-label="03 Result" style={{
      position: 'relative', minHeight: '100%', overflow: 'hidden',
      padding: '68px 0 40px',
    }}>
      <div className="starfield" style={{ opacity: 0.35 }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', marginBottom: 18 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: "'Nanum Myeongjo', serif", fontSize: 13, color: 'var(--bone-soft)',
            letterSpacing: '0.2em', cursor: 'pointer',
          }}>← 다시 산출</button>
          <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em' }}>03 · 命</div>
        </div>

        {/* identity */}
        <div style={{ padding: '0 24px', marginBottom: 22, textAlign: 'center' }}>
          <div className="myeongjo" style={{ fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.25em', marginBottom: 8 }}>
            {input.calendar === '음력' ? '陰曆' : '陽曆'} · {input.year}年 {input.month}月 {input.day}日 · {input.timeUnknown ? '時不詳' : `${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`}
          </div>
          <div className="brush glow-gold" style={{ fontSize: 34, color: 'var(--gold-bright)', lineHeight: 1.1 }}>
            {input.gender === '여성' ? '坤命' : '乾命'} · {ilgan.stem}{ilgan.branch}日
          </div>
          <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-soft)', marginTop: 8, letterSpacing: '0.15em' }}>
            일간 <strong style={{ color: 'var(--gold-bright)' }}>{ilgan.stem}({ilgan.stemH})</strong> · {ILGAN_META[ilgan.stem]} · 띠 {ilgan.zodiac}
          </div>
        </div>

        {/* 명식 */}
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <AutoFourPillars pillars={pillars}/>
        </div>

        {/* 오행 */}
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <SectionMini hanja="五行" label="오행의 기울기"/>
          <AutoOhaeng counts={counts}/>
        </div>

        {/* AI 해설 */}
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <SectionMini hanja="解" label="자동 풀이"/>
          <AIReading result={result}/>
        </div>

        {/* 카톡 업셀 */}
        <div style={{ padding: '0 24px' }}>
          <div className="gold-frame" style={{
            padding: '22px 18px', background: 'rgba(58,13,24,0.55)', textAlign: 'center',
          }}>
            <div className="brush glow-gold" style={{ fontSize: 30, color: 'var(--gold-bright)', lineHeight: 1, marginBottom: 12 }}>
              深命
            </div>
            <div className="myeongjo" style={{ fontSize: 15, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.6, letterSpacing: '0.04em' }}>
              더 깊은 풀이가<br/>필요하신가요?
            </div>
            <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-soft)', lineHeight: 1.85, marginTop: 12, letterSpacing: '0.02em' }}>
              대운 60년의 흐름, 올해의 운,<br/>
              관계·재물·진로의 구체적 시기는<br/>
              <strong style={{ color: 'var(--gold-bright)' }}>1:1 카톡 상담</strong>에서 자세히.
            </div>
            <div className="gold-rule" style={{ width: '50%', margin: '18px auto' }}/>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--bone-faint)', textDecoration: 'line-through' }}>₩79,900</span>
              <span className="brush" style={{ fontSize: 28, color: 'var(--gold-bright)', lineHeight: 1 }}>₩49,900</span>
            </div>
            <window.AKakaoButton sub="· 첫상담 50%">카톡으로 심화 상담</window.AKakaoButton>
          </div>

          <div className="myeongjo" style={{
            textAlign: 'center', marginTop: 20, fontSize: 9, color: 'var(--bone-faint)',
            letterSpacing: '0.15em', lineHeight: 1.8, opacity: 0.6,
          }}>
            ⓒ 命運錄 · 2026<br/>
            본 자동 풀이는 명리학 기반 참고 자료입니다
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionMini({ hanja, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <span className="brush glow-gold" style={{ fontSize: 22, color: 'var(--gold-bright)', lineHeight: 1 }}>{hanja}</span>
      <span className="myeongjo" style={{ fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.2em' }}>{label}</span>
    </div>
  );
}

Object.assign(window, { AutoResult, AutoFourPillars, AutoOhaeng, AIReading });
