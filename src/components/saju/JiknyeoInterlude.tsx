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
  cutRatio = "2 / 3",
  cutPos = "center",
  cutFade = 8,
  say,
  saySize = "lg",
  sfx,
  sfxAt = { top: 9, right: 6 },
}: {
  /** 직녀의 대사 — 말맛대로 끊은 줄 배열 */
  lines: string[];
  children: React.ReactNode;
  sd?: "sdSmile" | "sdThink";
  /** 반신 컷 id(j2·w2·w3…). 주면 **컷이 주인공**인 청월당 문법으로 렌더한다 */
  cut?: string;
  /** 컷 액자 비율. 기본은 **원본 그대로(2:3)** — 자르지 않는다.
   *  예전 기본값 3:2 는 원본의 10~54% 구간만 보여 줘서 연기(손·소품)가 통째로 잘렸고,
   *  폭도 86% 라 컷이 작았다. 형님 지시(2026-08-28): 「작게 보여주지 말고 화면에 꽉 차게」. */
  cutRatio?: string;
  /** 크롭 기준점. 기본 18% 는 얼굴을 가운데 두는 값이다 */
  cutPos?: string;
  /** 아래쪽 페이드 높이(%). 컷을 종이 바탕에 녹이는 장치인데 크게 주면 **연기를 지운다** —
   *  52% 였을 때 w7 달력 종이가 하얗게 날아가고 N2 은사가 사라졌다. 기본 14. */
  cutFade?: number;
  /** 말풍선 자리 — **컷 폭·높이 기준 %**(x=왼쪽, y=위쪽). 티저의 SAY_BOX 와 같은 좌표계다.
   *  모서리 이름(left/right)으로 고르면 컷마다 인물이 다른 자리에 서 있어서 반드시
   *  얼굴이나 연기 위에 떨어진다 — w2 는 오른쪽 절반이 빈 밤하늘인데 말풍선이 인물 위에
   *  얹혀 있었고, w7 은 말풍선이 달력(연기 그 자체)을 덮고 있었다(2026-08-28 격자 실측).
   *  값의 근거는 호출부에 컷별로 적는다. 자는 `python 직녀/tools/say-grid.py`. */
  say?: { x: number; y: number; tail?: "bl" | "br" | "tl" | "tr" };
  /** 밴드 컷(3:2)은 높이가 짧아 lg(207px)면 컷보다 커진다 — 그런 자리는 md 로 */
  saySize?: "lg" | "md";
  /** 손글씨 방백 — 원본은 그림에 구워 넣지만 우리는 코드로 얹는다(8/23 규격) */
  sfx?: string;
  /** 방백 자리(컷 기준 %). **그 행동 옆**에 놓아야 의미가 산다 — 기본값(오른쪽 위)은
   *  가리키는 손이 화면 한가운데인 컷에서 서로 상관없어 보였다. */
  sfxAt?: { top: number; right: number };
}) {
  const cutSrc = cut
    ? assetSrc(`/products/jiknyeo/${cut}.webp`) ?? assetSrc(`/products/jiknyeo/${cut}.png`)
    : null;

  // ── 컷 문법 — 청월당 실물 배치 ──
  if (cutSrc) {
    return (
      <div style={{ margin: "22px 0 0" }}>
        <div style={{ position: "relative", paddingBottom: say ? 26 : 58 }}>
          {/* 컷 상자 — 좌표의 기준. 액자(overflow hidden)는 한 겹 안쪽이고,
              말풍선은 이 상자 위에 얹혀서 필요하면 밖으로 삐져나간다 */}
          <div style={{ position: "relative", margin: "0 -12px" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
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
                  top: `${sfxAt.top}%`,
                  right: `${sfxAt.right}%`,
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
          {/* 말풍선 — 좌표를 주면 컷 기준 %로 앉고, 없으면 예전대로 왼쪽 아래에 걸친다 */}
          {say ? (
            <div style={{ position: "absolute", left: `${say.x}%`, top: `${say.y}%`, zIndex: 2 }}>
              <Bubble lines={lines} size={saySize} tail={say.tail ?? (say.x > 40 ? "bl" : "br")} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: 12, bottom: 18, zIndex: 2 }}>
              <Bubble lines={lines} size={saySize} tail="br" />
            </div>
          )}
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      </div>
    );
  }

  // ── SD 문법 — 가벼운 자리(청월당도 반신과 SD 를 섞어 쓴다) ──
  //  ⚠ 예전엔 말풍선이 왼쪽·SD 가 오른쪽인데 꼬리가 bl(왼쪽 아래)이라 **SD 반대편 허공**을
  //    가리켰다(2026-08-29 실측). 章머리(ChapterSay)와 같은 배치·같은 규격으로 통일한다 —
  //    lg 228px + SD 118px, 꼬리 끝(46+13, 185)이 SD 얼굴 중심(59)에 떨어진다.
  //    좌표 근거는 ChapterSay 주석 참조(같은 자를 쓴다 — 여기만 md 로 두면 같은 화면에서
  //    같은 화자의 목소리 크기가 16.5/18.8 로 갈린다).
  const face = assetSrc(`/products/jiknyeo/${sd}-cut.webp`) ?? assetSrc(`/products/jiknyeo/${sd}-cut.png`);
  return (
    <div style={{ margin: "20px 0 0" }}>
      <div style={{ position: "relative", height: 309 }}>
        <div style={{ position: "absolute", left: 46, top: 0 }}>
          <Bubble lines={lines} size="lg" tail="bl" />
        </div>
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face}
            alt=""
            draggable={false}
            style={{ position: "absolute", left: 0, top: 155, width: 118, height: 154, objectFit: "contain", objectPosition: "bottom", zIndex: 2 }}
          />
        ) : null}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

/** 말풍선 자산 — **그림으로 굽고 글자만 얹는다**(청월당 공식, 해부 §2).
 *
 *  왜 PNG 인가: CSS `border-radius:50%` 는 **기계적으로 완벽한 타원**이라 웹툰으로 안 읽힌다.
 *  실물 웹툰 말풍선은 손으로 그은 잉크선이라 미세하게 삐뚤고, 그 질감이 「웹툰 보는 느낌」의 일부다.
 *  꼬리도 그림의 일부라 방향·좌표를 코드로 조준할 필요가 사라진다(그게 어색함의 주범이었다).
 *
 *  값은 실측이다 — 굽기·측정은 `python 직녀/tools/bubble-cut.py`.
 *  textBox 는 잉크선 **안쪽**(꼬리를 뺀 몸통) 범위라, 여기 글자를 앉혀야 아래로 안 밀린다. */
const SAY_ART = {
  "lg-br": { src: "/products/jiknyeo/say-lg-br.png", ratio: 1.215, box: { x: 5.7, y: 6.1, w: 89.0, h: 65.9 } },
  "lg-bl": { src: "/products/jiknyeo/say-lg-bl.png", ratio: 1.213, box: { x: 5.4, y: 6.3, w: 89.1, h: 65.7 } },
  "lg-tr": { src: "/products/jiknyeo/say-lg-tr.png", ratio: 1.215, box: { x: 5.7, y: 28.0, w: 89.0, h: 65.9 } },
  "lg-tl": { src: "/products/jiknyeo/say-lg-tl.png", ratio: 1.213, box: { x: 5.4, y: 28.0, w: 89.1, h: 65.7 } },
  "md-bl": { src: "/products/jiknyeo/say-md-bl.png", ratio: 1.310, box: { x: 7.1, y: 9.3, w: 86.0, h: 76.1 } },
  "md-tl": { src: "/products/jiknyeo/say-md-tl.png", ratio: 1.310, box: { x: 7.1, y: 14.6, w: 86.0, h: 76.1 } },
  none: { src: "/products/jiknyeo/say-none.png", ratio: 1.321, box: { x: 6.9, y: 9.6, w: 86.5, h: 76.4 } },
} as const;

export function Bubble({
  lines,
  size = "lg",
  tail = "bl",
}: {
  /** 말맛대로 끊은 줄 배열 — 원본도 폭이 아니라 호흡으로 끊는다 */
  lines: string[];
  /** lg = 본문 컷용 · md = 카드 묶음·章머리용 */
  size?: "lg" | "md";
  /** 꼬리 방향 — **화자의 얼굴이 있는 쪽**을 고른다.
   *  tl/tr(위) · bl/br(아래) · none.
   *  ⚠ 「말풍선이 오른쪽이면 bl」 같은 규칙은 틀렸다(형님 지적 2026-08-29) — 우리 컷은 얼굴이
   *  위쪽(y10~40)에 있어서 말풍선이 그 아래 앉으면 **꼬리가 위를 향해야** 한다.
   *  md 는 tr/br 그림이 없어 좌우 반전해서 쓴다(글자는 안 뒤집는다). */
  tail?: "bl" | "br" | "tl" | "tr" | "none";
}) {
  const up = tail === "tl" || tail === "tr";
  const right = tail === "br" || tail === "tr";
  const key =
    tail === "none"
      ? "none"
      : size === "lg"
        ? ((up ? "lg-t" : "lg-b") + (right ? "r" : "l")) as "lg-br" | "lg-bl" | "lg-tr" | "lg-tl"
        : up
          ? "md-tl"
          : "md-bl";
  const art = SAY_ART[key];
  const flip = size === "md" && right;

  // 실측 폭비 51% 를 화면 폭과 무관하게 지킨다(청월당 원본 측정값). 높이는 그림 비율이 정한다.
  const w = size === "lg" ? "min(228px, 51vw)" : "min(190px, 43vw)";
  const fs = size === "lg" ? "clamp(15px, 4.2vw, 19px)" : "clamp(13.5px, 3.7vw, 16.5px)";
  return (
    <div style={{ position: "relative", width: w, aspectRatio: String(art.ratio), flex: "none" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art.src}
        alt=""
        draggable={false}
        className="select-none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          transform: flip ? "scaleX(-1)" : undefined,
          filter: "drop-shadow(0 6px 18px rgba(10,8,26,.40))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${art.box.x}%`,
          top: `${art.box.y}%`,
          width: `${art.box.w}%`,
          height: `${art.box.h}%`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {lines.map((t, i) => (
          <span
            key={i}
            className="font-myeongjo"
            style={{
              fontSize: fs,
              lineHeight: 1.2,
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
    <Band
      lines={["잊어버리기 전에,", "방금 그 세 달만", "다시 적어 둘게요."]}
      cut="w7"
      sfx="콕—"
      // 가리키는 손가락이 x38~48 y47~58 — 방백을 그 바로 오른쪽에 붙인다.
      // 기본값(오른쪽 위 구석)이면 방백과 행동이 서로 상관없어 보인다
      sfxAt={{ top: 46, right: 40 }}
      // 달력 x13~52 · 가리키는 손가락 x40~48 y82~95 를 피해 오른쪽으로. 예전 좌하단은
      // 달력(이 컷의 연기 그 자체)을 통째로 덮고 있었다
      // 원본 2:3 풀 프레임 실측 — 달력 x8~50 y33~63 · 가리키는 손가락 x38~48 y47~58 ·
      // 얼굴 x38~58 y10~32. 오른쪽 아래(창·배경)가 유일하게 다 비어 있다
      say={{ x: 48, y: 66, tail: "tl" }}
    >
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

/* ── ①-B 열두 달 전부 — 4章 뒤(달 카드 다음) ─────────────── */

/** 달마다 무엇을 하면 되는지 — **점수 구간에서 결정론으로 뽑는다(LLM 0회).**
 *
 *  청월당은 章마다 「사주상식」을 이미지로 구워 붙여 토큰 0 으로 분량을 만든다(해부 §0).
 *  우리는 같은 값을 **계산 결과로** 만든다 — 손님마다 달라서 저쪽 교양 글보다 낫다.
 *  재료는 이미 다 있었다: `inyeon.months` 가 **앞으로 열두 달 전부**를 태그·점수와 함께 들고 온다
 *  (티저 12칸 달력이 쓰는 그 값). 결과지는 그중 TOP3 만 카드로 보여주고 나머지 아홉 달을 버리고 있었다. */
const MONTH_ADVICE: { min: number; head: string; bodies: string[] }[] = [
  {
    min: 20,
    head: "문이 열려요",
    bodies: [
      "약속을 미루지 말고 이 달 안에 잡으세요. 먼저 연락해도 어색하지 않은 달이에요.",
      "망설이던 자리가 있으면 여기서 움직이세요. 이 달은 먼저 손 내미는 쪽이 이득이에요.",
      "미뤄 둔 연락을 이 달에 꺼내세요. 답이 빨리 오는 달이에요.",
    ],
  },
  {
    min: 10,
    head: "자리가 생겨요",
    bodies: [
      "사람이 모이는 자리에 한 번은 나가 보세요. 소개를 받아 두기 좋아요.",
      "새 사람을 만날 통로가 열려요. 부르는 자리에 얼굴만 비쳐도 됩니다.",
      "아는 사람 건너 아는 사람이 닿는 달이에요. 소개 얘기가 나오면 받아 두세요.",
    ],
  },
  {
    min: 3,
    head: "천천히 흘러요",
    bodies: [
      "새로 벌이기보다 하던 걸 이어가세요. 연락이 뜸해도 식은 게 아니에요.",
      "조용한 달이라 조바심이 나기 쉬워요. 그냥 지나가는 구간으로 두면 됩니다.",
      "큰 결정은 다음 달로 미뤄도 늦지 않아요. 지금은 고르는 시기예요.",
    ],
  },
  {
    min: -100,
    head: "숨을 고르세요",
    bodies: [
      "확답을 미루고, 참았던 말을 몰아서 꺼내지 마세요.",
      "서운한 게 쌓이기 쉬운 달이에요. 말을 줄이면 그냥 지나갑니다.",
      "판단을 서두르지 마세요. 이 달에 내린 결론은 다음 달에 달라 보여요.",
    ],
  },
];

/** 태그는 계산에서 나온 근거라 그대로 쓰되, 열두 줄이 다 같은 말이 되지 않게 앞의 둘만 쓴다 */
function monthWhy(r: InyeonRow): string {
  const t = (r.tags ?? []).filter(Boolean).slice(0, 2).join(" · ");
  return humanize(t);
}

export function MonthLedger({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px 14px 18px",
        borderRadius: 14,
        background: "rgba(255,255,255,.55)",
        border: "1px solid rgba(107,76,154,.20)",
      }}
    >
      <p className="font-myeongjo" style={{ fontSize: 13, letterSpacing: "0.18em", color: "#6B4C9A", textAlign: "center", fontWeight: 700 }}>
        열두 달 전부
      </p>
      <p style={{ marginTop: 6, textAlign: "center", fontSize: 12.5, color: "#6C6483" }}>
        좋은 달만 세 개 골라 드렸지만, 나머지 달도 그냥 흘러가지는 않아요.
      </p>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map((r) => {
          const a = MONTH_ADVICE.find((x) => r.score >= x.min) ?? MONTH_ADVICE[MONTH_ADVICE.length - 1];
          // 달 번호로 회전 — 같은 손님은 늘 같은 문장이고, 이웃한 달끼리는 서로 다른 문장이 걸린다
          const body = a.bodies[(r.month + r.year) % a.bodies.length];
          const why = monthWhy(r);
          return (
            <div
              key={`${r.year}-${r.month}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "9px 11px",
                borderRadius: 10,
                background: "rgba(255,255,255,.62)",
                border: "1px solid rgba(107,76,154,.16)",
              }}
            >
              <div style={{ flex: "none", paddingTop: 1 }}>
                <Moon phase={phaseOfScore(r.score)} size={22} />
              </div>
              <div style={{ flex: "none", width: 62 }}>
                <span className="font-myeongjo" style={{ fontSize: 15, fontWeight: 700, color: "#2A2434" }}>
                  {r.month}월
                </span>
                <span style={{ marginLeft: 4, fontSize: 11, color: "#8A82A2" }}>{String(r.year).slice(2)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#5B3F8F", lineHeight: 1.45 }}>{a.head}</p>
                <p style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.6, color: "#4A4360" }}>{body}</p>
                {why ? (
                  <p style={{ marginTop: 3, fontSize: 11.5, lineHeight: 1.55, color: "#8A82A2" }}>— {why}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ② 조심할 달 — 7章 뒤 ─────────────────────────────── */

export function ShakyCards({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <Band
      lines={["이 두 달은", "무서워하지 말아요.", "천천히 가면 돼요."]}
      cut="w2"
      // 인물은 왼쪽(x18~50)뿐이고 오른쪽 절반이 빈 밤하늘 — 여기만 말풍선이 컷 안에 다 들어간다.
      // 예전 좌하단 고정값은 인물 얼굴 위에 얹혀 있었다
      // 인물 x28~62 y28~100(측면). 인물이 **올려다보는 오른쪽 위** 밤하늘에 앉힌다 —
      // 시선이 말풍선으로 이어져 대사가 그 인물 것으로 읽힌다
      say={{ x: 46, y: 4, tail: "bl" }}
    >
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
      // 은사를 든 손이 화면 왼쪽이라 오른쪽으로 비킨다
      // 은사 든 손 x20~42 y48~92 · 얼굴 x38~62 y10~40. 오른쪽(x76~100)이 배경
      say={{ x: 48, y: 60, tail: "tl" }}
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

/* ── ③-B 신살 풀이 — 1章 뒤(끌림 칩 다음) ────────────────── */

/** 칩 한 줄로 끝내던 신살을 **문단으로 편다.** LLM 0회 — 값은 이미 확정값에 있다.
 *
 *  왜: 도화·천을귀인은 손님이 어디선가 들어 본 단어라 「나한테 그게 있대」가 힘이 세다.
 *  그런데 우리는 열두 글자짜리 칩으로만 보여 주고 끝냈다. 저쪽(청월당)은 같은 자리를
 *  교양 글로 몇 천 px 채운다 — 우리는 **그 사람 명식에서 나온 값**으로 채운다.
 *  ⚠ 없는 신살은 아예 안 그린다(빈 자리를 보이면 「나는 없구나」가 된다). */
const CHARM_LORE: Record<string, { what: string; mine: string; use: string }> = {
  도화: {
    what: "도화(桃花)는 사람 눈에 먼저 걸리는 자리예요. 옛 책은 이걸 「복숭아꽃」이라 불렀어요 — 피면 멀리서도 보이니까요.",
    mine: "○○님 명식에 이 자리가 켜져 있어요. 애써 꾸미지 않아도 처음 보는 자리에서 한 번은 눈에 담기는 쪽이에요.",
    use: "그러니 먼저 말을 걸기보다 **말을 걸어오게 두는 쪽**이 유리해요. 자리에 나가 있기만 해도 절반은 됩니다.",
  },
  홍염: {
    what: "홍염(紅艶)은 첫인상보다 **두 번째·세 번째 만남에서 짙어지는** 매력을 말해요.",
    mine: "○○님은 한 번 보고 끝나는 인상이 아니라, 볼수록 궁금해지는 결이에요.",
    use: "그래서 짧은 소개팅 한 번으로 판단당하면 손해예요. **다시 만날 구실**을 만드는 게 이득입니다.",
  },
  천을귀인: {
    what: "천을귀인(天乙貴人)은 열두 신살 중 가장 귀하게 치는 자리예요. 결정적인 순간에 **누가 다리를 놓아 주는** 흐름이에요.",
    mine: "○○님에겐 이 자리가 있어요. 혼자 애쓰다 막힐 때 사람이 붙는 쪽이에요.",
    use: "그러니 인연도 **아는 사람을 통해** 오는 쪽이 자연스러워요. 소개 얘기가 나오면 흘리지 마세요.",
  },
  금여성: {
    what: "금여성(金輿星)은 「귀한 수레」라는 뜻이에요. 대접받는 자리에 앉는 흐름을 말합니다.",
    mine: "○○님은 관계에서 함부로 대해지지 않는 결이에요. 상대가 알아서 조심하는 쪽이에요.",
    use: "그러니 **맞춰 주는 쪽으로 먼저 굽히지 않아도** 됩니다. 기다리면 상대가 맞춰 오는 구조예요.",
  },
};

export function CharmLore({ inyeon, who }: { inyeon: InyeonFacts; who: string }) {
  const have: string[] = [];
  if (inyeon.dohwaCount > 0) have.push("도화");
  if (inyeon.hongyeomCount > 0) have.push("홍염");
  if (inyeon.hasCheoneul) have.push("천을귀인");
  if (inyeon.hasGeumyeo) have.push("금여성");
  if (!have.length) return null;                 // 없는 사람에게 빈 자리를 보이지 않는다
  const name = (who || "").trim() || "그대";
  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px 15px 18px",
        borderRadius: 14,
        background: "rgba(255,255,255,.55)",
        border: "1px solid rgba(107,76,154,.20)",
      }}
    >
      <p className="font-myeongjo" style={{ fontSize: 13, letterSpacing: "0.18em", color: "#6B4C9A", textAlign: "center", fontWeight: 700 }}>
        이 신호가 뭐냐면
      </p>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
        {have.map((k) => {
          const t = CHARM_LORE[k];
          const fill = (x: string) => x.replace(/○○/g, name);
          return (
            <div key={k}>
              <p className="font-myeongjo" style={{ fontSize: 15, fontWeight: 700, color: "#2A2434" }}>
                {k}
              </p>
              <p style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.75, color: "#4A4360" }}>{t.what}</p>
              <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.75, color: "#4A4360" }}>{fill(t.mine)}</p>
              <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.75, color: "#4A4360" }}>
                {fill(t.use).split("**").map((seg, i) =>
                  i % 2 ? (
                    <b key={i} style={{ color: "#5B3F8F" }}>{seg}</b>
                  ) : (
                    <span key={i}>{seg}</span>
                  ),
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
export function CutInterlude({
  id,
  say,
  ratio = "3 / 2",
  pos = "center 22%",
  sfx,
}: {
  id: string;
  say: string;
  ratio?: string;
  pos?: string;
  /** 손글씨 방백 — 말풍선 없이 컷 위에 기울여 얹는다.
   *  청월당 웹툰 문법 4종 중 하나인데(해부 §3) 우리는 밴드 한 곳에서만 쓰고 있었다. */
  sfx?: string;
}) {
  const src = assetSrc(`/products/jiknyeo/${id}.webp`) ?? assetSrc(`/products/jiknyeo/${id}.png`);
  if (!src) return null;
  return (
    // 풀블리드 — 청월당은 테두리 컷과 **가장자리까지 꽉 찬 컷**을 번갈아 써서 리듬을 만든다
    // (해부 §3: 우리에게 없던 장치 3개 중 하나). 페이지 좌우 패딩(12px)을 음수 마진으로 상쇄한다.
    // ⚠ 앞 여백 18px 은 컷을 앞 문단에 붙여 놨다 — 웹툰 실측(칠흑 48·54화)에서 컷 앞뒤가
    //   화면의 3분의 1까지 비고, 감정이 무거운 구간일수록 **여백이 넓어져 침묵이 된다.**
    //   글 → (숨) → 그림 순서가 되게 벌린다. 아래는 페이드가 이미 다음 블록으로 이어 준다.
    <figure style={{ margin: "44px -12px 0" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#EFE9DC" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full select-none object-cover"
          style={{ aspectRatio: ratio, objectPosition: pos, display: "block" }}
        />
        {/* ⚠ 페이드를 **걷어냈다**(2026-08-29 형님 검수: 「그림이 죽는다」).
            청월당의 페이드 이음새는 **밝은 그림 → 밝은 종이**라서 성립한다. 우리 컷은 밤이라
            같은 페이드가 회색 안개로 뜨고, 베틀·문살·달빛을 지웠다(아래 34%·위 10% 실측 확인).
            대사를 컷 밖 한지 띠로 내렸으므로 받침도, 이음새도 필요 없다 — 컷은 컷답게 선명히 끝낸다. */}
        {sfx && (
          <span
            className="font-brush absolute"
            style={{
              top: "9%",
              right: "6%",
              fontSize: 22,
              color: "#F0E3B8",
              transform: "rotate(7deg)",
              textShadow: "0 2px 10px rgba(10,8,26,.9)",
              letterSpacing: "0.06em",
            }}
          >
            {sfx}
          </span>
        )}
      </div>
      {/* 대사는 **컷 밖 한지 띠**에 앉힌다. 그림 위에 얹으면 받치려고 안개를 깔게 되고,
          그 안개가 그림을 절반 죽인다 — 청월당도 컷 대사는 컷 밖에 둔다.
          `keep-all` 이 없으면 한글이 글자 단위로 꺾여 「실을 짭 / 니다」가 된다(실측). */}
      <figcaption
        className="font-myeongjo px-6 pt-3 text-center"
        style={{ fontSize: 17, lineHeight: 1.62, color: "#3A3350", fontWeight: 600, wordBreak: "keep-all" }}
      >
        {say}
      </figcaption>
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
  // 표정 분기 — 10章 전부 웃는 얼굴이면 감정이 단조롭다. 무겁게 짚는 장은 생각하는 얼굴로.
  // (sdThink-cut 은 진작 있었는데 안 쓰고 있었다)
  const grave = /놓치는 패턴|늦어지는 이유|조심할 달|피해야 할|흔들리|고민|물음/.test(title);
  const sd = grave ? "sdThink" : "sdSmile";
  const face = assetSrc(`/products/jiknyeo/${sd}-cut.webp`) ?? assetSrc(`/products/jiknyeo/${sd}-cut.png`);
  return (
    // 캐릭터와 말풍선이 **붙어 있어야** 대사로 읽힌다. 예전엔 58px SD 옆에 190px 말풍선이
    // 나란히 서 있고 꼬리는 SD 가 아니라 그 오른쪽 허공을 가리켰다 — 둘이 남남으로 보였다.
    // 말풍선을 오른쪽 위로 올리고 SD 를 그 꼬리 밑에 겹쳐 세운다(웹툰 기본 배치).
    // 청월당은 SD 를 세워만 두지 않는다 — **캐릭터에서 말풍선이 나오는 한 덩어리**로 그린다.
    // 이제 꼬리가 그림에 그려져 있으므로 **그 끝점에 SD 를 맞추기만** 하면 된다.
    //   2026-08-29 형님 검수: md(190px) + SD 92px 조합은 **덩어리가 빈 종이에 떠 보였다** —
    //   말풍선만 크고 화자가 작아 균형이 깨지고, 오른쪽 절반이 통째로 비었다. 둘 다 한 단 키운다.
    //   say-lg-bl 실측(bubble 알파 최하단): 616×508(비율 1.213) · 꼬리 끝 (5.7%, 98.6%)
    //   폭 228px → 높이 188px · 꼬리 끝 = (13, 185).
    //   SD 118px 의 얼굴 중심이 x≈59 이므로 말풍선을 left 46 에 두면 끝점 x=59 로 맞물린다.
    //   SD top 은 「머리 꼭대기가 꼬리 끝보다 31px 위」(기존 24px 를 154/120 로 스케일).
    //   글자도 16.5 → 18.8px 이 되어 대사 눈금(17~19)에 들어온다.
    <div style={{ position: "relative", marginBottom: 18, height: 309 }}>
      <div style={{ position: "absolute", left: 46, top: 0 }}>
        <Bubble lines={lines} size="lg" tail="bl" />
      </div>
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={face}
          alt=""
          draggable={false}
          style={{ position: "absolute", left: 0, top: 155, width: 118, height: 154, objectFit: "contain", objectPosition: "bottom", zIndex: 2 }}
        />
      ) : null}
    </div>
  );
}

/** 컷 한 장 + 말풍선. 카드가 안 따라붙는 자리(짝 얼굴 직전 같은 곳)에서 쓴다.
 *  Band 는 children(카드)을 전제하므로 그 자리엔 안 맞는다. */
export function CutSay({
  id,
  lines,
  ratio = "2 / 3",
  pos = "center",
  fade = 8,
  say = { x: 0, y: 74, tail: "tr" },
}: {
  id: string;
  lines: string[];
  ratio?: string;
  pos?: string;
  fade?: number;
  /** 말풍선 자리 — 컷 폭·높이 기준 %. 자는 `python 직녀/tools/say-grid.py` */
  say?: { x: number; y: number; tail?: "bl" | "br" | "tl" | "tr" };
}) {
  const src = assetSrc(`/products/jiknyeo/${id}.webp`) ?? assetSrc(`/products/jiknyeo/${id}.png`);
  if (!src) return null;
  return (
    // 말풍선이 컷 아래로 삐져나오는 만큼 자리를 비운다 — 안 비우면 다음 블록(얼굴 카드) 위를 덮는다.
    // 컷 높이 470 · say.y 74% · 말풍선 207px → 85px 초과. 96 이면 겹침 0.
    <div style={{ position: "relative", marginTop: 18, paddingBottom: 20 }}>
      <div style={{ position: "relative", margin: "0 -12px" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#EFE9DC" }}>
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
      <div style={{ position: "absolute", left: `${say.x}%`, top: `${say.y}%`, zIndex: 2 }}>
        <Bubble lines={lines} size="lg" tail={say.tail ?? (say.x > 40 ? "bl" : "br")} />
      </div>
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
              <Bubble lines={[`${name}님, 왜`, "이제 오셨어요!"]} size="lg" tail="tl" />
            </div>
          );
        }
        return (
          <div style={{ position: "relative", paddingBottom: 22 }}>
            <div style={{ position: "relative", margin: "0 -18px" }}>
            <div style={{ position: "relative", overflow: "hidden", background: "#EFE9DC" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt=""
                draggable={false}
                className="w-full select-none"
                style={{ aspectRatio: "2 / 3", objectFit: "cover", objectPosition: "center", display: "block" }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: "8%", background: "linear-gradient(180deg, rgba(250,247,240,0), rgba(250,247,240,.92) 76%, #faf7f0)" }}
              />
            </div>
            {/* 격자 실측: 얼굴 x30~62 y10~40 · 손 x28~48 y50~72 · 땋은머리 x62~78.
                손 반대쪽(오른쪽)에 앉히고, 꼬리는 **얼굴이 있는 위쪽**으로. */}
            <div style={{ position: "absolute", left: "48%", top: "56%", zIndex: 2 }}>
              <Bubble lines={[`${name}님, 왜`, "이제 오셨어요!"]} size="lg" tail="tl" />
            </div>
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
          <div style={{ position: "relative", marginTop: 16, paddingBottom: 22 }}>
            <div style={{ position: "relative", margin: "0 -18px" }}>
            <div style={{ position: "relative", overflow: "hidden", background: "#EFE9DC" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={open}
                alt=""
                draggable={false}
                className="w-full select-none"
                style={{ aspectRatio: "2 / 3", objectFit: "cover", objectPosition: "center", display: "block" }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: "8%", background: "linear-gradient(180deg, rgba(250,247,240,0), rgba(250,247,240,.92) 76%, #faf7f0)" }}
              />
            </div>
            {/* 격자 실측: 두루마리 x5~92 y45~92 가 아래 절반을 다 먹어 컷 안에 자리가 없다.
                두루마리 **아래 모서리만** 스치도록 걸친다 — 펼친 손과 종이는 살린다 */}
            <div style={{ position: "absolute", left: "49%", top: "72%", zIndex: 2 }}>
              <Bubble lines={["오늘 밤 것부터,", "하나씩 펼쳐", "볼게요."]} size="lg" tail="tl" />
            </div>
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
        // 배웅 컷이 페이드로 스며 사라진 **뒤 한 박자**. 48화 엔딩은 컷을 끊지 않고 여백으로
        // 여운을 남긴다(54화의 반전 절단과 정반대 문법 — 저쪽은 도발, 이쪽은 배웅).
        // 산군은 절단, 직녀는 여운 — 상품 성격이 엔딩 문법을 가른다.
        margin: "56px 0 0",
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
