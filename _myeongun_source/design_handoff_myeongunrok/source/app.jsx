// 명운록 — 메인 앱 (상세페이지 long-scroll → 카톡 상담 유도)

const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "ohaengStyle": "pentagon",
  "showCalculatorDemo": false
}/*EDITMODE-END*/;

function LandingPage() {
  const scrollRef = useRef(null);
  return (
    <div ref={scrollRef} className="app-scroll screen-scroll" style={{
      height: '100%', position: 'relative', background: 'var(--night)',
    }}>
      <window.HeroSection/>
      <window.HeritageSection/>
      <window.CosmosSection/>
      <window.PrecisionSection/>
      <window.ProblemSection/>
      <window.ConceptSection/>
      <window.HowItWorksSection/>
      <window.ReviewsSection/>
      <window.PricingSection/>
      <window.FAQSection/>
      <window.FinalCTASection/>
      <window.StickyKakaoBar scrollRef={scrollRef}/>
    </div>
  );
}

// Saju calculator demo (입력 → 결과) — kept as a secondary view, accessible from Tweaks
function CalculatorDemo({ ohaengStyle, onTweak }) {
  const [step, setStep] = useState('input'); // input | result
  const [form, setForm] = useState({
    calendar: '양력', gender: '여성', name: '',
    year: 1993, month: 7, day: 14, hour: 6, minute: 30,
    timeUnknown: false,
  });
  const [result, setResult] = useState(null);

  const handleSubmit = () => {
    const h = form.timeUnknown ? 12 : form.hour;
    const r = window.SajuLib.computeSaju({
      year: form.year, month: form.month, day: form.day,
      hour: h, minute: form.minute,
      gender: form.gender, name: form.name,
    });
    r.input = { ...r.input, calendar: form.calendar, timeUnknown: form.timeUnknown };
    setResult(r);
    setStep('result');
  };

  return (
    <div className="app-scroll screen-scroll" style={{ height: '100%' }}>
      {step === 'input' && (
        <window.InputScreen
          form={form} setForm={setForm}
          onBack={() => setStep('input')}
          onSubmit={handleSubmit}
        />
      )}
      {step === 'result' && result && (
        <window.ResultScreen
          result={result}
          ohaengStyle={ohaengStyle}
          onBack={() => setStep('input')}
          onTweak={onTweak}
        />
      )}
    </div>
  );
}

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const showDemo = t.showCalculatorDemo;

  const cycleOhaeng = () => {
    const order = ['pentagon','circular','bars','cards'];
    const idx = order.indexOf(t.ohaengStyle);
    setTweak('ohaengStyle', order[(idx + 1) % order.length]);
  };

  return (
    <>
      <window.IOSDevice width={402} height={874} dark={!showDemo}>
        {showDemo
          ? <CalculatorDemo ohaengStyle={t.ohaengStyle} onTweak={cycleOhaeng}/>
          : <LandingPage/>}
      </window.IOSDevice>

      <window.TweaksPanel title="Tweaks · 명운록">
        <window.TweakSection label="화면">
          <window.TweakRadio
            label="모드"
            value={showDemo ? 'demo' : 'landing'}
            onChange={v => setTweak('showCalculatorDemo', v === 'demo')}
            options={[
              { value: 'landing', label: '상세페이지' },
              { value: 'demo',    label: '명식 데모' },
            ]}
          />
        </window.TweakSection>

        <window.TweakSection label="오행 시각화">
          <window.TweakRadio
            label="스타일"
            value={t.ohaengStyle}
            onChange={v => setTweak('ohaengStyle', v)}
            options={[
              { value: 'pentagon', label: '오각성' },
              { value: 'circular', label: '환형' },
              { value: 'bars',     label: '막대' },
              { value: 'cards',    label: '낱장' },
            ]}
          />
          <div style={{
            marginTop: 8, fontFamily: "'Nanum Myeongjo', serif", fontSize: 11,
            lineHeight: 1.6, color: '#888', letterSpacing: '0.04em',
          }}>
            명식 데모 모드의 五行 시각화 방식
          </div>
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
