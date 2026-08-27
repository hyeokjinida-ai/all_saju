// 결과지 본문 사이에 끼우는 부품들 — **글 벽을 끊는 자리**.
//
// 왜 만들었나(2026-08-24 실측): 은비 결과지 19,888px 중 시각 요소 17개가 전부 머리
// 2,800px 안에 몰려 있었고, y 2,797~14,411 = **11,614px가 연속 산문**이었다.
// 폰으로 13화면을 스크롤하는 동안 그림이 하나도 안 나온다.
//
// 두 경쟁사 실측이 서로 다른 답을 준다:
//   · 청월당(유료 해부) — 장당 이미지 7장, 페이지의 76%를 그림으로 채운다. 우리는 이미지가
//     수동 생산(ChatGPT 웹)이라 그대로는 못 따라간다.
//   · 타이트(랜딩 22,057px 실측) — **그림을 거의 안 쓰고** 날짜 카드·넘버 뱃지·목차 카드로
//     리듬을 만든다. 한 리듬 단위가 폰 1~1.5화면. 「SEP 5 / NOV 14」 카드가 전부 DOM 이다.
//
// 우리가 택한 길은 타이트 쪽이다 — 그리고 우리에겐 저쪽에 없는 게 있다:
// **확정값이 이미 구조화 데이터로 존재한다**(top3·shaky·signals·pattern). 산문 속에 묻어 둘
// 이유가 없다. 코드가 카드로 꺼내면 LLM 토큰 0, 이미지 0장으로 리듬이 생긴다.
//
// 톤 규칙: 이모지·핑크 금지(타이트 문법을 그대로 베끼면 직녀가 아니게 된다).
//          우리 재료 — 달 위상 · 은사 선 · 밤 바탕 · 명조체 — 로만 만든다.
import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { Moon, phaseOfScore } from "./JiknyeoMoon";
import type { InyeonFacts, InyeonRow } from "@/lib/saju/saju-api";

/** 서버에서 파일 존재를 확인한다(클라이언트 onError 를 못 쓰는 서버 컴포넌트라서). */
function assetSrc(src: string): string | null {
  const p = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  return fs.existsSync(p) ? src : null;
}

/** 내부 판정어를 손님 말로. 본문은 normalize-voice 가 거르지만 **카드는 그 파이프를 안 탄다** —
 *  여기서 안 바꾸면 태그에 「전체 흐름이 대길」이 그대로 뜬다(2026-08-24 실측). */
function humanize(t: string): string {
  return t
    .replace(/대길/g, "크게 트임")
    .replace(/대흉/g, "크게 눌림")
    .replace(/소길/g, "조금 트임")
    .replace(/소흉/g, "조금 눌림");
}

/* ── 공통 껍데기 ────────────────────────────────────────── */

/** 카드 묶음의 머리 — **라벨이 아니라 직녀의 대사**로 연다.
 *  청월당은 SD 캐릭터가 빈 액자 옆에서 말풍선으로 내용을 소개한다(해부 §2). 그 동행 감각이
 *  저쪽 결과지가 "읽어주는 사람이 있는 물건"으로 느껴지는 이유다 — 삽화 장수가 아니다.
 *  말풍선 규격은 8/23 확정 그대로: **한 덩어리 도형** · 꼬리가 인물 쪽 · 글 두 줄 이내. */
function Band({
  lines,
  children,
  sd = "sdSmile",
  cut,
  cutRatio = "3 / 2",
  cutPos = "center 18%",
  cutFade = 52,
  bubbleSide = "left",
  sfx,
}: {
  /** 직녀의 대사 — 말맛대로 끊은 줄 배열 */
  lines: string[];
  children: React.ReactNode;
  sd?: "sdSmile" | "sdThink";
  /** 반신 컷 id(j2·w2·w3…). 주면 **컷이 주인공**인 청월당 문법으로 렌더한다 */
  cut?: string;
  /** 컷 액자 비율. 기본 3:2 는 원본(2:3)의 **10~54% 구간만** 보여준다 —
   *  연기가 가슴 아래(손·소품)에서 일어나는 컷은 잘려 나가므로 세로로 키운다. */
  cutRatio?: string;
  /** 크롭 기준점. 기본 18% 는 얼굴을 가운데 두는 값이다 */
  cutPos?: string;
  /** 아래쪽 페이드 높이(%). 액자를 지우려고 넣은 건데, 연기가 아래에서 일어나는 컷에서는
   *  기본 52% 가 **손과 소품을 통째로 지워 버린다**(N2 은사 실측). 그런 컷은 28 안팎으로. */
  cutFade?: number;
  /** 말풍선을 어느 쪽에 걸칠지. **연기와 같은 쪽에 두면 연기를 덮는다** —
   *  N2 는 손이 화면 왼쪽인데 말풍선도 왼쪽이라 은사가 통째로 가려졌다(실측). */
  bubbleSide?: "left" | "right";
  /** 손글씨 방백 — 원본은 그림에 구워 넣지만 우리는 코드로 얹는다(8/23 규격) */
  sfx?: string;
}) {
  const cutSrc = cut
    ? assetSrc(`/products/jiknyeo/${cut}.webp`) ?? assetSrc(`/products/jiknyeo/${cut}.png`)
    : null;

  // ── 컷 문법 — 청월당 실물 배치 ──
  if (cutSrc) {
    return (
      <div style={{ margin: "22px 0 0" }}>
        <div style={{ position: "relative", paddingBottom: 58 }}>
          {/* 컷: 폭 86%(실물 80~90%) · 3:2 · 아래를 밤 배경으로 녹여 액자 느낌을 지운다 */}
          <div
            style={{
              position: "relative",
              width: "86%",
              marginLeft: "auto",
              overflow: "hidden",
              borderRadius: 12,
              background: "#EFE9DC",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cutSrc}
              alt=""
              draggable={false}
              className="w-full select-none"
              style={{ aspectRatio: cutRatio, objectFit: "cover", objectPosition: cutPos, display: "block" }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: `${cutFade}%`, background: "linear-gradient(180deg, rgba(247,243,234,0), rgba(247,243,234,.92) 72%, #F7F3EA)" }}
            />
            {sfx && (
              <span
                className="font-brush absolute"
                style={{
                  top: "11%",
                  right: "5%",
                  fontSize: 21,
                  color: "#F0E3B8",
                  transform: "rotate(8deg)",
                  textShadow: "0 2px 10px rgba(10,8,26,.9)",
                  letterSpacing: "0.06em",
                }}
              >
                {sfx}
              </span>
            )}
          </div>
          {/* 말풍선이 **컷에 걸친다** — 꼬리는 컷 안 인물 쪽을 향한다 */}
          <div
            style={{
              position: "absolute",
              ...(bubbleSide === "right" ? { right: 0 } : { left: 12 }),
              bottom: 18,
              zIndex: 2,
            }}
          >
            <Bubble lines={lines} size="lg" tail={bubbleSide === "right" ? "bl" : "br"} />
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      </div>
    );
  }

  // ── SD 문법 — 가벼운 자리(청월당도 반신과 SD 를 섞어 쓴다) ──
  const face = assetSrc(`/products/jiknyeo/${sd}-cut.webp`) ?? assetSrc(`/products/jiknyeo/${sd}-cut.png`);
  return (
    <div style={{ margin: "20px 0 0" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
        <Bubble lines={lines} size="md" tail="bl" />
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face}
            alt=""
            draggable={false}
            className="flex-none select-none"
            style={{ width: 74, height: 96, objectFit: "contain", objectPosition: "bottom", marginBottom: -6, marginLeft: -8 }}
          />
        ) : null}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

/** 말풍선 — **청월당 실물 실측을 그대로 옮긴 규격**(2026-08-25 PIL 측정).
 *
 *  원본 750px 폭 기준: 386×352px · 폭비 51% · 종횡 1.10 · 글자높이 33px · 줄높이 54px(lh 1.18)
 *  → 448px 기둥 환산: 폭 228 · 높이 207 · font 27px · lh 1.18
 *
 *  ⚠ 이전 판(2026-08-24)은 실물을 안 보고 만든 높이 40px 짜리 알약이었다. 크기가 5배 틀리면
 *    같은 도형이어도 「캐릭터의 말」이 아니라 「UI 라벨」로 읽힌다 — 그래서 실측으로 다시 세웠다.
 *
 *  줄바꿈은 **말맛대로 손으로 끊는다**(폭 맞춤 아님). 그래서 문자열이 아니라 줄 배열을 받는다. */
export function Bubble({
  lines,
  size = "lg",
  tail = "bl",
}: {
  /** 말맛대로 끊은 줄 배열 — 원본도 폭이 아니라 호흡으로 끊는다 */
  lines: string[];
  /** lg = 실측값(228) · md = 카드 묶음용 축소판 */
  size?: "lg" | "md";
  /** 꼬리 방향 — bl(왼쪽 아래) / br(오른쪽 아래) / 없음 */
  tail?: "bl" | "br" | "none";
}) {
  // 실물 폭비 51% 를 화면 폭과 무관하게 지킨다. 448 에서는 228/190 그대로, 360 폰에서는 함께 줄어
  // 글줄이 원을 뚫지 않는다(nowrap 이라 폭이 모자라면 글자가 삐져나온다).
  const w = size === "lg" ? "min(228px, 51vw)" : "min(190px, 43vw)";
  const h = size === "lg" ? "min(207px, 46.4vw)" : "min(173px, 39vw)";
  const fs = size === "lg" ? "clamp(15px, 4.2vw, 19px)" : "clamp(13.5px, 3.7vw, 16.5px)";
  return (
    <div style={{ position: "relative", width: w, height: h, flex: "none" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "#FFFFFF",
          border: "2px solid #1B1729",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10%",
          boxShadow: "0 6px 20px rgba(10,8,26,.45)",
        }}
      >
        {lines.map((t, i) => (
          <span
            key={i}
            className="font-myeongjo"
            style={{
              fontSize: fs,
              lineHeight: 1.18,
              color: "#14111F",
              fontWeight: 700,
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {t}
          </span>
        ))}
      </div>
      {tail !== "none" && (
        // 꼬리는 원과 **한 덩어리**로 보여야 한다 — 흰 삼각을 원에 겹쳐 이음매를 지운다(8/23 규격)
        <svg
          width="30"
          height="26"
          viewBox="0 0 30 26"
          aria-hidden
          style={{
            position: "absolute",
            bottom: -14,
            [tail === "bl" ? "left" : "right"]: "18%",
            transform: tail === "br" ? "scaleX(-1)" : undefined,
          }}
        >
          <path d="M27 2C22 14 12 21 2 24c9-1 18-5 25-11z" fill="#FFFFFF" stroke="#1B1729" strokeWidth="2" strokeLinejoin="round" />
          <path d="M25 3C21 12 13 18 5 22" stroke="#FFFFFF" strokeWidth="3" />
        </svg>
      )}
    </div>
  );
}

/** 카드 한 장 — 좌: 달(또는 번호) / 우: 큰 글씨 + 근거 한 줄 */
function RowCard({
  left,
  big,
  small,
  body,
  tone = "good",
}: {
  left: React.ReactNode;
  big: string;
  small?: string;
  body: string;
  tone?: "good" | "care";
}) {
  // 한지 바탕 위 카드 — 흰 판 + 먹 글씨. 어두운 판은 밝은 종이 위에서 UI 위젯처럼 튄다.
  const edge = tone === "good" ? "rgba(201,169,78,.55)" : "rgba(107,76,154,.30)";
  const bigColor = tone === "good" ? "#3A2E12" : "#2A2434";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 15px",
        borderRadius: 14,
        background: tone === "good" ? "linear-gradient(160deg,#FFFDF7,#FBF6EA)" : "#FCFAFE",
        border: `1px solid ${edge}`,
        boxShadow: "0 2px 10px rgba(42,36,52,.06)",
      }}
    >
      <div className="flex-none" style={{ width: 34, display: "flex", justifyContent: "center" }}>
        {left}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="font-myeongjo" style={{ fontSize: 25, fontWeight: 700, color: bigColor, lineHeight: 1.1 }}>
            {big}
          </span>
          {small ? <span style={{ fontSize: 11.5, color: "#8A82A2" }}>{small}</span> : null}
        </div>
        <p style={{ marginTop: 5, fontSize: 13, lineHeight: 1.62, color: "#5B5470" }}>{body}</p>
      </div>
    </div>
  );
}

/* ── ① 만나는 달 3장 — 4章 뒤 ──────────────────────────── */

export function MonthCards({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <Band lines={["잊어버리기 전에,", "방금 그 세 달만", "다시 적어 둘게요."]} cut="w7" sfx="콕—">
      {rows.slice(0, 3).map((r) => (
        <RowCard
          key={r.label}
          left={<Moon phase={phaseOfScore(r.score)} size={30} />}
          big={`${r.month}월`}
          small={`${r.year}년`}
          body={humanize(r.tags.slice(0, 2).join(" · ")) || "흐름이 열리는 달이에요"}
        />
      ))}
      {/* 3사 중 우리만 「달」을 준다. 손님 폰에 남겨야 그 값이 산다 */}
      <p style={{ marginTop: 2, textAlign: "center", fontSize: 11.5, color: "#8A82A2" }}>
        폰 달력에 적어 두면 그 달에 알림이 와요
      </p>
    </Band>
  );
}

/* ── ② 조심할 달 — 7章 뒤 ─────────────────────────────── */

export function ShakyCards({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <Band lines={["이 두 달은", "무서워하지 말아요.", "천천히 가면 돼요."]} cut="w2">
      {rows.slice(0, 2).map((r) => (
        <RowCard
          key={r.label}
          tone="care"
          left={<Moon phase="cloud" size={30} />}
          big={`${r.month}월`}
          small={`${r.year}년`}
          body={humanize(r.tags.slice(0, 2).join(" · ")) || "마음이 앞서기 쉬운 달이에요"}
        />
      ))}
    </Band>
  );
}

/* ── ③ 알아보는 신호 — 6章 뒤 ─────────────────────────── */

/** 세 번째 카드는 라벨이 **「속도」**다 — 관계가 어떤 박자로 가까워지는지.
 *  앞의 두 카드(약속·기억)는 확정값 signals 를 그대로 쓰므로 여기는 **다른 축**이어야 한다.
 *  ⚠ 예전엔 이 표가 SIGNAL_POOL 문장을 그대로 베껴 놓아서, 짝이 수(水)·정(正)이면
 *     一 과 三 이 **같은 문장**으로 떴다(2026-08-26 실측). 축이 겹치면 반드시 부딪친다. */
const OH_PACE: Record<string, string> = {
  목: "처음부터 빠르게 붙었다가 한 번 숨을 고르고, 그 뒤로 쭉 간다",
  화: "만난 지 얼마 안 돼 마음을 다 보여 주고, 식지 않게 하는 건 내 몫이 된다",
  토: "느리게 시작해서 어느 날 보면 생활이 겹쳐 있다 — 티가 안 나게 스민다",
  금: "재는 시간이 길고, 정하고 나면 그 뒤로는 뒤를 안 돌아본다",
  수: "가까워졌다 멀어졌다 두어 번 하고, 세 번째에 자리를 잡는다",
};

export function SignalCards({ inyeon }: { inyeon: InyeonFacts }) {
  // 중복 제거 — 앞의 둘과 겹치는 문장이 들어오면 카드 두 장이 같은 말을 한다(안전망)
  const list = [...new Set(
    [...(inyeon.signals ?? []), OH_PACE[inyeon.spouseOh || "토"]].filter(Boolean),
  )].slice(0, 3);
  if (!list.length) return null;
  return (
    <Band
      lines={["이 세 가지만 기억하면", "그 사람을", "알아볼 수 있어요."]}
      cut="N2"
      // 연기가 가슴 아래(손바닥의 은사 세 가닥)에서 일어난다. 기본 3:2 는 원본의 10~54%
      // 구간만 보여 줘서 손이 통째로 잘려 나갔다(실측). 4:5 로 키워야 대사와 그림이 같은 말을 한다
      // 은사가 얇아 폰 폭에서 죽는다 → **소재를 3:4 로 구워 뒀다**(CSS 크롭 없음).
      // 페이드도 12 로 낮춘다 — 손이 프레임 아래쪽에 있어 기본값이면 씻긴다
      cutRatio="3 / 4"
      cutPos="center"
      cutFade={12}
      // 은사를 든 손이 화면 왼쪽에 있다 — 말풍선을 오른쪽으로 비켜 준다
      bubbleSide="right"
    >
      {list.map((s, i) => (
        <RowCard
          key={i}
          left={
            <span
              className="font-myeongjo"
              style={{ fontSize: 19, color: "#C9A94E", fontWeight: 700 }}
            >
              {["一", "二", "三"][i]}
            </span>
          }
          big={["약속", "기억", "속도"][i] ?? "신호"}
          body={s}
        />
      ))}
    </Band>
  );
}

/* ── ③-B 타고난 끌림 신호 — 1章 뒤 ────────────────────── */

/** 명식 용어를 그대로 쓰되 **바로 옆에 풀이를 붙인다.**
 *  청월당·타이트 둘 다 원국 용어를 증거로 노출한다 — 못 읽어도 "이건 내 거"가 되는 덩어리다.
 *  용어만 있으면 불친절하고, 풀이만 있으면 근거가 사라진다. 둘을 붙여야 증거가 된다. */
const CHARM: [string, string][] = [
  ["도화", "처음 만난 자리에서 눈에 걸리는 신호"],
  ["홍염", "가까이서 볼수록 매력이 짙어지는 신호"],
  ["천을귀인", "결정적인 순간에 누가 다리를 놓아 주는 신호"],
  ["금여성", "귀하게 대접받는 관계가 붙는 신호"],
];

export function CharmChips({ inyeon }: { inyeon: InyeonFacts }) {
  const have: [string, string][] = [];
  if (inyeon.dohwaCount > 0) have.push(CHARM[0]);
  if (inyeon.hongyeomCount > 0) have.push(CHARM[1]);
  if (inyeon.hasCheoneul) have.push(CHARM[2]);
  if (inyeon.hasGeumyeo) have.push(CHARM[3]);
  // 신호가 하나도 없는 명식도 있다 — 그 사람에게 빈 카드를 보이면 "나는 없구나"가 된다.
  // 확정값 블록이 같은 자리에서 쓰는 문장("은은한 편 · 꾸준함이 무기")을 그대로 쓴다.
  if (!have.length) have.push(["은은한 편", "튀지 않아도 오래 남는 쪽 — 꾸준함이 무기예요"]);
  return (
    <Band lines={["원래 이런 매력이", "있어요.", "알고 있었어요?"]}>
      {have.slice(0, 3).map(([term, how]) => (
        <RowCard
          key={term}
          left={
            <svg width="19" height="19" viewBox="0 0 74 74" aria-hidden>
              <path d="M37 6l7.4 22.6L67 36l-22.6 7.4L37 66l-7.4-22.6L7 36l22.6-7.4z" fill="#C9A94E" opacity=".8" />
            </svg>
          }
          big={term}
          body={how}
        />
      ))}
    </Band>
  );
}

/* ── ④ 짝 카드 재게시 — 5章 **직전** ──────────────────── */

/** 얼굴 카드는 결과지 머리(요약부)에 있고 5章 본문은 한참 아래다.
 *  프롬프트는 5章에게 「바로 위 표를 회수하라」고 시키는데 실제로는 멀어서, 손님이 그 연결을
 *  못 짓는다(2026-08-24 화면 실측). 카드를 옮기는 대신 **작게 다시 세워** 회수 루프를 잇는다.
 *  머리의 큰 카드는 결제 직후 보상으로 그대로 둔다. */
export function PartnerRecall({
  src,
  ohKo,
  keul,
  ageDir,
  place,
}: {
  src: string | null;
  ohKo: string;
  keul: string;
  ageDir: string;
  place: string;
}) {
  const ok = src ? assetSrc(src) : null;
  return (
    <div
      style={{
        margin: "14px 0 0",
        display: "flex",
        gap: 13,
        alignItems: "center",
        padding: "13px 15px",
        borderRadius: 14,
        background: "linear-gradient(160deg,#FFFDF7,#F8F2E6)",
        border: "1px solid rgba(201,169,78,.55)",
        boxShadow: "0 2px 10px rgba(42,36,52,.06)",
      }}
    >
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ok}
          alt=""
          draggable={false}
          className="flex-none select-none object-cover"
          style={{ width: 62, aspectRatio: "3 / 4", borderRadius: 8, border: "1px solid rgba(223,214,238,.5)" }}
        />
      ) : null}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11.5, letterSpacing: "0.14em", color: "#6B4C9A", fontWeight: 600 }}>
          앞에서 본 그 사람
        </p>
        <p className="font-myeongjo" style={{ marginTop: 3, fontSize: 16, fontWeight: 700, color: "#3A2E12" }}>
          {ohKo}의 결 · {ageDir}
        </p>
        <p style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.6, color: "#5B5470" }}>
          {keul} · {place}
        </p>
      </div>
    </div>
  );
}

/* ── ⑤ 컷 인터루드 — 숨 쉬는 자리 ─────────────────────── */

/** 티저가 쓰는 설화 컷을 결과지 본문 사이에 한 장씩 눕힌다.
 *  새 이미지를 만들지 않는다 — 이미 있는 자산(public/products/jiknyeo)의 재배치다. */
export function CutInterlude({ id, say, ratio = "3 / 2", pos = "center 22%" }: { id: string; say: string; ratio?: string; pos?: string }) {
  const src = assetSrc(`/products/jiknyeo/${id}.webp`) ?? assetSrc(`/products/jiknyeo/${id}.png`);
  if (!src) return null;
  return (
    // 풀블리드 — 청월당은 테두리 컷과 **가장자리까지 꽉 찬 컷**을 번갈아 써서 리듬을 만든다
    // (해부 §3: 우리에게 없던 장치 3개 중 하나). 페이지 좌우 패딩(12px)을 음수 마진으로 상쇄한다.
    <figure style={{ margin: "18px -12px 0" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#EFE9DC" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full select-none object-cover"
          style={{ aspectRatio: ratio, objectPosition: pos, display: "block" }}
        />
        {/* 위·아래를 페이지 바탕으로 녹인다 — 액자 대신 페이드로 잇는 게 청월당 문법이다 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: "22%", background: "linear-gradient(180deg, #F7F3EA, rgba(247,243,234,0))" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: "62%", background: "linear-gradient(180deg, rgba(247,243,234,0), rgba(247,243,234,.92) 78%, #F7F3EA)" }}
        />
        <figcaption
          className="font-myeongjo absolute inset-x-0 bottom-0 px-5 pb-4 text-center"
          style={{ fontSize: 15, lineHeight: 1.6, color: "#F1EAFB" }}
        >
          {say}
        </figcaption>
      </div>
    </figure>
  );
}

/* ── ⑤-B 장 머리 대사 — 캐릭터가 계속 말을 건다 ─────────── */

/** 章 본문 맨 위에서 직녀가 한마디 하고 시작한다.
 *  청월당은 장마다 캐릭터가 2~3번 말을 건다(「다음은 이성들이 너를 처음 만났을 때…알아보자구」).
 *  그 밀도가 「읽어주는 사람이 있는 물건」의 정체다 — 삽화 장수가 아니다.
 *  ⚠ 대사는 **고정 테이블**이다. 모델에게 맡기면 어려운 말이 섞인다(형님 지적 2026-08-25). */
const CHAPTER_LINES: [RegExp, string[]][] = [
  [/인연 그릇|결혼 그릇/, ["먼저 ○○님이", "어떤 사람인지부터", "볼게요."]],
  [/걸어온 길/, ["지나온 시간부터", "잠깐 짚을게요.", "맞나 보세요."]],
  [/놓치는 패턴|늦어지는 이유/, ["○○님이 사람을", "놓치던 버릇,", "여기 있어요."]],
  [/만나는 달|들어오는 달|결혼하는 해/, ["여기가 제일 중요해요.", "만나는 달이에요."]],
  [/내게 올 사람|함께할 사람/, ["아까 그 얼굴,", "이제 자세히", "말해 줄게요."]],
  [/신호/, ["만났을 때", "알아보는 법이에요."]],
  [/조심할 달|피해야 할|흔들리/, ["겁내지 말고 읽어요.", "피하는 법도", "같이 드려요."]],
  [/크게 바뀌는 해|정리할 것/, ["조금 멀리 볼게요.", "○○님 판이", "바뀌는 해예요."]],
  [/고민|물음/, ["이제 ○○님이", "물어보신 것에", "답할 차례예요."]],
  [/이번 주에 할 것/, ["마지막으로,", "이번 주에 할 것만", "남겼어요."]],
];

/** 장 제목으로 대사를 찾아 이름을 끼운다. 없으면 렌더하지 않는다(억지로 말 걸지 않는다). */
export function ChapterSay({ title, who }: { title: string; who: string }) {
  const hit = CHAPTER_LINES.find(([re]) => re.test(title));
  if (!hit) return null;
  const name = (who || "").trim();
  const lines = hit[1].map((l) => l.replace(/○○/g, name || "그대"));
  const face = assetSrc("/products/jiknyeo/sdSmile-cut.webp") ?? assetSrc("/products/jiknyeo/sdSmile-cut.png");
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-start", gap: 4, marginBottom: 14 }}>
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={face}
          alt=""
          draggable={false}
          className="flex-none select-none"
          style={{ width: 58, height: 76, objectFit: "contain", objectPosition: "bottom", marginBottom: -4 }}
        />
      ) : null}
      <div style={{ marginLeft: -6 }}>
        <Bubble lines={lines} size="md" tail="bl" />
      </div>
    </div>
  );
}

/** 컷 한 장 + 말풍선. 카드가 안 따라붙는 자리(짝 얼굴 직전 같은 곳)에서 쓴다.
 *  Band 는 children(카드)을 전제하므로 그 자리엔 안 맞는다. */
export function CutSay({
  id,
  lines,
  ratio = "4 / 5",
  pos = "center 12%",
  fade = 26,
}: {
  id: string;
  lines: string[];
  ratio?: string;
  pos?: string;
  fade?: number;
}) {
  const src = assetSrc(`/products/jiknyeo/${id}.webp`) ?? assetSrc(`/products/jiknyeo/${id}.png`);
  if (!src) return null;
  return (
    <div style={{ position: "relative", marginTop: 18, paddingBottom: 56 }}>
      <div
        style={{
          position: "relative",
          width: "84%",
          marginLeft: "auto",
          overflow: "hidden",
          borderRadius: 14,
          background: "#EFE9DC",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full select-none"
          style={{ aspectRatio: ratio, objectFit: "cover", objectPosition: pos, display: "block" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: `${fade}%`, background: "linear-gradient(180deg, rgba(250,247,240,0), rgba(250,247,240,.92) 76%, #faf7f0)" }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, zIndex: 2 }}>
        <Bubble lines={lines} size="lg" tail="br" />
      </div>
    </div>
  );
}

/* ── ⑥ 프롤로그 — 결과지의 첫 화면 ────────────────────── */

/** 청월당은 프롤로그 한 장(19,052px)을 통째로 인사에 쓴다. 타이트는 표지+목차 카드 6장으로 연다.
 *  우리는 달력부터 들이밀고 있었다 — 결제 직후 1초가 원하는 건 정보가 아니라 **환대**다.
 *
 *  세 가지를 한 블록에서 끝낸다:
 *   ① 호명 인사(관계)  ② 받은 분량을 숫자로(물성)  ③ 목차 + 「고민은 9장에서」 예고(재실망 공포 선해소)
 *  ③이 중요한 이유: 확답이 스크롤 85% 지점에 있어서, 손님이 거기 닿기 전에 판정을 내려 버린다. */
export function Prologue({
  who,
  chapters,
}: {
  who: string;
  /** 장 제목 목록 — 목차 카드에 그대로 쓴다 */
  chapters: string[];
}) {
  const name = who || "그대";
  // 고민에 답하는 장 — 제목으로 찾는다(장 수가 바뀌어도 따라오게)
  const askIdx = chapters.findIndex((t) => /고민|물음/.test(t));
  return (
    // 프롤로그 전체를 **한지 판 하나**에 담는다 — 청월당도 인사~목차가 같은 종이 위에 있다.
    <div
      style={{
        margin: "18px 0 0",
        padding: "20px 18px 22px",
        borderRadius: 16,
        backgroundColor: "#faf7f0",
        backgroundImage: "url(/products/jiknyeo/hanji.png)",
        backgroundSize: "360px 360px",
        border: "1px solid rgba(107,76,154,.20)",
        boxShadow: "0 10px 30px rgba(42,36,52,.10)",
      }}
    >
      {/* 인사 — **메인 캐릭터가 화면 크게** 나온다. 청월당 프롤로그도 SD 가 아니라 큰 일러다
          (SD 는 본문 중간 추임새 자리). j1 은 README 가 「직녀 소개·어서 와요」로 지정한 컷이다. */}
      {(() => {
        // j-greet = 인사 전용 컷(2026-08-26 생성). j1 은 창가를 보는 옆모습이라 맞이하는 자리와 안 맞았다.
        //   생산법은 에셋_생산_프롬프트시트 ③ j-greet 행 — j1 첨부 + 고정블록 전문 + POSE MUST CHANGE.
        const hero =
          assetSrc("/products/jiknyeo/j-greet.webp") ??
          assetSrc("/products/jiknyeo/j1.webp") ??
          assetSrc("/products/jiknyeo/j1.png");
        if (!hero) {
          return (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Bubble lines={[`${name}님, 왜`, "이제 오셨어요!"]} size="lg" tail="bl" />
            </div>
          );
        }
        return (
          <div style={{ position: "relative", paddingBottom: 64 }}>
            <div
              style={{
                position: "relative",
                width: "84%",
                marginLeft: "auto",
                overflow: "hidden",
                borderRadius: 14,
                background: "#EFE9DC",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt=""
                draggable={false}
                className="w-full select-none"
                style={{ aspectRatio: "4 / 5", objectFit: "cover", objectPosition: "center 12%", display: "block" }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: "42%", background: "linear-gradient(180deg, rgba(250,247,240,0), rgba(250,247,240,.92) 76%, #faf7f0)" }}
              />
            </div>
            <div style={{ position: "absolute", left: 0, bottom: 0, zIndex: 2 }}>
              <Bubble lines={[`${name}님, 왜`, "이제 오셨어요!"]} size="lg" tail="br" />
            </div>
          </div>
        );
      })()}

      {/* 자기 증명 — 우리만 하는 것을 우리만 한다고 말한다.
          랜딩엔 있는 문구가 정작 결과지 안엔 없었다(손님은 비교 대상이 없어 유일함을 모른다) */}
      <p style={{ marginTop: 10, textAlign: "center", fontSize: 12, lineHeight: 1.7, color: "#6C6483" }}>
        여기 적힌 달은 지어낸 말이 아니라
        <br />
        <b style={{ color: "#5B3F8F" }}>{name}님 만세력 계산에서 나온 값</b>이에요.
      </p>

      {/* 두 번째 컷 — 인사 다음은 **여는 동작**이다. 컷 하나 + 말풍선 하나로 끝나면 삽화지만
          컷→말풍선→컷→말풍선이 되면 그때부터 웹툰으로 읽힌다(몰입 판독 §3 「컷 연쇄가 없다」).
          첫 컷과 좌우를 뒤집어 리듬을 만든다 — 오른쪽 컷 다음은 왼쪽 컷. */}
      {(() => {
        const open = assetSrc("/products/jiknyeo/N1.webp") ?? assetSrc("/products/jiknyeo/N1.png");
        if (!open) return null;
        return (
          <div style={{ position: "relative", marginTop: 16, paddingBottom: 58 }}>
            <div
              style={{
                position: "relative",
                width: "84%",
                marginRight: "auto",
                overflow: "hidden",
                borderRadius: 14,
                background: "#EFE9DC",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={open}
                alt=""
                draggable={false}
                className="w-full select-none"
                // 두루마리가 아래쪽에 있어 **소재를 3:4 로 구워 뒀다**. 페이드도 얕게 —
                // 기본값(42%)이면 펼친 손과 종이가 통째로 씻긴다
                style={{ aspectRatio: "3 / 4", objectFit: "cover", objectPosition: "center", display: "block" }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: "14%", background: "linear-gradient(180deg, rgba(250,247,240,0), rgba(250,247,240,.92) 76%, #faf7f0)" }}
              />
            </div>
            <div style={{ position: "absolute", right: 0, bottom: 0, zIndex: 2 }}>
              <Bubble lines={["오늘 밤 것부터,", "하나씩 펼쳐", "볼게요."]} size="lg" tail="bl" />
            </div>
          </div>
        );
      })()}

      {/* 목차 — 탭하면 그 장으로. 고민 장에는 뱃지를 달아 미리 약속한다 */}
      {chapters.length > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: "14px 15px",
            borderRadius: 14,
            background: "rgba(255,255,255,.72)",
            border: "1px solid rgba(107,76,154,.22)",
          }}
        >
          <p style={{ fontSize: 11.5, letterSpacing: "0.18em", color: "#6B4C9A", fontWeight: 600, textAlign: "center" }}>
            오늘 여는 것
          </p>
          <ol style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {chapters.map((t, i) => (
              <li key={i}>
                <a
                  href={`#ch-${i}`}
                  style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none" }}
                >
                  <span className="font-myeongjo" style={{ fontSize: 12, color: "#A8842C", flex: "none", width: 18 }}>
                    {["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][i] ?? i + 1}
                  </span>
                  <span className="font-myeongjo" style={{ fontSize: 14, color: "#2A2434", lineHeight: 1.45 }}>
                    {t.replace(/^\s*\d+\s*[.·)]\s*/, "")}
                    {i === askIdx && (
                      <b
                        style={{
                          marginLeft: 6,
                          fontSize: 10.5,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "rgba(201,169,78,.20)",
                          border: "1px solid rgba(168,132,44,.55)",
                          color: "#6B5214",
                          whiteSpace: "nowrap",
                        }}
                      >
                        적어주신 고민, 여기서
                      </b>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ── ⑦ 마치며 — 결과지의 마지막 10초 ─────────────────── */

/** 3사 공통 표준(청월당 14장 「마치며」·음양관·귀신사주). 후기·공유 직전의 감정을 정하는 자리다.
 *  청월당도 410자뿐 — 길 필요가 없다. 정적 템플릿 + 이름·가장 가까운 좋은 달만 치환(토큰 0). */
export function ClosingLetter({ who, nearest }: { who: string; nearest?: { year: number; month: number } | null }) {
  const name = who || "그대";
  return (
    <div
      style={{
        margin: "20px 0 0",
        padding: "22px 20px 24px",
        borderRadius: 16,
        backgroundColor: "#faf7f0",
        backgroundImage: "url(/products/jiknyeo/hanji.png)",
        backgroundSize: "360px 360px",
        border: "1px solid rgba(201,169,78,.50)",
        boxShadow: "0 10px 30px rgba(42,36,52,.10)",
      }}
    >
      <p className="font-myeongjo" style={{ fontSize: 13, letterSpacing: "0.22em", color: "#A8842C", textAlign: "center" }}>
        마치며
      </p>
      <div
        className="font-myeongjo"
        style={{ marginTop: 14, fontSize: 14.5, lineHeight: 2, color: "#2A2434", textAlign: "center" }}
      >
        <p>여기까지 읽느라 고생했어요.</p>
        <p style={{ marginTop: 12 }}>
          제가 알려 드린 건 <b style={{ color: "#5B3F8F" }}>날짜</b>예요.
          <br />
          가는 건 {name}님이 하는 거고요.
        </p>
        <p style={{ marginTop: 12 }}>
          {nearest ? (
            <>
              가장 먼저 오는 달은{" "}
              <b style={{ color: "#5B3F8F" }}>
                {nearest.year}년 {nearest.month}월
              </b>
              이에요.
              <br />그때 이 종이를 다시 열어 보세요.
            </>
          ) : (
            <>그 달이 오면 이 종이를 다시 열어 보세요.</>
          )}
        </p>
        <p style={{ marginTop: 12 }}>저는 여기 있을게요.</p>
        <p style={{ marginTop: 12, color: "#6C6483" }}>그때까지, 잘 지내고 계세요.</p>
      </div>
      <p className="font-brush" style={{ marginTop: 16, textAlign: "center", fontSize: 15, color: "#A8842C", letterSpacing: "0.3em" }}>
        織 女
      </p>
    </div>
  );
}
