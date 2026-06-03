// 명운록 — 풀스크린 단계별 사주 입력 위저드 (부록 C) + 토스 결제 자리
// 名 → 生 → 時 → 性 → 曆 → 惑 → 확인 → 결제

const { useState: wUseState, useEffect: wUseEffect, useRef: wUseRef } = React;

const WIZ_CONCERNS = ['연애', '결혼', '직장', '재물', '건강', '학업', '이직', '사업'];

// 한자 라벨 브러시
function WBrush({ children, size = 18, color = 'var(--gold)', glow = false, style }) {
  return (
    <span className={glow ? 'glow-gold' : ''} style={{
      fontFamily: "'Ma Shan Zheng','Nanum Myeongjo',serif",
      fontSize: size, color, lineHeight: 1, letterSpacing: 0, ...style,
    }}>{children}</span>
  );
}

function SajuWizard({ product, onBack, onComplete }) {
  const [step, setStep] = wUseState(0); // 0..6 (7 steps incl 확인)
  const [form, setForm] = wUseState({
    name: '', birthDate: '', birthTime: '', timeUnknown: false,
    gender: '', calendar: '', concerns: [],
  });
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = c => setForm(f => ({ ...f, concerns: f.concerns.includes(c) ? f.concerns.filter(x=>x!==c) : [...f.concerns, c] }));

  const TOTAL = 7;
  const steps = [
    { hanja: '名', q: '어떻게 불러드릴까요?', help: '결과지에 표시될 이름입니다 (선택)', optional: true },
    { hanja: '生', q: '언제 태어나셨나요?', help: '정확한 명식을 위해 꼭 필요합니다', required: true },
    { hanja: '時', q: '태어난 시각을 아시나요?', help: '시각을 알면 더 정밀한 풀이가 가능합니다' },
    { hanja: '性', q: '성별을 선택해 주세요', help: '대운의 방향을 정하는 데 쓰입니다', required: true },
    { hanja: '曆', q: '양력인가요, 음력인가요?', help: '음력은 양력으로 정밀 환산됩니다', required: true },
    { hanja: '惑', q: '어떤 것이 궁금하세요?', help: '복수 선택 가능 · 기록의 방향을 정리합니다' },
    { hanja: '覽', q: '입력하신 정보를 확인해 주세요', help: '' },
  ];
  const cur = steps[step];

  const canNext = () => {
    if (step === 1) return !!form.birthDate;
    if (step === 3) return !!form.gender;
    if (step === 4) return !!form.calendar;
    return true;
  };

  const next = () => { if (step < TOTAL - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); else onBack && onBack(); };

  // Enter 키로 다음
  wUseEffect(() => {
    const h = e => { if (e.key === 'Enter' && canNext() && step < TOTAL - 1) next(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="scene-cosmos" style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="starfield" style={{ opacity: 0.3 }}/>

      {/* 상단: 이전 + 진행률 + N/7 */}
      <div style={{
        position: 'relative', zIndex: 2, padding: '20px 22px 0',
        maxWidth: 560, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={prev} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--bone-soft)', fontSize: 22, lineHeight: 1, fontFamily: 'serif',
          }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 22 : 7, height: 7, borderRadius: 4,
                background: i < step ? 'var(--gold-soft)' : i === step ? 'var(--gold-bright)' : 'rgba(212,175,106,0.2)',
                boxShadow: i === step ? '0 0 8px rgba(232,200,120,0.6)' : 'none',
                transition: 'all 0.3s',
              }}/>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.15em' }}>{step + 1}/{TOTAL}</div>
        </div>
      </div>

      {/* 중앙: 질문 + 컨트롤 */}
      <div key={step} className="svc-fade" style={{
        flex: 1, position: 'relative', zIndex: 1,
        maxWidth: 560, margin: '0 auto', width: '100%',
        padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <WBrush size={40} glow style={{ display: 'block', marginBottom: 16 }}>{cur.hanja}</WBrush>
          <div className="myeongjo glow-bone" style={{
            fontFamily: "'Noto Serif KR',serif", fontSize: 23, fontWeight: 700,
            color: 'var(--bone)', lineHeight: 1.45, letterSpacing: '0.03em',
          }}>{cur.q}</div>
          {cur.help && <div className="myeongjo" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--bone-soft)', letterSpacing: '0.04em' }}>{cur.help}</div>}
        </div>

        {/* STEP 0 — 이름 */}
        {step === 0 && (
          <input autoFocus className="ap-input" type="text" placeholder="홍길동" value={form.name}
            onChange={e => up('name', e.target.value)} style={{ textAlign: 'center', fontSize: 18 }}/>
        )}

        {/* STEP 1 — 생년월일 */}
        {step === 1 && (
          <input autoFocus className="ap-input" type="date" value={form.birthDate}
            onChange={e => up('birthDate', e.target.value)} style={{ textAlign: 'center', fontSize: 18 }}/>
        )}

        {/* STEP 2 — 출생시각 */}
        {step === 2 && (
          <div>
            <input className="ap-input" type="time" value={form.birthTime} disabled={form.timeUnknown}
              onChange={e => up('birthTime', e.target.value)}
              style={{ textAlign: 'center', fontSize: 18, opacity: form.timeUnknown ? 0.4 : 1 }}/>
            <button onClick={() => up('timeUnknown', !form.timeUnknown)} style={{
              width: '100%', marginTop: 12, padding: '14px', cursor: 'pointer',
              background: form.timeUnknown ? 'var(--gold)' : 'transparent',
              color: form.timeUnknown ? 'var(--wine-deep)' : 'var(--bone-soft)',
              border: '1px solid var(--gold-line)',
              fontFamily: "'Nanum Myeongjo',serif", fontSize: 14, letterSpacing: '0.1em',
              fontWeight: form.timeUnknown ? 700 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{
                width: 16, height: 16, border: '1px solid currentColor', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11,
              }}>{form.timeUnknown ? '✓' : ''}</span>
              태어난 시각을 몰라요
            </button>
          </div>
        )}

        {/* STEP 3 — 성별 */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['남성','乾'],['여성','坤']].map(([g, h]) => {
              const on = form.gender === g;
              return (
                <button key={g} onClick={() => { up('gender', g); setTimeout(next, 220); }} style={{
                  cursor: 'pointer', padding: '28px 12px',
                  border: on ? '1.5px solid var(--gold)' : '1px solid var(--gold-line)',
                  background: on ? 'rgba(212,175,106,0.10)' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <WBrush size={44} color={on ? 'var(--gold-bright)' : 'var(--bone)'} glow={on}>{h}</WBrush>
                  <span className="myeongjo" style={{ fontSize: 15, color: 'var(--bone)', letterSpacing: '0.15em', fontWeight: on ? 700 : 400 }}>{g}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 4 — 달력 */}
        {step === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['양력','陽'],['음력','陰']].map(([c, h]) => {
              const on = form.calendar === c;
              return (
                <button key={c} onClick={() => { up('calendar', c); setTimeout(next, 220); }} style={{
                  cursor: 'pointer', padding: '28px 12px',
                  border: on ? '1.5px solid var(--gold)' : '1px solid var(--gold-line)',
                  background: on ? 'rgba(212,175,106,0.10)' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <WBrush size={44} color={on ? 'var(--gold-bright)' : 'var(--bone)'} glow={on}>{h}</WBrush>
                  <span className="myeongjo" style={{ fontSize: 15, color: 'var(--bone)', letterSpacing: '0.15em', fontWeight: on ? 700 : 400 }}>{c}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 5 — 고민 */}
        {step === 5 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {WIZ_CONCERNS.map(c => {
              const on = form.concerns.includes(c);
              return (
                <button key={c} onClick={() => toggle(c)} style={{
                  padding: '12px 18px', cursor: 'pointer',
                  border: on ? '1px solid var(--gold)' : '1px solid var(--gold-line)',
                  background: on ? 'var(--gold)' : 'transparent',
                  color: on ? 'var(--wine-deep)' : 'var(--bone-soft)',
                  fontFamily: "'Nanum Myeongjo',serif", fontSize: 14, letterSpacing: '0.06em',
                  fontWeight: on ? 700 : 400,
                }}>{c}</button>
              );
            })}
          </div>
        )}

        {/* STEP 6 — 확인 */}
        {step === 6 && (
          <ConfirmStep form={form} product={product} onEdit={setStep}/>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div style={{
        position: 'relative', zIndex: 2, padding: '0 22px 28px',
        maxWidth: 560, margin: '0 auto', width: '100%',
      }}>
        {step < TOTAL - 1 ? (
          <>
            <button onClick={next} disabled={!canNext()} style={{
              width: '100%', minHeight: 56,
              background: canNext() ? 'linear-gradient(180deg,#e8c878,#d4af6a)' : 'rgba(212,175,106,0.15)',
              color: canNext() ? 'var(--wine-deep)' : 'var(--bone-faint)',
              border: 'none', cursor: canNext() ? 'pointer' : 'default',
              fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.25em',
              boxShadow: canNext() ? '0 0 24px rgba(212,175,106,0.28)' : 'none',
            }}>다음</button>
            {cur.optional && (
              <button onClick={next} style={{
                width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--bone-faint)', fontFamily: "'Nanum Myeongjo',serif", fontSize: 12.5, letterSpacing: '0.15em', padding: 8,
              }}>건너뛰기</button>
            )}
          </>
        ) : (
          <button onClick={() => onComplete(form)} style={{
            width: '100%', minHeight: 58,
            background: 'linear-gradient(180deg,#e8c878,#d4af6a)', color: 'var(--wine-deep)',
            border: 'none', cursor: 'pointer',
            fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.18em',
            boxShadow: '0 0 24px rgba(212,175,106,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            결제하러 가기 <WBrush size={20} color="var(--wine-deep)">受</WBrush>
          </button>
        )}
      </div>
    </div>
  );
}

// 확인 단계 — 요약 + 4기둥 블러 미리보기
function ConfirmStep({ form, product, onEdit }) {
  const rows = [
    ['이름', form.name || '—', 0],
    ['생년월일', form.birthDate || '—', 1],
    ['출생시각', form.timeUnknown ? '시 모름' : (form.birthTime || '—'), 2],
    ['성별', form.gender || '—', 3],
    ['달력', form.calendar || '—', 4],
    ['고민', form.concerns.length ? form.concerns.join(' · ') : '—', 5],
  ];

  // 4기둥 미리보기
  let pillars = null;
  if (form.birthDate) {
    const [y, m, d] = form.birthDate.split('-').map(Number);
    const t = (!form.timeUnknown && form.birthTime) ? form.birthTime.split(':').map(Number) : [12, 0];
    try {
      const r = window.SajuLib.computeSaju({ year: y, month: m, day: d, hour: t[0], minute: t[1]||0, gender: form.gender || '여성', name: form.name });
      pillars = r.pillars;
    } catch (e) {}
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map(([k, v, s], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--gold-pale)' }}>
            <span className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-faint)', letterSpacing: '0.12em', flexShrink: 0 }}>{k}</span>
            <span style={{ flex: 1, textAlign: 'right' }}>
              <span className="myeongjo" style={{ fontSize: 13.5, color: 'var(--bone)', letterSpacing: '0.02em' }}>{v}</span>
              <button onClick={() => onEdit(s)} style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontFamily: "'Nanum Myeongjo',serif", fontSize: 11, letterSpacing: '0.1em', textDecoration: 'underline', textUnderlineOffset: 2 }}>수정</button>
            </span>
          </div>
        ))}
      </div>

      {/* 4기둥 블러 미리보기 */}
      {pillars && (
        <div style={{ marginTop: 22, position: 'relative' }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em', textAlign: 'center', marginBottom: 12 }}>· 四柱 미리보기 ·</div>
          <div style={{ position: 'relative', border: '1px solid var(--gold-pale)', background: 'rgba(13,6,8,0.5)', padding: '16px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {['hour','day','month','year'].map((kk, idx) => {
                const p = pillars[kk];
                const blurred = idx >= 2; // 일부만 선명, 나머지 블러
                return (
                  <div key={kk} className={blurred ? 'svc-blur' : ''} style={{ textAlign: 'center' }}>
                    <WBrush size={28} color="var(--gold-bright)" glow={!blurred} style={{ display: 'block' }}>{p.stemH}</WBrush>
                    <WBrush size={28} color="var(--bone)" style={{ display: 'block', marginTop: 2 }}>{p.branchH}</WBrush>
                  </div>
                );
              })}
            </div>
            {/* 블러 위 뱃지 */}
            <div style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(212,175,106,0.92)', color: 'var(--wine-deep)', fontFamily: "'Nanum Myeongjo',serif", fontSize: 10, fontWeight: 700, padding: '4px 10px', letterSpacing: '0.1em' }}>결제 후 전체 공개</div>
          </div>
        </div>
      )}

      {/* 상품 요약 */}
      <div style={{ marginTop: 18, padding: '14px 16px', background: 'rgba(212,175,106,0.07)', border: '1px solid var(--gold-pale)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="myeongjo" style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 600 }}>{product.ko} 기록</span>
        <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>₩{product.price.toLocaleString()}</span>
      </div>
    </div>
  );
}

// 토스 결제 위젯 자리 → 즉시 AI 생성
function CheckoutStep({ product, onPaid, onBack }) {
  return (
    <div className="scene-wine" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="starfield" style={{ opacity: 0.3 }}/>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '40px 22px', position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--bone-soft)', fontFamily: "'Nanum Myeongjo',serif", fontSize: 13, letterSpacing: '0.15em', marginBottom: 24, alignSelf: 'flex-start' }}>← 정보 수정</button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <WBrush size={36} glow style={{ display: 'block', marginBottom: 14 }}>受</WBrush>
          <div className="myeongjo glow-bone" style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 22, fontWeight: 700, color: 'var(--bone)' }}>안전 결제</div>
        </div>

        {/* 주문 요약 */}
        <div className="gold-frame" style={{ padding: '20px 18px', background: 'rgba(13,6,8,0.5)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="myeongjo" style={{ fontSize: 15, color: 'var(--bone)', fontWeight: 700 }}>{product.ko} · {product.nameH}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--bone-faint)', textDecoration: 'line-through' }}>₩{product.orig.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="myeongjo" style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.1em' }}>첫 결제 할인 적용</span>
            <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 26, fontWeight: 700, color: 'var(--gold-bright)' }}>₩{product.price.toLocaleString()}</span>
          </div>
        </div>

        {/* 토스 위젯 자리 */}
        <div style={{ border: '1px dashed var(--gold-line)', background: 'rgba(13,6,8,0.35)', padding: '28px 18px', textAlign: 'center', marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em', marginBottom: 12 }}>· TOSS PAYMENTS ·</div>
          <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-soft)', lineHeight: 1.8 }}>
            실제 서비스에서는 이 자리에<br/>토스페이먼츠 결제 위젯(카드·간편결제)이<br/>표시됩니다
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <button onClick={onPaid} style={{
          width: '100%', minHeight: 58,
          background: 'linear-gradient(180deg,#e8c878,#d4af6a)', color: 'var(--wine-deep)',
          border: 'none', cursor: 'pointer',
          fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.18em',
          boxShadow: '0 0 24px rgba(212,175,106,0.3)',
        }}>₩{product.price.toLocaleString()} 결제하기</button>
        <div className="myeongjo" style={{ marginTop: 12, textAlign: 'center', fontSize: 10.5, color: 'var(--bone-faint)', letterSpacing: '0.04em', lineHeight: 1.6 }}>
          결제 즉시 AI가 명식을 분석해 결과지를 생성합니다<br/>
          본 서비스는 자기 이해를 돕는 참고 자료입니다
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SajuWizard, CheckoutStep });
