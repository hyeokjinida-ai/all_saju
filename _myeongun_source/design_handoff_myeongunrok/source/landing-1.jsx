// 명운록 — 랜딩 상세페이지 (cinematic 와인/시네마틱)
// 카카오톡 상담 유도

const KAKAO_URL = 'https://pf.kakao.com/_xxxxxx';
const onKakao = () => window.open(KAKAO_URL, '_blank');

// ──────────────────────────────────────────────────────
// 공통 atoms
// ──────────────────────────────────────────────────────
function Ornament({ color = 'var(--gold)' }) {
  return (
    <div className="ornament" style={{ color, margin: '14px auto', opacity: 0.7 }}>
      <span className="line"/>
      <span className="lozenge"/>
      <span className="line"/>
    </div>
  );
}

function VerticalHanja({ children, fontSize = 80, color = 'var(--bone)', glow = false, style }) {
  return (
    <div className={glow ? 'brush glow-bone' : 'brush'} style={{
      writingMode: 'vertical-rl',
      textOrientation: 'upright',
      fontSize, lineHeight: 1.05, color,
      letterSpacing: '0.04em',
      ...style,
    }}>
      {children}
    </div>
  );
}

function GoldDivider({ width = 80 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
      <div className="gold-rule" style={{ width }}/>
    </div>
  );
}

function SectionLabel({ index, hanja, label, color = 'var(--gold)' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      color, marginBottom: 18,
    }}>
      <div style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.5 }}/>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.4em' }}>{index}</span>
      <span className="brush" style={{ fontSize: 18, letterSpacing: 0, lineHeight: 1 }}>{hanja}</span>
      <span className="myeongjo" style={{ fontSize: 10, letterSpacing: '0.3em' }}>{label}</span>
      <div style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.5 }}/>
    </div>
  );
}

function KakaoButton({ children = '카카오톡으로 상담받기', sub }) {
  return (
    <button className="btn-kakao" onClick={onKakao}>
      <span className="chat"/>
      <span>{children}</span>
      {sub && <span style={{
        fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', opacity: 0.7,
      }}>{sub}</span>}
    </button>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 1 — HERO (wine, ornate gold frame)
// ──────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="scene-wine" data-screen-label="01 Hero" style={{
      position: 'relative', minHeight: 800, overflow: 'hidden',
      padding: '76px 26px 50px',
      textAlign: 'center',
    }}>
      <div className="starfield" style={{ opacity: 0.4 }}/>
      <div className="vignette"/>

      {/* top stamp */}
      <div className="fade-up" style={{
        position: 'relative', zIndex: 2, marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <div style={{ width: 18, height: 1, background: 'var(--gold)' }}/>
        <div className="mono" style={{
          fontSize: 9, color: 'var(--gold)', letterSpacing: '0.4em',
        }}>EST · 2026</div>
        <div style={{ width: 18, height: 1, background: 'var(--gold)' }}/>
      </div>

      {/* gold-framed title block */}
      <div className="fade-up" style={{ position: 'relative', zIndex: 2 }}>
        <div className="gold-frame" style={{
          margin: '0 auto', maxWidth: 280, padding: '28px 18px 24px',
          background: 'rgba(13,6,8,0.35)',
        }}>
          {/* big hanja brand */}
          <div className="brush glow-gold" style={{
            fontSize: 64, lineHeight: 1.05, color: 'var(--gold-bright)',
            letterSpacing: '0.08em',
          }}>
            命運錄
          </div>
          <div className="myeongjo" style={{
            fontSize: 14, color: 'var(--bone-soft)', letterSpacing: '0.5em',
            marginTop: 6, fontWeight: 500,
          }}>
            명 · 운 · 록
          </div>
          <div className="gold-rule" style={{ width: '60%', margin: '14px auto' }}/>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--bone-soft)', letterSpacing: '0.25em',
            lineHeight: 1.7,
          }}>
            四柱 · 命理 · 諮問
          </div>
        </div>
      </div>

      {/* hero pitch */}
      <div className="fade-up ink-fade-d1" style={{
        marginTop: 40, position: 'relative', zIndex: 2,
      }}>
        <div className="myeongjo glow-bone" style={{
          fontSize: 28, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.5,
          letterSpacing: '0.04em', textWrap: 'pretty',
        }}>
          타고난 흐름이<br/>
          어디로 가는지<br/>
          <span style={{ color: 'var(--gold-bright)' }}>읽어드립니다.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '22px 0' }}>
          <span className="gold-diamond"/>
        </div>

        <div className="myeongjo" style={{
          fontSize: 13, color: 'var(--bone-soft)', lineHeight: 2,
          letterSpacing: '0.18em',
        }}>
          하늘과 땅이 새긴 여덟 글자<br/>
          그 안에 당신이 있습니다
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 40 }}/>

      {/* hero CTA */}
      <div className="fade-up ink-fade-d2" style={{
        marginTop: 40, position: 'relative', zIndex: 2,
      }}>
        <KakaoButton sub="· 첫상담 50%">
          카톡으로 상담받기
        </KakaoButton>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          marginTop: 18, color: 'var(--bone-faint)',
        }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.25em' }}>
            누적 11,300건
          </span>
        </div>
      </div>

      {/* scroll hint */}
      <div className="fade-up" style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        color: 'var(--gold)', opacity: 0.7, zIndex: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div className="myeongjo" style={{ fontSize: 9, letterSpacing: '0.4em' }}>SCROLL</div>
        <div style={{ width: 1, height: 24, background: 'currentColor' }}/>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 2 — COSMOS (galaxy + 우주에 새겨졌다)
// ──────────────────────────────────────────────────────
function CosmosSection() {
  return (
    <section className="scene-wine" data-screen-label="03 Cosmos" style={{
      position: 'relative', minHeight: 700, overflow: 'hidden',
      padding: '80px 24px 60px',
      textAlign: 'center',
    }}>
      <div className="starfield"/>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <SectionLabel index="二" hanja="生" label="태어난 순간"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em', textWrap: 'pretty',
        }}>
          당신이 태어난 그 순간,<br/>
          <span style={{ color: 'var(--gold-bright)' }}>하늘과 땅</span>이<br/>
          여덟 글자를 새겼습니다.
        </div>
      </div>

      {/* galaxy in middle */}
      <div style={{
        margin: '40px 0 32px', position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'center',
      }}>
        <window.GalaxyScene size={300}/>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="brush glow-gold" style={{
          fontSize: 64, color: 'var(--gold-bright)', lineHeight: 1, letterSpacing: '0.1em',
          marginBottom: 18,
        }}>
          八字
        </div>
        <div className="myeongjo" style={{
          fontSize: 13, color: 'var(--bone-soft)', lineHeight: 2,
          letterSpacing: '0.15em', textWrap: 'pretty',
        }}>
          年 · 月 · 日 · 時<br/>
          하늘의 글자(天干) 넷<br/>
          땅의 글자(地支) 넷<br/>
          <br/>
          그 여덟 글자가<br/>
          <strong style={{ color: 'var(--bone)' }}>곧 당신입니다.</strong>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// SECTION 3 — PROBLEM (misty mountain scene + pain points)
// ──────────────────────────────────────────────────────
function ProblemSection() {
  const worries = [
    { hanja: '業', label: '진로', text: '지금 일을 계속해야 할지 한 해째 갈피가 잡히지 않으세요?' },
    { hanja: '緣', label: '인연', text: '맞지 않는 사람만 자꾸 만난다 느끼시나요?' },
    { hanja: '財', label: '재물', text: '돈은 들어오는데 머물지 않고 흩어지나요?' },
    { hanja: '時', label: '시기', text: '지금이 움직일 때인지, 기다릴 때인지 모르시겠나요?' },
  ];

  return (
    <section className="scene-wine" data-screen-label="05 Problem" style={{
      position: 'relative', overflow: 'hidden',
    }}>
      {/* full-bleed mountain at top */}
      <div style={{ position: 'relative', height: 260 }}>
        <window.MountainScene height={260} withLantern={true}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(58,13,24,0.5) 0%, transparent 40%, var(--wine) 100%)',
        }}/>
      </div>

      <div style={{ padding: '20px 26px 70px', textAlign: 'center', position: 'relative', zIndex: 1, marginTop: -60 }}>
        <SectionLabel index="四" hanja="惑" label="혹시 이런 마음"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          혹시,<br/>
          이런 마음에<br/>
          <span style={{ color: 'var(--gold-bright)' }}>막혀 계신가요.</span>
        </div>

        <GoldDivider width={60}/>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {worries.map((w, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr',
              gap: 14, alignItems: 'center',
              background: 'rgba(13,6,8,0.45)',
              border: '1px solid var(--gold-pale)',
              padding: '14px 14px',
            }}>
              <div style={{
                width: 48, height: 48,
                border: '1px solid var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="brush glow-gold" style={{ fontSize: 26, color: 'var(--gold-bright)', lineHeight: 1 }}>
                  {w.hanja}
                </span>
              </div>
              <div>
                <div className="myeongjo" style={{
                  fontSize: 10, color: 'var(--gold)', letterSpacing: '0.3em', marginBottom: 4,
                }}>
                  {w.label}
                </div>
                <div className="myeongjo" style={{
                  fontSize: 13, color: 'var(--bone-soft)', lineHeight: 1.7, letterSpacing: '0.02em',
                }}>
                  {w.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <span className="gold-diamond"/>
        </div>

        <div className="myeongjo" style={{
          marginTop: 24, fontSize: 14, color: 'var(--bone)', lineHeight: 1.85,
          letterSpacing: '0.04em',
        }}>
          답이 보이지 않을 때<br/>
          <strong style={{ color: 'var(--gold-bright)' }}>먼저 길을 본 사람</strong>의<br/>
          말을 들어야 합니다.
        </div>
      </div>
    </section>
  );
}

// 명운록 — 랜딩 추가 섹션: Heritage (傳) + Precision (精)

// ──────────────────────────────────────────────────────
// HERITAGE SECTION — 천 년의 命理 계보
// ──────────────────────────────────────────────────────
function HeritageSection() {
  const lineage = [
    { era: '周', y: 'B.C. 1000', name: '周易', desc: '음양의 시작' },
    { era: '漢', y: 'A.D. 100',  name: '太初曆',  desc: '천간지지 정립' },
    { era: '唐', y: '李虚中',     name: '三柱命理', desc: '연·월·일주의 학문화' },
    { era: '宋', y: '徐子平',     name: '子平命理', desc: '시주 추가, 사주 완성' },
    { era: '明清',y: '萬曆',      name: '萬歲曆',   desc: '정밀 역법의 표준화' },
    { era: '今', y: '2026',      name: '命運錄',   desc: '현대 알고리즘과의 결합', hi: true },
  ];

  return (
    <section className="scene-cosmos" data-screen-label="02 Heritage" style={{
      position: 'relative', overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* full-bleed traditional landscape painting */}
      <div style={{ position: 'relative', height: 320 }}>
        <window.BigLandscape height={320}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(6,3,6,0.3) 0%, transparent 30%, rgba(6,3,6,0.95) 100%)',
        }}/>
        {/* vertical hanja overlaid on painting */}
        <div className="brush glow-gold" style={{
          position: 'absolute', top: 36, right: 22,
          writingMode: 'vertical-rl', textOrientation: 'upright',
          fontSize: 28, color: 'var(--gold-bright)', letterSpacing: '0.1em',
          lineHeight: 1.1,
          textShadow: '0 0 12px rgba(232,200,120,0.4), 0 2px 4px rgba(0,0,0,0.6)',
        }}>
          千年<br/>한줄기
        </div>
      </div>

      <div style={{ padding: '0 24px 70px', position: 'relative', zIndex: 1, marginTop: -40 }}>
        <window.SectionLabel index="一" hanja="傳" label="천 년의 계보"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          명운록은<br/>
          <span style={{ color: 'var(--gold-bright)' }}>천 년</span>을 거쳐 온<br/>
          명리의 줄기 끝에 있습니다.
        </div>

        <window.GoldDivider width={60}/>

        {/* dynastic lineage timeline (vertical) */}
        <div style={{
          background: 'rgba(13,6,8,0.6)',
          border: '1px solid var(--gold-pale)',
          padding: '20px 16px', textAlign: 'left',
        }}>
          <div className="mono" style={{
            fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em',
            marginBottom: 14, textAlign: 'center',
          }}>
            · 命 理 系 譜 ·
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
            {/* vertical line */}
            <div style={{
              position: 'absolute', left: 38, top: 8, bottom: 8,
              width: 1, background: 'var(--gold-line)',
            }}/>
            {lineage.map((l, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 14px 1fr auto',
                gap: 10, alignItems: 'center', padding: '8px 0',
              }}>
                <div className="brush glow-gold" style={{
                  fontSize: l.hi ? 22 : 18,
                  color: l.hi ? 'var(--gold-bright)' : 'var(--gold-soft)',
                  lineHeight: 1, textAlign: 'center',
                }}>{l.era}</div>
                {/* node */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: l.hi ? 'var(--gold-bright)' : 'var(--gold-pale)',
                  border: l.hi ? '1px solid var(--gold-bright)' : '1px solid var(--gold-line)',
                  boxShadow: l.hi ? '0 0 8px rgba(232,200,120,0.7)' : 'none',
                  margin: '0 auto',
                }}/>
                <div>
                  <div className="myeongjo" style={{
                    fontSize: l.hi ? 14 : 13, fontWeight: l.hi ? 700 : 500,
                    color: l.hi ? 'var(--gold-bright)' : 'var(--bone)',
                    letterSpacing: '0.1em', lineHeight: 1.3,
                  }}>{l.name}</div>
                  <div className="myeongjo" style={{
                    fontSize: 10, color: 'var(--bone-faint)', letterSpacing: '0.1em', marginTop: 2,
                  }}>{l.desc}</div>
                </div>
                <div className="mono" style={{
                  fontSize: 9, color: l.hi ? 'var(--gold)' : 'var(--gold-soft)',
                  letterSpacing: '0.15em',
                }}>{l.y}</div>
              </div>
            ))}
          </div>
        </div>

        {/* almanac page mock */}
        <div style={{ marginTop: 30 }}>
          <div className="myeongjo" style={{
            fontSize: 11, color: 'var(--gold)', letterSpacing: '0.3em', marginBottom: 12,
          }}>
            萬歲曆 · 만세력 표본
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <window.AlmanacPage width={260} height={300}/>
          </div>
          <div className="myeongjo" style={{
            marginTop: 12, fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.04em',
            lineHeight: 1.7, textWrap: 'pretty',
          }}>
            천 년간 이어진 정밀 역법 — 명운록은<br/>
            이 만세력을 기반으로 명식을 세웁니다.
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────
// PRECISION SECTION — 정확한 산출의 과학
// ──────────────────────────────────────────────────────
function PrecisionSection() {
  const methods = [
    { hanja: '曆', label: '만세력 정밀계산',
      desc: '1900-2100년 만세력 분단위로 산출' },
    { hanja: '時', label: '진태양시 자동 보정',
      desc: '출생 도시의 경도 차이를 분 단위로 환산' },
    { hanja: '節', label: '절기 입절시각 적용',
      desc: '입춘·경칩 등 절입 시각까지 정밀 반영' },
    { hanja: '子', label: '子時 경계 일주 처리',
      desc: '23시 이후 출생 시 일주 자동 보정' },
  ];

  const stats = [
    { n: '99.7', unit: '%', label: '명식 산출 정확도', sub: '11,300건 검증' },
    { n: '87.2', unit: '%', label: '일주 본질 적중률', sub: '자체 추적 데이터' },
    { n: '11,300', unit: '+', label: '검증 케이스', sub: '6년 누적' },
    { n: '1,000', unit: '+년', label: '학문의 두께', sub: '子平命理 정립 이래' },
  ];

  return (
    <section className="scene-cosmos" data-screen-label="04 Precision" style={{
      position: 'relative', padding: '80px 24px 70px', overflow: 'hidden',
      textAlign: 'center',
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <window.SectionLabel index="三" hanja="精" label="정밀한 산출"/>

        <div className="myeongjo glow-bone" style={{
          fontSize: 26, color: 'var(--bone)', fontWeight: 700, lineHeight: 1.55,
          letterSpacing: '0.04em',
        }}>
          전통의 학문을<br/>
          <span style={{ color: 'var(--gold-bright)' }}>과학적 정밀함</span>으로<br/>
          풀어냅니다.
        </div>

        <div className="myeongjo" style={{
          marginTop: 14, fontSize: 12, color: 'var(--bone-faint)',
          letterSpacing: '0.2em',
        }}>
          東洋 天文 × 現代 알고리즘
        </div>

        {/* 28수 lunar mansion chart */}
        <div style={{ margin: '36px 0 30px', display: 'flex', justifyContent: 'center' }}>
          <window.LunarMansionChart size={280}/>
        </div>

        <div className="myeongjo" style={{
          fontSize: 11, color: 'var(--gold-soft)', letterSpacing: '0.3em', marginBottom: 6,
        }}>
          · 二 十 八 宿 ·
        </div>
        <div className="myeongjo" style={{
          fontSize: 11, color: 'var(--bone-faint)', letterSpacing: '0.1em',
          lineHeight: 1.7, textWrap: 'pretty',
        }}>
          하늘을 28구역으로 나눈 동양 천문도.<br/>
          명운록의 모든 산출은 이 천문 좌표 위에서 시작합니다.
        </div>

        <window.GoldDivider width={60}/>

        {/* methodology */}
        <div className="myeongjo" style={{
          fontSize: 13, color: 'var(--gold-bright)', letterSpacing: '0.3em',
          marginBottom: 18, fontWeight: 600,
        }}>
          · 산 출 방 법 ·
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {methods.map((m, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '44px 1fr',
              gap: 14, alignItems: 'center',
              background: 'rgba(13,6,8,0.5)',
              border: '1px solid var(--gold-pale)',
              padding: '14px 14px',
            }}>
              <div style={{
                width: 44, height: 44,
                border: '1px solid var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="brush glow-gold" style={{
                  fontSize: 24, color: 'var(--gold-bright)', lineHeight: 1,
                }}>{m.hanja}</span>
              </div>
              <div>
                <div className="myeongjo" style={{
                  fontSize: 13, color: 'var(--bone)', fontWeight: 700,
                  letterSpacing: '0.06em', marginBottom: 3,
                }}>{m.label}</div>
                <div className="myeongjo" style={{
                  fontSize: 11.5, color: 'var(--bone-soft)', lineHeight: 1.6, letterSpacing: '0.02em',
                }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <window.GoldDivider width={60}/>

        {/* stats grid */}
        <div className="myeongjo" style={{
          fontSize: 13, color: 'var(--gold-bright)', letterSpacing: '0.3em',
          marginBottom: 18, fontWeight: 600,
        }}>
          · 검 증 된 정 밀 도 ·
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              border: '1px solid var(--gold-pale)',
              background: 'rgba(13,6,8,0.55)',
              padding: '18px 10px', textAlign: 'center',
            }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2,
              }}>
                <span className="brush glow-gold" style={{
                  fontSize: 30, color: 'var(--gold-bright)', lineHeight: 1, letterSpacing: 0,
                }}>{s.n}</span>
                <span className="myeongjo" style={{
                  fontSize: 13, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em',
                }}>{s.unit}</span>
              </div>
              <div className="myeongjo" style={{
                fontSize: 11.5, color: 'var(--bone)', fontWeight: 600,
                letterSpacing: '0.05em', marginTop: 8,
              }}>{s.label}</div>
              <div className="myeongjo" style={{
                fontSize: 9, color: 'var(--bone-faint)', letterSpacing: '0.15em', marginTop: 4,
              }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* algorithm flow */}
        <div style={{
          marginTop: 24, padding: '18px 14px',
          border: '1px dashed var(--gold-line)',
          background: 'rgba(13,6,8,0.4)',
        }}>
          <div className="mono" style={{
            fontSize: 9, color: 'var(--gold)', letterSpacing: '0.3em', marginBottom: 14,
          }}>
            · PIPELINE · 산출 흐름 ·
          </div>
          <FlowDiagram/>
        </div>
      </div>
    </section>
  );
}

function FlowDiagram() {
  const steps = [
    { h: '生', label: '입력', sub: '생년월일시' },
    { h: '曆', label: '만세력', sub: '천간지지 변환' },
    { h: '時', label: '시 보정', sub: '진태양시·절기' },
    { h: '式', label: '명식', sub: '8자 산출' },
    { h: '解', label: '풀이', sub: '老師 1:1' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              width: 30, height: 30,
              border: '1px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(212,175,106,0.08)',
            }}>
              <span className="brush" style={{
                fontSize: 16, color: 'var(--gold-bright)', lineHeight: 1,
              }}>{s.h}</span>
            </div>
            <div className="myeongjo" style={{
              fontSize: 9.5, color: 'var(--bone)', letterSpacing: '0.1em', fontWeight: 600,
            }}>{s.label}</div>
            <div className="myeongjo" style={{
              fontSize: 8, color: 'var(--bone-faint)', letterSpacing: '0.05em',
              textWrap: 'pretty', textAlign: 'center', lineHeight: 1.3,
            }}>{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flexShrink: 0, color: 'var(--gold)', marginTop: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, opacity: 0.7,
            }}>›</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { Ornament, VerticalHanja, GoldDivider, SectionLabel, KakaoButton, HeroSection, CosmosSection, ProblemSection, HeritageSection, PrecisionSection });
