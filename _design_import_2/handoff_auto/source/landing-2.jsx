// 명운록 — 랜딩 part 2 (Concept 명식 · Master · How)

// ──────────────────────────────────────────────────────
// SECTION 4 — CONCEPT (와인 + 명식 8자 시각화)
// ──────────────────────────────────────────────────────
function ConceptSection() {
  const cols = [
    { col: '時', char1: '丁', char2: '酉', role: '말년' },
    { col: '日', char1: '己', char2: '巳', role: '자신', hi: true },
    { col: '月', char1: '己', char2: '未', role: '청년' },
    { col: '年', char1: '癸', char2: '酉', role: '초년' },
  ];

  return (
    <section className="scene-cosmos" data-screen-label="06 Concept" style={{
      position: 'relative', padding: '80px 24px 70px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.5 }}/>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <window.SectionLabel index="五" hanja="命" label="네 기둥 여덟 글자"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          사주는 <span style={{ color: 'var(--gold-bright)' }}>점</span>이 아니라<br/>
          당신의 <span style={{ color: 'var(--gold-bright)' }}>지도</span>입니다.
        </div>

        <div className="myeongjo" style={{
          marginTop: 14, fontSize: 12, color: 'var(--bone-faint)',
          letterSpacing: '0.18em', lineHeight: 1.9,
        }}>
          정해진 미래가 아닌<br/>
          당신이 흐를 결을 보는 일
        </div>

        {/* gold-framed 명식 */}
        <div className="gold-frame" style={{
          marginTop: 40,
          padding: '24px 14px 22px',
          background: 'rgba(13,6,8,0.6)',
        }}>
          <div className="mono" style={{
            fontSize: 9, color: 'var(--gold)', letterSpacing: '0.35em',
            marginBottom: 18,
          }}>
            · 四 柱 命 式 ·
          </div>

          {/* 8자 grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
            marginBottom: 4,
          }}>
            {cols.map((c, i) => (
              <div key={`l-${i}`} style={{
                textAlign: 'center', padding: '4px 0',
                color: c.hi ? 'var(--gold-bright)' : 'var(--gold-soft)',
              }}>
                <div className="brush" style={{ fontSize: 16, lineHeight: 1 }}>{c.col}</div>
              </div>
            ))}
          </div>
          <div className="gold-rule" style={{ marginBottom: 8 }}/>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          }}>
            {cols.map((c, i) => (
              <div key={`c-${i}`} style={{
                textAlign: 'center',
                background: c.hi ? 'rgba(212,175,106,0.10)' : 'rgba(240,230,210,0.04)',
                border: c.hi ? '1px solid var(--gold)' : '1px solid rgba(240,230,210,0.10)',
                padding: '10px 4px',
              }}>
                <div className="brush glow-bone" style={{
                  fontSize: 30, lineHeight: 1.15,
                  color: c.hi ? 'var(--gold-bright)' : 'var(--bone)',
                }}>{c.char1}</div>
                <div className="brush glow-bone" style={{
                  fontSize: 30, lineHeight: 1.15,
                  color: c.hi ? 'var(--gold-bright)' : 'var(--bone)',
                }}>{c.char2}</div>
                <div className="myeongjo" style={{
                  fontSize: 8.5, color: 'var(--bone-faint)',
                  letterSpacing: '0.2em', marginTop: 6,
                }}>{c.role}</div>
              </div>
            ))}
          </div>

          <div className="myeongjo" style={{
            fontSize: 10, color: 'var(--bone-faint)', textAlign: 'center',
            marginTop: 16, letterSpacing: '0.2em', lineHeight: 1.7,
          }}>
            年柱 · 月柱 · 日柱 · 時柱
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <span className="gold-diamond"/>
        </div>

        <div className="myeongjo" style={{
          fontSize: 13.5, color: 'var(--bone)', lineHeight: 1.95,
          letterSpacing: '0.04em', marginTop: 20,
        }}>
          명운록은 이 여덟 글자를<br/>
          <strong style={{ color: 'var(--gold-bright)' }}>당신의 언어</strong>로<br/>
          풀어드립니다.
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 5 — MASTER (와인, 老師 portrait)
// ──────────────────────────────────────────────────────
function MasterSection() {
  return (
    <section className="scene-wine" data-screen-label="07 Master" style={{
      position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* atmospheric smoke top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, opacity: 0.5 }}>
        <window.SmokeBand height={120} opacity={0.3}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="六" hanja="師" label="명운록의 스승"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          스무 해 동안<br/>
          만 명의 명식을<br/>
          <span style={{ color: 'var(--gold-bright)' }}>읽어온 손길</span>.
        </div>

        <window.GoldDivider width={60}/>

        {/* portrait card */}
        <div className="gold-frame" style={{
          padding: '22px 18px', background: 'rgba(13,6,8,0.5)',
          maxWidth: 280, margin: '0 auto',
        }}>
          {/* portrait placeholder */}
          <div style={{
            position: 'relative',
            aspectRatio: '1 / 1.1',
            background: 'linear-gradient(180deg, rgba(58,13,24,0.7), rgba(13,6,8,0.95))',
            border: '1px solid var(--gold-pale)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginBottom: 16,
          }}>
            {/* placeholder silhouette */}
            <svg viewBox="0 0 200 220" width="65%" height="auto" style={{ opacity: 0.55 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af6a" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#5a1822" stopOpacity="0.2"/>
                </linearGradient>
              </defs>
              <ellipse cx="100" cy="78" rx="44" ry="50" fill="url(#pg)"/>
              <path d="M30 220 C 30 145, 170 145, 170 220 Z" fill="url(#pg)"/>
            </svg>
            {/* seal */}
            <div className="seal" style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 52, height: 52, fontSize: 17,
              transform: 'rotate(-6deg)',
            }}>
              <span style={{ position: 'relative', zIndex: 2 }}>玄海</span>
            </div>
            {/* label */}
            <div className="mono" style={{
              position: 'absolute', top: 12, left: 12,
              fontSize: 8.5, color: 'var(--bone-faint)', letterSpacing: '0.3em',
            }}>
              · PORTRAIT ·
            </div>
          </div>

          <div className="brush glow-gold" style={{
            fontSize: 36, color: 'var(--gold-bright)', lineHeight: 1.1,
            letterSpacing: '0.08em', marginBottom: 6,
          }}>
            玄海
          </div>
          <div className="myeongjo" style={{
            fontSize: 15, color: 'var(--bone)', fontWeight: 700, letterSpacing: '0.25em',
          }}>
            현해 김재현
          </div>
          <div className="myeongjo" style={{
            fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.25em', marginTop: 6,
            lineHeight: 1.8,
          }}>
            號 玄海 · 本名 金在賢<br/>
            子平命理 · 韓國易學會 正會員
          </div>
        </div>

        {/* bio / 略歷 */}
        <div style={{
          marginTop: 22,
          background: 'rgba(13,6,8,0.5)',
          border: '1px solid var(--gold-pale)',
          padding: '18px 16px', textAlign: 'left',
        }}>
          <div className="myeongjo" style={{
            fontSize: 10, color: 'var(--gold)', letterSpacing: '0.35em',
            marginBottom: 14, textAlign: 'center',
          }}>
            · 略 歷 · 약 력 ·
          </div>
          <ul style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'flex', flexDirection: 'column', gap: 9,
          }}>
            {[
              ['1973', '충남 부여 출생, 한학자 집안에서 자람'],
              ['1998', '高麗大學校 동양철학과 졸업'],
              ['2003', '中國 北京大學 易學 연수'],
              ['2004', '子平命理 본격 사사, 22년째 연구'],
              ['2018', '저서 《여덟 글자의 길》 출간'],
              ['2020', '韓國易學會 正會員 등재'],
            ].map(([y, t], i) => (
              <li key={i} style={{
                display: 'grid', gridTemplateColumns: '52px 1fr',
                gap: 10, alignItems: 'baseline',
              }}>
                <span className="mono" style={{
                  fontSize: 10, color: 'var(--gold)', letterSpacing: '0.15em', textAlign: 'right',
                }}>{y}</span>
                <span className="myeongjo" style={{
                  fontSize: 12, color: 'var(--bone-soft)', letterSpacing: '0.02em', lineHeight: 1.5,
                }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* credentials */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          marginTop: 24,
        }}>
          {[
            { n: '22', unit: '년', label: '연구 경력' },
            { n: '11,300', unit: '+건', label: '누적 상담' },
            { n: '4.96', unit: '/5', label: '만족도' },
          ].map((c, i) => (
            <div key={i} style={{
              border: '1px solid var(--gold-pale)',
              padding: '14px 6px', textAlign: 'center',
              background: 'rgba(13,6,8,0.3)',
            }}>
              <div className="brush glow-gold" style={{
                fontSize: 24, color: 'var(--gold-bright)', lineHeight: 1, letterSpacing: 0,
              }}>{c.n}<span style={{ fontSize: 11, opacity: 0.8 }}>{c.unit}</span></div>
              <div className="myeongjo" style={{
                marginTop: 6, fontSize: 10, color: 'var(--bone-faint)',
                letterSpacing: '0.18em',
              }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* signature quote */}
        <div style={{
          marginTop: 28, padding: '22px 18px',
          background: 'rgba(13,6,8,0.6)',
          border: '1px solid var(--gold-pale)',
          position: 'relative',
        }}>
          <div className="brush" style={{
            position: 'absolute', top: -12, left: 14,
            fontSize: 30, color: 'var(--gold)', lineHeight: 1,
            background: 'var(--wine)', padding: '0 6px',
          }}>"</div>
          <div className="myeongjo" style={{
            fontSize: 14, color: 'var(--bone)', lineHeight: 1.9, letterSpacing: '0.02em',
            marginTop: 4, textAlign: 'left', textWrap: 'pretty',
          }}>
            정해진 운명을<br/>
            알려드리지 않습니다.<br/>
            <br/>
            당신이 <strong style={{ color: 'var(--gold-bright)' }}>이미 가진 결</strong>을<br/>
            어떻게 흐르게 할지<br/>
            함께 헤아립니다.
          </div>
          <div className="myeongjo" style={{
            marginTop: 14, fontSize: 10, color: 'var(--gold-soft)',
            letterSpacing: '0.3em', textAlign: 'right',
          }}>
            — 玄海 김재현
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 6 — HOW IT WORKS (cosmos + 3 steps + kakao chat)
// ──────────────────────────────────────────────────────
function HowItWorksSection() {
  const auto = typeof window !== 'undefined' && window.__autoMode;
  const steps = auto ? [
    { n: '一', en: 'STEP 01', title: '상품을 선택하세요', desc: '간명·심명 중 원하는\n기록의 깊이를 고릅니다.', hanja: '品' },
    { n: '二', en: 'STEP 02', title: '사주 정보를 입력하세요', desc: '생년월일·시각·성별·고민을\n한 단계씩 입력합니다.', hanja: '記' },
    { n: '三', en: 'STEP 03', title: '안전하게 결제하세요', desc: '토스페이먼츠로\n간편하게 결제합니다.', hanja: '受' },
    { n: '四', en: 'STEP 04', title: 'AI 결과지를 즉시 확인', desc: '정통 만세력 엔진과 AI가\n수 분 내 기록을 생성합니다.', hanja: '解' },
  ] : [
    {
      n: '一', en: 'STEP 01',
      title: '카톡으로 문을 두드리세요',
      desc: '명운록 채널을 친구추가하고\n상담 신청서를 받습니다.',
      hanja: '叩',
    },
    {
      n: '二', en: 'STEP 02',
      title: '여덟 글자를 적어주세요',
      desc: '생년월일·시각·성별만\n보내주시면 네 기둥을 세웁니다.',
      hanja: '記',
    },
    {
      n: '三', en: 'STEP 03',
      title: '맞춤 풀이를 받으세요',
      desc: '24시간 내, 일주 중심의 풀이와\n질문 1:1 답변이 도착합니다.',
      hanja: '解',
    },
  ];

  return (
    <section className="scene-cosmos" data-screen-label="09 How" style={{
      position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.5 }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="八" hanja="行" label="진행 방식"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          {auto ? '네 걸음이면' : '세 걸음이면'}<br/>
          <span style={{ color: 'var(--gold-bright)' }}>당신의 흐름</span>이<br/>
          도착합니다.
        </div>

        <div className="myeongjo" style={{
          marginTop: 14, fontSize: 12, color: 'var(--bone-faint)',
          letterSpacing: '0.2em',
        }}>
          {auto ? '입력 → 결제 → AI 결과까지 수 분이면 충분합니다' : '모든 상담은 카카오톡으로 진행됩니다'}
        </div>

        <window.GoldDivider width={60}/>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: '20px 18px', position: 'relative', overflow: 'hidden',
              background: 'rgba(13,6,8,0.6)',
              border: '1px solid var(--gold-pale)',
            }}>
              {/* big hanja watermark */}
              <div className="brush" style={{
                position: 'absolute', right: -6, bottom: -24,
                fontSize: 110, lineHeight: 1, color: 'rgba(212,175,106,0.07)',
                pointerEvents: 'none',
              }}>{s.hanja}</div>

              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10,
              }}>
                <span className="brush glow-gold" style={{
                  fontSize: 32, color: 'var(--gold-bright)', lineHeight: 1,
                }}>{s.n}</span>
                <span className="mono" style={{
                  fontSize: 9, color: 'var(--gold-soft)', letterSpacing: '0.3em',
                }}>{s.en}</span>
              </div>
              <div className="myeongjo" style={{
                fontSize: 16, color: 'var(--bone)', fontWeight: 600,
                letterSpacing: '0.04em', marginBottom: 8,
              }}>{s.title}</div>
              <div className="myeongjo" style={{
                fontSize: 12.5, color: 'var(--bone-soft)', lineHeight: 1.85,
                letterSpacing: '0.02em', whiteSpace: 'pre-line',
              }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* kakao chat sample (상담 모드에서만) */}
        {!auto && (
        <div style={{
          marginTop: 32, padding: '18px 16px',
          background: 'rgba(254, 229, 0, 0.08)',
          border: '1px solid rgba(254, 229, 0, 0.25)',
          textAlign: 'left',
        }}>
          <div className="mono" style={{
            fontSize: 9, color: 'var(--kakao)', letterSpacing: '0.3em', marginBottom: 10,
          }}>
            · KakaoTalk 미리보기 ·
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ChatBubble side="left" name="명운록">
              안녕하세요. 명식 잘 받았습니다.<br/>
              일주가 己巳(기사)일이시군요.
            </ChatBubble>
            <ChatBubble side="right">
              저 올해 이직해도 괜찮을까요?
            </ChatBubble>
            <ChatBubble side="left">
              올해 흐름이 庚午(경오)로<br/>
              움직이는 해입니다. 하반기가<br/>
              결단에 유리합니다.
            </ChatBubble>
          </div>
        </div>
        )}

        {/* inline cta */}
        <div style={{ marginTop: 28 }}>
          <window.KakaoButton sub="· 무료 친구추가">
            채널 친구추가하고 시작
          </window.KakaoButton>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ side, name, children }) {
  const right = side === 'right';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: right ? 'flex-end' : 'flex-start', gap: 2,
    }}>
      {name && (
        <div className="myeongjo" style={{
          fontSize: 9, color: 'var(--bone-faint)', letterSpacing: '0.2em',
          marginBottom: 2,
        }}>{name}</div>
      )}
      <div style={{
        maxWidth: '80%', padding: '8px 12px',
        fontFamily: "'Nanum Myeongjo', 'Noto Serif KR', serif",
        fontSize: 12, lineHeight: 1.55, letterSpacing: '0.02em',
        background: right ? 'var(--kakao)' : 'rgba(240,230,210,0.92)',
        color: right ? 'var(--kakao-text)' : '#1a0810',
        borderRadius: right ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
      }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { ConceptSection, MasterSection, HowItWorksSection, ChatBubble });
