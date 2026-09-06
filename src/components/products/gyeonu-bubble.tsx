"use client";

// 견우 말풍선 부품 — **웹툰부와 랜딩이 같이 쓴다.**
//
// 왜 파일을 갈랐나(2026-09-06): 랜딩에도 견우가 말하는 자리가 생겼는데(형님 「캐릭터가
// 말해주던지」) 말풍선 부품이 `gyeonu-teaser.tsx` 안에만 있었다. 두 화면이 같은 잉크선을
// 써야 같은 사람이 말하는 것으로 읽힌다 — 복사하면 반드시 어긋난다.
//
// ⚠ 값의 정본은 직녀 결과지(JiknyeoInterlude)의 SAY_ART 실측표다. 말풍선을 다시 구우면
//   `python 직녀/tools/bubble-cut.py` 로 재고 **두 곳을 같이** 고친다.

import type { SayBox } from "@/lib/jiknyeo-say-box";

export type SayTail = "bl" | "br" | "tl" | "tr";

/** 말풍선 자산 — **직녀 결과지(JiknyeoInterlude)의 SAY_ART 실측표와 같은 값**이다.
 *
 *  왜 import 하지 않고 옮겨 적었나: 그 파일은 `node:fs` 를 쓰는 **서버 컴포넌트**라
 *  "use client" 인 여기서 부르면 fs 가 클라이언트 번들에 딸려 들어가 빌드가 죽는다.
 *  값의 정본은 저쪽이다 — 말풍선을 다시 구우면 `python 직녀/tools/bubble-cut.py` 로 재고
 *  두 곳을 같이 고친다.
 *  box = 잉크선 **안쪽**(꼬리를 뺀 몸통) 범위. 여기 글자를 앉혀야 아래로 안 밀린다. */
export const SAY_ART: Record<SayTail, { src: string; ratio: number; box: { x: number; y: number; w: number; h: number } }> = {
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
export const GYEONU_SAY_BOX: Record<"g-river" | "g-greet", SayBox> = {
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
export function GyeonuBubble({ lines, tail, box }: { lines: string[]; tail: SayTail; box: SayBox }) {
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
