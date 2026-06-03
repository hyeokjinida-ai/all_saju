// 명운록 自動 — 자동화 사주 플로우 화면
// 랜딩 → 입력 → 산출 애니메이션 → 결과(명식+오행+AI해설) → 카톡 업셀

const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef } = React;

const AUTO_KAKAO_URL = 'https://pf.kakao.com/_xxxxxx';
const autoKakao = () => window.open(AUTO_KAKAO_URL, '_blank');

// ──────────────────────────────────────────────────────
// 공통 atoms (와인/골드)
// ──────────────────────────────────────────────────────
function AKakaoButton({ children, sub, onClick }) {
  return (
    <button className="btn-kakao" onClick={onClick || autoKakao}>
      <span className="chat"/>
      <span>{children}</span>
      {sub && <span style={{ fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', opacity: 0.7 }}>{sub}</span>}
    </button>
  );
}

function AGoldBtn({ children, sub, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 58,
      background: disabled ? 'rgba(212,175,106,0.15)' : 'linear-gradient(180deg, #e8c878 0%, #d4af6a 100%)',
      color: disabled ? 'var(--bone-faint)' : '#1a0810',
      border: 'none', cursor: disabled ? 'default' : 'pointer',
      fontFamily: "'Noto Serif KR', serif", fontWeight: 700, fontSize: 15,
      letterSpacing: '0.3em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      boxShadow: disabled ? 'none' : '0 0 24px rgba(212,175,106,0.3)',
      transition: 'all 0.2s',
    }}>
      <span>{children}</span>
      {sub && <span className="brush" style={{ fontSize: 20, letterSpacing: 0 }}>{sub}</span>}
    </button>
  );
}

// ──────────────────────────────────────────────────────
// LANDING (간결한 자동화 소개)
// ──────────────────────────────────────────────────────
function AutoLanding({ onStart }) {
  return (
    <section className="scene-wine" data-screen-label="01 Landing" style={{
      position: 'relative', minHeight: '100%', overflow: 'hidden',
      padding: '80px 28px 40px',
      display: 'flex', flexDirection: 'column', textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.4 }}/>
      <div className="vignette"/>

      {/* top tag */}
      <div className="fade-up" style={{
        position: 'relative', zIndex: 2, marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <div style={{ width: 18, height: 1, background: 'var(--gold)' }}/>
        <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.4em' }}>
          AUTO · 自動命式
        </div>
        <div style={{ width: 18, height: 1, background: 'var(--gold)' }}/>
      </div>

      {/* galaxy hero */}
      <div className="fade-up" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div className="drift">
          <window.GalaxyScene size={200}/>
        </div>
      </div>

      <div className="fade-up ink-fade-d1" style={{ position: 'relative', zIndex: 2, marginTop: -10 }}>
        <div className="brush glow-gold" style={{
          fontSize: 52, color: 'var(--gold-bright)', lineHeight: 1.1, letterSpacing: '0.08em',
        }}>
          命運錄
        </div>
        <div className="myeongjo" style={{
          fontSize: 12, color: 'var(--bone-soft)', letterSpacing: '0.5em', marginTop: 6,
        }}>
          명 · 운 · 록
        </div>
      </div>

      <div className="fade-up ink-fade-d2" style={{ position: 'relative', zIndex: 2, marginTop: 32 }}>
        <div className="myeongjo glow-bone" style={{
          fontSize: 24, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.5,
          letterSpacing: '0.04em',
        }}>
          단 1분.<br/>
          당신의 <span style={{ color: 'var(--gold-bright)' }}>여덟 글자</span>가<br/>
          자동으로 펼쳐집니다.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <span className="gold-diamond"/>
        </div>
        <div className="myeongjo" style={{
          fontSize: 12, color: 'var(--bone-soft)', lineHeight: 1.9, letterSpacing: '0.15em',
        }}>
          태어난 순간만 입력하면<br/>
          명식 · 오행 · 풀이까지 즉시
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 24 }}/>

      {/* feature chips */}
      <div className="fade-up ink-fade-d3" style={{
        position: 'relative', zIndex: 2,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24,
      }}>
        {[['式','명식 자동'],['行','오행 분석'],['解','즉시 풀이']].map(([h, t], i) => (
          <div key={i} style={{
            border: '1px solid var(--gold-pale)', padding: '12px 4px',
            background: 'rgba(13,6,8,0.4)',
          }}>
            <div className="brush glow-gold" style={{ fontSize: 22, color: 'var(--gold-bright)', lineHeight: 1 }}>{h}</div>
            <div className="myeongjo" style={{ fontSize: 10, color: 'var(--bone-soft)', letterSpacing: '0.1em', marginTop: 6 }}>{t}</div>
          </div>
        ))}
      </div>

      <div className="fade-up ink-fade-d4" style={{ position: 'relative', zIndex: 2 }}>
        <AGoldBtn onClick={onStart} sub="展">명식 자동 산출</AGoldBtn>
        <div className="mono" style={{
          marginTop: 14, fontSize: 9, color: 'var(--bone-faint)', letterSpacing: '0.3em',
        }}>
          · 無料 · 約 一分 ·
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// INPUT (와인/골드 리스타일)
// ──────────────────────────────────────────────────────
function AutoInput({ form, setForm, onBack, onSubmit }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <section className="scene-cosmos" data-screen-label="02 Input" style={{
      position: 'relative', minHeight: '100%', overflow: 'hidden',
      padding: '70px 24px 36px',
    }}>
      <div className="starfield" style={{ opacity: 0.3 }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: "'Nanum Myeongjo', serif", fontSize: 13, color: 'var(--bone-soft)',
            letterSpacing: '0.2em', cursor: 'pointer',
          }}>← 처음으로</button>
          <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em' }}>02 · 入</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="brush glow-gold" style={{
            fontSize: 44, color: 'var(--gold-bright)', lineHeight: 1.1, letterSpacing: '0.04em',
          }}>
            四柱를<br/>세우다
          </div>
          <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-faint)', marginTop: 8, letterSpacing: '0.18em' }}>
            태어난 순간의 좌표를 적습니다
          </div>
        </div>

        <div className="gold-rule" style={{ marginBottom: 24 }}/>

        <AField label="曆 · 양력 음력" hint="태어난 날의 달력">
          <ASeg options={[['양력','陽'],['음력','陰']]} value={form.calendar} onChange={v => update('calendar', v)}/>
        </AField>

        <AField label="性 · 성별" hint="대운 방향을 결정">
          <ASeg options={[['여성','坤'],['남성','乾']]} value={form.gender} onChange={v => update('gender', v)}/>
        </AField>

        <AField label="生 · 생년월일">
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8 }}>
            <ANum label="년" min={1920} max={2026} value={form.year} onChange={v => update('year', v)}/>
            <ANum label="월" min={1} max={12} value={form.month} onChange={v => update('month', v)}/>
            <ANum label="일" min={1} max={31} value={form.day} onChange={v => update('day', v)}/>
          </div>
        </AField>

        <AField label="時 · 태어난 시각" hint="모르면 시각 모름">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 8 }}>
            <ANum label="시" min={0} max={23} value={form.hour} onChange={v => update('hour', v)} disabled={form.timeUnknown}/>
            <ANum label="분" min={0} max={59} value={form.minute} onChange={v => update('minute', v)} disabled={form.timeUnknown}/>
            <button onClick={() => update('timeUnknown', !form.timeUnknown)} style={{
              background: form.timeUnknown ? 'var(--gold)' : 'transparent',
              color: form.timeUnknown ? '#1a0810' : 'var(--bone-soft)',
              border: '1px solid var(--gold-line)', cursor: 'pointer',
              fontFamily: "'Nanum Myeongjo', serif", fontSize: 11,
              letterSpacing: '0.12em', padding: '8px 4px', lineHeight: 1.3, fontWeight: 600,
            }}>시각 모름</button>
          </div>
        </AField>

        <div style={{ marginTop: 30 }}>
          <AGoldBtn onClick={onSubmit} sub="命">명식 자동 산출</AGoldBtn>
        </div>
      </div>
    </section>
  );
}

function AField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone)', letterSpacing: '0.18em', fontWeight: 600 }}>{label}</div>
        {hint && <div className="myeongjo" style={{ fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.1em' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ASeg({ options, value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      border: '1px solid var(--gold-line)', overflow: 'hidden',
    }}>
      {options.map(([label, hanja]) => {
        const active = value === label;
        return (
          <button key={label} onClick={() => onChange(label)} style={{
            background: active ? 'var(--gold)' : 'transparent',
            color: active ? '#1a0810' : 'var(--bone-soft)',
            border: 'none', padding: '14px 8px', cursor: 'pointer',
            fontFamily: "'Nanum Myeongjo', serif", fontSize: 14, letterSpacing: '0.2em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontWeight: active ? 700 : 400,
          }}>
            <span className="brush" style={{ fontSize: 18, opacity: 0.85 }}>{hanja}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ANum({ label, min, max, value, onChange, disabled }) {
  const onInput = e => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v)) v = min;
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };
  return (
    <div style={{ position: 'relative', borderBottom: '1px solid var(--gold-line)', opacity: disabled ? 0.4 : 1 }}>
      <input type="number" value={value} onChange={onInput} disabled={disabled} className="mono" style={{
        width: '100%', padding: '14px 22px 14px 10px',
        background: 'transparent', border: 'none', outline: 'none',
        fontSize: 18, color: 'var(--bone)', fontFamily: "'JetBrains Mono', monospace",
        appearance: 'textfield',
      }}/>
      <div style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontFamily: "'Nanum Myeongjo', serif", fontSize: 11, color: 'var(--bone-faint)',
        letterSpacing: '0.1em', pointerEvents: 'none',
      }}>{label}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// COMPUTING (산출 애니메이션)
// ──────────────────────────────────────────────────────
function AutoComputing({ onDone }) {
  const [phase, setPhase] = aUseState(0);
  const phases = ['하늘의 글자를 읽는 중', '땅의 글자를 세우는 중', '오행의 기울기를 재는 중', '명식을 펼치는 중'];

  aUseEffect(() => {
    const timers = [];
    phases.forEach((_, i) => {
      timers.push(setTimeout(() => setPhase(i), i * 700));
    });
    timers.push(setTimeout(onDone, phases.length * 700 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="scene-cosmos" style={{
      position: 'relative', minHeight: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 28px',
    }}>
      <div className="starfield"/>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ animation: 'spin 8s linear infinite' }}>
          <window.LunarMansionChart size={240}/>
        </div>
      </div>
      <div className="myeongjo glow-gold" style={{
        position: 'relative', zIndex: 2, marginTop: 36,
        fontSize: 15, color: 'var(--gold-bright)', letterSpacing: '0.25em',
        textAlign: 'center', minHeight: 24,
      }}>
        {phases[phase]}…
      </div>
      {/* progress dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, position: 'relative', zIndex: 2 }}>
        {phases.map((_, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i <= phase ? 'var(--gold-bright)' : 'rgba(212,175,106,0.25)',
            boxShadow: i <= phase ? '0 0 6px rgba(232,200,120,0.7)' : 'none',
            transition: 'all 0.3s',
          }}/>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { AutoLanding, AutoInput, AutoComputing, AKakaoButton, AGoldBtn });
