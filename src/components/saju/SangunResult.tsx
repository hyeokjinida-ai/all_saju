// =====================================================
// 박수무당 사주 전용 결과지 — 검정+금(신당 세계관) 조판.
// =====================================================
// 타이트 결과지 실측(2026-08-03)의 결론: 그들의 진짜 상품은 글이 아니라 조판이다.
// 표지 → 챕터 간지 → 글·그림 교차 → 오행색 원국 카드 → 형광펜. 글만 뽑으면 평범한 해설이고
// 값어치는 조판이 만든다. 우리는 분량(2,900자)으로 못 이기지만 조판은 가진 부품으로 따라잡는다.
//
// 보라색 SAJU LAB 결과지(ResultScroll)를 산군에 그대로 쓰면 결제 직전까지 쌓은 검정+금+반말
// 세계관이 결과지에서 끊긴다 — 웹툰 말풍선 때와 같은 병. 그래서 상품 전용 조판을 따로 둔다.

import fs from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { makeMarkdownComponents, markdownComponents } from "./ResultBody";
import { splitChapters } from "./ResultChapters";
import { ResultCrossSell } from "./ResultCrossSell";
import { ResultReviewCTA } from "./ResultReviewCTA";
import { ResultSealOff } from "./ResultSealOff";
import { PillarChart } from "./PillarChart";
import { SangunNote, SangunNudge, SangunPrologue, SangunSay, SayPlate, SANGUN_VOICE } from "./SangunInterlude";
import { DAEUN_NOTE, ilganNote } from "@/lib/saju/sangun-notes";
import { SANGUN_JANG, type ChartRow } from "@/lib/saju/teaser";
import { plainName } from "@/lib/saju/display-name";
import type { ResultView } from "@/lib/saju/result-view";
import { buildPartnerFace, type PartnerFace } from "@/lib/saju/partner-face";
import type { WealthFacts, WealthMonth, InyeonFacts, DaeunRow } from "@/lib/saju/saju-api";
import type { Prescription } from "@/lib/saju/prescription";

const GOLD = "#e8c96a";
const GOLD_SOFT = "rgba(232,201,106,0.75)";
const GOLD_PALE = "rgba(232,201,106,0.25)";
const HANJI = "#efe6d2";
const RED = "#8f2b1e";

/** 장부 한 장 — 어두운 신당 위에 놓인 종이.
 *
 *  왜 본문만 밝히나: 청월당·타이트 유료 결과지는 **간지만 어둡고 본문은 밝다.** 13,000자를
 *  밤 판에 계속 얹으면 눈이 먼저 지친다. 그렇다고 직녀처럼 전부 밝히면(명:암 88:12) 신점의
 *  어둠이 사라진다 — 산군의 답은 「어두운 신당 안, 촛불에 비친 밝은 장부 한 장」이다.
 *  그래서 무대(표지·간지·컷·표)는 밤, **읽는 면만** 종이로 간다.
 *
 *  종이는 이미지 없이 만든다(자산 0바이트·요청 0건). 위가 촛불에 밝고 아래로 그늘진다. */
const HANJI_PAGE: React.CSSProperties = {
  background:
    "radial-gradient(120% 70% at 50% 0%, rgba(255,252,240,0.78), rgba(255,252,240,0) 62%), linear-gradient(180deg,#efe5cd 0%,#e6dabd 100%)",
  borderTop: "1px solid rgba(143,43,30,0.20)",
  borderBottom: "1px solid rgba(143,43,30,0.20)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  // ⚠ 종이 위에서 금은 안 보인다(#e8c96a on #e6dabd = 대비 1.6). 공용 부품(불릿·구분선·인용
  //   테두리)이 전부 var(--gold-*) 를 쓰므로, 카드 안에서만 **붉은 먹으로 갈아 끼운다.**
  //   이러면 ResultBody 마크업을 한 줄도 안 고치고 종이 판에서 살아난다.
  ["--gold" as string]: "#8f2b1e",
  ["--gold-bright" as string]: "#7a2418",
  ["--gold-soft" as string]: "#a4512f",
  ["--gold-pale" as string]: "rgba(143,43,30,0.16)",
  ["--gold-line" as string]: "rgba(143,43,30,0.28)",
};

/** 종이 판 위의 본문 — 먹빛 글자 + 붉은 형광(ResultBody 의 ink 톤). */
const inkComponents = makeMarkdownComponents("ink");

/** 표지 이미지 — cover.webp 가 오기 전엔 제단 그림으로 내려앉는다(화면이 비면 안 된다) */
function coverSrc(): string {
  const p = path.join(process.cwd(), "public", "products", "sangun", "cover.webp");
  return fs.existsSync(p) ? "/products/sangun/cover.webp" : "/products/sangun/altar.webp";
}

/** public 에 그 파일이 실제로 있는지 — 없으면 null. 아직 안 온 이미지(얼굴 10장·신규 컷)를
 *  깨진 아이콘으로 보여주지 않고 조용히 건너뛰기 위한 것. 표지와 같은 방식(서버에서 판정). */
function assetSrc(src: string): string | null {
  const p = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  return fs.existsSync(p) ? src : null;
}

/** 장 머리에 세우는 웹툰 컷 + 말풍선 — 타이트 결과지 실측(8-2)의 「웹툰 컷 + 말풍선」 자리.
 *
 *  그들의 진짜 상품은 글이 아니라 조판이고, 14,000자를 끝까지 읽히게 하는 건 이 리듬이다.
 *  글 → 그림 → 표 → 글 로 숨을 끊어 줘야 긴 결과지가 벽으로 안 읽힌다.
 *  티저 컷과 같은 옷(한지 말풍선 + 붉은 「산군」 배지)이라 결제 전후 세계관이 이어진다. */
function ResultCut({ src, alt, say, pos = "center 35%" }: { src: string; alt: string; say: string; pos?: string }) {
  const ok = assetSrc(src);
  if (!ok) return null; // 아직 안 온 컷(money·close)은 그 자리만 조용히 비운다
  return (
    // 본문 패딩(px-4=16)을 되물려 컬럼 끝까지 채운다 — 판 패딩을 바꾸면 이 값도 같이 바꿔야 한다.
    <div className="relative -mx-4 mt-7 h-[220px] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ok}
        alt={alt}
        className="h-full w-full select-none object-cover"
        loading="lazy"
        draggable={false}
        style={{ objectPosition: pos }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(0deg,rgba(8,7,6,0.66) 0%,rgba(8,7,6,0.15) 42%,rgba(8,7,6,0) 64%)" }}
      />
      <div className="absolute inset-x-4 bottom-3.5 z-10">
        <SayPlate say={say} />
      </div>
    </div>
  );
}

/** 짝의 얼굴 — 결제 전 티저에서 흐리게 보여준 **그 장**을 여기서 연다.
 *
 *  티저와 결과지가 같은 계산(buildPartnerFace)으로 같은 파일을 집기 때문에 얼굴이 바뀌지 않는다.
 *  여기서 하는 일은 두 가지뿐이다 — 블러를 걷고, 가려뒀던 네 줄을 실제 값으로 채운다.
 *  결제의 회수 지점이라 인연 章에서 제일 먼저 세운다(손님의 마지막 기억이 이 카드다). */
function PartnerCard({ face, meetMonth, ageDir }: { face: PartnerFace; meetMonth: string; ageDir: string }) {
  const src = assetSrc(face.src);
  const rows: [string, string][] = [
    ["만나는 시기", meetMonth || "아래 인연의 달력 참고"],
    ["외모", face.look],
    ["성격", face.nature],
    ["만나는 자리", face.place],
    ["나이대", ageDir],
  ];
  return (
    <div
      className="mt-6 px-5 pb-5 pt-5"
      style={{
        backgroundImage: "url(/products/sangun/ganji.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0c0a08",
        border: `1px solid ${RED}`,
      }}
    >
      <p className="font-myeongjo text-center text-[11px] tracking-[0.15em]" style={{ color: GOLD_SOFT }}>
        네 운명의 상대
      </p>
      <div className="relative mx-auto mt-3.5 h-[212px] w-[168px] overflow-hidden" style={{ background: "#151009", border: `1px solid ${GOLD_PALE}` }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full select-none object-cover" draggable={false} />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(42% 26% at 50% 28%, rgba(210,190,160,0.5), rgba(21,16,9,0) 70%), radial-gradient(72% 42% at 50% 80%, rgba(210,190,160,0.35), rgba(21,16,9,0) 70%), #151009",
              filter: "blur(6px)",
            }}
          />
        )}
      </div>
      <div className="mt-4">
        {rows.map(([label, val], i) => (
          <div
            key={label}
            className="py-2"
            style={{ borderTop: i === 0 ? "none" : `1px solid ${GOLD_PALE}` }}
          >
            <span className="font-myeongjo block text-[11px] tracking-[0.08em] text-bone-faint">{label}</span>
            <span className="font-myeongjo mt-0.5 block text-[14px] leading-[1.7]" style={{ color: HANJI }}>
              {val}
            </span>
          </div>
        ))}
      </div>
      {/* 얼굴을 고른 근거 — 티저 카드에 적힌 글자와 **같은 글자**여야 한다(다르면 그 자리에서 들통난다) */}
      <p className="font-myeongjo mt-3 text-center text-[10.5px] leading-[1.6] text-bone-faint">
        네 배우자 자리는 <span style={{ color: GOLD_SOFT }}>{face.ohKo}</span>의 결 — 그 결로 얼굴을 골랐다
      </p>
      {/* 캡처 유도 — 타이트 실측에서 이 카드가 «스크린샷 찍어 공유하고 싶어지는 유일한 컷»이다.
          웹 전용 자산이라 PDF 로는 못 가져간다 — 그러니 여기서 담아 가라고 말해 준다. */}
      <SangunNudge>이 얼굴은 네 장부에만 있다. 화면째 담아 둬라.</SangunNudge>
    </div>
  );
}

/** 챕터 간지 — 티저 4章 카드와 같은 옷(ganji.webp + 붉은 배너 + 태그). "약속대로 왔다"의 장치 */
function Ganji({ no, tag, line }: { no: string; tag?: string; line: string }) {
  return (
    <div
      className="mt-8 px-4 pb-7 pt-7 text-center"
      style={{
        backgroundImage: "url(/products/sangun/ganji.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0c0a08",
        border: `1px solid ${GOLD_PALE}`,
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className="font-brush px-3 pb-1 pt-1.5 text-[17px] leading-none tracking-[0.28em]"
          style={{ background: "#7a2317", color: "#f3e6cf", textIndent: "0.28em" }}
        >
          {no}章
        </span>
        {tag && (
          <span
            className="font-myeongjo px-2 py-1 text-[11px] tracking-[0.08em]"
            style={{ border: "1px solid rgba(232,201,106,0.45)", color: GOLD_SOFT }}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="font-myeongjo mt-3 text-[15.5px] font-bold leading-snug" style={{ color: HANJI }}>
        {line}
      </p>
    </div>
  );
}

/** 달력 표 — 타이트 「대박 타이밍」 표의 우리 판. 그들은 연 단위뿐이지만 우리는 달을 적는다.
 *  달별 점수·대길/대흉 판정값은 내부 계산값이라 안 보여준다(결과지 문체 규칙과 동일).
 *  값은 프롬프트에 들어간 확정값과 같은 계산(computeWealthFacts/computeInyeonFacts)에서 온다 —
 *  본문과 표가 다른 달을 말하면 그 자리에서 신뢰가 끝난다. */
function MonthTable({
  title,
  score,
  rows,
  nudge,
}: {
  title: string;
  score: number;
  rows: { kind: string; label: string }[];
  /** 표 아래 한마디 — 달을 «읽고 끝»이 아니라 «옮겨 적게» 만든다(재열람의 씨앗) */
  nudge?: string;
}) {
  if (!rows.length) return null;
  return (
    <>
    <div className="mt-5" style={{ border: `1px solid ${GOLD_PALE}` }}>
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: "rgba(232,201,106,0.08)", borderBottom: `1px solid ${GOLD_PALE}` }}
      >
        <span className="font-myeongjo text-[13px] font-bold" style={{ color: HANJI }}>
          {title}
        </span>
        <span className="font-myeongjo text-[13px] font-bold" style={{ color: GOLD }}>
          그릇 {score}점
        </span>
      </div>
      {rows.map((r, i) => (
        // 경고 줄(새는 달·흔들리는 달)만 붉게 — 라벨과 값만이고 본문 문장은 안 건드린다.
        // 결과지 톤 규칙이 "겁주지 말고 대처로 감싼다"라 문단까지 붉으면 불안 조장 톤이 된다.
        (() => {
          const warn = /새는|흔들리는|조심/.test(r.kind);
          return (
            <div
              key={i}
              className="flex items-center justify-between px-3.5 py-2.5"
              style={{ borderTop: i === 0 ? "none" : `1px solid rgba(232,201,106,0.12)` }}
            >
              <span className="font-myeongjo text-[13px]" style={{ color: warn ? "rgba(216,140,120,0.9)" : undefined }}>
                <span className={warn ? "" : "text-bone-faint"}>{r.kind}</span>
              </span>
              <span className="font-myeongjo text-[13px] font-bold" style={{ color: warn ? "#e8695a" : HANJI }}>
                {r.label}
              </span>
            </div>
          );
        })()
      ))}
    </div>
    {nudge && <SangunNudge>{nudge}</SangunNudge>}
    </>
  );
}

/** 9장 시절(2026-08-08 이전 결제분)의 章 배치 — 이미 산 손님의 재열람이 걸려 있어 지우면 안 된다.
 *  SANGUN_JANG.chapterIdx 는 11장 기준으로 바뀌었으므로, 옛 결과지는 이 표로 갈라 담는다. */
const LEGACY_JANG_IDX: Record<string, number[]> = {
  一: [0, 1],
  二: [2, 4],
  三: [3, 5],
  四: [6, 7, 8],
};

// 11장이 되면서 "一二三四五六七八九"[idx] 한 글자 인덱싱이 十(10)·十一(11)에서 깨진다 — 배열로.
const CHAPTER_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一"];

/** 대운 연대기 — '네가 걸어온 길' 장 머리. 인생 전체가 한 표에 걸리는 자리라 행이 많아도 줄이지 않는다.
 *  유불리(favor)는 본문·대운 곡선과 같은 잣대(computeDaeunTimeline)라 서로 다른 판정이 나올 수 없다. */
function DaeunTimelineTable({ rows }: { rows: DaeunRow[] }) {
  return (
    <div className="mt-5" style={{ border: `1px solid ${GOLD_PALE}` }}>
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: "rgba(232,201,106,0.08)", borderBottom: `1px solid ${GOLD_PALE}` }}
      >
        <span className="font-myeongjo text-[13px] font-bold" style={{ color: HANJI }}>
          네 대운 연대기
        </span>
        <span className="font-myeongjo text-[11px]" style={{ color: GOLD_SOFT }}>
          10년마다 판이 바뀐다
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-3.5 py-2"
          style={{
            borderTop: i === 0 ? "none" : "1px solid rgba(232,201,106,0.12)",
            background: r.when === "now" ? "rgba(143,43,30,0.14)" : undefined,
          }}
        >
          <span className="font-myeongjo w-[64px] shrink-0 text-[12px] text-bone-faint">{r.range}</span>
          <span className="font-brush w-[44px] shrink-0 text-[15px]" style={{ color: r.when === "now" ? GOLD : GOLD_SOFT }}>
            {r.ganji}
          </span>
          <span className="font-myeongjo grow text-[12px] leading-[1.6]" style={{ color: r.when === "past" ? "rgba(239,230,210,0.55)" : HANJI }}>
            {r.line}
          </span>
          {r.when === "now" && (
            <span className="font-myeongjo shrink-0 px-1.5 py-0.5 text-[10px]" style={{ background: "#7a2317", color: "#f3e6cf" }}>
              지금
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** 산군의 처방 — 용신/기신 생활 조견표. 해라/피해라 2열(타이트 처방표 대응). */
function PrescriptionTable({ p }: { p: Prescription }) {
  return (
    <div className="mt-5" style={{ border: `1px solid ${GOLD_PALE}` }}>
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: "rgba(232,201,106,0.08)", borderBottom: `1px solid ${GOLD_PALE}` }}
      >
        <span className="font-myeongjo text-[13px] font-bold" style={{ color: HANJI }}>
          산군의 처방
        </span>
        <span className="font-myeongjo text-[11px]" style={{ color: GOLD_SOFT }}>
          네게 이로운 결 {p.yongKo}
          {p.giKo ? ` · 누를 결 ${p.giKo}` : ""}
        </span>
      </div>
      {p.rows.map((r, i) => (
        <div key={r.label} className="px-3.5 py-2.5" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(232,201,106,0.12)" }}>
          <span className="font-myeongjo block text-[11px] tracking-[0.08em] text-bone-faint">{r.label}</span>
          <div className="mt-1 space-y-0.5">
            <p className="font-myeongjo text-[13px] leading-[1.65]" style={{ color: HANJI }}>
              <span style={{ color: GOLD_SOFT }}>해라</span> — {r.do_}
            </p>
            <p className="font-myeongjo text-[13px] leading-[1.65]" style={{ color: "rgba(216,140,120,0.9)" }}>
              <span style={{ color: "#e8695a" }}>피해라</span> — {r.avoid}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SangunResult({
  view,
  markdown,
  name,
  wealth,
  inyeon,
  chartRows,
  wealthYears,
  daeunTimeline,
  prescription,
  reviewOrderId = null,
  recordedAt = null,
  concern = null,
}: {
  view: ResultView;
  markdown: string;
  name: string | null;
  wealth: WealthFacts | null;
  inyeon: InyeonFacts | null;
  /** 십성·12운성 줄 — raw_analysis 에서 buildChartRows 로. 없으면(옛 결과지) 한자 판만 선다 */
  chartRows?: ChartRow[];
  /** 크게 벌리는 해 — 돈의 달력 아래 합류(computeWealthYears) */
  wealthYears?: WealthMonth[] | null;
  /** 대운 연대기 — '네가 걸어온 길' 장 머리(computeDaeunTimeline) */
  daeunTimeline?: DaeunRow[] | null;
  /** 용신 처방 — '산군의 처방' 장 머리(computePrescription) */
  prescription?: Prescription | null;
  /** 후기 자격이 있을 때만(로그인 회원 주문). 게스트는 null */
  reviewOrderId?: string | null;
  /** 결과 생성일(ISO) — 맺음 낙관에 찍는다 */
  recordedAt?: string | null;
  /** 손님이 적어 온 고민 원문 — 프롤로그 차례에 「네 물음 여기」 뱃지와 함께 되비춘다.
   *  [프로필] 태그는 고민이 아니라 상황 정보라 호출부에서 걸러 넘긴다. */
  concern?: string | null;
}) {
  const { intro, chapters } = splitChapters(markdown);
  const who = plainName(name, "");
  // 4章 간지는 9장(구)·11장(신) 결과지에서만 — 그 외 구성은 간지 없이 순서대로 폴백
  const useJang = chapters.length === 9 || chapters.length === 11;
  const jangIdx = (no: string, idx11: number[]) => (chapters.length === 11 ? idx11 : LEGACY_JANG_IDX[no] ?? idx11);
  // 표를 어느 장 앞에 세울지는 **챕터 제목**으로 찾는다 — 장 번호를 박으면 구/신 구성에서 어긋난다.
  const titleOf = (idx: number) => chapters[idx]?.title ?? "";

  // 한자 장번호는 **화면에 서는 차례**로 매긴다.
  // 章 그룹핑이 주제별이라(二=돈[3,5] · 三=인연[4,6]) 목차 인덱스를 그대로 쓰면
  // 손님 눈에는 四 → 六 → 五 → 七 로 번호가 거꾸로 흐른다(2026-08-29 실측).
  // 손님은 목차 번호를 모르고 읽는 순서만 보므로, 보이는 대로 다시 센다.
  const readOrder = (useJang ? SANGUN_JANG.flatMap((j) => jangIdx(j.no, j.chapterIdx)) : chapters.map((_, i) => i))
    .filter((idx) => chapters[idx]);
  const displayNo = new Map<number, number>();
  readOrder.forEach((idx, pos) => displayNo.set(idx, pos + 1));
  const numOf = (idx: number) => CHAPTER_NUM[(displayNo.get(idx) ?? idx + 1) - 1] ?? "";

  // 프롤로그 차례 — 읽는 순서 그대로. 제목 앞 「4. 」 번호는 한자 번호와 겹치므로 뗀다.
  const tocEntries = readOrder.map((idx) => ({
    idx,
    no: numOf(idx),
    title: chapters[idx].title.replace(/^\d+\.\s*/, ""),
    isConcern: /물음|고민/.test(chapters[idx].title),
  }));

  // 물성 — **계산한 실값만** 적는다(타이트는 실측의 2~5배로 부풀렸다).
  // 자수는 판매 카피와 같은 자로 센다: 헤딩을 뺀 본문의 **한글 음절**
  // (SangunSalesBlocks 2026-08-17 정정 주석 — 렌더 화면 글자수를 세면 표·라벨까지 섞여 부풀려진다).
  const charCount = markdown.replace(/^#{1,3}\s.*$/gm, "").replace(/[^가-힣]/g, "").length;
  const monthCount = new Set(
    [
      ...(wealth?.top ?? []).map((m) => m.label),
      ...(wealth?.bad ?? []).map((m) => m.label),
      ...(inyeon?.top3 ?? []).map((m) => m.label),
      ...(inyeon?.shaky ?? []).map((m) => m.label),
    ].filter(Boolean),
  ).size;

  // 산군의 주석 — 손님의 일간 하나를 골라 1장 끝에 붙인다(LLM 0원 · 개인화는 «고르기»뿐).
  const ilgan = ilganNote(view.pillars.find((p) => p.isDay)?.gan.char);

  // 년→월→일→시 읽기 순서. 시 모름이면 시주가 "?" 로 오므로 티저와 같은 조건으로 뺀다.
  const shown = view.pillars.slice().reverse().filter((p) => p.gan.char !== "?");

  const wealthRows = wealth
    ? [
        ...wealth.top.map((m) => ({ kind: "돈이 드는 달", label: m.label })),
        ...wealth.bad.map((m) => ({ kind: "새는 달", label: m.label })),
        // 연 단위 피크 — 본문(크게 바뀌는 해 장)과 같은 계산값(computeWealthYears)
        ...(wealthYears ?? []).map((y) => ({ kind: "크게 벌리는 해", label: y.label })),
      ]
    : [];
  const inyeonRows = inyeon
    ? [
        ...inyeon.top3.map((m) => ({ kind: "인연이 드는 달", label: m.label })),
        ...inyeon.shaky.slice(0, 1).map((m) => ({ kind: "마음이 흔들리는 달", label: m.label })),
        ...inyeon.topYears.slice(0, 1).map((y) => ({ kind: "크게 바뀌는 해", label: y.label })),
      ]
    : [];

  // 챕터 앞 여백은 **문단 사이보다 확실히 커야** 새 장이 시작된 게 느껴진다.
  // 실측(2026-08-06): 문단 사이 28px인데 챕터 앞이 38px이라 챕터가 문단처럼 읽혔다.
  // mt-12(48px) 로 벌리면 시각 공백 62px ≈ 문단 사이의 2.2배가 된다.
  // 단, 章 간지 카드 바로 다음 챕터는 카드가 이미 갈라 주므로 mt-6 을 유지한다(과하면 카드와 따로 논다).
  const chapterBlock = (idx: number, firstInJang = false) => {
    const c = chapters[idx];
    if (!c) return null;
    return (
      // id 는 프롤로그 「장부의 차례」가 눌러 오는 자리 — 상단이 잘리지 않게 여백을 준다.
      <section key={idx} id={`jang-${idx}`} className={firstInJang ? "mt-6" : "mt-12"} style={{ scrollMarginTop: 14 }}>
        {/* 본문 패딩(px-4)을 되물려 종이가 판 끝까지 깔린다 — 읽는 폭을 한 뼘도 안 버린다 */}
        <div className="-mx-4 px-4 pb-7 pt-6" style={HANJI_PAGE}>
          <h3
            className="font-myeongjo flex items-baseline gap-2.5 text-[19px] font-semibold leading-snug"
            style={{ color: "#1a1309" }}
          >
            <span className="font-brush shrink-0 text-[20px]" style={{ color: RED }}>
              {numOf(idx)}
            </span>
            {/* 제목 앞 「6. 」은 목차 순서 번호다. 한자 번호를 읽는 차례로 다시 매긴 뒤로는
                둘이 어긋나 보인다(실측: 「五 6. 일과 자리」 · 「六 5. 인연」) — 아라비아는 뗀다. */}
            <span>{c.title.replace(/^\d+\.\s*/, "")}</span>
          </h3>
          <div className="font-myeongjo mt-1">
            <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={inkComponents}>
              {c.body}
            </ReactMarkdown>
          </div>
        </div>
      </section>
    );
  };

  return (
    // world-sangun: 결과지도 같은 토큰 덮개를 쓴다 — 마크다운 본문(markdownComponents)이
    // 공용 보라 색을 쓰고 있어서, 이게 없으면 결제 후 본문만 보라로 돌아간다.
    <div className="world-sangun" style={{ background: "#0a0908", border: `1px solid ${GOLD_PALE}` }}>
      {/* ── 표지 — 타이트는 표지 한 장으로 "책을 받았다"는 실감을 만든다 ── */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* 표지 원본은 2:3 전신 컷인데 틀은 420×420 정사각이다. 가운데로 자르면 갓이 잘리고
            도포 몸통만 남는다 — 위쪽으로 당겨 갓·어깨가 들어오게 한다(아래는 어두워 제목이 읽힌다). */}
        <img
          src={coverSrc()}
          alt=""
          className="h-[420px] w-full select-none object-cover"
          draggable={false}
          style={{ objectPosition: "center 24%" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(10,9,8,0.45) 0%,rgba(10,9,8,0.05) 40%,rgba(10,9,8,0.92) 88%)" }}
        />
        <div className="absolute inset-x-0 bottom-6 text-center">
          <p className="font-myeongjo text-[11px] tracking-[0.3em]" style={{ color: GOLD_SOFT }}>
            命運錄 · 신당
          </p>
          {who && (
            <p className="font-brush mt-2 text-[34px] leading-none" style={{ color: HANJI }}>
              {who}
            </p>
          )}
          <p className="font-myeongjo mt-2 text-[16px] font-bold" style={{ color: GOLD }}>
            산군이 읽은 운명 장부
          </p>
          {view.birthLine && (
            <p className="font-myeongjo mt-1.5 text-[11px] text-bone-faint">{view.birthLine}</p>
          )}
        </div>
      </div>

      <div className="px-4 pb-8 pt-2">
        {/* ── 개봉 의식 — 산군이 먼저 말을 걸고, 받은 물건의 크기를 적고, 차례를 편다.
            여기가 없던 시절엔 표지 다음이 곧장 1장이라 «뭘 받았는지 모른 채» 읽기 시작했다. ── */}
        {tocEntries.length > 0 && (
          <SangunPrologue
            who={who || null}
            entries={tocEntries}
            charCount={charCount}
            monthCount={monthCount}
            concern={concern}
          />
        )}

        {/* ── 원국 — 티저와 **같은 판**(PillarChart). 결제 전엔 십성·12운성이 붙어 있었는데
            결제 후에 한자만 남으면 돈 내고 정보가 줄어든 셈이 된다 — 같은 컴포넌트로 통일 ── */}
        {shown.length > 0 && (
          <div className="mt-5">
            <p className="font-myeongjo text-center text-[11px] tracking-[0.16em] text-bone-faint">
              네 {shown.length === 3 ? "여섯" : "여덟"} 글자
            </p>
            <PillarChart shown={shown} rows={chartRows ?? []} />
          </div>
        )}

        {intro && (
          <div className="font-myeongjo mt-4">
            <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={markdownComponents}>
              {intro}
            </ReactMarkdown>
          </div>
        )}

        {useJang ? (
          SANGUN_JANG.map((j) => (
            <div key={j.no}>
              <Ganji no={j.no} tag={j.tag} line={j.teaseResult} />
              {/* 달력 표는 해당 章 머리에 — 본문이 말하는 달과 같은 계산값이라 표가 예고, 본문이 해설이 된다 */}
              {j.no === "二" && wealth && (
                <MonthTable
                  title="돈의 달력"
                  score={wealth.score}
                  rows={wealthRows}
                  nudge="이 달들은 네 달력에 옮겨 적어 둬라. 그달이 오거든 이 장부를 다시 펴 보면 안다."
                />
              )}
              {/* 인연 章은 얼굴부터 — 티저에서 흐리게 본 카드가 여기서 열리는 게 결제의 회수다 */}
              {j.no === "三" && inyeon && (
                <PartnerCard
                  face={buildPartnerFace(inyeon)}
                  meetMonth={inyeon.top3[0]?.label ?? ""}
                  ageDir={inyeon.ageDir}
                />
              )}
              {j.no === "三" && inyeon && (
                <MonthTable
                  title="인연의 달력"
                  score={inyeon.score}
                  rows={inyeonRows}
                  nudge="붉게 적힌 달은 겁낼 게 아니라 미리 아는 달이다. 같이 적어 둬라."
                />
              )}
              {jangIdx(j.no, j.chapterIdx).map((idx, i) => {
                // 타이트 8-2 리듬: 컷(그림+말) → 표(개인화 그래픽) → 본문. 그림이 먼저 와야
                // 장이 바뀐 게 눈으로 먼저 읽힌다.
                // 컷이 없는 장(올해·조심할 달·네 물음·당부)에서도 산군이 말을 건다 —
                // 말을 거는 장만 말을 걸면 나머지 장에서 화자가 사라져 동행 감각이 끊긴다.
                const v = SANGUN_VOICE.find((c) => c.match.test(titleOf(idx)));
                return (
                  <div key={idx}>
                    {v?.src ? (
                      <ResultCut src={v.src} alt={v.alt ?? ""} say={v.say} pos={v.pos} />
                    ) : v ? (
                      <SangunSay say={v.say} />
                    ) : null}
                    {/* 장 전용 표는 챕터 제목으로 찾아 그 장 바로 앞에 — 9장(구) 결과지엔 이 장이 없어 자연히 안 선다 */}
                    {/걸어온 길/.test(titleOf(idx)) && daeunTimeline?.length ? <DaeunTimelineTable rows={daeunTimeline} /> : null}
                    {/산군의 처방/.test(titleOf(idx)) && prescription ? <PrescriptionTable p={prescription} /> : null}
                    {chapterBlock(idx, i === 0)}
                    {/* 장 끝 읽을거리 — 청월당은 여기에 4,000px 짜리 상식란을 둔다.
                        1장(그릇)엔 일간 주석, 2장(걸어온 길)엔 대운 주석. 둘 다 토큰 0. */}
                    {/그릇부터/.test(titleOf(idx)) && ilgan ? <SangunNote note={ilgan} /> : null}
                    {/걸어온 길/.test(titleOf(idx)) && daeunTimeline?.length ? <SangunNote note={DAEUN_NOTE} /> : null}
                  </div>
                );
              })}
              {/* 크로스셀 — 인연 章이 끝나는 자리. 청월당 유료 결과지 실측(2026-08-22)에서
                  배너가 전부 46~88% 구간에 있었다(끝에 두면 이미 스크롤을 놓은 뒤다).
                  三 章 직후는 **방금 PartnerCard 로 짝의 얼굴을 본 직후**라,
                  "그래서 몇 월에 만나나"가 손님 머릿속에 이미 떠 있는 유일한 지점이다. */}
              {j.no === "三" && <ResultCrossSell to="inyeon" />}
            </div>
          ))
        ) : (
          // 9/11챕터가 아니면(다른 구성) 간지 없이 순서대로
          chapters.map((_, i) => chapterBlock(i))
        )}

        {/* 맺음 컷 — 장부를 덮고 낙관을 찍는 손. "다시 열어라"가 재열람 루프의 씨앗이고,
            나중에 후기·추가질문 버튼이 이 자리 아래 붙는다. */}
        <ResultCut
          src="/products/sangun/close.webp"
          alt="장부의 마지막 장에 붉은 낙관을 찍는 손"
          say="여기까지가 네 장부다. 적어 준 달이 오거든 다시 열어봐라."
          pos="center 45%"
        />

        {/* 기록 완료 낙관 — 맺음 컷(낙관 찍는 손 사진) 바로 아래에 진짜 낙관이 찍힌다.
            사진 → 도장 → 후기 질문. 이 순서가 이야기다. */}
        <ResultSealOff at={recordedAt} tone="ink" />

        {/* 예고해 둔 자리 — 낙관을 찍고 나서 묻는 게 순서다 */}
        {reviewOrderId && <ResultReviewCTA orderId={reviewOrderId} tone="ink" />}
      </div>
    </div>
  );
}
