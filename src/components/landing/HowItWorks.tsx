// Ollama: stays on the same paper-white canvas, no surface alternation.
// Steps are numbered minimal markers in monospace.
export function HowItWorks() {
  const steps = [
    { n: "01", t: "상품 선택", d: "기본 풀이부터 프리미엄 종합 풀이까지" },
    { n: "02", t: "사주 입력", d: "생년월일 · 출생 시각 · 성별 · 고민" },
    { n: "03", t: "결제", d: "토스페이먼츠로 안전하게 결제" },
    { n: "04", t: "결과 확인", d: "AI가 작성한 맞춤 리포트 즉시 확인" },
  ];
  return (
    <section id="how-it-works" className="scene-wine border-t border-hairline">
      <div className="container py-20">
        <div className="text-center mb-14">
          <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">順序</p>
          <h2 className="font-myeongjo text-2xl md:text-3xl font-semibold tracking-[0.04em] text-bone">
            작동 방식
          </h2>
        </div>
        <ol className="grid gap-10 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="text-center md:text-left">
              <p className="font-mono text-2xl text-gold/80 mb-3">{s.n}</p>
              <div className="gold-rule mb-4 max-w-[40px] mx-auto md:mx-0" />
              <p className="font-myeongjo text-base font-semibold text-bone mb-1.5">{s.t}</p>
              <p className="text-sm text-bone-soft leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
