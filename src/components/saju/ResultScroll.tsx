// =====================================================
// ⑨ 종합 결과지 — 디자인 핸드오프 "결과지 디자인.dc.html" 자수정 재현.
// 순수 표현용(서버 컴포넌트). 데이터는 buildResultView/DEMO_RESULT_VIEW가 만든 ResultView.
// 없는 에셋(카테고리 아이콘·디바이더)은 인라인 SVG로 대체, 오행 아이콘은 type3d 오브 재사용.
// 한자는 장식 — 원국/오행에 한글 읽기를 함께 노출(알아보기 쉽게).
// =====================================================
import { ELEMENT_META, type CategoryKey, type ResultView } from "@/lib/saju/result-view";

const MARK = "/assets/saju/scroll/mark.svg";
const PAD = 20; // 카드·제목 좌우 인셋 통일(정렬)

type TocItem = { label: string; href: string; locked?: boolean };

// 영역별 카테고리 아이콘(인라인) — 핸드오프엔 category/ 에셋이 빠져있어 직접 그림.
const CAT_ICON: Record<CategoryKey, { tint: string; path: React.ReactNode }> = {
  wealth: {
    tint: "228,200,120",
    path: (
      <>
        <ellipse cx="12" cy="7" rx="7" ry="3" />
        <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
        <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ),
  },
  career: {
    tint: "127,200,160",
    path: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),
  },
  love: {
    tint: "255,150,180",
    path: <path d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11z" />,
  },
  health: {
    tint: "136,168,224",
    path: <path d="M3 12h4l2-5 3 9 2-6 1.5 2H21" />,
  },
};

function Divider() {
  return (
    <div style={{ padding: "22px 40px 4px" }}>
      <svg viewBox="0 0 300 12" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="dvL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(180,140,255,0)" />
            <stop offset="0.5" stopColor="rgba(180,140,255,.5)" />
            <stop offset="1" stopColor="rgba(180,140,255,0)" />
          </linearGradient>
        </defs>
        <line x1="20" y1="6" x2="128" y2="6" stroke="url(#dvL)" strokeWidth="1" />
        <line x1="172" y1="6" x2="280" y2="6" stroke="url(#dvL)" strokeWidth="1" />
        <g fill="#c9a8ff">
          <path d="M150 1 L153 6 L150 11 L147 6 Z" />
          <circle cx="138" cy="6" r="1.4" opacity=".7" />
          <circle cx="162" cy="6" r="1.4" opacity=".7" />
        </g>
      </svg>
    </div>
  );
}

function TocCard({ items }: { items: TocItem[] }) {
  return (
    <div style={{ margin: `18px ${PAD}px 0`, padding: "16px 16px 6px", borderRadius: 16, background: "rgba(9,5,22,.6)", border: "1px solid rgba(180,140,255,.22)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK} alt="" width={18} height={18} style={{ width: 18, height: 18 }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#cbb8f0" }}>목차</span>
      </div>
      {items.map((it, i) => {
        const row = (
          <>
            <span style={{ flex: "none", width: 22, height: 22, borderRadius: 999, background: it.locked ? "rgba(255,255,255,.06)" : "rgba(150,90,255,.22)", border: `1px solid ${it.locked ? "rgba(180,140,255,.25)" : "rgba(180,140,255,.4)"}`, color: it.locked ? "#9a8cd0" : "#dcc8ff", fontSize: it.locked ? 10 : 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {it.locked ? "🔒" : i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: it.locked ? "#9a8cd0" : "#e6dbff" }}>{it.label}</span>
            <span style={{ flex: "none", fontSize: 13, color: "#9a8cd0" }}>{it.locked ? "" : "›"}</span>
          </>
        );
        const style = { display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", textDecoration: "none", borderTop: i === 0 ? "none" : "1px solid rgba(180,140,255,.12)" } as const;
        return it.locked ? (
          <div key={it.label} style={style}>{row}</div>
        ) : (
          <a key={it.label} href={it.href} style={style}>{row}</a>
        );
      })}
    </div>
  );
}

function PillarCell({ char, read, element, day }: { char: string; read: string; element: keyof typeof ELEMENT_META; day?: boolean }) {
  const e = ELEMENT_META[element];
  return (
    <div
      style={{
        aspectRatio: "1",
        borderRadius: 11,
        background: `rgba(${e.rgb},${day ? 0.22 : 0.18})`,
        border: `${day ? 1.5 : 1}px solid rgba(${e.rgb},${day ? 0.55 : 0.4})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <span style={{ fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 24, lineHeight: 1, color: e.text }}>{char}</span>
      {read && (
        <span style={{ fontSize: 9.5, lineHeight: 1.1, color: e.text, opacity: 0.85 }}>
          {read} · {e.ko}
        </span>
      )}
    </div>
  );
}

function DaeunChart({ points }: { points: NonNullable<ResultView["daeun"]>["points"] }) {
  const W = 300, H = 150, top = 22, bottom = 120, left = 20, right = 280;
  const n = points.length;
  const x = (i: number) => left + (right - left) * (n === 1 ? 0.5 : i / (n - 1));
  const y = (v: number) => bottom - (bottom - top) * Math.max(0, Math.min(1, v));
  const line = points.map((p, i) => `${x(i).toFixed(0)},${y(p.value).toFixed(0)}`).join(" ");
  const area = `M${x(0).toFixed(0)},${y(points[0].value).toFixed(0)} ` +
    points.map((p, i) => `L${x(i).toFixed(0)},${y(p.value).toFixed(0)}`).join(" ") +
    ` L${x(n - 1).toFixed(0)},${bottom} L${x(0).toFixed(0)},${bottom} Z`;
  const cur = points.findIndex((p) => p.current);
  return (
    <div style={{ marginTop: 14, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(180,140,255,.18)", padding: "14px 10px 8px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="duArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9a8ff" stopOpacity=".55" />
            <stop offset="1" stopColor="#8a5cf0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={left - 6} y1={bottom} x2={right + 6} y2={bottom} stroke="rgba(180,140,255,.2)" />
        <path d={area} fill="url(#duArea)" />
        <polyline points={line} fill="none" stroke="#c9a8ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {cur >= 0 && (
          <>
            <circle cx={x(cur)} cy={y(points[cur].value)} r="6" fill="#fff" stroke="#8a5cf0" strokeWidth="3" />
            <text x={x(cur)} y={y(points[cur].value) - 12} textAnchor="middle" fontSize="11" fill="#e6dbff" fontWeight="bold">지금</text>
          </>
        )}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={138} textAnchor="middle" fontSize="10" fill={p.current ? "#e6dbff" : "#9a8cd0"} fontWeight={p.current ? "bold" : undefined}>
            {p.current ? `${p.age} ${p.label}` : p.age}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function ResultScroll({ view, embedded, extraToc = [], locked }: { view: ResultView; embedded?: boolean; extraToc?: TocItem[]; locked?: boolean }) {
  const il = ELEMENT_META[view.ilgan.element];
  const barMax = Math.max(1, ...view.ohaeng.map((o) => o.count));

  // 무료(잠금) 목차 — 결제하면 받을 전체 구성을 미리 보여주고 잠긴 항목은 🔒.
  const toc: TocItem[] = locked
    ? [
        { label: "나는 어떻게 타고났을까?", href: "#sec-ilgan" },
        { label: "내 안엔 어떤 기운이 흐를까?", href: "#sec-wonguk" },
        { label: "돈·일·사랑·건강 — 내 강점은 어디?", href: "#sec-areas" },
        { label: "내 강점, 더 깊이 파고들면?", href: "#", locked: true },
        { label: "내 인생, 언제 피어날까?", href: "#", locked: true },
        { label: "그 고민, 사주는 뭐라 답할까? · 상세 풀이 7챕터", href: "#", locked: true },
      ]
    : [
        { label: "나는 어떻게 타고났을까?", href: "#sec-ilgan" },
        { label: "내 안엔 어떤 기운이 흐를까?", href: "#sec-wonguk" },
        ...(view.categories.length ? [{ label: "돈·일·사랑·건강 — 내 강점은 어디?", href: "#sec-areas" }] : []),
        ...(view.daeun ? [{ label: "내 인생, 언제 피어날까?", href: "#sec-daeun" }] : []),
        ...(view.advice ? [{ label: "그 고민, 사주는 뭐라 답할까?", href: "#sec-advice" }] : []),
        ...extraToc,
      ];

  const card = { margin: `18px ${PAD}px 0`, borderRadius: 18, background: "rgba(9,5,22,.6)", border: "1px solid rgba(180,140,255,.22)" } as const;
  const anchor = { scrollMarginTop: 14 } as const;

  const phone = (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        color: "#fff",
        background: "linear-gradient(180deg,#141023 0%,#0f0a1c 40%,#0a0715 100%)",
        boxShadow: embedded ? undefined : "0 30px 70px rgba(15,7,40,.6)",
        borderRadius: embedded ? 0 : 28,
        overflow: "hidden",
        paddingBottom: 6,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: "html{scroll-behavior:smooth}" }} />

      {/* 헤더 — 랜딩과 동일하게 중앙 워드마크, 공유는 우측 상단 */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: `16px ${PAD}px 0` }}>
        <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 18, letterSpacing: ".1em", color: "#f3edff" }}>{view.brand.title}</div>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".22em", textIndent: ".22em", color: "#c9a8ff", marginTop: 3 }}>{view.brand.sub}</div>
        {!locked && <span style={{ position: "absolute", right: PAD, top: 16, fontSize: 16, color: "#b8a4e0" }}>⤴</span>}
      </div>

      {/* 히어로 — 일간 오브 */}
      <div
        id="sec-ilgan"
        style={{
          ...anchor,
          margin: `18px ${PAD}px 0`,
          padding: "24px 20px 22px",
          borderRadius: 22,
          background: `radial-gradient(100% 85% at 50% -8%, rgba(${il.rgb},.22), rgba(8,5,20,0) 62%), rgba(9,5,22,.62)`,
          border: `1px solid rgba(${il.rgb},.3)`,
          textAlign: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={il.orb} alt={`${il.ko} 오브`} width={148} height={148} style={{ width: 148, height: 148, display: "block", margin: "0 auto", filter: "drop-shadow(0 14px 30px rgba(20,10,40,.5))" }} />
        <div style={{ marginTop: 6, fontSize: 12.5, color: "#cbb8f0" }}>회원님이 타고난 기운은</div>
        <div style={{ marginTop: 6, fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 25 }}>{view.ilgan.title}</div>
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 999, background: `rgba(${il.rgb},.16)`, border: `1px solid rgba(${il.rgb},.35)`, fontSize: 12, fontWeight: 700, color: il.text }}>
          {view.ilgan.type}
        </div>
        {view.birthLine && <div style={{ marginTop: 12, fontSize: 12.5, color: "#9a8cd0" }}>{view.birthLine}</div>}
      </div>

      {/* 목차 */}
      <TocCard items={toc} />

      {/* 원국 + 오행 분포 */}
      <div id="sec-wonguk" style={{ ...card, ...anchor, padding: `18px ${PAD - 4}px` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#cbb8f0", marginBottom: 12 }}>내 사주 네 기둥 (四柱) — 타고난 여덟 글자</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {view.pillars.map((p, i) => (
            <div key={`l${i}`} style={{ textAlign: "center", fontSize: 11, color: p.isDay ? "#c9a8ff" : "#9a8cd0", fontWeight: p.isDay ? 700 : 400 }}>
              {p.label}
            </div>
          ))}
          {view.pillars.map((p, i) => (
            <PillarCell key={`g${i}`} char={p.gan.char} read={p.gan.read} element={p.gan.element} day={p.isDay} />
          ))}
          {view.pillars.map((p, i) => (
            <PillarCell key={`j${i}`} char={p.ji.char} read={p.ji.read} element={p.ji.element} />
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 12.5, fontWeight: 700, color: "#cbb8f0" }}>나를 이루는 다섯 기운 (五行)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 48, marginTop: 10 }}>
          {view.ohaeng.map((o) => {
            const e = ELEMENT_META[o.key];
            const h = o.count === 0 ? 8 : Math.max(20, (o.count / barMax) * 100);
            return <div key={o.key} style={{ flex: 1, height: `${h}%`, background: `linear-gradient(180deg,${e.bar},${e.barTo})`, borderRadius: "5px 5px 0 0", opacity: o.count === 0 ? 0.3 : 1 }} />;
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {view.ohaeng.map((o) => {
            const e = ELEMENT_META[o.key];
            return (
              <div key={o.key} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.orb} alt={e.ko} width={26} height={26} style={{ width: 26, height: 26, opacity: o.count === 0 ? 0.4 : 1 }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {view.ohaeng.map((o) => (
            <span key={o.key} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 600, color: ELEMENT_META[o.key].text, opacity: 0.85 }}>
              {ELEMENT_META[o.key].ko}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 10.5 }}>
          {view.ohaeng.map((o) => (
            <span
              key={o.key}
              style={{
                flex: 1,
                textAlign: "center",
                fontWeight: o.emphasis ? 700 : 400,
                color: o.emphasis === "strong" ? ELEMENT_META[o.key].text : o.emphasis === "absent" ? "#ff9a9a" : "#9a8cd0",
              }}
            >
              {o.count === 0 ? "없음" : `${o.count}개`}
            </span>
          ))}
        </div>
      </div>

      {/* 영역별 풀이 */}
      {view.categories.length > 0 && (
        <>
          <Divider />
          <div id="sec-areas" style={{ ...anchor, padding: `8px ${PAD}px 0` }}>
            <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 19 }}>영역별 풀이</div>
          </div>
          {view.categories.map((c, i) => {
            const ic = CAT_ICON[c.key];
            return (
              <div key={c.key} style={{ margin: `${i === 0 ? 14 : 11}px ${PAD}px 0`, padding: 16, borderRadius: 16, background: "rgba(9,5,22,.6)", border: "1px solid rgba(180,140,255,.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `rgba(${ic.tint},.16)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={`rgb(${ic.tint})`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        {ic.path}
                      </svg>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.label}</span>
                    {c.primary && <span style={{ fontSize: 10, fontWeight: 700, color: "#3a1a8a", background: "#dcc8ff", padding: "2px 7px", borderRadius: 999 }}>고민 1순위</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: `rgb(${ic.tint})` }}>{c.score}</div>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,.08)", marginTop: 11, overflow: "hidden" }}>
                  <div style={{ width: `${c.score}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg,#b794ff,rgb(${ic.tint}))` }} />
                </div>
                <div style={{ marginTop: 11, fontSize: 12.5, lineHeight: 1.7, color: "#cbb8f0", ...(locked ? { filter: "blur(4.5px)", userSelect: "none", pointerEvents: "none" } : {}) }}>{c.body}</div>
                {locked && (
                  <div style={{ marginTop: 7, fontSize: 11, fontWeight: 700, color: "#b8a4e0", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>🔒</span> 자세한 풀이는 전체 풀이에서
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* 무료(잠금) — 결제 후 열리는 것 요약 */}
      {locked && (
        <div style={{ margin: `18px ${PAD}px 0`, padding: 18, borderRadius: 16, border: "1px dashed rgba(180,140,255,.45)", background: "rgba(20,8,50,.45)", textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 800, color: "#f3edff" }}>전체 풀이에서 모두 열려요</div>
          <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.65, color: "#b8a4e0" }}>
            영역별 상세 풀이 · 인생 60년의 큰 흐름
            <br />
            내 고민 맞춤 조언 · 상세 풀이 7챕터
          </div>
        </div>
      )}

      {/* 대운 흐름 */}
      {!locked && view.daeun && view.daeun.points.length > 0 && (
        <>
          <Divider />
          <div id="sec-daeun" style={{ ...anchor, padding: `6px ${PAD}px 0` }}>
            <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 19 }}>인생의 큰 흐름</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#9a8cd0" }}>10년마다 바뀌는 인생의 큰 계절 · 대운(大運)</div>
            <DaeunChart points={view.daeun.points} />
          </div>
        </>
      )}

      {/* 맞춤 조언 */}
      {!locked && view.advice && (
        <div id="sec-advice" style={{ ...anchor, margin: `22px ${PAD}px 0`, padding: 18, borderRadius: 18, background: "linear-gradient(160deg,rgba(150,90,255,.24),rgba(60,30,130,.18))", border: "1.5px solid rgba(190,150,255,.42)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} alt="" width={22} height={22} style={{ width: 22, height: 22 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#c9a8ff" }}>내 고민에 대한 방향</div>
          </div>
          {view.advice.quote && <div style={{ marginTop: 8, fontSize: 12.5, fontStyle: "italic", color: "#9a8cd0", lineHeight: 1.5 }}>&ldquo;{view.advice.quote}&rdquo;</div>}
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.75, color: "#ece4ff" }}>{view.advice.body}</div>
        </div>
      )}

      {/* 푸터 — 무료(잠금)에선 숨김(퍼널이 결제 CTA 제공) */}
      {!locked && (
        <div style={{ padding: `22px ${PAD}px 26px` }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 14, border: "1.5px solid rgba(180,140,255,.4)", fontSize: 13.5, fontWeight: 700, color: "#dcc8ff" }}>PDF 저장</div>
            <div style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 14, background: "linear-gradient(180deg,#fff,#f1eaff)", color: "#3a1a8a", fontSize: 13.5, fontWeight: 800 }}>결과 공유</div>
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} alt="" width={20} height={20} style={{ width: 20, height: 20 }} />
            <span style={{ fontSize: 11, color: "#9a8cd0" }}>명운록 · SAJU LAB · 평생 다시 보기</span>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return phone;
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "radial-gradient(90% 55% at 50% 0%,#16112c,#0b0816 58%,#070410)",
        padding: "30px 12px 60px",
      }}
    >
      {phone}
    </div>
  );
}
