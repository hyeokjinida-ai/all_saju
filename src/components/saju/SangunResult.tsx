// =====================================================
// 산군 신점 전용 결과지 — 검정+금(신당 세계관) 조판.
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
import { markdownComponents } from "./ResultBody";
import { splitChapters } from "./ResultChapters";
import { PillarChart } from "./PillarChart";
import { SANGUN_JANG, type ChartRow } from "@/lib/saju/teaser";
import { plainName } from "@/lib/saju/display-name";
import type { ResultView } from "@/lib/saju/result-view";
import { buildPartnerFace, type PartnerFace } from "@/lib/saju/partner-face";
import type { WealthFacts, InyeonFacts } from "@/lib/saju/saju-api";

const GOLD = "#e8c96a";
const GOLD_SOFT = "rgba(232,201,106,0.75)";
const GOLD_PALE = "rgba(232,201,106,0.25)";
const HANJI = "#efe6d2";
const RED = "#8f2b1e";

/** 표지 이미지 — cover.webp 가 오기 전엔 제단 그림으로 내려앉는다(화면이 비면 안 된다) */
function coverSrc(): string {
  const p = path.join(process.cwd(), "public", "products", "sangun", "cover.webp");
  return fs.existsSync(p) ? "/products/sangun/cover.webp" : "/products/sangun/altar.webp";
}

/** 짝의 얼굴 파일이 실제로 있는지 — 10장(오행5 × 성별2)이 아직 안 왔을 때
 *  깨진 이미지 아이콘 대신 실루엣을 세운다. 표지와 같은 방식(서버에서 판정). */
function faceSrc(src: string): string | null {
  const p = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  return fs.existsSync(p) ? src : null;
}

/** 짝의 얼굴 — 결제 전 티저에서 흐리게 보여준 **그 장**을 여기서 연다.
 *
 *  티저와 결과지가 같은 계산(buildPartnerFace)으로 같은 파일을 집기 때문에 얼굴이 바뀌지 않는다.
 *  여기서 하는 일은 두 가지뿐이다 — 블러를 걷고, 가려뒀던 네 줄을 실제 값으로 채운다.
 *  결제의 회수 지점이라 인연 章에서 제일 먼저 세운다(손님의 마지막 기억이 이 카드다). */
function PartnerCard({ face, meetMonth, ageDir }: { face: PartnerFace; meetMonth: string; ageDir: string }) {
  const src = faceSrc(face.src);
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
function MonthTable({ title, score, rows }: { title: string; score: number; rows: { kind: string; label: string }[] }) {
  if (!rows.length) return null;
  return (
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
  );
}

export function SangunResult({
  view,
  markdown,
  name,
  wealth,
  inyeon,
  chartRows,
}: {
  view: ResultView;
  markdown: string;
  name: string | null;
  wealth: WealthFacts | null;
  inyeon: InyeonFacts | null;
  /** 십성·12운성 줄 — raw_analysis 에서 buildChartRows 로. 없으면(옛 결과지) 한자 판만 선다 */
  chartRows?: ChartRow[];
}) {
  const { intro, chapters } = splitChapters(markdown);
  const who = plainName(name, "");
  // 4章 간지는 결과지가 정확히 9챕터일 때만 — 옛 결과지(다른 구성)는 순서대로 폴백
  const useJang = chapters.length === 9;

  // 년→월→일→시 읽기 순서. 시 모름이면 시주가 "?" 로 오므로 티저와 같은 조건으로 뺀다.
  const shown = view.pillars.slice().reverse().filter((p) => p.gan.char !== "?");

  const wealthRows = wealth
    ? [
        ...wealth.top.map((m) => ({ kind: "돈이 드는 달", label: m.label })),
        ...wealth.bad.map((m) => ({ kind: "새는 달", label: m.label })),
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
      <section key={idx} className={firstInJang ? "mt-6" : "mt-12"}>
        <h3
          className="font-myeongjo flex items-baseline gap-2.5 text-[19px] font-semibold leading-snug"
          style={{ color: HANJI }}
        >
          <span className="font-brush shrink-0 text-[20px]" style={{ color: GOLD_SOFT }}>
            {"一二三四五六七八九"[idx] ?? ""}
          </span>
          <span>{c.title}</span>
        </h3>
        <div className="font-myeongjo mt-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {c.body}
          </ReactMarkdown>
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {intro}
            </ReactMarkdown>
          </div>
        )}

        {useJang ? (
          SANGUN_JANG.map((j) => (
            <div key={j.no}>
              <Ganji no={j.no} tag={j.tag} line={j.teaseResult} />
              {/* 달력 표는 해당 章 머리에 — 본문이 말하는 달과 같은 계산값이라 표가 예고, 본문이 해설이 된다 */}
              {j.no === "二" && wealth && <MonthTable title="돈의 달력" score={wealth.score} rows={wealthRows} />}
              {/* 인연 章은 얼굴부터 — 티저에서 흐리게 본 카드가 여기서 열리는 게 결제의 회수다 */}
              {j.no === "三" && inyeon && (
                <PartnerCard
                  face={buildPartnerFace(inyeon)}
                  meetMonth={inyeon.top3[0]?.label ?? ""}
                  ageDir={inyeon.ageDir}
                />
              )}
              {j.no === "三" && inyeon && <MonthTable title="인연의 달력" score={inyeon.score} rows={inyeonRows} />}
              {j.chapterIdx.map((idx, i) => chapterBlock(idx, i === 0))}
            </div>
          ))
        ) : (
          // 9챕터가 아니면(옛 결과지·다른 구성) 간지 없이 순서대로
          chapters.map((_, i) => chapterBlock(i))
        )}
      </div>
    </div>
  );
}
