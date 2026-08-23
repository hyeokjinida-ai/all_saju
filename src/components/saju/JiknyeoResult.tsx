// 직녀 전용 결과지 — 2026-08-22 신설.
//
// 왜 만들었나: 직녀는 **파는 화면만 있고 파는 물건이 없었다.**
//   손님 동선이 [밤하늘 게이트 → 설화 → 달빛 티저에서 12칸 예보를 보고 「첫 달은 ████」에서 멈춤]
//   → 결제 → **보라색 공용 템플릿**(재물운·직업운·건강운까지 나오는 그것)이었다.
//   티저가 건 약속("계산은 다 보여드렸어요, 읽어 드리는 건 여기서부터")의 보상이 없는 상품이다.
//   산군은 이미 전용 조판(SangunResult)이 있다 — 직녀도 같은 길을 간다.
//
// 이 결과지의 일 하나: **티저에서 잠근 것을 여는 것.**
//   ① 예보판을 티저와 **같은 12칸**으로 다시 세우되 달 이름을 전부 연다 (gradeMonths 공용)
//   ② 만나는 달 셋을 근거와 함께 카드로 — 티저에서 하나만 열었던 그 목록의 나머지
//   ③ 명식 실물(원국) — 티저에서 보여준 것과 같은 표
//   ④ LLM 10장 본문
//
// ⚠ 등급은 여기서 계산하지 않는다. `gradeMonths(facts)` 한 곳에서만 나온다 —
//    티저가 ● 라고 한 달을 결과지가 안 짚으면 그 자리에서 신뢰가 끝난다.
// ⚠ 재물·직업·건강 영역은 싣지 않는다. 안 판 것을 보여주면 상품이 흐려진다(공용 템플릿의 문제).
import { Fragment } from "react";
import { splitChapters } from "./ResultChapters";
import { ResultBody } from "./ResultBody";
import { ResultCrossSell } from "./ResultCrossSell";
import { ResultSealOff } from "./ResultSealOff";
import { ResultReviewCTA } from "./ResultReviewCTA";
import { gradeMonths } from "@/lib/saju/teaser";
import type { InyeonFacts } from "@/lib/saju/saju-api";
import type { ChartRow } from "@/lib/saju/teaser";
import type { ResultView } from "@/lib/saju/result-view";

/* ── 달 위상 — 티저(JiknyeoForecast)와 같은 그림. 별도 파일이지만 모양이 갈리면 안 된다 ── */
type Phase = "full" | "half" | "cres" | "cloud";
const GRADE_TO_PHASE: Record<string, Phase> = { "●": "full", "◎": "half", "○": "cres", "△": "cloud" };

function Moon({ phase, size = 30 }: { phase: Phase; size?: number }) {
  const c = { width: size, height: size, viewBox: "0 0 74 74" } as const;
  if (phase === "full")
    return (
      <svg {...c} aria-hidden>
        <defs>
          <radialGradient id="jr-full">
            <stop offset="0%" stopColor="#FFFDF2" />
            <stop offset="100%" stopColor="#EFE3BE" />
          </radialGradient>
        </defs>
        <circle cx="37" cy="37" r="27" fill="url(#jr-full)" stroke="#C9A94E" strokeWidth="2.5" />
        <circle cx="30" cy="30" r="5" fill="#E4D6A8" opacity=".7" />
        <circle cx="45" cy="42" r="7" fill="#E4D6A8" opacity=".55" />
      </svg>
    );
  if (phase === "half")
    return (
      <svg {...c} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#F3EDFA" stroke="#9B8AC4" strokeWidth="2.5" />
        <path d="M37 10a27 27 0 0 1 0 54z" fill="#C7B0EC" />
      </svg>
    );
  if (phase === "cres")
    return (
      <svg {...c} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#E6E2EE" stroke="#B9B2CE" strokeWidth="2.5" />
        <path d="M31 11a27 27 0 1 0 0 52 31 31 0 0 1 0-52z" fill="#FCFAFE" />
      </svg>
    );
  return (
    <svg {...c} aria-hidden>
      <circle cx="41" cy="30" r="21" fill="#EFECF6" stroke="#A9A2BE" strokeWidth="2.5" />
      <path d="M20 52h34a12 12 0 0 0 0-24 17 17 0 0 0-32 5 10 10 0 0 0-2 19z" fill="#8F87A8" />
    </svg>
  );
}

/** 밤 위에 뜬 달빛 판 — 티저와 같은 형태. 정보 밀도 높은 구간만 이렇게 띄운다. */
function Plate({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="relative overflow-hidden rounded-[16px] px-4 py-5"
      style={{
        background: "linear-gradient(168deg,#F7F4FB 0%,#EDE7F6 58%,#E2D9F0 100%)",
        boxShadow: "0 0 0 1px rgba(217,199,232,.45), 0 18px 44px rgba(10,8,26,.55)",
        scrollMarginTop: 14,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0))" }}
      />
      {children}
    </div>
  );
}

function PlateTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <div className="flex items-center justify-center gap-2.5">
        <i className="block h-5 w-[3px] flex-none" style={{ background: "#6B4C9A" }} />
        <p className="text-[17px] font-extrabold" style={{ color: "#1B1729" }}>{children}</p>
        <i className="block h-5 w-[3px] flex-none" style={{ background: "#6B4C9A" }} />
      </div>
      {sub ? <p className="mt-1.5 text-center text-[12px]" style={{ color: "#6C6483" }}>{sub}</p> : null}
    </>
  );
}

/* ── 章 간지 — 청월당 유료 결과지 실측(2026-08-22)에서 가져온 장치.
   저쪽은 장마다 750×8,000px 짜리 PNG 앞머리에 「제 N 장」 + 매듭 + 제목을 굽고
   아래를 본문 배경색으로 페이드시켜 이음매를 지운다. 우리는 이미지를 굽지 않는다 —
   같은 그림을 DOM 으로 세우면 장 제목이 바뀌어도 다시 만들 필요가 없다.
   핵심은 두 가지: **번호와 제목 사이의 매듭 구분선**, 그리고 **아래쪽 페이드**. ── */
function ChapterGate({ no, title }: { no: number; title: string }) {
  // LLM 이 제목에 "9. " 처럼 번호를 붙여 온다. 간지가 이미 「제 9 장」을 세우므로
  // 그대로 두면 번호가 두 번 나온다 — 여기서 한 번만 남긴다.
  const clean = title.replace(/^\s*\d+\s*[.·)]\s*/, "");
  return (
    <div
      style={{
        position: "relative",
        margin: "34px 0 0",
        padding: "32px 20px 30px",
        borderRadius: "16px 16px 0 0",
        border: "1px solid rgba(199,176,236,.20)",
        borderBottom: "none",
        textAlign: "center",
        // 끝 색을 본문 카드(rgba(19,20,38,.72))와 같게 둬야 경계선이 사라진다.
        // 청월당은 이걸 PNG 안에서 페이드로 처리한다 — 우리는 색을 맞춘다.
        background:
          "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(120,92,190,.30) 0%, rgba(120,92,190,0) 70%)," +
          "linear-gradient(180deg, #1B1839 0%, #17142E 58%, rgba(19,20,38,.72) 100%)",
      }}
    >
      <div style={{ fontSize: 12.5, letterSpacing: "0.34em", color: "#A98BD9", fontWeight: 600 }}>
        제 {no} 장
      </div>

      {/* 매듭 + 좌우 선 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "13px 0 14px" }}>
        <i style={{ display: "block", width: 46, height: 1, background: "linear-gradient(90deg, rgba(169,139,217,0), rgba(169,139,217,.55))" }} />
        <svg width="21" height="21" viewBox="0 0 74 74" aria-hidden>
          <path d="M37 6l7.4 22.6L67 36l-22.6 7.4L37 66l-7.4-22.6L7 36l22.6-7.4z" fill="#A98BD9" opacity=".75" />
        </svg>
        <i style={{ display: "block", width: 46, height: 1, background: "linear-gradient(90deg, rgba(169,139,217,.55), rgba(169,139,217,0))" }} />
      </div>

      <div className="font-myeongjo" style={{ fontSize: 21, fontWeight: 700, color: "#EFE7FA", lineHeight: 1.4 }}>
        {clean}
      </div>
    </div>
  );
}

/* ── 본문 카드 — 밤 위 어두운 카드(글은 길어서 판으로 만들면 눈이 아프다) ── */
const nightCard: React.CSSProperties = {
  borderRadius: 16,
  background: "rgba(19,20,38,.72)",
  border: "1px solid rgba(199,176,236,.20)",
  padding: "18px 20px",
  scrollMarginTop: 14,
};

// 오행 색 — 밤 배경에서 견디도록 채도·명도를 낮춘 판(디자인시스템 tokens.css 와 같은 값)
const EL_BG: Record<string, string> = {
  wood: "linear-gradient(150deg,#8FBFA0,#5E8F6E)",
  fire: "linear-gradient(150deg,#E08098,#B4526B)",
  earth: "linear-gradient(150deg,#D6AC76,#A8804A)",
  metal: "linear-gradient(150deg,#BDB9D6,#8A86A8)",
  water: "linear-gradient(150deg,#6E7BB8,#3E4A80)",
};


/** 짝의 오행 → 「어떤 결의 사람인지」. 외모·직업은 넣지 않는다 —
 *  outline 이 "직업명·얼굴·지역 단정 금지"로 못박은 항목이라 표에서도 지킨다.
 *  (타이트는 외모·직업군까지 표로 단정하지만, 우리는 그 선을 안 넘기로 한 선택이다) */
const OH_TRAIT: Record<string, { keul: string; how: string }> = {
  목: { keul: "곧고 자라는 결", how: "먼저 계획을 세워 오고, 약속을 미루지 않아요" },
  화: { keul: "밝고 퍼지는 결", how: "표현이 빠르고, 함께 있으면 분위기가 데워져요" },
  토: { keul: "두텁고 받치는 결", how: "말수는 적어도 한 번 맡으면 끝까지 지켜요" },
  금: { keul: "맺고 끊는 결", how: "기준이 분명하고, 아닌 건 아니라고 말해요" },
  수: { keul: "깊고 스미는 결", how: "먼저 듣고, 시간이 지날수록 편해져요" },
};

export function JiknyeoResult({
  view,
  markdown,
  name,
  inyeon,
  chartRows,
  isMarriage = false,
  reviewOrderId = null,
  recordedAt = null,
}: {
  view: ResultView;
  markdown: string;
  name: string | null;
  inyeon: InyeonFacts | null;
  chartRows?: ChartRow[];
  /** 결혼예보 — 같은 부품에 강조만 「결혼하는 해」로 옮긴다 */
  isMarriage?: boolean;
  /** 후기 자격이 있을 때만 값이 온다(로그인 회원 주문). 게스트는 null — 눌러도 막히는 버튼은 안 세운다 */
  reviewOrderId?: string | null;
  /** 결과 생성일(ISO) — 맺음 낙관에 찍는다 */
  recordedAt?: string | null;
}) {
  const { intro, chapters } = splitChapters(markdown);
  const who = (name ?? "").trim();
  const months = inyeon ? gradeMonths(inyeon) : [];
  // 점수순으로 오는 배열을 **읽는 순서(시간순)** 로 세운다 — 달력 아래에 붙는 목록이라 순서가 어긋나면 헷갈린다.
  const byTime = <T extends { year: number; month: number }>(rows: T[]) =>
    rows.slice().sort((a, b) => a.year - b.year || a.month - b.month);
  const top3 = inyeon ? byTime(inyeon.top3) : [];
  const shaky = inyeon ? byTime(inyeon.shaky) : [];
  // 시 모름이면 시주가 "?" 로 온다 — 티저와 같은 조건으로 뺀다
  const shown = view.pillars.slice().reverse().filter((p) => p.gan.char !== "?");

  return (
    <div className="space-y-5">
      {/* ── 머리 ── */}
      <div className="text-center">
        <p className="font-brush text-[13px] tracking-[0.34em]" style={{ color: "#cfd6e6", opacity: 0.9 }}>
          織 女
        </p>
        <h1 className="mt-2 font-myeongjo text-[24px] font-bold" style={{ color: "#EFE7FA" }}>
          {who ? `${who}님의 ` : ""}
          {isMarriage ? "결혼예보" : "연애예보"}
        </h1>
        <p className="mt-1.5 text-[12px]" style={{ color: "#98a0b4" }}>
          만세력 계산 · 앞으로 열두 달
        </p>
      </div>

      {/* ── ① 예보판 — 티저에서 가렸던 달 이름을 전부 연다 ── */}
      {months.length > 0 && (
        <Plate id="sec-forecast">
          <PlateTitle sub="티저에서 가렸던 달 이름을 전부 열었어요">
            {isMarriage ? "결혼 예보" : "인연 예보"}
          </PlateTitle>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {months.map((m) => {
              const p = GRADE_TO_PHASE[m.grade] ?? "cres";
              const big = p === "full";
              return (
                <div
                  key={`${m.year}-${m.month}`}
                  className="rounded-[9px] py-2 text-center"
                  style={{
                    background: "#FCFAFE",
                    border: `1px solid ${big ? "#6B4C9A" : "#DFD6EE"}`,
                    boxShadow: big ? "0 0 0 2px rgba(107,76,154,.16)" : undefined,
                  }}
                >
                  <p className="text-[12px] font-bold" style={{ color: big ? "#5B3F8F" : "#6C6483" }}>
                    {m.month}월
                  </p>
                  <div className="mt-1 flex justify-center"><Moon phase={p} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {([["full", "크게 열리는 달"], ["half", "자리가 생기는 달"], ["cres", "평"], ["cloud", "결이 엉키는 달"]] as const).map(
              ([p, label]) => (
                <div key={p} className="flex items-center gap-1.5">
                  <Moon phase={p} size={18} />
                  <span className="text-[11px]" style={{ color: "#332C4A" }}>{label}</span>
                </div>
              ),
            )}
          </div>
        </Plate>
      )}

      {/* ── ② 만나는 달 셋 — 티저에서 하나만 열었던 목록의 나머지 ── */}
      {top3.length > 0 && (
        <Plate id="sec-top3">
          <PlateTitle sub="근거는 아래 명식에서 나왔어요">
            {isMarriage ? "결혼하는 해와 달" : "만나는 달 셋"}
          </PlateTitle>
          <div className="mt-4 space-y-2.5">
            {top3.map((m) => (
              <div
                key={m.label}
                className="rounded-[10px] px-3.5 py-3"
                style={{ background: "#FCFAFE", border: "1px solid #DFD6EE" }}
              >
                <div className="flex items-baseline gap-2">
                  <Moon phase="full" size={20} />
                  <p className="text-[16px] font-extrabold" style={{ color: "#1B1729" }}>
                    {m.year}년 {m.month}월
                  </p>
                  <span className="ml-auto text-[11px]" style={{ color: "#8A82A2" }}>{m.age}세</span>
                </div>
                {m.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full px-2 py-[3px] text-[11px]"
                        style={{ background: "#E4DAF4", color: "#3F2E63" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {shaky.length > 0 && (
            <p className="mt-3.5 flex items-center gap-2 text-[12px]" style={{ color: "#6C6483" }}>
              <Moon phase="cloud" size={16} />
              결이 엉키는 달 — {shaky.slice(0, 2).map((r) => `${r.year}년 ${r.month}월`).join(" · ")}
            </p>
          )}
        </Plate>
      )}

      {/* ── ③ 명식 실물 — "직접 계산했다"의 증거. 티저에서 본 것과 같은 표 ── */}
      {shown.length > 0 && (
        <Plate id="sec-chart">
          <PlateTitle sub={view.birthLine}>{who ? `${who}님 명식` : "명식"}</PlateTitle>
          <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${shown.length},minmax(0,1fr))` }}>
            {shown.map((p, i) => (
              <div
                key={`gan-${i}`}
                className="rounded-[9px] py-2.5 text-center text-white"
                style={{ background: EL_BG[p.gan.element] ?? EL_BG.water }}
              >
                <em className="block text-[24px] font-bold not-italic leading-none">{p.gan.char}</em>
                <span className="mt-1 block text-[11px] opacity-90">{p.gan.read}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${shown.length},minmax(0,1fr))` }}>
            {shown.map((p, i) => (
              <div
                key={`ji-${i}`}
                className="rounded-[9px] py-2.5 text-center text-white"
                style={{ background: EL_BG[p.ji.element] ?? EL_BG.water }}
              >
                <em className="block text-[24px] font-bold not-italic leading-none">{p.ji.char}</em>
                <span className="mt-1 block text-[11px] opacity-90">{p.ji.read}</span>
              </div>
            ))}
          </div>
          {chartRows && chartRows.length > 0 && (
            <div className="mt-3 space-y-1">
              {chartRows.map((r) => (
                <div key={r.pos} className="flex items-center gap-2 text-[11px]">
                  <span className="w-10 flex-none font-bold" style={{ color: "#8A82A2" }}>{r.pos}</span>
                  <span style={{ color: "#332C4A" }}>
                    {[r.ganSip, r.jiSip, r.fortune].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Plate>
      )}

      {/* ── ③-B 인연 프로필 표 ──
          티저가 「그 사람은 ████ 에서 처음 마주쳐요」 로 가린 것의 **직접 보상**.
          타이트 유료 결과지의 「[운명 카드] 내 앞에 나타날 진짜 인연 프로필」 자리인데,
          걔넨 외모·직업군까지 단정하고 우리는 그 선을 안 넘는다 — 대신 근거 있는 항목만 표로 박는다. */}
      {inyeon && !isMarriage && (
        <Plate id="sec-profile">
          <PlateTitle sub="티저에서 가려 두었던 자리예요">내 앞에 나타날 사람</PlateTitle>
          <div className="mt-4 overflow-hidden rounded-[10px]" style={{ border: "1px solid #DFD6EE" }}>
            {[
              ["어떤 결", OH_TRAIT[inyeon.spouseOh]?.keul ?? "고르게 섞인 결"],
              ["태도", OH_TRAIT[inyeon.spouseOh]?.how ?? "서두르지 않고 꾸준해요"],
              ["인연의 성격", inyeon.spouseType === "정" ? "바르게 오래 가는 인연" : "강하게 끌리는 인연"],
              ["나이대", inyeon.ageDir],
              ["처음 마주치는 자리", inyeon.meetHint || "사람을 통해 자연스럽게 이어져요"],
              ["가까워지는 속도", `${inyeon.iljiFortune || "보통"} — ${inyeon.iljiLevel >= 7 ? "빠르게 데워져요" : "천천히 깊어져요"}`],
              ["첫 달", top3[0] ? `${top3[0].year}년 ${top3[0].month}월` : "—"],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="flex gap-3 px-3.5 py-2.5"
                style={{ background: i % 2 ? "#FCFAFE" : "transparent", borderTop: i ? "1px solid #E9E2F4" : undefined }}
              >
                <span className="w-[92px] flex-none text-[12px] font-bold" style={{ color: "#6B4C9A" }}>{k}</span>
                <span className="flex-1 text-[13px] leading-relaxed" style={{ color: "#332C4A" }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px]" style={{ color: "#8A82A2" }}>
            얼굴·직업·사는 곳은 적지 않았어요. 명식으로 단정할 수 없는 건 쓰지 않습니다.
          </p>
        </Plate>
      )}

      {/* ── ④ 본문 10장 ── */}
      {intro && (
        <div style={nightCard}>
          <ResultBody markdown={intro} />
        </div>
      )}
      {chapters.map((c, i) => {
        // 크로스셀은 **읽는 도중 한 번만.** 청월당 실측 위치가 46·57·75·79·88% (평균 69%)였다.
        // 끝(100%)에 두면 이미 스크롤을 놓은 뒤다. 장 인덱스 0.62 → 실측 스크롤 70%대에 앉는다
        // (뒷장이 길어서 인덱스 비율보다 픽셀 비율이 뒤로 밀린다). 장이 3개도 안 되면 넣지 않는다.
        const crossAt = chapters.length >= 3 ? Math.floor(chapters.length * 0.62) : -1;
        return (
          <Fragment key={i}>
            <ChapterGate no={i + 1} title={c.title} />
            <div
              id={`ch-${i}`}
              style={{ ...nightCard, marginTop: 0, borderTop: "none", borderRadius: "0 0 16px 16px" }}
            >
              <ResultBody markdown={c.body} />
            </div>
            {i === crossAt && <ResultCrossSell to="sangun" />}
          </Fragment>
        );
      })}

      {/* 기록 완료 낙관 — 본문 끝. 도장을 찍고 나서 후기를 묻는다 */}
      <ResultSealOff at={recordedAt} tone="night" />

      {/* 후기 — 손님 1~10호가 평생 유일한 후기 원천이다 */}
      {reviewOrderId && <ResultReviewCTA orderId={reviewOrderId} tone="night" />}
    </div>
  );
}
