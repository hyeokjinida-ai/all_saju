// 명운록 랜딩 — 추가 상페 섹션 (異 자동사주한계 / 章 다섯 개의 장 / 覽 내 기록 미리보기)

// ──────────────────────────────────────────────────────
// 異 — 자동 사주의 한계
// ──────────────────────────────────────────────────────
function LimitLandingSection() {
  return (
    <section className="scene-cosmos" data-screen-label="04 Limit" style={{
      position: 'relative', padding: '80px 24px 70px', overflow: 'hidden', textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.3 }}/>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="三" hanja="異" label="자동 사주의 한계"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55, letterSpacing: '0.04em',
        }}>
          왜 자동 사주는<br/>
          <span style={{ color: 'var(--gold-bright)' }}>다 비슷한 답</span>을 할까요?
        </div>

        <window.GoldDivider width={60}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ border: '1px solid var(--gold-pale)', background: 'rgba(13,6,8,0.5)', padding: '22px 14px', opacity: 0.9 }}>
            <div className="myeongjo" style={{ fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.2em', marginBottom: 10 }}>자동 · AI 사주</div>
            <div className="brush" style={{ fontSize: 40, color: 'var(--bone-soft)', lineHeight: 1 }}>60<span style={{ fontSize: 15 }}>개</span></div>
            <div className="myeongjo" style={{ fontSize: 11.5, color: 'var(--bone-faint)', lineHeight: 1.7, marginTop: 12 }}>
              일주(日柱) 하나로<br/>정해진 답 중 하나
            </div>
          </div>
          <div style={{ border: '1px solid var(--gold)', background: 'rgba(212,175,106,0.06)', padding: '22px 14px' }}>
            <div className="myeongjo" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', marginBottom: 10 }}>명운록</div>
            <div className="brush glow-gold" style={{ fontSize: 40, color: 'var(--gold-bright)', lineHeight: 1 }}>8<span style={{ fontSize: 15 }}>글자</span></div>
            <div className="myeongjo" style={{ fontSize: 11.5, color: 'var(--bone-soft)', lineHeight: 1.7, marginTop: 12 }}>
              같은 답을 가진<br/>사람은 없습니다
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 26, padding: '22px 18px',
          borderTop: '1px solid var(--gold-line)', borderBottom: '1px solid var(--gold-line)',
        }}>
          <div className="myeongjo" style={{ fontSize: 14, color: 'var(--bone)', lineHeight: 1.9, letterSpacing: '0.02em' }}>
            무료 앱은 당신의 생일이 정해지면<br/>그 <strong style={{ color: 'var(--bone)' }}>60개 안에서</strong> 답을 고릅니다.<br/>
            <span style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>한 줄 운세에 운명을 묻지 마세요.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 章 — 기록은 다섯 개의 장으로
// ──────────────────────────────────────────────────────
function ChaptersLandingSection() {
  const chapters = [
    { n: 'Chapter 1', t: '성격의 결', d: '내가 편하게 느끼는 방식과 강점' },
    { n: 'Chapter 2', t: '관계의 반복', d: '가까워지는 방식과 반복되는 지점' },
    { n: 'Chapter 3', t: '재물의 흐름', d: '돈을 대하는 태도와 머무는 구조' },
    { n: 'Chapter 4', t: '애정의 온도', d: '마음이 열리는 방식과 인연의 결' },
    { n: 'Chapter 5', t: '다음 선택의 방향', d: '지금의 흐름에서 참고할 만한 지점' },
  ];
  return (
    <section className="scene-cosmos" data-screen-label="08 Chapters" style={{
      position: 'relative', padding: '80px 24px 70px', overflow: 'hidden', textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.3 }}/>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="七" hanja="章" label="다섯 개의 장"/>
        <div className="myeongjo glow-bone" style={{
          fontSize: 25, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.04em',
        }}>
          기록은 다섯 개의 장으로<br/>이어집니다
        </div>
        <window.GoldDivider width={60}/>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {chapters.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, alignItems: 'center',
              border: '1px solid var(--gold-pale)', background: 'rgba(13,6,8,0.5)', padding: '16px 16px',
            }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0, border: '1px solid var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="brush glow-gold" style={{ fontSize: 22, color: 'var(--gold-bright)', lineHeight: 1 }}>{['一','二','三','四','五'][i]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--gold-soft)', letterSpacing: '0.25em', marginBottom: 4 }}>{c.n}</div>
                <div className="myeongjo" style={{ fontSize: 15, fontWeight: 700, color: 'var(--bone)', letterSpacing: '0.04em' }}>{c.t}</div>
                <div className="myeongjo" style={{ fontSize: 12, color: 'var(--bone-soft)', lineHeight: 1.6, marginTop: 3 }}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// 覽 — 내 기록 미리보기 (PDF 샘플)
// ──────────────────────────────────────────────────────
function PreviewLandingSection() {
  const parts = [
    { n: 'PART 1', t: '성격의 결', body: '겉으로는 차분해 보여도, 내면에는 스스로 정한 기준을 지키려는 힘이 강한 편입니다.' },
    { n: 'PART 2', t: '관계의 반복', body: '빠른 친밀감보다 신뢰가 쌓이는 시간을 중요하게 여기는 흐름이 나타납니다.' },
    { n: 'PART 3', t: '재물의 흐름', body: '돈이 들어오는 순간보다, 머물 수 있는 구조를 만드는 것이 더 중요하게 작용합니다.' },
    { n: 'PART 4', t: '애정의 온도', body: '마음이 열리기까지 시간이 필요하지만, 한 번 깊어진 관계는 오래 이어가려는 성향이 있습니다.' },
  ];
  return (
    <section className="scene-wine" data-screen-label="10 Preview" style={{
      position: 'relative', padding: '80px 24px 70px', overflow: 'hidden', textAlign: 'center',
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="九" hanja="覽" label="내 기록 미리보기"/>
        <div className="myeongjo glow-bone" style={{
          fontSize: 25, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.04em',
        }}>
          내 기록에는<br/>이런 문장이 담깁니다
        </div>
        <div className="myeongjo" style={{ marginTop: 12, fontSize: 11, color: 'var(--gold-soft)', letterSpacing: '0.3em' }}>· 샘플 미리보기 ·</div>

        <div style={{
          marginTop: 28, background: 'linear-gradient(180deg, #f4ecd8 0%, #ece1c8 100%)',
          padding: '28px 22px 26px', position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)', border: '1px solid rgba(212,175,106,0.5)',
        }}>
          <div className="hanji-fiber" style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none', mixBlendMode: 'multiply' }}/>
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, paddingBottom: 18, borderBottom: '1.5px solid rgba(58,42,26,0.3)' }}>
            <span className="brush" style={{ fontSize: 30, color: '#8b1e1e', letterSpacing: '0.06em' }}>命 運 錄</span>
            <div className="myeongjo" style={{ fontSize: 14, fontWeight: 700, color: '#3a2a1a', letterSpacing: '0.1em', marginTop: 10 }}>명운록 기본 사주 기록</div>
            <div className="myeongjo" style={{ fontSize: 10.5, color: 'rgba(58,42,26,0.65)', letterSpacing: '0.25em', marginTop: 6 }}>성격 · 관계 · 재물 · 애정</div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {parts.map((p, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span className="mono" style={{ fontSize: 9, color: '#8b1e1e', letterSpacing: '0.15em', fontWeight: 600 }}>{p.n}</span>
                  <span className="myeongjo" style={{ fontSize: 13, fontWeight: 700, color: '#3a2a1a', letterSpacing: '0.04em' }}>{p.t}</span>
                </div>
                <div className="myeongjo" style={{ fontSize: 12, color: 'rgba(32,26,20,0.82)', lineHeight: 1.85 }}>{p.body}</div>
              </div>
            ))}
          </div>
          <div className="seal" style={{ position: 'absolute', bottom: 18, right: 18, width: 46, height: 46, fontSize: 15, transform: 'rotate(-7deg)', zIndex: 2 }}>
            <span style={{ position: 'relative', zIndex: 2 }}>命錄</span>
          </div>
        </div>

        <div className="myeongjo" style={{ marginTop: 16, fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.04em', lineHeight: 1.7 }}>
          실제 기록은 신청 정보에 맞춰 개별 내용으로 정리됩니다.<br/>
          카카오톡 메시지 또는 PDF 형태로 전달됩니다.
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LimitLandingSection, ChaptersLandingSection, PreviewLandingSection });
