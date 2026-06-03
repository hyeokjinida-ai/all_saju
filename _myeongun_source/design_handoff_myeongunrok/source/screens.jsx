// 명운록 — 화면들 (Landing, Input, Result)

// ──────────────────────────────────────────────────────
// 공통: 인장 (seal stamp)
// ──────────────────────────────────────────────────────
function SealStamp({ children = '命運錄', size = 64, style = {} }) {
  return (
    <div className="seal" style={{
      width: size, height: size, fontSize: size * 0.34, ...style,
    }}>
      <span style={{ position: 'relative', zIndex: 2, lineHeight: 1, textAlign: 'center' }}>
        {children}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// LANDING
// ──────────────────────────────────────────────────────
function LandingScreen({ onStart }) {
  return (
    <div className="hanji" data-screen-label="01 Landing" style={{
      minHeight: '100%', position: 'relative', overflow: 'hidden',
      padding: '76px 28px 40px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* watermark hanja, top-right */}
      <div className="brush" style={{
        position: 'absolute', top: 70, right: -10,
        fontSize: 240, lineHeight: 0.9, color: 'rgba(58,42,26,0.06)',
        writingMode: 'vertical-rl', textOrientation: 'upright',
        pointerEvents: 'none', letterSpacing: '-0.05em',
      }}>
        四柱
      </div>

      {/* tiny header */}
      <div className="ink-fade" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 32,
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-faint)' }}>
          MMXXVI · 丙午
        </div>
        <SealStamp size={36} style={{ fontSize: 11 }}>明</SealStamp>
      </div>

      {/* vertical title block */}
      <div className="ink-fade ink-fade-d1" style={{
        display: 'flex', gap: 18, alignItems: 'flex-start', flex: '0 0 auto',
        marginTop: 20,
      }}>
        <div className="brush" style={{
          fontSize: 96, lineHeight: 1.0, color: 'var(--ink)',
          writingMode: 'vertical-rl', textOrientation: 'upright',
          letterSpacing: '0.04em',
        }}>
          命運錄
        </div>
        <div style={{ paddingTop: 6, flex: 1 }}>
          <div className="myeongjo" style={{
            fontSize: 28, lineHeight: 1.3, color: 'var(--ink)', fontWeight: 700,
            letterSpacing: '0.04em', marginBottom: 4,
          }}>
            명운록
          </div>
          <div className="myeongjo" style={{
            fontSize: 12, lineHeight: 1.7, color: 'var(--ink-faint)',
            letterSpacing: '0.2em',
          }}>
            네 기둥에 새겨진
          </div>
          <div className="myeongjo" style={{
            fontSize: 12, lineHeight: 1.7, color: 'var(--ink-faint)',
            letterSpacing: '0.2em',
          }}>
            당신의 흐름.
          </div>

          <div className="ink-rule" style={{ margin: '18px 0 16px', width: 64 }}/>

          <div className="myeongjo" style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink-soft)' }}>
            年柱 · 月柱<br/>
            日柱 · 時柱<br/>
            <span style={{ color: 'var(--ink-faint)' }}>네 개의 기둥, 여덟 글자.</span>
          </div>
        </div>
      </div>

      {/* small story card */}
      <div className="ink-fade ink-fade-d2 brush-border" style={{
        marginTop: 36, padding: '20px 18px',
        background: 'rgba(237,228,212,0.5)',
      }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--seal)', marginBottom: 10 }}>
          序 · INTRO
        </div>
        <div className="myeongjo" style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--ink-soft)' }}>
          태어난 순간의 하늘과 땅이 당신의 네 기둥을 세웁니다.
          그 여덟 글자는 점괘가 아니라 <strong style={{ color: 'var(--ink)' }}>지도</strong>.
          당신이 어떤 결로 흐르는지 비춥니다.
        </div>
      </div>

      {/* steps */}
      <div className="ink-fade ink-fade-d3" style={{ marginTop: 28 }}>
        {[
          ['一','생년월일과 시간을 적습니다'],
          ['二','네 기둥과 오행을 펼칩니다'],
          ['三','일주를 중심으로 읽습니다'],
        ].map(([n, t], i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, alignItems: 'baseline',
            padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
          }}>
            <div className="brush" style={{ fontSize: 22, color: 'var(--seal)', minWidth: 24 }}>{n}</div>
            <div className="myeongjo" style={{ fontSize: 13, color: 'var(--ink-soft)', letterSpacing: '0.04em' }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      {/* start button */}
      <div className="ink-fade ink-fade-d4" style={{ marginTop: 32 }}>
        <button onClick={onStart} className="btn-ink" style={{
          width: '100%', height: 60, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 26px',
        }}>
          <span style={{ letterSpacing: '0.4em' }}>명식 펼치기</span>
          <span className="brush" style={{ fontSize: 22, letterSpacing: 0 }}>展</span>
        </button>
        <div style={{
          textAlign: 'center', marginTop: 14,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          letterSpacing: '0.3em', color: 'var(--ink-faint)',
        }}>
          約 一分 · ABOUT 1 MIN
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// INPUT FORM
// ──────────────────────────────────────────────────────
function InputScreen({ form, setForm, onBack, onSubmit }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="hanji" data-screen-label="02 Input" style={{
      minHeight: '100%', position: 'relative',
      padding: '70px 24px 28px',
    }}>
      {/* back + title */}
      <div className="ink-fade" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', padding: 0, fontFamily: "'Nanum Myeongjo', serif",
          fontSize: 13, color: 'var(--ink-soft)', letterSpacing: '0.2em',
        }}>← 처음으로</button>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.3em' }}>
          02 · 入
        </div>
      </div>

      <div className="ink-fade ink-fade-d1" style={{ marginBottom: 22 }}>
        <div className="brush" style={{ fontSize: 56, lineHeight: 1, color: 'var(--ink)', letterSpacing: '0.04em' }}>
          四柱를<br/>세우다
        </div>
        <div className="myeongjo" style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8, letterSpacing: '0.18em' }}>
          태어난 순간의 좌표를 적습니다
        </div>
      </div>

      <div className="ink-rule" style={{ marginBottom: 22 }}/>

      {/* 양력/음력 segmented */}
      <FormBlock label="曆 · 양력 음력" hint="태어난 날을 어떤 달력으로 적으시겠어요">
        <Segmented
          options={[['양력','陽'],['음력','陰']]}
          value={form.calendar}
          onChange={v => update('calendar', v)}
        />
      </FormBlock>

      {/* 성별 */}
      <FormBlock label="性 · 성별" hint="명식의 대운 방향을 결정합니다">
        <Segmented
          options={[['여성','坤'],['남성','乾']]}
          value={form.gender}
          onChange={v => update('gender', v)}
        />
      </FormBlock>

      {/* 이름 */}
      <FormBlock label="名 · 이름 (선택)" hint="결과에 비춰 부르고 싶은 이름">
        <input
          type="text" placeholder="입력 안 함"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          className="myeongjo"
          style={{
            width: '100%', padding: '14px 14px', fontSize: 15,
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--line)', outline: 'none',
            color: 'var(--ink)', letterSpacing: '0.1em',
            fontFamily: "'Nanum Myeongjo', serif",
          }}
        />
      </FormBlock>

      {/* 생년월일 */}
      <FormBlock label="生 · 생년월일">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8 }}>
          <NumberField label="년" min={1920} max={2026} value={form.year} onChange={v => update('year', v)}/>
          <NumberField label="월" min={1} max={12} value={form.month} onChange={v => update('month', v)}/>
          <NumberField label="일" min={1} max={31} value={form.day} onChange={v => update('day', v)}/>
        </div>
      </FormBlock>

      {/* 시간 */}
      <FormBlock label="時 · 태어난 시각" hint="모르시면 정오(12시)로 두세요">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 8 }}>
          <NumberField label="시" min={0} max={23} value={form.hour} onChange={v => update('hour', v)}/>
          <NumberField label="분" min={0} max={59} value={form.minute} onChange={v => update('minute', v)}/>
          <UnknownTimeToggle
            unknown={form.timeUnknown}
            onToggle={() => update('timeUnknown', !form.timeUnknown)}
          />
        </div>
      </FormBlock>

      <button onClick={onSubmit} className="btn-ink" style={{
        width: '100%', height: 58, marginTop: 30, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <span style={{ letterSpacing: '0.4em' }}>명식 펼치기</span>
        <span className="brush" style={{ fontSize: 22, letterSpacing: 0 }}>命</span>
      </button>
    </div>
  );
}

function FormBlock({ label, hint, children }) {
  return (
    <div className="ink-fade ink-fade-d2" style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="myeongjo" style={{ fontSize: 12, color: 'var(--ink)', letterSpacing: '0.18em', fontWeight: 600 }}>
          {label}
        </div>
        {hint && (
          <div className="myeongjo" style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.12em' }}>
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      border: '1px solid var(--line)', overflow: 'hidden',
    }}>
      {options.map(([label, hanja]) => {
        const active = value === label;
        return (
          <button key={label} onClick={() => onChange(label)} style={{
            background: active ? 'var(--ink)' : 'transparent',
            color: active ? 'var(--paper-warm)' : 'var(--ink-soft)',
            border: 'none', padding: '14px 8px', cursor: 'pointer',
            fontFamily: "'Nanum Myeongjo', serif", fontSize: 14,
            letterSpacing: '0.2em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span className="brush" style={{ fontSize: 18, opacity: 0.85 }}>{hanja}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ label, min, max, value, onChange }) {
  const onInput = e => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v)) v = min;
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };
  return (
    <div style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
      <input
        type="number"
        value={value}
        onChange={onInput}
        className="mono"
        style={{
          width: '100%', padding: '14px 10px 14px 10px',
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: 18, color: 'var(--ink)',
          fontFamily: "'JetBrains Mono', monospace",
          appearance: 'textfield',
        }}
      />
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        fontFamily: "'Nanum Myeongjo', serif", fontSize: 11,
        color: 'var(--ink-faint)', letterSpacing: '0.2em',
        pointerEvents: 'none',
      }}>{label}</div>
    </div>
  );
}

function UnknownTimeToggle({ unknown, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      background: unknown ? 'var(--ink-soft)' : 'transparent',
      color: unknown ? 'var(--paper-warm)' : 'var(--ink-soft)',
      border: '1px solid var(--line)', cursor: 'pointer',
      fontFamily: "'Nanum Myeongjo', serif", fontSize: 11,
      letterSpacing: '0.16em', padding: '8px 4px', lineHeight: 1.3,
    }}>
      시각 모름
    </button>
  );
}

// ──────────────────────────────────────────────────────
// RESULT
// ──────────────────────────────────────────────────────
function ResultScreen({ result, ohaengStyle, onBack, onTweak }) {
  const { pillars, counts, input } = result;

  // 일간 = day stem (자기 자신)
  const ilgan = pillars.day;
  const dominant = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
  const weakest  = Object.entries(counts).sort((a,b) => a[1] - b[1])[0];

  return (
    <div className="hanji" data-screen-label="03 Result" style={{
      minHeight: '100%', padding: '70px 0 40px',
    }}>
      {/* header */}
      <div className="ink-fade" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', marginBottom: 16,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', padding: 0, fontFamily: "'Nanum Myeongjo', serif",
          fontSize: 13, color: 'var(--ink-soft)', letterSpacing: '0.2em',
        }}>← 다시 적기</button>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.3em' }}>
          03 · 命
        </div>
      </div>

      {/* identification block */}
      <div className="ink-fade ink-fade-d1" style={{ padding: '0 24px', marginBottom: 24 }}>
        <div className="myeongjo" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.3em', marginBottom: 6 }}>
          {input.calendar === '음력' ? '陰曆' : '陽曆'} · {input.year}年 {input.month}月 {input.day}日 · {input.timeUnknown ? '時不詳' : `${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`}
        </div>
        <div className="brush" style={{ fontSize: 38, color: 'var(--ink)', lineHeight: 1.1, letterSpacing: '0.04em' }}>
          {input.name || '無名'} <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>·</span> {input.gender === '여성' ? '坤命' : '乾命'}
        </div>
        <div className="myeongjo" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, letterSpacing: '0.18em' }}>
          {input.gender === '여성' ? '곤명' : '건명'} · 띠 {ilgan.zodiac} <span style={{ opacity: 0.5 }}>·</span> 일간 <strong style={{ color: 'var(--seal)' }}>{ilgan.stem}({ilgan.stemH})</strong>
        </div>
      </div>

      {/* Four Pillars */}
      <FourPillars pillars={pillars}/>

      {/* 오행 visualization */}
      <OhaengSection counts={counts} style={ohaengStyle} onTweak={onTweak}/>

      {/* 일주 해설 */}
      <IljuReading ilgan={ilgan} dominant={dominant} weakest={weakest}/>

      {/* 대운 타임라인 미리보기 */}
      <DaeunPreview pillars={pillars} input={input}/>

      {/* footer 인장 */}
      <div className="ink-fade ink-fade-d5" style={{
        marginTop: 36, padding: '0 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div className="myeongjo" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.3em', lineHeight: 1.7 }}>
          MMXXVI · 丙午年<br/>
          命運錄 第 ○○○ 號
        </div>
        <SealStamp size={52} style={{ fontSize: 18, transform: 'rotate(-4deg)' }}>命錄</SealStamp>
      </div>
    </div>
  );
}

Object.assign(window, { LandingScreen, InputScreen, ResultScreen, SealStamp });
