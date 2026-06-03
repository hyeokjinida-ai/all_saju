// 명운록 — 랜딩 part 3 (Reviews · Pricing · FAQ · FinalCTA · StickyBar)

const { useState: useState3, useEffect: useEffect3 } = React;

// ──────────────────────────────────────────────────────
// SECTION 7 — REVIEWS (와인, 후기)
// ──────────────────────────────────────────────────────
function ReviewsSection() {
  const reviews = [
    {
      tag: '진로', age: '32 · 여',
      quote: '이직 시기를 두고 일 년을 고민했는데,\n선생님 풀이 듣고 두 달 만에 결정했어요.\n결정의 이유가 명확해지는 느낌.',
      pillar: '己巳',
    },
    {
      tag: '인연', age: '29 · 여',
      quote: '"왜 같은 사람만 만나지?" 그 답을 들었어요.\n인연이 끊긴 게 아니라\n내 흐름이 거기 머물러 있었던 거였어요.',
      pillar: '丁未',
    },
    {
      tag: '재물', age: '41 · 남',
      quote: '돈에 대한 압박감이 컸는데,\n무엇을 기다리고 무엇을 움직일지\n시기를 알게 된 게 가장 컸어요.',
      pillar: '甲子',
    },
  ];

  return (
    <section className="scene-wine" data-screen-label="11 Reviews" style={{
      position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="十" hanja="證" label="실제 후기"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          먼저 받아본 분들의<br/>
          <span style={{ color: 'var(--gold-bright)' }}>실제 후기</span>.
        </div>

        {/* rating */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14,
          marginTop: 22, marginBottom: 28,
        }}>
          <div className="brush glow-gold" style={{
            fontSize: 44, color: 'var(--gold-bright)', lineHeight: 1,
          }}>4.96</div>
          <div style={{ textAlign: 'left' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em' }}>
              ★★★★★
            </div>
            <div className="myeongjo" style={{
              fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.2em', marginTop: 2,
            }}>
              누적 1,247 건
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {reviews.map((r, i) => (
            <div key={i} style={{
              background: 'rgba(13,6,8,0.55)',
              border: '1px solid var(--gold-pale)',
              padding: '18px 16px', position: 'relative',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: 'var(--gold)', color: 'var(--wine-deep)',
                    fontSize: 10, padding: '3px 8px', letterSpacing: '0.2em',
                    fontFamily: "'Nanum Myeongjo', serif", fontWeight: 700,
                  }}>{r.tag}</span>
                  <span className="myeongjo" style={{
                    fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.15em',
                  }}>{r.age}</span>
                </div>
                <div className="brush glow-gold" style={{
                  fontSize: 18, color: 'var(--gold-bright)', letterSpacing: 0,
                }}>{r.pillar}</div>
              </div>
              <div className="myeongjo" style={{
                fontSize: 13.5, color: 'var(--bone)', lineHeight: 1.9,
                letterSpacing: '0.02em', whiteSpace: 'pre-line', textWrap: 'pretty',
              }}>
                {r.quote}
              </div>
              <div className="mono" style={{
                marginTop: 10, fontSize: 10, color: 'var(--gold)', letterSpacing: '0.25em',
              }}>
                ★★★★★
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 8 — PRICING (cosmos with gold-framed cards)
// ──────────────────────────────────────────────────────
function PricingSection() {
  const tiers = [
    {
      name: '簡命', ko: '간명',
      sub: '핵심만 빠르게',
      desc: ['일주 중심 풀이', '올해 흐름 (歲運)', '질문 2개까지'],
      price: '19,900', orig: '29,900',
      duration: '24h 이내 답변',
    },
    {
      name: '深命', ko: '심명',
      sub: '깊고 자세하게',
      desc: ['사주 8자 전체 풀이', '대운 60년 흐름', '질문 무제한 (3일)'],
      price: '49,900', orig: '79,900',
      duration: '48h 이내 답변',
      featured: true,
    },
  ];

  return (
    <section className="scene-cosmos" data-screen-label="12 Pricing" style={{
      position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.45 }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="十一" hanja="受" label="상담 혜택"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          지금 시작하시면<br/>
          <span style={{ color: 'var(--gold-bright)' }}>첫 상담 50%</span>
        </div>

        <div className="myeongjo" style={{
          marginTop: 12, fontSize: 11, color: 'var(--bone-faint)',
          letterSpacing: '0.2em',
        }}>
          · 6월 한정 · 신규 1회 ·
        </div>

        <window.GoldDivider width={60}/>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          {tiers.map((t, i) => (
            <div key={i} style={{
              padding: '24px 20px', position: 'relative',
              border: t.featured ? '1.5px solid var(--gold)' : '1px solid var(--gold-pale)',
              background: t.featured
                ? 'linear-gradient(180deg, rgba(212,175,106,0.10) 0%, rgba(13,6,8,0.65) 100%)'
                : 'rgba(13,6,8,0.6)',
              boxShadow: t.featured ? '0 0 24px rgba(212,175,106,0.15)' : 'none',
            }}>
              {t.featured && (
                <div className="seal" style={{
                  position: 'absolute', top: -14, right: 14,
                  width: 46, height: 46, fontSize: 14,
                  transform: 'rotate(-8deg)',
                }}>
                  <span style={{ position: 'relative', zIndex: 2 }}>推</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <span className="brush glow-gold" style={{
                  fontSize: 36, color: t.featured ? 'var(--gold-bright)' : 'var(--bone)', lineHeight: 1,
                }}>{t.name}</span>
                <div>
                  <div className="myeongjo" style={{
                    fontSize: 16, color: 'var(--bone)', fontWeight: 700, letterSpacing: '0.15em',
                  }}>{t.ko}</div>
                  <div className="myeongjo" style={{
                    fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.18em', marginTop: 2,
                  }}>{t.sub}</div>
                </div>
              </div>

              <div className="gold-rule" style={{ margin: '14px 0' }}/>

              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                display: 'flex', flexDirection: 'column', gap: 7,
              }}>
                {t.desc.map((d, j) => (
                  <li key={j} className="myeongjo" style={{
                    fontSize: 13, color: 'var(--bone-soft)', letterSpacing: '0.02em',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{
                      flexShrink: 0, color: 'var(--gold)', marginTop: 2, fontSize: 9,
                    }}>◆</span>
                    {d}
                  </li>
                ))}
              </ul>

              <div style={{
                marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 8,
                justifyContent: 'space-between', flexWrap: 'wrap',
              }}>
                <div>
                  <span className="mono" style={{
                    fontSize: 11, color: 'var(--bone-faint)', textDecoration: 'line-through',
                    letterSpacing: '0.08em',
                  }}>₩{t.orig}</span>
                  <div className="brush" style={{
                    fontSize: 32, color: t.featured ? 'var(--gold-bright)' : 'var(--bone)',
                    lineHeight: 1, letterSpacing: 0,
                  }}>₩{t.price}</div>
                </div>
                <div className="mono" style={{
                  fontSize: 9, color: 'var(--gold-soft)', letterSpacing: '0.25em',
                }}>
                  {t.duration}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* warranty */}
        <div style={{
          marginTop: 22, padding: '14px 16px',
          border: '1px dashed var(--gold-line)',
          textAlign: 'center',
        }}>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--gold-bright)', letterSpacing: '0.25em', marginBottom: 6,
          }}>
            · 不滿足 · 全額 還拂 ·
          </div>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--bone-soft)', letterSpacing: '0.05em', lineHeight: 1.7,
          }}>
            만족하지 못하셨다면 전액 환불해드립니다
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 9 — FAQ
// ──────────────────────────────────────────────────────
function FAQSection() {
  const faqs = [
    { q: '태어난 시각을 모르면 상담이 어려운가요?',
      a: '시(時)를 모르셔도 일주 중심으로 충분히 풀이 가능합니다. 단, 결혼·자녀 등 시주가 중요한 질문은 정확도가 다소 낮아질 수 있어요.' },
    { q: '음력만 알고 있는데 괜찮나요?',
      a: '괜찮습니다. 신청서에서 음력으로 선택해 주시면 명운록이 양력으로 환산해 명식을 세웁니다.' },
    { q: '카톡으로만 진행되나요? 전화 상담은 안 되나요?',
      a: '네, 모든 상담은 카카오톡으로만 진행됩니다. 글로 차분히 읽고 다시 돌아볼 수 있다는 점에서 더 깊이 와닿는다는 후기가 많아요.' },
    { q: '풀이는 언제 도착하나요?',
      a: '간명은 24시간, 심명은 48시간 이내 답변드립니다.' },
    { q: '같은 질문을 여러 번 해도 되나요?',
      a: '심명 패키지는 3일간 무제한입니다. 풀이를 받고 떠오른 추가 질문을 편하게 보내주세요.' },
  ];

  return (
    <section className="scene-wine" data-screen-label="13 FAQ" style={{
      position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <window.SectionLabel index="十二" hanja="問" label="자주 묻는 물음"/>

      <div className="myeongjo glow-bone" style={{
        fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
        letterSpacing: '0.04em',
      }}>
        자주 묻는<br/>
        <span style={{ color: 'var(--gold-bright)' }}>물음들</span>.
      </div>

      <window.GoldDivider width={60}/>

      <div style={{ textAlign: 'left' }}>
        {faqs.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} index={i + 1}/>
        ))}
      </div>
    </section>
  );
}

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState3(index === 1);
  return (
    <div style={{ borderBottom: '1px solid var(--gold-pale)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', background: 'transparent', border: 'none',
        padding: '18px 4px', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        textAlign: 'left', color: 'var(--bone)',
      }}>
        <span className="brush glow-gold" style={{
          fontSize: 18, color: 'var(--gold-bright)', lineHeight: 1.1, flexShrink: 0, minWidth: 16,
        }}>問</span>
        <span className="myeongjo" style={{
          flex: 1, fontSize: 13.5, color: 'var(--bone)', lineHeight: 1.6,
          letterSpacing: '0.02em', fontWeight: 600,
        }}>{q}</span>
        <span className="myeongjo" style={{
          fontSize: 18, color: 'var(--gold-soft)', lineHeight: 1, marginTop: 2,
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.3s',
        }}>⌄</span>
      </button>
      {open && (
        <div style={{
          padding: '0 4px 20px 28px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span className="brush" style={{
            fontSize: 18, color: 'var(--gold-soft)', lineHeight: 1.1, flexShrink: 0, minWidth: 16,
          }}>答</span>
          <span className="myeongjo" style={{
            fontSize: 13, color: 'var(--bone-soft)', lineHeight: 1.85, letterSpacing: '0.02em',
            textWrap: 'pretty',
          }}>{a}</span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 10 — FINAL CTA (cosmos + sun radiant)
// ──────────────────────────────────────────────────────
function FinalCTASection() {
  return (
    <section className="scene-cosmos" data-screen-label="14 CTA" style={{
      position: 'relative', padding: '90px 26px 110px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div className="starfield"/>

      {/* radiant sun in background */}
      <div style={{
        position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
        zIndex: 0, opacity: 0.85, pointerEvents: 'none',
      }}>
        <window.SunRadiant size={320}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="brush glow-gold" style={{
          fontSize: 52, color: 'var(--gold-bright)', lineHeight: 1,
          letterSpacing: '0.1em', marginBottom: 18,
        }}>
          問命
        </div>
        <div className="myeongjo" style={{
          fontSize: 10, color: 'var(--gold)', letterSpacing: '0.4em', marginBottom: 30,
        }}>
          · 명을 묻다 ·
        </div>

        <div className="myeongjo glow-bone" style={{
          fontSize: 22, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.6,
          letterSpacing: '0.04em',
        }}>
          당신의 흐름은<br/>
          이미 정해진 것이 아닙니다.
        </div>

        <div className="myeongjo" style={{
          marginTop: 14, fontSize: 13, color: 'var(--bone-soft)',
          letterSpacing: '0.04em', lineHeight: 1.95,
        }}>
          어떻게 흐를지<br/>
          <span style={{ color: 'var(--gold-bright)' }}>지금</span> 함께 헤아립시다.
        </div>

        <window.GoldDivider width={60}/>

        <window.KakaoButton sub="· 첫 상담 50% 마감 임박">
          카톡으로 상담받기
        </window.KakaoButton>

        <div className="mono" style={{
          marginTop: 18, fontSize: 9, color: 'var(--bone-faint)', letterSpacing: '0.3em',
        }}>
          · 24h 이내 답변 ·
        </div>

        {/* footer legal */}
        <div className="myeongjo" style={{
          marginTop: 40, fontSize: 10, color: 'var(--bone-faint)',
          letterSpacing: '0.15em', lineHeight: 1.9, opacity: 0.5,
        }}>
          ⓒ 命運錄 · 2026<br/>
          사업자 등록 / 통신판매업<br/>
          개인정보처리방침
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// STICKY KAKAO BAR
// ──────────────────────────────────────────────────────
function StickyKakaoBar({ scrollRef }) {
  const [show, setShow] = useState3(false);

  useEffect3(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setShow(el.scrollTop > 400);
    el.addEventListener('scroll', handler);
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, [scrollRef]);

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 34,
      padding: '0 14px 8px',
      transform: show ? 'translateY(0)' : 'translateY(120%)',
      transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
      pointerEvents: show ? 'auto' : 'none',
      zIndex: 70,
    }}>
      <div style={{
        background: 'rgba(13, 6, 8, 0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 14,
        padding: '8px 8px 8px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
        border: '1px solid var(--gold-line)',
      }}>
        <div style={{ flex: 1 }}>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--gold-bright)', letterSpacing: '0.2em', lineHeight: 1.2,
            fontWeight: 700,
          }}>{window.__autoMode ? '1분 자동 산출' : '첫 상담 50%'}</div>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.1em', marginTop: 2,
          }}>{window.__autoMode ? '명식 · 오행 · 풀이 즉시' : '지금만 — ₩19,900부터'}</div>
        </div>
        <button onClick={onKakao} style={{
          background: window.__autoMode ? 'linear-gradient(180deg,#e8c878,#d4af6a)' : 'var(--kakao)',
          color: window.__autoMode ? 'var(--wine-deep)' : 'var(--kakao-text)',
          border: 'none', padding: '12px 16px',
          fontFamily: "'Noto Serif KR', serif", fontWeight: 700, fontSize: 13,
          letterSpacing: '0.14em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: 10,
        }}>
          {!window.__autoMode && <span style={{
            display: 'inline-block', width: 16, height: 14,
            background: 'var(--kakao-text)',
            WebkitMask: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 22'><path d='M12 2C6 2 1.2 5.7 1.2 10.3c0 3 2 5.6 5 7.1l-1 3.6c-.1.4.3.7.7.5l4.3-2.7c.6.1 1.2.1 1.8.1 6 0 10.8-3.7 10.8-8.6S18 2 12 2z'/></svg>\") center/contain no-repeat",
                    mask: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 22'><path d='M12 2C6 2 1.2 5.7 1.2 10.3c0 3 2 5.6 5 7.1l-1 3.6c-.1.4.3.7.7.5l4.3-2.7c.6.1 1.2.1 1.8.1 6 0 10.8-3.7 10.8-8.6S18 2 12 2z'/></svg>\") center/contain no-repeat",
          }}/>}
          {window.__autoMode ? '바로 보기' : '상담받기'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ReviewsSection, PricingSection, FAQSection, FinalCTASection, StickyKakaoBar });
