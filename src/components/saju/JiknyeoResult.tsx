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
import fs from "node:fs";
import path from "node:path";
import { Fragment } from "react";
import { splitChapters } from "./ResultChapters";
import { ResultBody } from "./ResultBody";
import { ResultCrossSell } from "./ResultCrossSell";
import { ResultSealOff } from "./ResultSealOff";
import { ResultReviewCTA } from "./ResultReviewCTA";
import { PastCheck } from "./PastCheck";
import { gradeMonths } from "@/lib/saju/teaser";
import { buildPartnerFace, buildWorstFace } from "@/lib/saju/partner-face";

/** public 에 그 파일이 실제로 있는지 — 없으면 null.
 *  ⚠ 이 컴포넌트는 **서버 컴포넌트**라 onError 같은 클라이언트 핸들러를 못 넘긴다
 *  (넘기면 "Event handlers cannot be passed to Client Component props" 로 페이지 전체가 죽는다 —
 *   2026-08-24 실측). 그래서 폴백을 브라우저가 아니라 **서버에서** 판정한다.
 *  산군 SangunResult 의 assetSrc 와 같은 방식이다. */
function assetSrc(src: string): string | null {
  const p = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  return fs.existsSync(p) ? src : null;
}

/** 70장 → 산군 구 10장 → 없음. 화면이 비는 것보다 구 얼굴이라도 있는 게 낫다. */
function faceSrc(src: string, legacy?: string): string | null {
  return assetSrc(src) ?? (legacy ? assetSrc(legacy) : null);
}
import type { InyeonFacts } from "@/lib/saju/saju-api";
import type { ChartRow } from "@/lib/saju/teaser";
import type { ResultView } from "@/lib/saju/result-view";
import { Moon, GRADE_TO_PHASE } from "./JiknyeoMoon";
import { MonthCards, MonthLedger, CharmLore, ShakyCards, SignalCards, CharmChips, PartnerRecall, CutInterlude, CutSay, Prologue, ClosingLetter, ChapterSay } from "./JiknyeoInterlude";

/** 밤 위에 뜬 달빛 판 — 티저와 같은 형태. 정보 밀도 높은 구간만 이렇게 띄운다. */
function Plate({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="relative overflow-hidden rounded-[16px] px-4 py-5"
      // 2026-08-29 형님 검수: 연보라 판은 **구 공용 템플릿 잔재**였다 — 직녀 세계(밤·한지·먹·금)와
      // 남남이라 카드만 다른 상품처럼 떴다. 章 본문(hanjiCard)과 같은 한지로 맞춘다.
      style={{
        backgroundColor: "#FCFAF4",
        backgroundImage:
          "linear-gradient(rgba(255,253,248,.6), rgba(255,253,248,.6)), url(/products/jiknyeo/hanji.png)",
        backgroundSize: "auto, 360px 360px",
        backgroundRepeat: "repeat",
        boxShadow: "0 0 0 1px rgba(107,76,154,.22), 0 18px 44px rgba(10,8,26,.55)",
        scrollMarginTop: 14,
      }}
    >
      {children}
    </div>
  );
}

/** 판 머리 — 章 간지와 **같은 붓**(매듭 + 좌우 선)을 쓰되 색만 판에 맞춘다.
 *  간지는 밤 무대라 보라, 이 판은 한지라 금(낙관색)이다. 예전엔 보라 세로막대 두 개였는데
 *  밝은 종이 위에서 구 템플릿 말투로 읽혔다(2026-08-29 형님 검수). */
function PlateTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <div className="flex items-center justify-center gap-3">
        <i className="block h-px w-9 flex-none" style={{ background: "linear-gradient(90deg, rgba(168,132,44,0), rgba(168,132,44,.6))" }} />
        <p className="font-myeongjo text-[19px] font-bold" style={{ color: "#1B1729", letterSpacing: "-0.01em" }}>{children}</p>
        <i className="block h-px w-9 flex-none" style={{ background: "linear-gradient(90deg, rgba(168,132,44,.6), rgba(168,132,44,0))" }} />
      </div>
      {sub ? <p className="mt-2 text-center text-[13px]" style={{ color: "#6C6483" }}>{sub}</p> : null}
    </>
  );
}

/* ── 章 간지 — 청월당 유료 결과지 실측(2026-08-22)에서 가져온 장치.
   저쪽은 장마다 750×8,000px 짜리 PNG 앞머리에 「제 N 장」 + 매듭 + 제목을 굽고
   아래를 본문 배경색으로 페이드시켜 이음매를 지운다. 우리는 이미지를 굽지 않는다 —
   같은 그림을 DOM 으로 세우면 장 제목이 바뀌어도 다시 만들 필요가 없다.
   핵심은 두 가지: **번호와 제목 사이의 매듭 구분선**, 그리고 **아래쪽 페이드**. ── */
function ChapterGate({ no, title, id }: { no: number; title: string; id?: string }) {
  // LLM 이 제목에 "9. " 처럼 번호를 붙여 온다. 간지가 이미 「제 9 장」을 세우므로
  // 그대로 두면 번호가 두 번 나온다 — 여기서 한 번만 남긴다.
  const clean = title.replace(/^\s*\d+\s*[.·)]\s*/, "");
  return (
    <div
      id={id}
      style={{
        position: "relative",
        // 목차에서 뛰어오는 자리 — 간지 제목이 화면 위에 걸리게 여유를 준다
        scrollMarginTop: 12,
        margin: "34px 0 0",
        padding: "32px 20px 30px",
        borderRadius: "16px 16px 0 0",
        border: "1px solid rgba(199,176,236,.20)",
        borderBottom: "none",
        textAlign: "center",
        // 끝 색을 **아래 본문 판과 같게** 둬야 경계선이 사라진다(청월당은 PNG 안에서 페이드로 처리).
        // 2026-08-25: 본문이 한지로 바뀌어 끝색도 한지색으로 옮겼다. 어두운 간지에서 밝은 종이로
        // 미끄러지듯 넘어가는 그 이음매가 저쪽 결과지의 「한 덩어리」 감각을 만든다.
        // 2026-08-25: 그라디언트 위에 **간지 배경 그림**을 얹는다(은하수 + 베틀 실루엣, 하단이
        // 한지색으로 페이드되게 구워 왔다). 파일이 없으면 아래 그라디언트만 남아 화면은 안 깨진다.
        backgroundImage:
          "url(/products/jiknyeo/gate-bg.webp)," +
          "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(120,92,190,.30) 0%, rgba(120,92,190,0) 70%)," +
          "linear-gradient(180deg, #1B1839 0%, #17142E 46%, #3A3355 78%, #FCFAF4 100%)",
        backgroundSize: "cover, auto, auto",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
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

/* ── 章 본문 판 — 한지(2026-08-25, 청월당 구조 이식) ──
   저쪽 유료 결과지는 간지만 어둡고 본문은 밝다. 긴 글의 가독성과 삽화 발색을 같이 얻는 구조라
   「청월당처럼」의 절반이 여기서 온다. 우리 정체성(밤)은 페이지 바탕·간지·설화 컷·카드가 지킨다.
   HANJI_BG 와 같은 텍스처를 쓴다 — 티저 목차/발췌 카드와 종이가 갈리면 한 상품이 아니게 된다. */
const hanjiCard: React.CSSProperties = {
  borderRadius: "0 0 16px 16px",
  backgroundColor: "#FCFAF4",
  // 흰 반투명을 한 겹 얹어 스캔 원색의 노란기를 걷는다 — 청월당 본문은 우리 hanji 원색보다
  // 한 단 밝은 아이보리다(2026-08-25 형님 검토). 질감은 유지되고 톤만 올라간다.
  backgroundImage:
    "linear-gradient(rgba(255,253,248,.6), rgba(255,253,248,.6)), url(/products/jiknyeo/hanji.png)",
  backgroundSize: "auto, 360px 360px",
  backgroundRepeat: "repeat",
  border: "1px solid rgba(107,76,154,.22)",
  borderTop: "none",
  padding: "20px 20px 26px",
  scrollMarginTop: 14,
  // 밤 배경 위에 뜬 종이 — 그림자로 띄워야 '판'으로 읽힌다
  boxShadow: "0 18px 44px rgba(10,8,26,.55)",
};

/** 章별 무드 — **감정 온도계.**
 *
 *  카카오웹툰 「칠흑이 삼킨 여름」 두 회차를 같은 자로 재 보니(2026-08-29) 회차마다 톤이
 *  통째로 달랐다: 54화(일상·대화) 밝음 61%·어둠 6%, **48화(감정 클라이맥스) 밝음 39%·
 *  중간 47%·어둠 12%.** 48화는 감정이 무거운 구간에서 흰 여백을 버리고 **바탕 자체가
 *  색을 가진다**(회녹). 밝기만 오르내리는 게 아니라 색조가 바뀐다.
 *
 *  우리 열 장은 전부 같은 아이보리라 열 장이 한 톤으로 읽혔다. 직녀의 감정은 파도다 —
 *  놓친 이유(가라앉음) → 만나는 달(트임) → 조심할 달(가라앉음) → 크게 바뀌는 해(트임).
 *  그 네 곳만 반의반 톤씩 흔든다. 진폭을 크게 주면 파도가 아니라 얼룩이 된다.
 *  (산군은 열한 장 중 두 곳 — 저쪽은 「어두운 신당」이라 이미 대비가 있고, 직녀는 종이가
 *   내내 밝아서 흔들 자리가 더 필요하다) */
function chapterMood(title: string): React.CSSProperties {
  const HANJI_URL = "url(/products/jiknyeo/hanji.png)";
  // 가라앉음 — 지나간 것을 들여다보는 장. 흰 오버레이를 옅은 회보라로 바꾼다(채도만 내림)
  if (/놓치는 패턴|늦어지는 이유|조심할 달|피해야 할|흔들리/.test(title))
    return {
      backgroundColor: "#F4F1F7",
      backgroundImage: `linear-gradient(rgba(240,236,247,.66), rgba(233,228,242,.66)), ${HANJI_URL}`,
    };
  // 트임 — 이 결과지를 산 이유가 적힌 장. 달빛 은청을 한 겹 얹어 종이가 환해진다
  if (/만나는 달|들어오는 달|결혼하는 해|크게 바뀌는 해/.test(title))
    return {
      backgroundColor: "#FEFDFA",
      backgroundImage: `linear-gradient(rgba(255,254,252,.74), rgba(250,252,255,.74)), ${HANJI_URL}`,
    };
  return {};
}

/* ── 본문 카드 — 밤 위 어두운 카드(요약부 등 章 밖에서 계속 쓴다) ── */
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


/** 짝의 얼굴 — 티저에서 흐리게 본 **그 장**이 여기서 열린다.
 *
 *  왜 넣나(2026-08-24): 청월당은 유료 2종 모두 짝 얼굴을 열고(연애비책 2장·정통사주 1장),
 *  타이트도 「[운명 카드]」로 같은 걸 한다. **두 회사가 같이 하면 시장 표준**이고,
 *  연애가 본업인 직녀만 이 자리가 비어 있었다(`docs-private/청월당_정통사주_유료결과지_해부.md`).
 *
 *  단 우리가 안 넘는 선은 그대로다 — **키·직업명·사는 곳은 여전히 안 쓴다.**
 *  얼굴은 「단정」이 아니라 「명식의 결을 그림으로 옮긴 것」이고, 그 근거를 카드 아래 한 줄로 댄다.
 *  청월당 배경은 오행과 무관한 스튜디오 톤이지만, 우리 배경색은 **상대의 오행색**이라
 *  "왜 이 얼굴인가"를 색으로도 설명한다 — 저쪽이 못 하는 자리다.
 *
 *  파일이 아직 없으면 산군 구 10장(legacySrc) → 실루엣 순으로 조용히 내려앉는다. */
function FaceCard({
  src,
  title,
  why,
  tone,
}: {
  /** 서버에서 존재를 확인한 경로만 들어온다. null 이면 호출부가 카드를 통째로 안 그린다. */
  src: string;
  title: string;
  why: React.ReactNode;
  tone: "best" | "worst";
}) {
  return (
    <div className="mx-auto mt-1 w-full max-w-[300px]">
      <p className="text-center text-[12px] font-bold" style={{ color: tone === "best" ? "#8A6A1E" : "#8A6B6B" }}>
        {title}
      </p>
      {/* 3:4 — 생성 규격(1086×1448)과 같은 비율. 여기서 비율이 어긋나면 얼굴이 눌린다.
          2026-08-25: 맨 사진이던 자리에 **비단 자수 액자**를 씌운다(청월당 빈 액자 공식).
          액자를 배경으로 깔고 얼굴을 안쪽에 앉힌다 — 액자 테두리가 전체의 약 11%다. */}
      <div
        className="relative mx-auto mt-2"
        style={{
          aspectRatio: "3 / 4",
          backgroundImage: "url(/products/jiknyeo/frame-silk.webp)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="absolute overflow-hidden"
          style={{ inset: "9.5% 11% 9.5% 11%", background: "#EFEAF6", borderRadius: 3 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className="h-full w-full select-none object-cover" />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] leading-[1.6]" style={{ color: "#8A82A2" }}>
        {why}
      </p>
    </div>
  );
}

/** 짝의 오행 → 「어떤 결의 사람인지」. 외모·직업은 넣지 않는다 —
 *  outline 이 "직업명·얼굴·지역 단정 금지"로 못박은 항목이라 표에서도 지킨다.
 *  (타이트는 외모·직업군까지 표로 단정하지만, 우리는 그 선을 안 넘기로 한 선택이다) */
/** 만나는 자리 — 만세력 도화 해설 **원문**이 표에 그대로 실리던 것을 손님 말로 옮긴다.
 *
 *  2026-08-29 형님 검수: 「처음 마주치는 자리」 칸에 「도삽도화라고도 하며, 어려서부터 성숙한
 *  감성을 가집니다…」가 통째로 찍히고 있었다. ①전문용어 ②합쇼체(다른 칸은 해요체)
 *  ③「어디서 만나나」에 답을 안 함 — 결제 직후 첫 보상 화면이라 손상이 컸다.
 *
 *  ⚠ `partner-face.ts` 의 `placeFromHint` 를 그냥 쓸 수 없다 — 그건 **반말**로 맞춘다(산군 세계관).
 *     직녀는 해요체다. 그리고 그 파일은 산군도 쓰므로 건드리면 산군까지 흔들린다.
 *     그래서 **직녀 전용**으로 둔다. 원문에서 장소 낱말만 집어 같은 곳을 가리키게 하되(본문 LLM 도
 *     같은 힌트를 근거로 쓴다) 문장은 우리 말로 새로 쓴다. */
const PLACE_BY_WORD: Array<[RegExp, string]> = [
  [/직장|조직|회사|업무|거래/, "일로 엮이는 자리예요 — 직장·거래처"],
  [/소개/, "아는 사람의 소개로 이어져요"],
  [/모임|동호회|동아리|취미/, "사람이 모이는 자리예요 — 모임·동호회"],
  [/학교|학원|공부|스터디/, "배우는 자리예요 — 학교·학원"],
  [/온라인|인터넷/, "화면 너머예요 — 온라인에서 먼저 말이 오가요"],
  [/여행/, "길 위예요 — 여행지에서"],
  [/물가/, "물가 가까운 곳이에요"],
  [/종교|봉사/, "뜻이 같은 자리예요 — 종교·봉사"],
];
/** 공급사 해설은 장소와 **경고**를 한 절에 붙여 온다(「기혼자와 관계가 생길 수 있어 주의가 필요」).
 *  그게 「운명의 짝」 칸에 실리면 상품이 무너진다 — 경고가 섞인 힌트는 통째로 버린다. */
const PLACE_WARN = /기혼|유부|불륜|삼각|바람기|주의가 필요|조심|위험|경계/;
const PLACE_BY_OH: Record<string, string> = {
  목: "배우는 자리예요 — 학원·스터디·동호회",
  화: "사람이 모이는 밝은 자리예요 — 모임·행사·소개",
  토: "오래 머문 자리예요 — 직장·동네·아는 사람의 소개",
  금: "일로 엮이는 자리예요 — 업무·거래처·전문 모임",
  수: "물가나 늦은 시간, 또는 화면 너머예요",
};
function meetPlace(hint: string | undefined, ohKo: string): string {
  const h = (hint ?? "").trim();
  if (h && !PLACE_WARN.test(h)) {
    for (const [re, label] of PLACE_BY_WORD) if (re.test(h)) return label;
  }
  return PLACE_BY_OH[ohKo] ?? PLACE_BY_OH.토;
}

/** 가까워지는 속도 — 십이운성 **이름을 노출하지 않는다.**
 *  「병 — 천천히 깊어져요」에서 손님은 병(病)을 질병으로 읽는다(2026-08-29 형님 검수).
 *  단계는 뜻으로만 말한다. */
function meetSpeed(level: number): string {
  if (level >= 9) return "빠르게 데워져요";
  if (level >= 5) return "차근히 가까워져요";
  return "천천히 깊어져요";
}

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

  // 5章 「내게 올 사람」 **직전**에 짝 카드를 작게 다시 세운다 — 회수 루프를 잇는 자리.
  // 큰 카드는 결과지 머리(결제 직후 보상)에 그대로 두고, 여기서는 썸네일 + 세 값만 되짚는다.
  // 결혼 라인에는 얼굴을 안 쓴다(기혼·약혼 독자에게 역효과 — outline 이 정한 규칙 그대로).
  const before = (title: string) => {
    if (!inyeon || isMarriage) return null;
    if (!/내게 올 사람|함께할 사람/.test(title)) return null;
    const f = buildPartnerFace(inyeon);
    return (
      <PartnerRecall
        src={faceSrc(f.src, f.legacySrc)}
        ohKo={f.ohKo}
        keul={OH_TRAIT[f.ohKo]?.keul ?? "오래 가는 결"}
        ageDir={f.ageDir}
        // 표와 **같은 값**을 써야 한 장부 안에서 두 곳을 가리키지 않는다(회수 카드가 표를 되짚는 자리다)
        place={meetPlace(inyeon.meetHint, f.ohKo)}
      />
    );
  };
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
        <p className="font-brush text-[13px] tracking-[0.34em]" style={{ color: "#6B4C9A", opacity: 0.95 }}>
          織 女
        </p>
        {(() => {
          // 손으로 그린 레터링을 갖고 있으면서 시스템 폰트를 쓰고 있었다(자산 미사용).
          // 연애예보 전용 자산이라 결혼판은 기존 활자 그대로 둔다.
          // ⚠ lettering-yeonae-yebo.png 는 보라·형광 3D 게임 로고체다. 먹빛 담채 세계관과 어긋나
          //   붙였다가 되돌렸다(2026-08-25 화면 실측). 붓글씨 레터링을 새로 굽기 전까지 활자로 간다.
          const lettering: string | null = null;
          if (lettering) {
            return (
              <div className="mt-2">
                {who ? (
                  <p className="font-myeongjo text-[15px]" style={{ color: "#5B5470" }}>{who}님의</p>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lettering}
                  alt="연애예보"
                  draggable={false}
                  className="mx-auto mt-1 select-none"
                  style={{ width: "62%", maxWidth: 240, height: "auto" }}
                />
              </div>
            );
          }
          return (
            <h1 className="mt-2 font-myeongjo text-[24px] font-bold" style={{ color: "#2A2434" }}>
              {who ? `${who}님의 ` : ""}
              {isMarriage ? "결혼예보" : "연애예보"}
            </h1>
          );
        })()}
        <p className="mt-1.5 text-[12px]" style={{ color: "#6C6483" }}>
          만세력 계산 · 앞으로 열두 달
        </p>
      </div>

      {/* ── ⓪ 프롤로그 — 인사·물성·목차. 결제 직후 1초는 정보가 아니라 환대를 원한다 ── */}
      <Prologue who={who} chapters={chapters.map((c) => c.title)} />

      {/* 서사 도입 — 티저는 설화 4씬으로 직녀의 밤을 보여주는데, 결제하고 들어온 손님은
          인사 다음에 바로 목차였다. 청월당이 프롤로그 한 장을 통째로 서사에 쓰는 이유가 이것.
          j3 는 **인물이 작고 하늘이 주인공인 유일한 와이드 컷**인데 안 쓰고 있었다 —
          반신 컷만 이어지던 샷 리듬도 여기서 한 번 끊긴다. */}
      {/* ⚠ 대사는 **직녀가 손님에게 직접 하는 말**만 쓴다 — 3인칭 설정 소개 금지(2026-08-29 형님).
          예전 문장은 「직녀는 밤마다 여기 앉아…」였다. 화자가 갑자기 세계 밖 나레이터로 바뀌어
          직녀와 마주 앉은 프레임이 깨지고, 손님 정보가 0이라 와닿지도 않았다(설정은 티저 설화가 이미 함). */}
      {/* ⚠ 비율은 **컷마다 다르다** — 2:3 을 일괄로 쓰면 안 된다(2026-08-29 형님 검수).
          j3 는 하단이 빈 마루라 원본 그대로 두면 컷 아래 1/6 이 볼 것 없는 검정으로 남는다.
          실측(행별 디테일 std<6): **y=1276 = 83.1% 부터 죽은 공간.**
          4/5 + top 정렬이면 위 83.3% 만 남아 딱 그 자리가 잘린다.
          (같은 자로 전수 측정: w7 은 15% 가 죽었지만 그 자리를 말풍선이 덮어 실害 없음) */}
      <CutInterlude
        id="j3"
        say={who ? `${who}님 달력을 짜던 밤이에요.` : "그대의 달력을 짜던 밤이에요."}
        ratio="4 / 5"
        pos="center top"
        sfx="탁, 탁—"
      />

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
                    background: "#FDFAF1",
                    // 열린 달의 표식은 **금**이다 — 보라 테두리는 구 템플릿 색이라 한지 위에서 떴다.
                    // 달 그림 자체가 이미 금색이므로 테두리도 금이어야 한 덩어리로 읽힌다.
                    border: `1px solid ${big ? "#C2A35C" : "#E2D8BF"}`,
                    boxShadow: big ? "0 0 0 2px rgba(194,163,92,.22)" : undefined,
                  }}
                >
                  <p className="text-[12px] font-bold" style={{ color: big ? "#8A6A1E" : "#6C6483" }}>
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
                style={{ background: "#FDFAF1", border: "1px solid #E2D8BF" }}
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
                        style={{ background: "#F2E8CF", color: "#6B5420" }}
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

          {/* 빈 액자를 들어 보이는 컷 → 바로 다음이 얼굴 카드다. 「들어갈 자리」를 먼저 보여 주고
              얼굴을 여는 순서라, 결제의 회수 지점이 한 박자 늦춰지면서 더 세게 열린다 */}
          <CutSay id="N3" lines={["이 사람이에요.", "잘 봐 두세요."]} />

          {/* 표보다 **얼굴이 먼저** 온다 — 티저가 흐리게 예고한 게 얼굴이라, 결제의 회수도 얼굴이어야 한다 */}
          {(() => {
            const f = buildPartnerFace(inyeon);
            const src = faceSrc(f.src, f.legacySrc);
            if (!src) return null;
            return (
              <div className="mt-4">
                <FaceCard
                  src={src}
                  title="이런 결의 사람이에요"
                  why={
                    <>
                      배우자 자리가 <b style={{ color: "#8A6A1E" }}>{inyeon.spouseOh || "토"}</b>의 결 —
                      그 결을 그림으로 옮겼어요
                    </>
                  }
                  tone="best"
                />
                {/* 공유각 1순위 자산인데 유도가 없었다. 캡처가 단톡방에 돌면 낙관이 곧 광고다 */}
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span style={{ fontSize: 11.5, color: "#8A82A2" }}>이 카드, 캡처해서 간직하세요</span>
                  <span className="font-brush" style={{ fontSize: 11, color: "#A8842C", letterSpacing: "0.14em" }}>
                    · 명운록
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="mt-4 overflow-hidden rounded-[10px]" style={{ border: "1px solid #E2D8BF" }}>
            {[
              ["어떤 결", OH_TRAIT[inyeon.spouseOh]?.keul ?? "고르게 섞인 결"],
              ["태도", OH_TRAIT[inyeon.spouseOh]?.how ?? "서두르지 않고 꾸준해요"],
              ["인연의 성격", inyeon.spouseType === "정" ? "바르게 오래 가는 인연" : "강하게 끌리는 인연"],
              ["나이대", inyeon.ageDir],
              ["처음 마주치는 자리", meetPlace(inyeon.meetHint, inyeon.spouseOh || "토")],
              ["가까워지는 속도", meetSpeed(inyeon.iljiLevel)],
              ["첫 달", top3[0] ? `${top3[0].year}년 ${top3[0].month}월` : "—"],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="flex gap-3 px-3.5 py-2.5"
                style={{ background: i % 2 ? "#FDFAF1" : "transparent", borderTop: i ? "1px solid #E8DFC8" : undefined }}
              >
                <span className="w-[92px] flex-none text-[12px] font-bold" style={{ color: "#8A6A1E" }}>{k}</span>
                <span className="flex-1 text-[13px] leading-relaxed" style={{ color: "#332C4A" }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px]" style={{ color: "#8A82A2" }}>
            얼굴은 단정이 아니라 <b>명식의 결을 그린 것</b>이에요. 키·직업·사는 곳은 적지 않습니다 —
            명식으로 단정할 수 없는 건 쓰지 않아요.
          </p>

          {/* ── 멀리할 결 ──
              청월당 연애비책 5장 「운명일 줄 알았는데, 아닌 사람」의 우리 판(8/22 실측).
              좋은 것만 파는 상품보다 믿음이 간다 — 나쁜 소식을 같이 줘야 좋은 소식도 진짜로 읽힌다.
              밉게 그리지 않는다(생성 프롬프트도 "good-looking but emotionally distant"). */}
          {(() => {
            const w = buildWorstFace(inyeon);
            const src = assetSrc(w.src);
            if (!src) return null;
            return (
              <div className="mt-6 border-t pt-5" style={{ borderColor: "#E8DFC8" }}>
                <FaceCard
                  src={src}
                  title="반대로, 멀리할 결이에요"
                  why={
                    <>
                      {w.why} — {w.how}
                    </>
                  }
                  tone="worst"
                />
              </div>
            );
          })()}
        </Plate>
      )}

      {/* ── ④ 본문 10장 ── */}
      {intro && (
        <div style={{ ...hanjiCard, borderRadius: 16, borderTop: "1px solid rgba(107,76,154,.22)" }}>
          <ResultBody markdown={intro} tone="hanji" />
        </div>
      )}
      {chapters.map((c, i) => {
        // 크로스셀은 **읽는 도중 한 번만.** 청월당 실측 위치가 46·57·75·79·88% (평균 69%)였다.
        // 끝(100%)에 두면 이미 스크롤을 놓은 뒤다. 장 인덱스 0.62 → 실측 스크롤 70%대에 앉는다
        // (뒷장이 길어서 인덱스 비율보다 픽셀 비율이 뒤로 밀린다). 장이 3개도 안 되면 넣지 않는다.
        const crossAt = chapters.length >= 3 ? Math.floor(chapters.length * 0.62) : -1;
        // 章 사이 부품 — **제목으로 자리를 찾는다.** 인덱스로 박으면 장 수가 바뀔 때
        // (9장 → 10장 개편 같은 것) 전부 어긋난다. 린터가 같은 이유로 제목 매칭을 쓴다.
        const t = c.title;
        const after = !inyeon ? null
          : /인연 그릇|결혼 그릇/.test(t) ? (
              <>
                <CharmChips inyeon={inyeon} />
                {/* 칩 한 줄로 끝내던 신살을 문단으로 편다 — 값은 확정값에 이미 있다(LLM 0회) */}
                <CharmLore inyeon={inyeon} who={who} />
              </>
            )
          : /만나는 달|들어오는 달|결혼하는 해/.test(t) ? (
              <>
                <MonthCards rows={inyeon.top3} />
                {/* 좋은 달 셋만 주고 나머지 아홉 달을 버리고 있었다 — 값은 이미 계산돼 있다(LLM 0회) */}
                <MonthLedger rows={inyeon.months} />
              </>
            )
          : /신호/.test(t) ? <SignalCards inyeon={inyeon} />
          : /조심할 달|피해야 할|흔들리/.test(t) ? <ShakyCards rows={inyeon.shaky} />
          // 컷 다음에 **검증**을 세운다 — 이 장만 손님이 채점할 수 있는 장이다(과거는 이미 살아 봤다).
          // 결과지 전체에서 유일한 인터랙션이라, 순서는 「직녀가 한마디 → 손님이 대답」이어야 한다.
          : /걸어온 길/.test(t) ? (
            <>
              <CutInterlude id="w6" say="몰라서 지나갔을 뿐이에요." sfx="사락—" />
              <PastCheck who={who} />
            </>
          )
          // 놓치는 패턴 장은 컷이 없었다. j2 는 **유일한 옆모습**(종이를 내려다보는 조용한 얼굴)이라
          // 「지나간 것을 들여다본다」와 맞고, 정면 반신만 이어지던 감정도 한 번 갈린다
          : /놓치는 패턴|늦어지는 이유/.test(t) ? <CutInterlude id="j2" say="여기까지가 지나온 자리예요." ratio="2 / 3" pos="center" />
          // 「판이 바뀌는 해」에는 인물이 아니라 하늘이 맞다. w1(은하수)보다 **t3(까치다리가 놓인 밤)**이
          // 낫다 — 설화를 회수하고, 「건널 수 없던 것을 건너는 해」라는 뜻이 그림 자체에 있다.
          // (t2 는 같은 풍경의 어두운 판이라 한 쌍이다 — 대구가 필요해지면 조심할 달에 쓴다)
          // 설화 설명("일 년에 한 번 다리가 놓여요")이 아니라 **손님에게 짚어 주는 말**로 옮겼다
          : /크게 바뀌는 해/.test(t) ? <CutInterlude id="t3" say={who ? `${who}님께 다리가 놓이는 해예요.` : "다리가 놓이는 해예요."} ratio="2 / 3" pos="center" sfx="푸드득—" />
          // 확답 장 뒤에 확신하는 얼굴. 말과 표정이 같은 자리에서 만나야 답이 무겁게 읽힌다.
          // 인물 컷은 **원본 2:3 그대로** — 3:2 로 자르면 얼굴만 남고 몰입이 안 산다(형님 8/28)
          : /고민|물음/.test(t) ? <CutInterlude id="w3" say="제가 아는 건 여기까지예요. 그리고 이건 확실해요." ratio="2 / 3" pos="center" />
          : null;
        return (
          <Fragment key={i}>
            {before(t)}
            <ChapterGate no={i + 1} title={c.title} id={`ch-${i}`} />
            <div id={`ch-body-${i}`} style={{ ...hanjiCard, ...chapterMood(t), marginTop: 0 }}>
              {/* 장 머리에서 직녀가 한마디 — 지금 무엇을 볼지 쉬운 말로 예고한다(청월당 밀도) */}
              <ChapterSay title={c.title} who={who} />
              <ResultBody markdown={c.body} tone="hanji" />
            </div>
            {after}
            {/* 크로스셀 2회 — 청월당은 연애 장 안에 두 개를 넣는다. 5章(짝 얘기) 직후가 관심 최고점 */}
            {(i === crossAt || /내게 올 사람|함께할 사람/.test(t)) && <ResultCrossSell to="sangun" />}
          </Fragment>
        );
      })}

      {/* 배웅 — 편지 바로 앞. 돌아보며 눈을 맞추는 컷이라 「저는 여기 있을게요」와 붙는다.
          마지막 10초가 후기·공유 직전 감정이라 여기에 사람 얼굴이 있어야 한다 */}
      <CutInterlude id="w5" say="여기까지 같이 왔네요." ratio="2 / 3" pos="center" />

      {/* 마치며 — 3사 공통 표준. 낙관(도장) 앞에 편지가 와야 순서가 맞다 */}
      <ClosingLetter who={who} nearest={top3[0] ?? null} />

      {/* 기록 완료 낙관 — 본문 끝. 도장을 찍고 나서 후기를 묻는다 */}
      <ResultSealOff at={recordedAt} tone="night" />

      {/* 후기 — 손님 1~10호가 평생 유일한 후기 원천이다 */}
      {reviewOrderId && <ResultReviewCTA orderId={reviewOrderId} tone="night" />}
    </div>
  );
}
