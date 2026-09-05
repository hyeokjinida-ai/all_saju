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
  | "p-close" // 장부를 덮는 손 — 마감
  // 표정 클로즈업 넷(2026-09-05 5차) — 증거 카드 **바로 뒤**에 오는 반응 컷이다.
  // 풍경은 세계를 보여주고 표정은 관계를 만든다. 카드가 답을 준 직후 견우가 그 답에
  // 반응해야 「값을 읽어 주는 사람」이 아니라 「같이 보고 있는 사람」이 된다.
  | "g-face-gaze" // 정면 응시 — 「아직 보고 계셨군요」
  | "g-face-smile" // 옅은 미소 — 「눈이 오래 머무셨네요」
  | "g-face-down" // 눈 내림·표정 굳음 — 「여기서는 조금 다르게 보입니다」
  | "g-face-back"; // 돌아봄 — 「마음이 향하는 곳은 그대로군요」

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

/** 은하수색 — 랜딩(GyeonuLanding)의 STAR 와 같은 값. 강조에 쓰되 **CTA 보다 채도가 낮아야** 한다.
 *  판에서 제일 센 색은 언제나 결제 버튼이다. */
const STAR = "#cfd6e6";

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
 *  나레이션은 여기 없다 — 컷 **밖** `<Narration>` 이 맡는다(2026-09-05 이전).
 *  옛 주석은 「띠를 깔면 밤이 끊긴다」였는데, 박스 없이 밤 위에 글자만 놓으면 밤은 안 끊긴다.
 *  그리고 이제는 컷이 끊겨야 하는 게 목표다.
 *  ⚠ width/height 를 반드시 박는다. 없으면 로드 전 높이가 0 이라 읽는 도중 아래가 밀린다. */
function WebtoonPanel({
  id,
  alt,
  /** 앞 숨 — 컷 **관계**로 정한다. 하나로 통일하면 안 된다(아래 숨 대역표). */
  gap = 128,
  eager = false,
  say,
  /** 가로 밴드로 눌러 쓸 때 — `ratio`는 폭:높이, `focus`는 원본에서 살릴 세로 위치(%).
   *  안 주면 원본 비율(2:3) 그대로 깐다. 빨리 지나갈 컷(설명·전경·브리지)에만 쓴다. */
  band,
  /** 컬럼 폭의 몇 %로 좁혀 앉힐지 — 안 주면 풀블리드.
   *  높이만 흔들면 「폭 375 고정」이 남아서 랜딩페이지로 읽힌다. 조용한 컷은 폭을 좁힌다. */
  inset,
  /** 좁힌 컷을 어느 쪽에 붙일지 — 기본 가운데.
   *  경쟁사 실물(타이트 도입 3컷 67%/75%/100%)은 오른쪽·왼쪽·풀블리드로 **지그재그**다.
   *  가운데로만 좁히면 폭만 줄었지 여전히 「가운데 정렬된 랜딩」으로 읽힌다. */
  align = "center",
  /** 효과음 — 컷 위 경계에 걸치는 손글씨. 없으면 안 그린다. */
  fx,
  /** 가장자리를 밤으로 녹인다 — 컷이 「붙인 사진」이 아니라 어둠에서 떠오른 장면이 된다.
   *  `"both"` 위아래 · `"top"` 위만. 인물이 프레임 아래까지 찬 컷은 아래를 녹이면 몸이 잘리므로 top.
   *  경쟁사 실측 페이드 폭 **30px**(375 환산) — 우리도 그 대역을 쓴다.
   *  ⚠ 페이드를 쓰면 figure 의 바탕색을 지운다. 안 그러면 녹은 자리에 컷보다 **더 어두운**
   *    사각형(NIGHT_DEEP)이 남아 페이드가 아니라 얼룩으로 보인다. */
  fade,
}: {
  id: GyeonuCutId;
  alt: string;
  gap?: number;
  eager?: boolean;
  say?: { lines: string[]; tail: SayTail; box: SayBox };
  band?: { ratio: string; focus: number };
  inset?: number;
  align?: "left" | "center" | "right";
  fx?: { text: string; top: number; side: "left" | "right"; size?: number; dim?: number };
  fade?: "both" | "top";
}) {
  const F = 30; // 페이드 폭(px)
  const maskCss = fade
    ? fade === "both"
      ? `linear-gradient(180deg, transparent 0, #000 ${F}px, #000 calc(100% - ${F}px), transparent 100%)`
      : `linear-gradient(180deg, transparent 0, #000 ${F}px)`
    : undefined;
  return (
    <figure
      data-panel={id}
      style={{
        position: "relative",
        marginTop: gap,
        // 대사 크기의 자 — 없으면 cqw 가 위쪽 조상을 잡아 엉뚱한 크기가 된다.
        containerType: "inline-size",
        background: fade ? "transparent" : NIGHT_DEEP,
        ...(inset
          ? {
              width: `${inset}%`,
              marginLeft: align === "left" ? 0 : "auto",
              marginRight: align === "right" ? 0 : "auto",
            }
          : null),
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
        style={{
          ...(band
            ? // 밴드 컷 — aspectRatio 로 자리를 먼저 잡으므로 로드 전에도 높이가 확정된다(점프 0).
              {
                display: "block",
                width: "100%",
                aspectRatio: band.ratio,
                objectFit: "cover",
                objectPosition: `50% ${band.focus}%`,
              }
            : { display: "block", width: "100%", height: "auto" }),
          ...(maskCss ? { maskImage: maskCss, WebkitMaskImage: maskCss } : null),
        }}
      />
      {say && <GyeonuBubble {...say} />}
      {fx && <SoundFx {...fx} />}
    </figure>
  );
}

/** 컷 **밖** 나레이션 — 밤 위에 글자만. 박스도, 그라데이션 띠도 없다.
 *
 *  왜 밖으로 나왔나(2026-09-05): 컷 안에 두면 그림과 글을 **동시에** 소비하고 거기서 끝난다.
 *  밖으로 빼면 「그림 본다 → 글 읽는다 → 다음 그림을 기대한다」 3박자가 되고, 문장이
 *  이미지 설명이 아니라 **다음 컷을 여는 문**이 된다. 결제 벽까지 끌고 가는 게 목적이라
 *  이쪽이 맞다(경쟁사 타이트사주 문법 · 형님 픽 2026-09-05).
 *  밴드 컷은 특히 못 품는다 — 189px 컷에 나레이션을 얹으면 그림의 61%가 글자로 덮인다(실측).
 *
 *  자리 규칙: **위 숨은 짧게, 아래 숨은 길게.** 문장이 앞 컷에 붙어 있어야 그 컷의 말로 읽힌다.
 *  아래 숨은 이 요소가 아니라 **다음 패널의 gap** 이 맡는다(margin 이 겹치지 않게).
 *  대사(말풍선)는 그림에 붙인 채로 둔다 — 표정과 함께 읽혀야 하는 건 나레이션이 아니라 대사다. */
function Narration({
  above,
  children,
  /** 이 블록에서만 은하수색을 쓴다 — **판 전체에 한 번**. CTA 보다 채도가 낮아야 한다. */
  accent = false,
}: {
  above: number;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <p
      data-narrate
      className="font-myeongjo"
      style={{
        marginTop: above,
        marginBottom: 0,
        // 폭을 묶는다 — 375 를 다 쓰면 한 줄이 길어져 두 눈에 안 들어온다.
        // 폭·패딩 실측(2026-09-05): 24px 한글은 실폭 280 에서 한 줄 12자가 한계다.
        // 320/20 으로 두었더니 두 줄로 쓴 등불 문장이 **네 줄로 깨졌다**. 실폭 304 로 넓힌다.
        maxWidth: 336,
        marginLeft: "auto",
        marginRight: "auto",
        paddingLeft: 16,
        paddingRight: 16,
        textAlign: "center",
        color: accent ? STAR : "rgba(255,255,255,0.82)",
        // 24px 인 이유: 19 로 두니 여백에 나와도 캡션으로 읽혔다. 경쟁사 실물은 이 자리 글자가
        // 컷과 대등한 주인공이다. 위계(본문 15 < 대사 17 < 나레이션)의 순서는 그대로다.
        fontSize: 24,
        lineHeight: "36px",
        fontWeight: 400,
        wordBreak: "keep-all",
      }}
    >
      {children}
    </p>
  );
}

/** 나레이션 안에서 한 어절만 세운다 — **블록당 하나.** 굵기·명도로 세우고 색은 안 쓴다
 *  (색은 accent 블록 한 곳에서만. 밤 톤에선 색보다 굵기·명도가 덜 시끄럽다). */
function Hi({ children }: { children: React.ReactNode }) {
  return <b style={{ fontWeight: 700, color: "#fff" }}>{children}</b>;
}

/** 효과음 — 정지 그림을 「시간이 흐르는 컷」으로 바꾸는 장치.
 *
 *  ⚠ 「쾅·탁」 같은 액션만화형은 이 세계관(밤·강·까치)을 그 자리에서 깬다.
 *  쓰는 건 **저강도 물성음** 셋뿐이다: 찰랑(물) · 파드득(날갯짓) · 사락(종이).
 *  정점(오작교)과 대면에는 **안 넣는다** — 거기선 침묵이 더 세다.
 *  컷 경계를 10~30px 만 넘긴다. 절반씩 튀어나오면 남의 문법을 흉내 낸 티가 난다. */
function SoundFx({
  text,
  top,
  side,
  size = 20,
  dim = 0.5,
}: {
  text: string;
  /** 컷 위쪽 경계에서 몇 px 위에 앉힐지(음수면 컷 안으로) */
  top: number;
  side: "left" | "right";
  size?: number;
  dim?: number;
}) {
  return (
    <span
      aria-hidden
      data-fx
      className="font-brush pointer-events-none absolute select-none"
      style={{
        top,
        [side]: 22,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "0.08em",
        color: `rgba(255,255,255,${dim})`,
        textShadow: "0 1px 8px rgba(4,6,14,0.7)",
        transform: side === "left" ? "rotate(-6deg)" : "rotate(5deg)",
      }}
    >
      {text}
    </span>
  );
}
// ⚠ 나레이션 줄은 **직접 끊는다**(`<br />`). 자동 줄바꿈에 맡기면 폭 296 에서
//   「…쪽도, 보이는 / 데까지 봤습니다」·「…달에는, 강이 / 이렇게 됩니다」처럼
//   한 덩어리가 갈라진다(2026-09-05 실측). 문장 하나가 한 줄이다.

/* ── 밤 톤 증거 카드 ─────────────────────────────────────
   웹툰부 **안**에 앉는 상품 블록이다. 상품부의 흰 한지 카드와 같은 값을 어두운 판으로 다시 짠다.

   왜 웹툰 안으로 끌고 왔나(2026-09-05 4차, 형님 「타이트꺼 제대로 다시 봐」):
     경쟁사 티저 둘(타이트·청월당)은 **웹툰 → 상품**이 아니라 **컷 ↔ 카드 교차**다.
     이야기가 질문을 만들고 카드가 답을 주고 다시 이야기가 다음 질문을 만든다.
     우리만 컷 일곱 장을 다 보여준 뒤 상품을 통째로 내밀고 있었다 — 조판을 아무리 고쳐도
     이 구조가 다르면 「그림 먼저, 광고 나중」으로 읽힌다.

   규칙:
     · 서사 beat 1~2 장에 카드 하나. 카드가 연달아 오면 그때부터 상세페이지다.
     · **한 카드는 한 가지만 말한다.** 480~900px.
     · 가격은 여기 안 온다. 가격은 대면·절단 뒤 처음 나오는 거래 신호다.
     · 12칸 격자도 여기 안 온다 — 11칸이 잠긴 격자를 초반에 보이면 「대부분 막아놨네」가 된다.
       여기서 여는 건 **한 칸**뿐이다(획득감). 격자는 절단 뒤 상품부가 맡는다.
   ───────────────────────────────────────────────────── */

/** 카드 껍데기 — 밤 위에 뜨는 판. 컬럼 끝까지 나가는 컷과 달리 **한 단 안쪽**(20)에 앉는다. */
function NightCard({
  above,
  eyebrow,
  children,
}: {
  above: number;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-proof
      style={{ marginTop: above, marginLeft: 20, marginRight: 20 }}
    >
      <p
        className="font-myeongjo"
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          letterSpacing: "0.22em",
          color: "rgba(207,214,230,0.62)",
          textAlign: "center",
        }}
      >
        {eyebrow}
      </p>
      <div
        style={{
          background: "linear-gradient(180deg, rgba(24,31,52,0.92), rgba(14,19,36,0.92))",
          border: "1px solid rgba(207,214,230,0.16)",
          borderRadius: 14,
          padding: "20px 18px",
          boxShadow: "0 14px 34px rgba(3,5,12,0.55)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

/** ① 열린 달 한 칸 — 손님이 처음 **받는** 것. 잠금이 아니라 획득감이 이 카드의 일이다. */
function NightOpenMonth({ data, above }: { data: Reunion; above: number }) {
  const r = data.revealed;
  if (!r) return null;
  return (
    <NightCard above={above} eyebrow="열두 달 중 한 칸">
      <p className="font-myeongjo" style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.66)" }}>
        {r.year}년 {r.month}월
      </p>
      <p
        className="font-myeongjo"
        style={{ margin: "6px 0 0", fontSize: 21, lineHeight: "31px", color: STAR, fontWeight: 700 }}
      >
        {r.kind}
      </p>
      <p
        className="font-myeongjo"
        style={{ margin: "12px 0 0", fontSize: 16, lineHeight: "26px", color: "rgba(255,255,255,0.86)", wordBreak: "keep-all" }}
      >
        {r.desc}
      </p>
    </NightCard>
  );
}

/** ② 이별 무렵 채점 — 첫 개인화 증거. 손님이 O/X 로 **직접 맞혀 보는** 자리라 힘이 세다.
 *  ⚠ 이별 시기를 안 적은 손님에겐 값이 없다(null) → 그 손님에겐 이 카드가 통째로 빠진다. */
function NightBreakup({ data, name, above }: { data: Reunion; name: string; above: number }) {
  const b = data.breakupCheck;
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (!b) return null;
  const pick = (v: "yes" | "no") => {
    setAnswer(v);
    track("reunion_breakup_answer", { answer: v, where: "webtoon" });
  };
  return (
    <NightCard above={above} eyebrow={`${b.year}년${b.month ? ` ${b.month}월` : ""} 무렵`}>
      <p
        className="font-myeongjo"
        style={{ margin: 0, fontSize: 18, lineHeight: "29px", color: "#fff", fontWeight: 700, wordBreak: "keep-all" }}
      >
        {b.line}
      </p>
      {b.marks.length > 1 && (
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
          {b.marks.slice(1, 3).map((m) => (
            <li
              key={m}
              className="font-myeongjo"
              style={{ fontSize: 15, lineHeight: "24px", color: "rgba(255,255,255,0.78)", marginTop: 4 }}
            >
              · {m}
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(207,214,230,0.14)" }}>
        {answer === null ? (
          <>
            <p
              className="font-myeongjo"
              style={{ margin: 0, textAlign: "center", fontSize: 15, color: "rgba(255,255,255,0.72)" }}
            >
              그 무렵, 이랬습니까?
            </p>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                  className="font-myeongjo"
                  style={{
                    minHeight: 46,
                    borderRadius: 10,
                    border: "1px solid rgba(207,214,230,0.34)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#e9ecf4",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p
            className="font-myeongjo"
            style={{ margin: 0, fontSize: 16, lineHeight: "26px", color: "rgba(255,255,255,0.9)", wordBreak: "keep-all" }}
          >
            {answer === "yes"
              ? b.bent
                ? `그러면 그날 갈라진 건 ${callMe(name)}이 모자라서가 아닙니다. 두 사람 흐름이 그 달에 같이 꺾여 있었습니다.`
                : `흐름이 꺾여 있진 않았습니다. 무엇이 어긋났는지는 결과지에서 정면으로 짚어 드립니다.`
              : `아니라면 그것도 답입니다. 흐름으로 덮지 않고, 어긋난 자리를 그대로 짚습니다.`}
          </p>
        )}
      </div>
    </NightCard>
  );
}

/** ③ 연적 — 긴장이 제일 크게 오르는 카드. 값이 **항상 있다**(기획 확정)이라 교차의 기둥이다. */
function NightRival({ data, above }: { data: Reunion; above: number }) {
  const r = data.rival;
  if (!r || r.lines.length === 0) return null;
  return (
    <NightCard above={above} eyebrow="그 사람 옆자리">
      {r.lines.map((line, i) => (
        <p
          key={i}
          className="font-myeongjo"
          style={{
            margin: i ? "10px 0 0" : 0,
            fontSize: i === r.lines.length - 1 ? 18 : 16,
            lineHeight: i === r.lines.length - 1 ? "29px" : "26px",
            color: i === r.lines.length - 1 ? "#fff" : "rgba(255,255,255,0.8)",
            fontWeight: i === r.lines.length - 1 ? 700 : 400,
            wordBreak: "keep-all",
          }}
        >
          {line}
        </p>
      ))}
      <p
        className="font-myeongjo"
        style={{ margin: "14px 0 0", fontSize: 13, lineHeight: "20px", color: "rgba(207,214,230,0.58)", wordBreak: "keep-all" }}
      >
        {r.basis === "상대"
          ? "그 사람 생년월일로 그쪽 흐름까지 같이 읽은 자리예요"
          : "그 사람 생년월일이 없어 곁자리 흐름으로 읽은 자리예요"}
      </p>
    </NightCard>
  );
}

/** 침묵 — 정점 직전 한 곳에만 쓰는 점 리더.
 *
 *  이 구간에는 **글자를 같이 두지 않는다.** 페이지에서 유일하게 아무 말도 안 하는 자리라
 *  나레이션과 겹치면 그 침묵이 사라진다. 정중앙이 아니라 위쪽에 두는 이유: 점이 화면 가운데
 *  들어온 뒤에도 **아래에 빈 공간이 남아야** 다음 컷이 늦게 오는 느낌이 생긴다. */
function DotRest({ above }: { above: number }) {
  return (
    <div
      aria-hidden
      data-rest
      style={{
        marginTop: above,
        textAlign: "center",
        letterSpacing: "0.5em",
        fontSize: 13,
        lineHeight: "14px",
        color: "rgba(255,255,255,0.52)",
      }}
    >
      · · ·
    </div>
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
 * 컷과 컷의 **관계**로 정한다.
 *
 * 그리고 그 숨은 **비어 있지 않다** — 나레이션이 거기 산다(2026-09-05 2차).
 * 컷 사이는 「빈 공간」이 아니라 **narrative slot = 위 숨 + 글 + 아래 숨** 이다.
 * 텍스트 높이만큼 gap 에서 기계적으로 빼면 안 된다. 슬롯 통째로 다시 잡는다:
 *
 *   슬롯            위 숨   글    아래 숨   합    자리
 *   1줄·앞 컷 소유    52    30     110     192   강 → 「그날, 강이 갈라졌습니다」 → 강가
 *   2줄·앞 컷 소유    52    60      72     184   등불 → 「등불 하나가 한 달입니다」 → 강 건너
 *   1줄·앞 컷 소유    48    30      64     142   강 건너 → 「보이는 데까지 봤습니다」 → 까치
 *   1줄 + 침묵       52    30   118+128   328   까치 → 「따로 있습니다」 → · · · → 오작교
 *   1줄·앞 컷 소유    52    30     110     192   오작교 → 「강이 이렇게 됩니다」 → 대면
 *
 * 위 숨(48~52) < 아래 숨(64~128) 인 게 규칙이다 — 문장이 앞 컷에 붙어 있어야 그 컷의 말로 읽힌다.
 * 아래 숨은 나레이션이 아니라 **다음 패널의 gap** 이 맡는다(margin 겹침 방지).
 * 말풍선이 있는 컷(g-river·g-greet)의 gap 110 은 풍선이 위로 34·45px 먹는 걸 감안한 값이다.
 *
 * 크기도 같이 흔든다 — 높이만 흔들면 「폭 375 고정」이 남아 랜딩페이지로 읽힌다:
 *   563 → 563 → 190(밴드·인셋) → 495(인셋) → 330(밴드) → 563 → 563
 *
 * 나레이션 overlay 하한(점유율 = 글 높이 ÷ 컷 높이): 컷 <330px 금지 · 330~420 1줄만 ·
 * ≥480 2줄 허용. 우리 밴드 컷은 189·330 이라 **둘 다 못 품는다** — 그래서 전부 밖으로 뺐다.
 * 정점은 컷을 새로 뽑지 않는다. 프로의 733~1170px 은 그림 한 장의 높이가 아니라
 * **독자가 그 장면에 쓰는 세로 공간**이다: 260(앞숨) + 563(컷) + 160(뒷숨) = 983px 로 이미 대역 안.
 */
export function GyeonuWebtoon({
  data,
  name,
  /** 컷을 전부 즉시 받는다 — **조판 검사대(`/dev/gyeonu-webtoon`) 전용**이다. 손님 화면에선 쓰지 않는다.
   *  왜 필요하냐: 캡처용 크롬은 뷰포트 밖 컷을 lazy 로 미뤄 통짜 캡처의 아래쪽이 빈 판으로 찍힌다.
   *  페이지 쪽 useEffect 로 되받아 오는 건 그 크롬에서 안 먹었다(2026-09-05 실측) — 렌더 시점부터 eager 여야 한다. */
  eagerAll = false,
}: {
  data: Reunion;
  name: string;
  eagerAll?: boolean;
}) {
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
        fade="both"
        alt="두 갈래로 갈라져 흐르는 밤의 강"
        gap={0}
        eager
        fx={{ text: "찰랑", top: 292, side: "right", size: 27, dim: 0.6 }}
      />
      <Narration above={52}>
        그날, 강이 <Hi>갈라졌습니다</Hi>.
      </Narration>

      {/* ② 화자 등장 — 앞 컷의 사건을 받아 「그래서 내가 적어 뒀다」로 잇는다.
          앞 숨 110: 위 나레이션과 이 컷 사이. 대사 말풍선이 그중 34px 를 위로 먹으므로
          글에서 풍선까지 76px 이 남는다 — 여기를 80 아래로 줄이면 둘이 붙어 읽힌다. */}
      <WebtoonPanel
        id="g-river"
        eager={eagerAll}
        fade="top"
        alt="은하수가 비친 강가에서 건너편을 보는 견우"
        gap={110}
        say={{
          tail: "br",
          box: GYEONU_SAY_BOX["g-river"],
          lines: [`${callMe(name)}, 시선이`, "강 건너에", "있네요."],
        }}
      />

      {/* ③ 등불 = 열두 달. 여기서 「등불 하나 = 한 달」을 가르쳐 두면 뒤의 까치(소식)·
          오작교(다리)가 설명 없이 읽힌다.
          ⚠ 칸 수를 세지 않는다 — 열린 칸이 없는 손님(revealed 없음)에게 거짓말이 된다. */}
      {/* 두 문장이라 줄을 **직접 끊는다**. 자동 줄바꿈에 맡기면 「지금 밝은 / 건 하나뿐입니다」로
          꺾여 한 낱말이 두 줄에 걸린다(실측). 나레이션은 문장 하나가 한 줄이다. */}
      <WebtoonPanel
        id="p-lanterns"
        eager={eagerAll}
        fade="both"
        alt="강물 위에 뜬 등불들, 앞쪽 하나만 환하다"
        // 설명 컷 = 빨리 지나가야 하는 자리 → 가로로 눌러 앉힌다(밝은 등불 하나가 한가운데 오는 focus 50).
        gap={92}
        band={{ ratio: "335 / 190", focus: 50 }}
        inset={89}
        align="right"
      />
      {/* 이 컷이 나레이션을 밖으로 뺀 **이유 그 자체**다. 189px 컷에 두 줄을 얹으면
          그림의 61%가 글자에 덮여 「그림 깔린 텍스트 박스」가 된다(실측). */}
      {/* 규칙 한 줄 + 서사 한 줄. 규칙을 통째로 빼면 뒤의 열두 칸 격자와 「다리가 놓이는 달」이
          설 자리를 잃는다 — 손님은 여기서 딱 한 번 「등불 = 한 달」을 배운다. */}
      <Narration above={44}>
        등불 하나가 <Hi>한 달</Hi>입니다.
        <br />
        {data.revealed ? "아직 빛나는 게 있습니다." : "불은 결과지에서 켭니다."}
      </Narration>

      {/* ▶ 증거 ① — 이야기가 「등불 하나 = 한 달」을 가르친 **직후**에 그 한 칸을 실제로 연다.
          여는 건 한 칸뿐이다. 열두 칸 격자는 절단 뒤 상품부가 맡는다. */}
      <NightOpenMonth data={data} above={72} />

      {/* ▶ 반응 ① — 카드가 답을 준 **직후** 견우가 손님을 본다. 값을 읽어 주는 사람이 아니라
          같이 보고 있는 사람이 되는 자리다(경쟁사 티저는 이 반응 컷이 대부분이다).
          대사는 풍선이 아니라 여백에 둔다: 얼굴 컷에 풍선을 얹으면 얼굴을 가리고,
          말풍선은 판에서 두 번(g-river·g-greet)이 상한이다. 얼굴 → 글 순서면 대사로 읽힌다. */}
      <WebtoonPanel
        id="g-face-gaze"
        eager={eagerAll}
        fade="both"
        alt="강 건너를 보다 이쪽으로 시선을 옮긴 견우"
        gap={72}
        band={{ ratio: "1080 / 1440", focus: 50 }}
        inset={86}
        align="right"
      />
      <Narration above={44}>
        {callMe(name)}, 아직 강 건너를
        <br />
        보고 계셨군요.
      </Narration>

      {/* ④ 시점 전환 — 여기서 처음 카메라가 강 건너를 본다. 얼굴은 안 그린다(그 사람 얼굴을
          그리면 손님이 실제 사람과 대조하기 시작하고, 상품부의 행동 패턴 세 줄이 무너진다). */}
      <WebtoonPanel
        id="p-farshore"
        eager={eagerAll}
        fade="both"
        alt="강 건너 멀리 서 있는 사람의 뒷모습"
        // ⚠ 이 컷만 밴드로 안 누른다. 200px 로 자르면 실루엣이 프레임 밖으로 나가
        //    「강 건너 그 사람」이라는 컷의 뜻이 통째로 죽는다(25/50/70 전부 실측).
        //    대신 **폭을 좁혀** 조용한 응시 컷으로 만든다 — 그림은 원본 그대로 다 산다.
        gap={80}
        inset={88}
        align="left"
      />
      {/* 「보이는 데까지 봤습니다」는 작업 보고처럼 들렸다 — 손님이 보던 쪽을 견우가 같이 본 것으로 돌린다. */}
      <Narration above={44}>
        강 건너 그 사람 쪽도,
        <br />
        <Hi>함께</Hi> 살펴봤습니다.
      </Narration>

      {/* ▶ 증거 ② — 「봤습니다」 바로 뒤에 무엇을 봤는지 내놓는다. 손님이 O/X 로 직접
          맞혀 보는 자리라 이 판에서 제일 센 개인화다.
          ⚠ 이별 시기를 안 적은 손님에겐 값이 없어 통째로 빠진다 — 그래서 교차의 기둥은
            이 카드가 아니라 아래 연적(항상 뜬다)이다. */}
      <NightBreakup data={data} name={name} above={72} />

      {/* ▶ 반응 ② — 「맞혔죠?」의 자리. 호칭은 안 쓴다. 네 반응 컷에 매번 이름을 부르면
          개인화가 아니라 변수 삽입처럼 보인다(호칭은 응시·돌아봄 둘에만). */}
      <WebtoonPanel
        id="g-face-smile"
        eager={eagerAll}
        fade="both"
        alt="등불 곁에서 눈을 내리고 옅게 웃는 견우"
        gap={72}
        band={{ ratio: "1080 / 1440", focus: 50 }}
        inset={86}
        align="left"
      />
      <Narration above={44}>
        방금 그 대목에서
        <br />
        눈이 오래 머무셨네요.
      </Narration>

      {/* ⑤ 까치 = 소식. 잠금 목록을 「안 주는 것」이 아니라 「오는 것」으로 뒤집는 컷이다.
          ⚠ 달을 말하지 않는다 — 「따로 있습니다」에서 끊는 게 이 컷의 일이다. */}
      <WebtoonPanel
        id="p-magpie"
        eager={eagerAll}
        fade="both"
        alt="발목에 서찰을 묶고 은하수를 건너 나는 까치"
        // 앞 두 컷(190·495)을 지나 190 → 330 → 563(정점)으로 커지며 정점을 민다.
        gap={80}
        band={{ ratio: "375 / 330", focus: 50 }}
        // 날갯짓이 실제로 있는 컷이라 소리가 붙는다. 앉아 있는 새였으면 안 넣는다.
        fx={{ text: "파드득", top: -14, side: "left", size: 32, dim: 0.72 }}
      />
      <Narration above={44}>
        소식이 건너오는 달이…
        <br />
        <Hi>따로</Hi> 있습니다.
      </Narration>

      {/* ▶ 증거 ③ — 긴장이 제일 크게 오르는 카드. 정점(오작교) 직전에 두어야 다리 그림이
          「그래서 어떻게 되는데」의 답으로 읽힌다. */}
      <NightRival data={data} above={72} />

      {/* ▶ 반응 ③ — 연적 카드를 읽은 직후. 여기서 처음 견우의 표정이 **굳는다**.
          응시(관찰) → 미소(맞혔죠) → 굳음(불안 전조) 순으로 감정이 올라가고, 그 상태로
          침묵을 지나 정점에 닿는다.
          ⚠ 넷째 「돌아봄」은 일부러 안 넣었다 — 바로 뒤 대면 컷(g-greet)과 감정 기능이 겹치고,
            얼굴 500px 컷이 여섯 장이 되면 서로 비슷해져 평평해진다. 그 컷은 가격 뒤
            배웅·목차 연결용으로 남겨 둔다. */}
      <WebtoonPanel
        id="g-face-down"
        eager={eagerAll}
        fade="both"
        alt="등불 아래 장부를 내려다보며 표정이 굳은 견우"
        gap={72}
        band={{ ratio: "1080 / 1440", focus: 50 }}
        inset={86}
        align="right"
      />
      <Narration above={44}>
        여기서는 조금
        <br />
        다르게 보입니다.
      </Narration>

      {/* ⑥ 정점 — 오작교. 티저에서 제일 큰 그림이고 유일하게 아무것도 안 가린 약속이다.
          앞이 **페이지에서 유일한 침묵 구간**이다(글 0, 점 하나). 점을 위쪽(118)에 두고
          아래 128 을 비우는 이유는 점이 화면 가운데 온 뒤에도 빈 공간이 남아야
          다음 컷이 늦게 오기 때문이다.
          대사는 사실만 — 「다시 이어집니다」로 단정하면 재회가 안 되는 손님에게 거짓말이 된다. */}
      <DotRest above={96} />
      <WebtoonPanel
        id="p-bridge"
        eager={eagerAll}
        fade="both"
        alt="수백 마리 까치가 은하수 위로 다리를 이룬 밤"
        gap={104}
      />
      {/* 판에서 **한 번뿐인** 색 강조. 정점 문장이라 여기 쓴다 — 두 번째가 생기면 둘 다 죽는다. */}
      <Narration above={44} accent>
        다리가 놓이는 달에는,
        <br />
        강이 이렇게 됩니다.
      </Narration>

      {/* ⑦ 대면 — 돈 얘기는 마주 보고 한다. 앞 숨 200 위에 대사를 올리고 아래 16px 만
          컷 하늘에 걸친다(얼굴 y26~42·양손 y38~52·y76~91 을 전부 비킨다).
          ⚠ 같은 g-greet 가 위저드 12단계(위로 화면, SajuWizard:1404)에도 있다. 열 화면쯤
            떨어져 있고 「마주 본다」가 두 번 다 그 자리의 뜻이라 그대로 둔다 — 바꾸려면 새 컷이 필요하다. */}
      <WebtoonPanel
        id="g-greet"
        eager={eagerAll}
        fade="top"
        alt="펼쳐 둔 장부에 손을 얹고 정면으로 마주 보는 견우"
        gap={100}
        // 장부를 펴는 소리. 정점(오작교)엔 안 넣는다 — 거기선 침묵이 더 세다.
        fx={{ text: "사락", top: 236, side: "right", size: 24, dim: 0.58 }}
        say={{
          // 대사가 컷 위로 올라갔으니 꼬리도 아래(얼굴 쪽)를 가리켜야 한다 — tr 이면 허공을 가리킨다.
          tail: "br",
          box: GYEONU_SAY_BOX["g-greet"],
          lines: ["여기부터는,", "복채를 받고", "펼쳐 드립니다."],
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
/** ⚠ 2026-09-05 4차부터 **화면에서 안 쓴다.** 같은 값을 웹툰부의 밤 톤 카드
 *  `NightBreakup` 이 컷 사이에서 낸다(컷 ↔ 카드 교차). 이 밝은 판 버전은 되돌릴 때를 위해
 *  남겨 둔 것이다 — 다시 켜려면 SajuWizard 쪽에서 NightBreakup 을 먼저 빼라(두 번 뜬다). */
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
/** ⚠ 2026-09-05 4차부터 **화면에서 안 쓴다** — 웹툰부의 `NightRival` 이 대신한다(위 주석과 같은 이유). */
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

/** 목차 한 덩이 — 열 장을 통째로 쌓지 않는다.
 *
 *  왜 쪼갰나(2026-09-05 5차, 경쟁사 PDF 판독): 상품 UI 가 길게 이어지면 그 지점부터
 *  웹툰이 아니라 일반 상세페이지로 되돌아간다. 경쟁사는 목차조차
 *  **Chapter → 캐릭터 → Chapter → 캐릭터** 로 끊는다.
 *  우리 목차는 한 카드 안에 10장을 쌓아 2,000px 넘는 단일 UI 덩어리였다. */
function TocGroup({ from, to, gap = 28 }: { from: number; to: number; gap?: number }) {
  return (
    <div style={{ marginTop: gap }}>
      <HanjiCard>
        {TOC_REUNION.slice(from, to).map((c, i) => (
          <div key={c.title} className={i > 0 ? "mt-10" : "mt-5"}>
            <TocChapter title={c.title} items={c.items} />
          </div>
        ))}
      </HanjiCard>
    </div>
  );
}

/** 상품 UI 사이에 끼우는 견우 표식 — 큰 일러스트가 아니라 **32~48px 짜리 자국**이다.
 *  「아직 견우가 같이 있다」만 말하면 되는 자리라 그림을 키우면 그 구간의 리듬을 잡아먹는다.
 *  export 인 이유: 목차뿐 아니라 SajuWizard 의 상품부(원국 뒤)에서도 같은 부품을 쓴다 —
 *  12칸 격자 → 원국 → 콜드리딩 → 잠긴 줄 → 가격이 사람 없이 2,000px 넘게 이어지던 자리다. */
export function GyeonuMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-9 flex items-center justify-center gap-2.5 px-6">
      <span
        aria-hidden
        className="shrink-0 rounded-full"
        style={{
          width: 38,
          height: 38,
          backgroundImage: "url(/products/reunion/g-face-gaze.webp)",
          backgroundSize: "180%",
          backgroundPosition: "50% 24%",
          border: "1px solid rgba(58,51,80,0.28)",
        }}
      />
      <p
        className="font-myeongjo text-[15px]"
        style={{ color: "#3A3350", lineHeight: 1.6, fontWeight: 600, wordBreak: "keep-all" }}
      >
        {children}
      </p>
    </div>
  );
}

/** 목차 — 열 장을 셋으로 끊고 사이에 견우와 **환승 결과**를 끼운다.
 *
 *  `data` 를 받는 이유: 환승(강을 건너지 않는다면)이 여기로 들어왔기 때문이다.
 *  경쟁사 PDF 판독(2026-09-05): 목차는 Chapter → 캐릭터 → Chapter 로 끊기고, 그 사이에
 *  아직 안 보여준 결과가 하나 더 열린다. 목차만 3,000px 쌓으면 그 지점부터 상세페이지다.
 *  ⚠ 환승을 여기 넣었으므로 **SajuWizard 의 ReunionMoveOn 은 뺐다** — 안 그러면 두 번 뜬다. */
export function ReunionToc({ data }: { data?: Reunion }) {
  return (
    <section className="mt-14">
      <T>받으시는 것</T>
      <div className="mt-2">
        <BrushHead lines={["열 장을 다 펴서 보여드립니다"]} accent={0} />
      </div>
      <div className="mt-7">
        <div
          className="bg-white px-3 py-2.5 text-center text-[13px]"
          style={{ border: `1px solid ${LINE}`, color: INK, fontWeight: 700 }}
        >
          *전체 풀이 내용이에요. 결제하시면 이 열 장이 다 열립니다.
        </div>
      </div>

      {/* 1~4장 — 「무슨 일이 있었나」 */}
      <TocGroup from={0} to={4} />

      {/* 결제 구역에 와서도 견우가 아직 같이 있다는 자리. 그림은 크게 안 쓴다. */}
      <GyeonuCut
        id="g-face-back"
        alt="별길에서 돌아보는 견우"
        gap={40}
        say={<>여기까지 오셨으면, 나머지도 같이 보시죠.</>}
      />

      {/* 5~7장 — 「언제, 무엇을」 */}
      <TocGroup from={4} to={7} gap={40} />

      {/* 아직 안 보여준 결과 하나 — 「재회가 아니어도 받는 게 있다」. 목차 한가운데에 두어야
          남은 세 장(8~10)이 그 답의 뒷장으로 읽힌다. */}
      {data ? <ReunionMoveOn data={data} /> : <GyeonuMark>남은 세 장은 그 뒤를 적어 둔 자리입니다.</GyeonuMark>}

      {/* 8~10장 — 「그 다음」 */}
      <TocGroup from={7} to={10} gap={40} />

      <div className="mt-4">
        <Cap>마이페이지에 계속 보관돼요 · 언제든 다시 열어볼 수 있어요</Cap>
      </div>
    </section>
  );
}
