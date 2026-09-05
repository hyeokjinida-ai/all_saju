"use client";

// 견우(재회) 티저 델타 5블록 — 2026-09-02 신설.
//
// 티저 뼈대(밝은 달빛 판·원국 증거·콜드리딩·구매 카드·잠금 줄)는 직녀판을 그대로 쓰고,
// **재회 전용 다섯 블록만 여기서 갈아 끼운다**(기획서 §6):
//   T1 오프닝 달력 · T2 이별 무렵 채점 · T3 연적 · T4 환승 · T5 반전 절단
//
// 규칙 셋(어기면 상품이 무너진다):
//  ① 값은 전부 `teaser.reunion`(=computeReunionFacts)에서만 온다. 여기서 새로 세지 않는다 —
//     티저가 「먼저 연락하면 안 되는 달」이라 한 달을 결과지가 다르게 부르면 그 자리에서 끝난다.
//  ② 잠긴 칸의 종류(kind)는 **글자로도 그림으로도** 쓰지 않는다. 달 그림을 그리면 범례로 읽혀
//     잠금이 풀린 것과 같다 — 잠긴 칸은 가림 바 하나만 둔다.
//  ③ 말은 견우다: 담백한 존댓말(~합니다/~요). 재촉·압박·느끼한 말 금지, 분량 앵커 금지.
//
// ⚠ 직녀 그림(InyeonCut·SlotCut·SD 캐릭터)은 이 파일에서 한 장도 안 쓴다.
//    화자가 다른데 직녀 얼굴이 나오면 그게 제일 큰 사고다.
//    견우 컷은 `public/products/reunion/` 에만 있다
//    (2026-09-04 인물 컷 3장 · 2026-09-05 판넬 6장 입고 = 티저 아홉 컷).
//    (예외 하나 — **말풍선 PNG**(`say-lg-*.png`)는 직녀 폴더에 있지만 인물이 아니라
//     손으로 그은 잉크선 부품이다. 얼굴이 없으니 화자가 갈리지 않는다. 아래 SAY_ART 참조.)
//
// 2026-09-05 3차 — **웹툰부 / 상품부 두 단으로 갈랐다**(형님 실측 「그림 끼운 랜딩이다」).
//   ① 밝은 카드판 위에 밤 컷이 붙임 사진처럼 떴다 → 웹툰부는 **자기 밤 배경**을 갖는다.
//   ② 대사가 그림 밖 캡션이었다 → 웹툰부 대사는 **그림 위**(말풍선·나레이션)로 올렸다.
//   ③ 컷과 UI 카드가 뒤섞여 흐름이 끊겼다 → 컷을 앞으로 모으고 표·카드는 절단 뒤로 내렸다.
// 부품도 그래서 둘이다: 웹툰부 = WebtoonPanel(그림 위 대사) · 상품부 = GyeonuCut(한지 띠 캡션).
import { useState } from "react";
import { track } from "@/lib/analytics";
import {
  BrushHead,
  Cap,
  HanjiCard,
  OpenMonthCard,
  T,
  TocChapter,
  INK,
  BODY,
  LINE,
  MUTE,
  PINK,
} from "@/components/products/jiknyeo-teaser-kit";
import { NeonMask } from "@/components/products/jiknyeo-ui";
import { Moon } from "@/components/products/JiknyeoForecast";
import type { SayBox } from "@/lib/jiknyeo-say-box";
import type { SajuTeaser } from "@/lib/saju/teaser";

type Reunion = NonNullable<SajuTeaser["reunion"]>;

/** 호칭 — 이름을 받았으면 「○○님」, 아니면 「손님」. 한 파일 안에서 말이 갈리지 않게 여기 하나만 둔다. */
const callMe = (name: string) => (name ? `${name}님` : "손님");

/** 가려 둔 값 — ▓ 글리프를 그대로 찍으면 자리표시자로 읽힌다(산군 InkMask 와 같은 판단).
 *  견우는 밤·강의 색이라 먹붉은 산군 자국 대신 **은청 가림 바**를 쓴다.
 *  단위 글자(월·년)는 남긴다 — 「달까지 적혀 있는데 가려져 있다」가 눈에 보여야 한다. */
function MaskWord({ text, tone = "dark" }: { text: string; tone?: "dark" | "light" }) {
  const parts = text.match(/▓+|[^▓]+/g) ?? [];
  return (
    <span className="inline-flex items-center gap-[0.16em] whitespace-nowrap align-middle">
      {parts.map((p, i) =>
        p.startsWith("▓") ? (
          <span
            key={i}
            aria-hidden
            className="inline-block align-middle"
            style={{
              width: `${Math.max(1.5, p.length * 0.72)}em`,
              height: "0.98em",
              borderRadius: 3,
              background:
                tone === "dark"
                  ? "linear-gradient(97deg,#2b3350,#3d4a72 40%,#232a44)"
                  : "linear-gradient(97deg,#cfd6e6,#b9c2da 45%,#cfd6e6)",
              boxShadow: tone === "dark" ? "inset 0 1px 3px rgba(0,0,0,0.55)" : "inset 0 1px 2px rgba(0,0,0,0.18)",
            }}
          />
        ) : (
          <span key={i} style={{ color: "inherit" }}>
            {p}
          </span>
        ),
      )}
    </span>
  );
}

/** 티저에 심는 아홉 컷 — 파일명이 곧 신분증이다(`public/products/reunion/<id>.webp`).
 *
 *  인물 컷 셋(g-*)은 견우가 나오는 자리, 판넬 여섯(p-*)은 **무인 풍경**이라 서사를 밀고 간다.
 *  여기 없는 이름을 쓰면 404 가 나고 그 자리는 밤색 빈 칸으로 남는다 — 타입으로 막는다. */
export type GyeonuCutId =
  | "p-split" // 강이 두 갈래로 갈라진 밤 — 이별
  | "g-river" // 강가에서 건너편을 보는 견우
  | "p-lanterns" // 강에 뜬 등불 열둘, 하나만 밝다 — 열두 달
  | "p-farshore" // 강 건너 멀리 선 뒷모습 — 그 사람 쪽
  | "g-farewell" // 별길에서 돌아보는 견우 — 배웅
  | "p-magpie" // 서찰을 묶고 나는 까치 — 소식
  | "p-bridge" // 까치가 은하수 위로 놓는 다리 — 정점
  | "g-greet" // 장부에 손을 얹고 마주 보는 견우
  | "p-close"; // 장부를 덮는 손 — 마감

/* ═════════════════════════════════════════════════════════
   웹툰부 — 티저의 **위 절반**. 컷 일곱 장 + 반전 절단으로 끝난다.

   왜 이렇게 갈랐나(형님 실측 2026-09-05, 현재판 937a2af 판정 「그림 끼운 랜딩」):
     ① 밝은 달빛 판 위에 밤 컷이 얹혀 있어서 컷마다 **붙임 사진**처럼 떴다.
        → 웹툰부는 자기 밤 배경(진남색→먹색)을 통째로 깔고, 컷 사이 여백까지 그 밤이다.
          컷이 서로 다른 장면이 아니라 **한 밤의 연속**으로 읽히는 게 이 배경의 일이다.
     ② 대사가 그림 밖 캡션이었다 — 「사진 + 설명글」은 웹툰이 아니라 상세페이지 문법이다.
        → 대사를 그림 **위**로 올렸다. 인물 컷은 말풍선, 풍경 컷은 하단 나레이션.
     ③ 컷과 UI 카드(달력·표·잠금 줄)가 번갈아 나와 읽는 흐름이 계속 끊겼다.
        → 컷을 앞으로 다 모으고, 표·카드는 절단 뒤 **상품부**로 내렸다.

   순서는 이야기 그대로다: 갈라진 강(사건) → 화자 등장 → 등불(열두 달) → 강 건너(그 사람)
   → 까치(소식) → 오작교(정점) → 대면(복채) → 검정 절단. 값은 여기서 한 개도 안 연다.
   ═════════════════════════════════════════════════════════ */

/** 컷 사이 여백에만 보이는 별 — 컷은 불투명이라 그 위는 그림이 덮는다.
 *
 *  왜 두 겹인가: 한 겹이면 타일이 반복되는 게 격자로 잡힌다. 크기가 서로 안 나누어떨어지는
 *  두 겹을 겹치면 반복 주기가 길어져 눈에 안 걸린다.
 *  ⚠ 진하게 뿌리면 이음새를 죽이는 게 아니라 **얼룩**이 된다 — 점 8개·opacity 0.6 이 상한이다. */
const STARS_A =
  "radial-gradient(1.1px 1.1px at 22px 34px, rgba(238,240,252,0.70), transparent 60%)," +
  "radial-gradient(0.8px 0.8px at 118px 18px, rgba(238,240,252,0.48), transparent 60%)," +
  "radial-gradient(1px 1px at 68px 132px, rgba(214,206,242,0.52), transparent 60%)," +
  "radial-gradient(0.7px 0.7px at 156px 96px, rgba(238,240,252,0.40), transparent 60%)," +
  "radial-gradient(0.9px 0.9px at 12px 176px, rgba(238,240,252,0.44), transparent 60%)";
const STARS_B =
  "radial-gradient(0.8px 0.8px at 40px 22px, rgba(238,240,252,0.46), transparent 60%)," +
  "radial-gradient(1px 1px at 96px 108px, rgba(200,192,238,0.40), transparent 60%)," +
  "radial-gradient(0.7px 0.7px at 8px 74px, rgba(238,240,252,0.34), transparent 60%)";

/** 컷 로드 전 자리 색 — 밤 배경과 같은 계열이라 흰 사각형이 번쩍이지 않는다. */
const NIGHT_DEEP = "#06080f";

type SayTail = "bl" | "br" | "tl" | "tr";

/** 말풍선 자산 — **직녀 결과지(JiknyeoInterlude)의 SAY_ART 실측표와 같은 값**이다.
 *
 *  왜 import 하지 않고 옮겨 적었나: 그 파일은 `node:fs` 를 쓰는 **서버 컴포넌트**라
 *  "use client" 인 여기서 부르면 fs 가 클라이언트 번들에 딸려 들어가 빌드가 죽는다.
 *  값의 정본은 저쪽이다 — 말풍선을 다시 구우면 `python 직녀/tools/bubble-cut.py` 로 재고
 *  두 곳을 같이 고친다.
 *  box = 잉크선 **안쪽**(꼬리를 뺀 몸통) 범위. 여기 글자를 앉혀야 아래로 안 밀린다. */
const SAY_ART: Record<SayTail, { src: string; ratio: number; box: { x: number; y: number; w: number; h: number } }> = {
  br: { src: "/products/jiknyeo/say-lg-br.png", ratio: 1.215, box: { x: 5.7, y: 6.1, w: 89.0, h: 65.9 } },
  bl: { src: "/products/jiknyeo/say-lg-bl.png", ratio: 1.213, box: { x: 5.4, y: 6.3, w: 89.1, h: 65.7 } },
  tr: { src: "/products/jiknyeo/say-lg-tr.png", ratio: 1.215, box: { x: 5.7, y: 28.0, w: 89.0, h: 65.9 } },
  tl: { src: "/products/jiknyeo/say-lg-tl.png", ratio: 1.213, box: { x: 5.4, y: 28.0, w: 89.1, h: 65.7 } },
};

/**
 * 컷별 말풍선 자리 — **그림을 재서 박은 값**(1080×1620 원본 실측 2026-09-05).
 * x·w 는 컷 폭 기준 %, y 는 컷 높이 기준 %(직녀 SAY_BOX 와 같은 좌표계).
 *
 *   컷        얼굴            손                  앉힌 자리
 *   g-river   x54~70 y12~23   x29~44 y77~94       컷 **위 숨**으로 올림(꼬리 br → 아래 얼굴 쪽)
 *   g-greet   x39~61 y26~42   x42~77 y76~91       컷 **위 숨**으로 올림(꼬리 br → 아래 얼굴 쪽)
 *
 * 규칙(2026-08-24 확정): **눈·입·손 위에는 절대 안 얹는다.** 머리카락 윤곽을 한 조각
 * 스치는 건 허용 — 인물을 통째로 피해 허공에 띄우면 대사가 아니라 UI 라벨로 보인다.
 * 그림을 새로 구우면 이 표부터 다시 잰다.
 *
 * y 가 **음수인 이유**(2026-09-05): 경쟁사 셋(청월당·타이트사주·프로 웹툰)을 같은 자로
 * 재 보니 말풍선이 컷 안에 갇혀 있지 않다 — 컷 경계를 넘어 앞 숨으로 걸친다.
 * 컷 안에만 두면 웹툰이 아니라 「이미지에 캡션 얹은 랜딩」으로 읽힌다.
 *
 * ⚠ 넘기는 양이 규칙이다: **풍선 높이의 20~35% 만** 컷 밖으로 낸다.
 *   처음엔 87% 를 숨에 띄웠다가 되물렸다 — 통째로 띄우면 대사가 컷에서 떨어져 나와
 *   카드뉴스처럼 흩어진다. 걸쳐야 대사가 그 컷의 말이 된다.
 *   그리고 **일곱 컷 중 두 곳만** 쓴다. 문법을 깨는 장치라 흔해지면 힘이 죽는다.
 *
 *   g-river  풍선 123px · 34px(28%) 밖 — 걸치는 x2.5~42.5 는 하늘, 얼굴은 x54~70 이라 안 겹침
 *   g-greet  풍선 136px · 45px(33%) 밖 — 걸치는 y-8~16% 는 하늘, 얼굴은 y26~42
 */
const GYEONU_SAY_BOX: Record<"g-river" | "g-greet", SayBox> = {
  "g-river": { x: 2.5, y: -6.0, w: 40 },
  "g-greet": { x: 2, y: -8.0, w: 44 },
};

/** 한 줄의 가로 길이(em) — 한글 1 · 영숫자 0.55 · 공백 0.34 · 마침표류 0.4.
 *  글씨 크기를 이 값에서 거꾸로 뽑는다(아래 GyeonuBubble). */
function emWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (ch === " ") w += 0.34;
    else if (/[.,!?·]/.test(ch)) w += 0.4;
    else if (/[A-Za-z0-9]/.test(ch)) w += 0.55;
    else w += 1;
  }
  return w;
}

/** 그림 위 말풍선 — 인물 컷 전용(컷당 하나, 짧게).
 *
 *  글씨 크기를 **폭에서 계산**하는 이유: 원 안에 든 글자는 넘치면 원을 뚫는다(직녀 w3 실측:
 *  대사가 원 밖으로 29px 나가 화면 가로를 넘겼다). 폭·줄 수·글자 길이로 들어갈 수 있는
 *  최대 크기를 먼저 구하고 96% 만 쓴다 — 손님 이름이 길어져도 안 터진다.
 *  단위는 cqw(컷 폭의 1%)라 폰이든 태블릿이든 컷과 같은 비율로 커진다. */
function GyeonuBubble({ lines, tail, box }: { lines: string[]; tail: SayTail; box: SayBox }) {
  const art = SAY_ART[tail];
  const innerW = (art.box.w / 100) * box.w; // 잉크선 안쪽 가로(cqw)
  const innerH = (art.box.h / 100) * (box.w / art.ratio); // 잉크선 안쪽 세로(cqw)
  const cols = Math.max(...lines.map(emWidth));
  const k = Math.min(innerW / cols, innerH / (1.3 * lines.length)) * 0.96;
  return (
    <div
      data-say
      className="pointer-events-none absolute"
      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%` }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: String(art.ratio) }}>
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
            // 밤 컷 위라 흰 원이 그냥 뜨면 스티커가 된다 — 그림자로 그림 위에 앉힌다.
            filter: "drop-shadow(0 6px 16px rgba(4,6,14,0.62))",
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
                fontSize: `clamp(11px, ${k.toFixed(2)}cqw, 21px)`,
                lineHeight: 1.3,
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
    </div>
  );
}

/** 웹툰부 컷 한 장 — 그림 + (말풍선 | 나레이션).
 *
 *  나레이션이 **밝은 띠 박스가 아닌** 이유: 띠를 깔면 컷이 거기서 끝나 버려 밤이 끊긴다.
 *  웹툰 나레이션은 그림 아래쪽을 어둡게 눌러 그 위에 흰 글씨를 얹는다 — 컷은 그대로 이어진다.
 *  ⚠ width/height 를 반드시 박는다. 없으면 로드 전 높이가 0 이라 읽는 도중 아래가 밀린다. */
function WebtoonPanel({
  id,
  alt,
  /** 앞 숨 — 컷 **관계**로 정한다. 하나로 통일하면 안 된다(아래 숨 대역표). */
  gap = 128,
  eager = false,
  narrate,
  say,
  /** 가로 밴드로 눌러 쓸 때 — `ratio`는 폭:높이, `focus`는 원본에서 살릴 세로 위치(%).
   *  안 주면 원본 비율(2:3) 그대로 깐다. 빨리 지나갈 컷(설명·전경·브리지)에만 쓴다. */
  band,
  /** 컬럼 폭의 몇 %로 좁혀 앉힐지 — 안 주면 풀블리드.
   *  높이만 흔들면 「폭 375 고정」이 남아서 랜딩페이지로 읽힌다. 조용한 컷은 폭을 좁힌다. */
  inset,
}: {
  id: GyeonuCutId;
  alt: string;
  gap?: number;
  eager?: boolean;
  narrate?: React.ReactNode;
  say?: { lines: string[]; tail: SayTail; box: SayBox };
  band?: { ratio: string; focus: number };
  inset?: number;
}) {
  return (
    <figure
      data-panel={id}
      style={{
        position: "relative",
        marginTop: gap,
        // 대사 크기의 자 — 없으면 cqw 가 위쪽 조상을 잡아 엉뚱한 크기가 된다.
        containerType: "inline-size",
        background: NIGHT_DEEP,
        ...(inset ? { width: `${inset}%`, marginLeft: "auto", marginRight: "auto" } : null),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/products/reunion/${id}.webp`}
        alt={alt}
        width={1080}
        height={1620}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="select-none"
        style={
          band
            ? // 밴드 컷 — aspectRatio 로 자리를 먼저 잡으므로 로드 전에도 높이가 확정된다(점프 0).
              {
                display: "block",
                width: "100%",
                aspectRatio: band.ratio,
                objectFit: "cover",
                objectPosition: `50% ${band.focus}%`,
              }
            : { display: "block", width: "100%", height: "auto" }
        }
      />
      {narrate && (
        <figcaption
          data-narrate
          className="absolute inset-x-0 bottom-0"
          style={{
            padding: "56px 20px 20px",
            background:
              "linear-gradient(180deg, rgba(4,6,12,0) 0%, rgba(4,6,12,0.58) 36%, rgba(4,6,12,0.90) 72%, rgba(4,6,12,0.96) 100%)",
          }}
        >
          <p
            className="font-myeongjo"
            style={{
              margin: 0,
              color: "#F5F2EC",
              fontSize: "clamp(15px, 4.6cqw, 19px)",
              lineHeight: 1.6,
              fontWeight: 600,
              wordBreak: "keep-all",
              textShadow: "0 1px 10px rgba(0,0,0,0.85)",
            }}
          >
            {narrate}
          </p>
        </figcaption>
      )}
      {say && <GyeonuBubble {...say} />}
    </figure>
  );
}

/**
 * 웹툰부 전체 — 티저 맨 위, 밝은 판(teaser-light)보다 **먼저** 온다.
 *
 * 청월당 재회 티저 문법 그대로다: **웹툰 먼저, 상품 나중.** 손님은 값을 보기 전에
 * 이야기를 한 번 다 읽고, 절단에서 끊긴 채로 상품부에 들어간다.
 *
 * `-mx-5`(=20) 은 위저드 컨테이너의 px-5 를 되물리는 값이다 — 웹툰부는 컬럼 끝까지 나간다.
 * (밝은 판은 -16 을 쓴다. 판의 px-4 가 다른 값이라 여기 20 을 그대로 쓰면 4px 이 삐져나온다.)
 *
 * ── 숨(컷 사이 여백) 대역표 — 2026-09-05 실측으로 다시 깐 것 ───────────────
 * 고치기 전: 컷 7장이 전부 563px 풀블리드, 사이 14px. 같은 자(행 프로파일)로 재니
 * **숨 2.3%**, 숨으로 잡힌 구간 2곳뿐 — 14px 은 측정기도 사람 눈도 숨으로 못 본다.
 * 그래서 일곱 장이 「잘못 이어붙인 한 장」으로 읽혔다(형님 지적: "이어지는 부분이 어색").
 *
 * 비교군(같은 자):  프로 웹툰 6회차 숨 16~37% · 청월당 재회 티저 12~71%
 *
 * 숨은 **하나로 통일하지 않는다.** 14 를 120 으로 바꾸면 메트로놈만 옮겨 놓는 꼴이다.
 * 컷과 컷의 **관계**로 정한다(563px 컷 기준):
 *
 *   같은 장면의 연속        96px    p-farshore→p-magpie (배경끼리, 속도를 올리는 자리)
 *   보통의 컷 전환         128px    g-river→p-lanterns
 *   시점·감정 전환         160px    p-lanterns→p-farshore · p-bridge→g-greet
 *   중요한 대사 직전       180px    p-split→g-river
 *   정점 직전             260px    p-magpie→p-bridge
 *
 * 크기도 같이 흔든다 — 높이만 흔들면 「폭 375 고정」이 남아 랜딩페이지로 읽힌다:
 *   190(밴드·인셋) → 563 → 330(밴드) → 563 → 495(인셋) → 563 → 563
 * 정점은 컷을 새로 뽑지 않는다. 프로의 733~1170px 은 그림 한 장의 높이가 아니라
 * **독자가 그 장면에 쓰는 세로 공간**이다: 260(앞숨) + 563(컷) + 160(뒷숨) = 983px 로 이미 대역 안.
 */
export function GyeonuWebtoon({ data, name }: { data: Reunion; name: string }) {
  return (
    <section
      data-webtoon
      aria-label="견우가 그린 밤"
      style={{
        position: "relative",
        marginLeft: -20,
        marginRight: -20,
        marginBottom: 22,
        overflow: "hidden",
        // 위에서 아래로 조금씩 깊어진다 — 절단(검정 판)으로 자연스럽게 내려앉게.
        background:
          "linear-gradient(180deg,#070a15 0%,#0b1026 22%,#0a0e20 56%,#070911 82%,#05070d 100%)",
        paddingBottom: 30,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `${STARS_A},${STARS_B}`,
          backgroundSize: "188px 246px, 131px 173px",
          opacity: 0.6,
        }}
      />

      {/* ① 콜드오픈 — 사람도 말도 없이 갈라진 강 하나로 연다(웹툰 1화가 사건으로 시작하는 문법).
          eager: 티저 컷 아홉 장 중 **이 한 장만** 즉시 받는다. */}
      <WebtoonPanel
        id="p-split"
        alt="두 갈래로 갈라져 흐르는 밤의 강"
        gap={0}
        eager
        narrate="그날, 강이 갈라졌습니다."
      />

      {/* ② 화자 등장 — 앞 컷의 사건을 받아 「그래서 내가 적어 뒀다」로 잇는다.
          앞 숨 200: 대사가 이 숨 위에 앉는다(아래 16px 만 컷 하늘에 걸침). */}
      <WebtoonPanel
        id="g-river"
        alt="은하수가 비친 강가에서 건너편을 보는 견우"
        gap={180}
        say={{
          tail: "br",
          box: GYEONU_SAY_BOX["g-river"],
          lines: ["강 건너를 보면서", `${callMe(name)} 달력을`, "적어 두었습니다."],
        }}
      />

      {/* ③ 등불 = 열두 달. 여기서 「등불 하나 = 한 달」을 가르쳐 두면 뒤의 까치(소식)·
          오작교(다리)가 설명 없이 읽힌다.
          ⚠ 칸 수를 세지 않는다 — 열린 칸이 없는 손님(revealed 없음)에게 거짓말이 된다. */}
      {/* 두 문장이라 줄을 **직접 끊는다**. 자동 줄바꿈에 맡기면 「지금 밝은 / 건 하나뿐입니다」로
          꺾여 한 낱말이 두 줄에 걸린다(실측). 나레이션은 문장 하나가 한 줄이다. */}
      <WebtoonPanel
        id="p-lanterns"
        alt="강물 위에 뜬 등불들, 앞쪽 하나만 환하다"
        // 설명 컷 = 빨리 지나가야 하는 자리 → 가로로 눌러 앉힌다(밝은 등불 하나가 한가운데 오는 focus 50).
        gap={128}
        band={{ ratio: "335 / 190", focus: 50 }}
        inset={89}
        narrate={
          <>
            등불 하나가 한 달입니다.
            <br />
            {data.revealed ? "지금 밝은 건 하나뿐입니다." : "불은 결과지에서 켭니다."}
          </>
        }
      />

      {/* ④ 시점 전환 — 여기서 처음 카메라가 강 건너를 본다. 얼굴은 안 그린다(그 사람 얼굴을
          그리면 손님이 실제 사람과 대조하기 시작하고, 상품부의 행동 패턴 세 줄이 무너진다). */}
      <WebtoonPanel
        id="p-farshore"
        alt="강 건너 멀리 서 있는 사람의 뒷모습"
        // ⚠ 이 컷만 밴드로 안 누른다. 200px 로 자르면 실루엣이 프레임 밖으로 나가
        //    「강 건너 그 사람」이라는 컷의 뜻이 통째로 죽는다(25/50/70 전부 실측).
        //    대신 **폭을 좁혀** 조용한 응시 컷으로 만든다 — 그림은 원본 그대로 다 산다.
        gap={160}
        inset={88}
        narrate="강 건너 그 사람 쪽도, 보이는 데까지 봤습니다."
      />

      {/* ⑤ 까치 = 소식. 잠금 목록을 「안 주는 것」이 아니라 「오는 것」으로 뒤집는 컷이다.
          ⚠ 달을 말하지 않는다 — 「따로 있습니다」에서 끊는 게 이 컷의 일이다. */}
      <WebtoonPanel
        id="p-magpie"
        alt="발목에 서찰을 묶고 은하수를 건너 나는 까치"
        // 앞 두 컷(190·495)을 지나 190 → 330 → 563(정점)으로 커지며 정점을 민다.
        // 앞 숨 96 = 이 표에서 제일 짧은 숨 — 까치는 앞 컷에 붙여 속도를 올리는 자리다.
        gap={96}
        band={{ ratio: "375 / 330", focus: 50 }}
        narrate="소식이 건너오는 달이… 따로 있습니다."
      />

      {/* ⑥ 정점 — 오작교. 티저에서 제일 큰 그림이고 유일하게 아무것도 안 가린 약속이다.
          앞 여백 56(정점 앞 큰 숨): 앞 컷에 붙여 두면 까치 컷의 뒷장으로 읽힌다.
          대사는 사실만 — 「다시 이어집니다」로 단정하면 재회가 안 되는 손님에게 거짓말이 된다. */}
      <WebtoonPanel
        id="p-bridge"
        alt="수백 마리 까치가 은하수 위로 다리를 이룬 밤"
        gap={260}
        narrate="다리가 놓이는 달에는, 강이 이렇게 됩니다."
      />

      {/* ⑦ 대면 — 돈 얘기는 마주 보고 한다. 앞 숨 200 위에 대사를 올리고 아래 16px 만
          컷 하늘에 걸친다(얼굴 y26~42·양손 y38~52·y76~91 을 전부 비킨다).
          ⚠ 같은 g-greet 가 위저드 12단계(위로 화면, SajuWizard:1404)에도 있다. 열 화면쯤
            떨어져 있고 「마주 본다」가 두 번 다 그 자리의 뜻이라 그대로 둔다 — 바꾸려면 새 컷이 필요하다. */}
      <WebtoonPanel
        id="g-greet"
        alt="펼쳐 둔 장부에 손을 얹고 정면으로 마주 보는 견우"
        gap={160}
        say={{
          // 대사가 컷 위로 올라갔으니 꼬리도 아래(얼굴 쪽)를 가리켜야 한다 — tr 이면 허공을 가리킨다.
          tail: "br",
          box: GYEONU_SAY_BOX["g-greet"],
          lines: ["이 아래부터는…", "복채를 받고", "폅니다."],
        }}
      />

      {/* ⑧ 절단 — 웹툰부는 여기서 끝난다. 아래는 상품부(밝은 판)다.
          좌우 20 은 여백이 아니라 문법이다: 컷은 끝까지, **판은 한 단 안쪽**. */}
      <div style={{ position: "relative", paddingLeft: 20, paddingRight: 20 }}>
        <ReunionCut data={data} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   견우 컷 — **상품부**에 남는 컷 두 장(g-farewell·p-close)의 옷.

   2026-09-05 3차까지 이 부품이 티저 컷 아홉 장을 다 그렸다. 지금은 **두 장만** 그린다 —
   나머지 일곱은 웹툰부(WebtoonPanel)로 올라갔다. 남은 둘은 절단 **뒤**, 표와 카드가 흐르는
   상품부 안에 있어서 문법이 다르다:

     상품부는 문서다. 여기서는 그림도 「이 문단 옆에 붙은 한 장」이지 장면이 아니다.
     그래서 대사를 컷 위에 얹지 않고 **컷 밖 한지 띠**에 「견우」 명패를 달아 앉힌다 —
     밝은 판 위에 흰 말풍선을 띄우면 흰 위에 흰이라 원이 안 보인다(웹툰부는 밤이라 뜬다).

   문법 둘:
    ① 앞 여백 44px — 글 → (숨) → 그림. 붙여 두면 컷이 앞 카드의 삽화가 된다
       (칠흑 48·54화 실측을 결과지 CutInterlude 가 이미 이 눈금으로 옮겨 놨다).
    ② 원본 비율 그대로 풀블리드 — 컷은 판 끝까지, 카드·표는 한 단 안쪽(리포 공통 규칙).
       음수 마진 16 = teaser-light 의 px-4. **20(-mx-5)을 쓰면 안 된다** — 이 판은
       border-radius 18 짜리 떠 있는 카드라 4px 이 모서리 밖으로 삐져나온다.
       (웹툰부는 판 바깥이라 거기선 20 이 맞다 — 값이 두 개인 건 판이 둘이라서다.)

   ⚠ width/height 를 반드시 박는다. 없으면 로드 전 높이가 0 이라 읽는 도중에 아래가 밀린다.
   ⚠ 직녀 컷은 여기 못 들어온다 — 자산은 `public/products/reunion/` 에만 있다.
   ───────────────────────────────────────────────────────── */
export function GyeonuCut({
  id,
  alt,
  say,
  /** 앞 여백 — 기본 44(글 → 숨 → 그림) */
  gap = 44,
  /** 상품부 컷은 전부 스크롤 한참 아래라 lazy 가 기본이다(즉시 받는 건 웹툰부 첫 컷 하나뿐). */
  eager = false,
}: {
  id: GyeonuCutId;
  alt: string;
  say: React.ReactNode;
  gap?: number;
  eager?: boolean;
}) {
  return (
    // 마진은 인라인으로 박는다 — 되물릴 값(16)이 판의 패딩과 한 몸이라 클래스로 흩어 두면
    // 패딩이 바뀔 때 한쪽만 고쳐져 가로 넘침이 난다.
    <figure style={{ marginTop: gap, marginLeft: -16, marginRight: -16 }}>
      {/* 밤 그림이 판(달빛 종이) 위에 얹히므로 로드 전 자리는 밤색으로 둔다 — 흰 사각형이
          한 번 번쩍였다 사라지는 걸 막는다. */}
      <div style={{ overflow: "hidden", background: "#0b0f1a" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/products/reunion/${id}.webp`}
          alt={alt}
          width={1080}
          height={1620}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="block w-full select-none"
          style={{ height: "auto" }}
        />
      </div>
      <figcaption className="px-5 pt-3.5 text-center">
        {/* 명패 — 반전 절단(ReunionCut)과 같은 부품을 밝은 판용으로 뒤집은 것.
            이게 있어야 아래 한 줄이 「사진 설명」이 아니라 「견우가 하는 말」로 읽힌다. */}
        <span
          className="inline-block rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
          style={{ background: "#3A3350", color: "#F3F0EA" }}
        >
          견우
        </span>
        {/* 17px — 조판 위계 그대로(본문 15 < 대사 17 < 나레이션 19).
            keep-all 이 없으면 한글이 글자 단위로 꺾여 「배웅은 제 / 가 합니다」가 된다. */}
        <p
          className="font-myeongjo mt-2 text-[17px]"
          style={{ color: "#3A3350", lineHeight: 1.62, fontWeight: 600, wordBreak: "keep-all" }}
        >
          {say}
        </p>
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────
   T1 — 오프닝 달력
   「언제」를 파는 상품이라 첫 화면이 달력이다(청월당 재회 티저도 달력 3장으로 연다).
   열두 칸을 다 세워 계산을 보여주되, 종류는 **한 칸만** 연다.
   여는 칸은 「먼저 연락하면 안 되는 달」 — 손님이 오늘 밤 하려던 일을 한 번 멈추게 만든다.
   ───────────────────────────────────────────────────────── */
export function ReunionCalendar({ data, name }: { data: Reunion; name: string }) {
  const cal = data.calendar;
  if (cal.length === 0) return null;
  const openKey = data.revealed ? `${data.revealed.year}-${data.revealed.month}` : "";

  return (
    <section>
      {/* 여기 있던 컷 셋(p-split·g-river·p-lanterns)은 **웹툰부로 올라갔다**(2026-09-05 3차).
          이 블록은 이제 상품부의 첫 화면 — 절단(검정 판)이 끊고 나서 손님이 처음 만나는
          「그래서 계산은 이렇다」다. 컷이 앞에 없으므로 제목이 판의 py-10 바로 아래 선다. */}
      <T>앞으로 열두 달</T>
      <div className="mt-2">
        <BrushHead lines={["열두 칸을 다 세워 두었습니다"]} />
      </div>
      <p className="mt-3 text-center text-[16px] leading-[24px]" style={{ color: BODY }}>
        칸은 다 보여드립니다. 이름은 한 칸만 먼저 엽니다.
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {cal.map((c) => {
          const open = `${c.year}-${c.month}` === openKey;
          return (
            <div
              key={`${c.year}-${c.month}`}
              className="rounded-[9px] px-1 py-2 text-center"
              style={
                open
                  ? { background: "#ffffff", border: `2px solid ${PINK}`, boxShadow: "0 4px 12px rgba(107,76,154,.22)" }
                  : { background: "rgba(255,255,255,0.42)", border: `1px solid ${LINE}` }
              }
            >
              <p className="text-[12px] font-bold" style={{ color: open ? PINK : MUTE }}>
                {c.month}월
              </p>
              <div className="mt-1.5 flex justify-center">
                {open ? (
                  // 열린 칸에만 달을 그린다. 잠긴 칸에 달을 그리면 범례로 읽혀 잠금이 풀린다.
                  <Moon phase="cloud" size={30} />
                ) : (
                  <span
                    aria-label="아직 덮어 둔 칸"
                    className="inline-block"
                    style={{
                      width: 30,
                      height: 10,
                      borderRadius: 3,
                      background: "linear-gradient(90deg, rgba(126,118,152,0.30), rgba(126,118,152,0.16))",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[13px] leading-[20px]" style={{ color: MUTE, letterSpacing: "normal" }}>
        열두 칸 가운데 {data.lockedCount}칸은 아직 덮어 두었습니다
      </p>

      {data.revealed ? (
        <OpenMonthCard
          year={data.revealed.year}
          month={data.revealed.month}
          desc="먼저 연락하면 안 되는 달입니다"
          note={`그 달 흐름 — ${data.revealed.desc}. 이 달에 보낸 연락은 반대로 갑니다.`}
          moon={<Moon phase="cloud" size={30} />}
          locks={[
            ...Array.from({ length: Math.min(2, data.reconnectCount) }, () => ({ label: "다리가 놓이는 달" })),
            ...Array.from({ length: Math.min(1, data.contactOkCount) }, () => ({ label: "연락해도 되는 달" })),
          ]}
        />
      ) : (
        <p className="mt-6 text-center text-[15px] leading-[24px]" style={{ color: INK, fontWeight: 700 }}>
          {callMe(name)} 달력에는 먼저 연락하면 안 되는 달이 없습니다. 그것도 답입니다.
        </p>
      )}

      <p className="mt-5 text-center text-[15px] leading-[24px]" style={{ color: BODY }}>
        다리가 놓이는 달 {data.reconnectCount} · 연락해도 되는 달 {data.contactOkCount} —
        <br />
        달 이름은 결과지에서 엽니다.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T2 — 이별 무렵 채점
   과거 검증의 재회판. 미래는 채점이 안 되지만 **이미 살아 본 그 달**은 손님이 그 자리에서 맞다·아니다를
   말할 수 있다. 답을 받은 뒤에 죄책감 해제로 넘어간다(3사 공통 3단: 네 탓 아님 → 원인은 흐름 → 여기서 끝내라).
   ⚠ 꺾여 있지 않았으면 꺾였다고 하지 않는다 — facts.bent 가 그대로 문장을 가른다.
   ───────────────────────────────────────────────────────── */
export function ReunionBreakupCheck({ data, name }: { data: Reunion; name: string }) {
  const b = data.breakupCheck;
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (!b) return null;

  const pick = (v: "yes" | "no") => {
    setAnswer(v);
    track("reunion_breakup_answer", { answer: v });
  };

  return (
    <section className="mt-14">
      <T>강이 갈라지던 무렵</T>
      <div className="mt-2">
        <BrushHead lines={[`${b.year}년${b.month ? ` ${b.month}월` : ""}, 그 무렵 흐름`]} />
      </div>

      {/* 여기 붙어 있던 g-river 컷은 **오프닝으로 승격**했다(2026-09-05).
          이 블록은 「이별 시기를 적은 손님」에게만 뜬다 — 건너뛴 손님은 컷을 한 장도 못 봤고,
          적은 손님은 오프닝과 같은 그림을 두 번 봤다. 컷은 조건부 자리에 두지 않는다. */}
      <div
        className="mt-5 bg-white px-5 py-5"
        style={{ borderRadius: 14, border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(20,12,40,0.10)" }}
      >
        <p className="text-[17px] leading-[27px]" style={{ color: INK, fontWeight: 700 }}>
          {b.line}
        </p>
        {b.marks.length > 1 && (
          <ul className="mt-3 space-y-1.5">
            {b.marks.slice(1, 3).map((m) => (
              <li key={m} className="flex items-start gap-2 text-[15px] leading-[23px]" style={{ color: BODY }}>
                <span className="shrink-0" style={{ color: PINK }}>
                  ·
                </span>
                {m}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t pt-4" style={{ borderColor: "#EFE9F8" }}>
          {answer === null ? (
            <>
              <p className="text-center text-[15px] leading-[23px]" style={{ color: BODY }}>
                그 무렵, 이랬습니까?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {(
                  [
                    ["yes", "맞아요"],
                    ["no", "아니에요"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => pick(v)}
                    className="min-h-[48px] text-[15px]"
                    style={{ border: `1px solid ${PINK}55`, borderRadius: 10, color: INK, fontWeight: 700, background: "#fff" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[16px] leading-[26px]" style={{ color: INK }}>
              {answer === "yes"
                ? b.bent
                  ? `그러면 그날 갈라진 건 ${callMe(name)}이 모자라서가 아닙니다. 두 사람 흐름이 그 달에 같이 꺾여 있었습니다. 자책은 여기서 끝내셔도 됩니다.`
                  : `흐름이 꺾여 있진 않았습니다. 그러니 흐름 탓으로 덮지 않고, 무엇이 어긋났는지를 결과지에서 정면으로 짚어 드립니다.`
                : `아니라면 그것도 답입니다. 흐름으로 덮지 않고, 두 분 사이에서 어긋난 자리를 결과지에서 그대로 짚습니다.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T3 — 연적
   청월당 실측 최강 구간(「그 사람 옆에 다른 사람이 보이는데?」)의 우리 판.
   외모·직업은 안 그린다 — **행동 패턴**만 그린다. 문장은 확정값(rival.lines) 그대로 쓴다.
   근거가 상대 명식인지 내 흐름인지는 아래 한 줄로 밝힌다(우리는 계산을 파는 쪽이다).
   ───────────────────────────────────────────────────────── */
export function ReunionRival({ data }: { data: Reunion }) {
  const r = data.rival;
  if (!r || r.lines.length === 0) return null;
  return (
    // 앞에 있던 시점 전환 컷(p-farshore)은 웹툰부로 올라갔다(2026-09-05 3차) — 강 건너를
    // 처음 보는 순간은 이야기 쪽 일이고, 여기는 그 시선이 무엇을 봤는지 적는 자리다.
    // 컷이 빠졌으므로 앞 여백을 section 이 직접 든다(앞뒤 블록과 같은 56 눈금).
    <section className="mt-14">
      <T>그 사람 옆자리</T>
      <div className="mt-2">
        <BrushHead lines={["비어 있는지부터 봤습니다"]} />
      </div>
      <div
        className="mt-5 px-5 py-5"
        style={{ background: "rgba(255,255,255,0.62)", borderRadius: 14, border: `1px solid ${LINE}` }}
      >
        {r.lines.map((line, i) => (
          <p
            key={i}
            className={`text-[16px] leading-[26px] ${i > 0 ? "mt-3" : ""}`}
            style={i === r.lines.length - 1 ? { color: INK, fontWeight: 700 } : { color: BODY }}
          >
            {line}
          </p>
        ))}
      </div>
      <div className="mt-2">
        <Cap>
          {r.basis === "상대"
            ? "그 사람 생년월일로 그쪽 흐름까지 같이 읽은 자리예요"
            : "그 사람 생년월일이 없어 곁자리 흐름으로 읽은 자리예요"}
        </Cap>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T4 — 환승(강을 건너지 않는다면)
   재회가 안 될 손님에게도 유효한 결과지가 있다는 것을 **반 발만** 보여준다(결과지 9장 예고).
   결·나이대까지만 열고 「처음 마주치는 자리」는 잠근다 — 다 열면 9장이 안 팔린다.
   ───────────────────────────────────────────────────────── */
export function ReunionMoveOn({ data }: { data: Reunion }) {
  const m = data.moveOn;
  if (!m) return null;
  return (
    <section className="mt-14">
      <T>강을 건너지 않는다면</T>
      <div className="mt-2">
        <BrushHead lines={["다음 사람도 같은 장부에 있습니다"]} />
      </div>
      {/* 배웅 컷 — 「강을 건너지 않는다면」의 **그림 짝**이다. 길이 뒤로 뻗고 견우가 돌아본다.
          제목 → 붓글씨 → 그림 → 값 순서라, 표(다음 사람)가 대사를 받아 열리는 모양이 된다.
          ⚠ 대사에 「건너」를 다시 쓰지 않는다 — 바로 위 제목이 그 말이라 두 번 읽힌다. */}
      <GyeonuCut
        id="g-farewell"
        alt="별길이 뻗은 강가에서 뒤를 돌아보는 견우"
        say="어느 쪽으로 가시든, 배웅은 제가 합니다."
      />
      <div
        className="mt-5 overflow-hidden bg-white"
        style={{ borderRadius: 14, border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(20,12,40,0.10)" }}
      >
        {[
          ["어떤 결", m.nature],
          ["첫인상", m.look],
          ["나이대", m.ageDir],
        ].map(([k, v], i) => (
          <div
            key={k}
            className="flex gap-3 px-4 py-3"
            style={{ background: i % 2 ? "rgba(255,255,255,0.5)" : "transparent", borderTop: i ? `1px solid ${LINE}` : undefined }}
          >
            <span className="w-[68px] flex-none text-[13px]" style={{ color: PINK, fontWeight: 700 }}>
              {k}
            </span>
            <span className="flex-1 text-[15px] leading-[23px]" style={{ color: INK }}>
              {v}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${LINE}` }}>
          <span className="w-[68px] flex-none text-[13px]" style={{ color: PINK, fontWeight: 700 }}>
            만나는 자리
          </span>
          <NeonMask text="○○○○○○" scribble={false} />
        </div>
      </div>
      {/* ⚠ 「크게 바뀌는 해」는 여기서 말하지 않는다 — 바로 아래 붓 동그라미 카드가 같은 해를 크게 쓴다.
          여기에 한 줄 더 두면 같은 숫자를 2초 안에 두 번 읽힌다(운영 실측에서 잡힌 중복). */}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T5 — 반전 절단. **웹툰부의 마지막 한 판**이다(GyeonuWebtoon 안에서만 그린다).
   카카오웹툰이 회차 마지막 대사만 뒤집어 끊는 그 문법: 그림으로 읽어 오다 그림이 사라지고
   글자만 남는다. 그리고 이 판 바로 아래에서 화면이 **밝은 상품부**로 통째로 뒤집힌다 —
   반전은 판 색이 아니라 그 자리다.
   ⚠ 한 화면에 딱 한 번. 재회 티저에서 절단은 여기 하나뿐이다 — 두 번 쓰면 절단이 사라진다.
   ───────────────────────────────────────────────────────── */
export function ReunionCut({ data }: { data: Reunion }) {
  const c = data.cut;
  if (!c) return null;
  return (
    // 절단 앞 큰 숨 — 앞 컷에 붙여 두면 절단이 그 컷의 자막으로 읽힌다(칠흑 여백 눈금 56).
    <section className="mt-14">
      <div
        className="relative px-5 pb-6 pt-7"
        style={{
          // 밤하늘(#05070d~#0b1026)보다 **한 단 더 검다** — 같은 어둠이면 판이 안 서고
          // 배경에 녹아 그냥 글자만 떠 있는 자리가 된다(은사 테두리가 그 경계를 긋는다).
          background: "linear-gradient(180deg,#101020,#000000)",
          borderRadius: 6,
          border: "1px solid rgba(207,214,230,0.42)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.72)",
        }}
      >
        <span
          className="absolute -top-2.5 right-4 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
          style={{ background: "#cfd6e6", color: "#14121f" }}
        >
          견우
        </span>
        <p className="font-myeongjo text-[19px] leading-[1.75]" style={{ color: "#f3f0ea", fontWeight: 600 }}>
          {c.lead} <MaskWord text={c.mask} />.
          <br />
          <span style={{ color: "rgba(243,240,234,0.72)" }}>…{c.tail}</span>
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   목차 — 결과지 10장과 1:1. 잠글 것은 값이지 목차가 아니다(청월당 전량 공개 방식).
   ⚠ prompt.ts 의 reunion-saju outline 열 장과 순서·개수를 맞춘다. 여기 없는 걸 적으면 그게 거짓말이 된다.
   ───────────────────────────────────────────────────────── */
const TOC_REUNION: { title: string; items: string[] }[] = [
  { title: "1장. 두 사람의 별", items: ["내가 사랑할 때 하는 것", "그 사람과 어긋나던 자리"] },
  { title: "2장. 강이 갈라진 날", items: ["그 무렵 흐름은 어땠는지", "그래서 왜 내 탓이 아닌지"] },
  { title: "3장. 그 사람의 지금", items: ["연락 없는 동안 그 사람이 하는 것", "마음이 식었을 때 나오는 행동"] },
  { title: "4장. 아직 이어져 있는 것", items: ["재회 가능성 — 높음·보통·낮음", "적어 보내신 물음에 대한 답"] },
  { title: "5장. 다리가 놓이는 달", items: ["열두 달 중 다시 이어지는 달", "그 달에 미리 해 둘 준비"] },
  { title: "6장. 연락의 달", items: ["연락해도 되는 달", "먼저 연락하면 안 되는 달", "보낼 첫 줄과 묻지 말 것"] },
  { title: "7장. 하면 안 되는 것", items: ["매달릴 때 되풀이되는 행동 셋", "대신 할 행동"] },
  { title: "8장. 다시 보고 싶은 사람으로", items: ["내 쪽에서 바꾸는 것 셋", "이번 달 안에 되는 것으로"] },
  { title: "9장. 강을 건너지 않는다면", items: ["그 사람이 아니어도 되는 이유", "다음에 올 사람의 결과 나이대"] },
  { title: "10장. 견우의 배웅", items: ["이번 주에 할 것 셋", "가장 가까운 연락의 달에 맞춰"] },
];

export function ReunionToc() {
  return (
    <section className="mt-14">
      <T>받으시는 것</T>
      <div className="mt-2">
        <BrushHead lines={["열 장을 다 펴서 보여드립니다"]} accent={0} />
      </div>
      <div className="mt-7">
        <HanjiCard>
          <div
            className="bg-white px-3 py-2.5 text-center text-[13px]"
            style={{ border: `1px solid ${LINE}`, color: INK, fontWeight: 700 }}
          >
            *전체 풀이 내용이에요. 결제하시면 이 열 장이 다 열립니다.
          </div>
          {TOC_REUNION.map((c, i) => (
            <div key={c.title} className={i > 0 ? "mt-10" : "mt-5"}>
              <TocChapter title={c.title} items={c.items} />
            </div>
          ))}
        </HanjiCard>
      </div>
      <div className="mt-4">
        <Cap>마이페이지에 계속 보관돼요 · 언제든 다시 열어볼 수 있어요</Cap>
      </div>
    </section>
  );
}
