// 명운록 自動 — 상페 + 단계별 위저드 + 토스 결제 + AI 결과 (부록 A·C 구조)

const { useState: appUseState, useEffect: appUseEffect, useRef: appUseRef } = React;

const AUTO_PRODUCTS = {
  basic:   { id: 'basic',   nameH: '簡命', ko: '간명', price: 19900, orig: 29900 },
  premium: { id: 'premium', nameH: '深命', ko: '심명', price: 49900, orig: 79900 },
};

// 상페 전체 (index.html과 동일 14섹션, CTA만 위저드로 연결)
function AutoSalesLanding({ scrollRef }) {
  return (
    <>
      <window.HeroSection/>
      <window.HeritageSection/>
      <window.CosmosSection/>
      <window.LimitLandingSection/>
      <window.ProblemSection/>
      <window.ConceptSection/>
      <window.PrecisionSection/>
      <window.ChaptersLandingSection/>
      <window.HowItWorksSection/>
      <window.PreviewLandingSection/>
      <window.ReviewsSection/>
      <window.PricingSection/>
      <window.FAQSection/>
      <window.FinalCTASection/>
      <window.StickyKakaoBar scrollRef={scrollRef}/>
    </>
  );
}

function AutoApp() {
  const [screen, setScreen] = appUseState('landing'); // landing | wizard | checkout | computing | result
  const [productId, setProductId] = appUseState('basic');
  const [form, setForm] = appUseState(null);
  const [result, setResult] = appUseState(null);
  const scrollRef = appUseRef(null);
  const product = AUTO_PRODUCTS[productId] || AUTO_PRODUCTS.basic;

  const top = () => setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; window.scrollTo(0,0); }, 30);

  // 상페 CTA → 위저드 시작 (상품 선택 가능: window.__pickProduct)
  appUseEffect(() => {
    window.__autoFlowStart = (pid) => { if (pid && AUTO_PRODUCTS[pid]) setProductId(pid); setScreen('wizard'); top(); };
    return () => { delete window.__autoFlowStart; };
  }, []);

  const onWizardComplete = (f) => { setForm(f); setScreen('checkout'); top(); };

  const onPaid = () => {
    // 사주 계산 후 결과 생성
    const [y,m,d] = (form.birthDate || '1993-07-14').split('-').map(Number);
    const t = (!form.timeUnknown && form.birthTime) ? form.birthTime.split(':').map(Number) : [12,0];
    const r = window.SajuLib.computeSaju({ year:y, month:m, day:d, hour:t[0], minute:t[1]||0, gender: form.gender || '여성', name: form.name });
    r.input = { ...r.input, calendar: form.calendar || '양력', timeUnknown: form.timeUnknown, concerns: form.concerns, product };
    setResult(r);
    setScreen('computing'); top();
  };

  return (
    <div ref={scrollRef} className="auto-scroll screen-scroll" style={{
      height: '100vh', overflowY: 'auto', position: 'relative',
      background: 'var(--night)', maxWidth: 600, margin: '0 auto',
      boxShadow: '0 0 80px rgba(0,0,0,0.5)',
    }}>
      {screen === 'landing' && <AutoSalesLanding scrollRef={scrollRef}/>}
      {screen === 'wizard' && (
        <window.SajuWizard product={product} onBack={() => { setScreen('landing'); top(); }} onComplete={onWizardComplete}/>
      )}
      {screen === 'checkout' && (
        <window.CheckoutStep product={product} onBack={() => { setScreen('wizard'); top(); }} onPaid={onPaid}/>
      )}
      {screen === 'computing' && (
        <window.AutoComputing onDone={() => { setScreen('result'); top(); }}/>
      )}
      {screen === 'result' && result && (
        <window.AutoResult result={result} onBack={() => { setScreen('landing'); top(); }}/>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AutoApp/>);
