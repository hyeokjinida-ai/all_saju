"use client";

// 밝은 티저 시공 킷 — 청월당 「연애비책」 조판을 부품으로 옮긴 것.
//
// 왜 이 파일이 생겼나: 원본 티저 15슬라이스를 전부 판독해 보니 **웹툰은 7장(38%)뿐이고
// 나머지 8장(62%)은 카드·표·목업·숫자 조판**이었다. 그림이 없어서 못 한다는 말은 성립하지 않는다 —
// 62%는 코드로 짓는다. 이 파일이 그 62%다.
//
// 수치는 전부 라이브 `getComputedStyle` 실측이다(추정 아님).
// 원문: 경쟁사레퍼런스/청월당/연애비책_디자인토큰.md · 연애비책_섹션분해표.md
//   본문 16/400/행간24 · 값 16/500 · 헤드 24/서예체 · 캡션 12/#a1a1a1
//   자간 -0.025em **고정**(크기가 바뀌어도 비율이 같다 — em 으로 건 값)
//   바탕 #f3f2ef · 선 #e5e7eb · 포인트 #eb4465 · 태그칩 #f5cbd4
//
// 원본이 크기를 안 키우는 게 핵심이다 — 헤드도 24px 밖에 안 된다.
// 위계를 **크기가 아니라 굵기(400·500·600·700·800)와 색**으로 만든다.
// 숫자 「9」가 튀는 이유도 30px 이라서가 아니라 **주변이 전부 무채색인데 혼자 컬러**라서다.

import { HANJI_BG } from "@/components/products/jiknyeo-comic-kit";
import { NeonMask } from "@/components/products/jiknyeo-ui";

// ⚠ 2026-08-22 — 색을 하드코딩에서 **CSS 변수 참조**로 바꿨다.
// 티저 스킨(.teaser-light 달빛 / .teaser-pink 옛 분홍)이 한 곳에서 갈리게 하려면
// 부품이 값을 직접 들고 있으면 안 된다. 값 자체는 globals.css 의 스킨 블록에 있다.
// 이름은 유지한다(PINK 등) — 참조하는 파일이 많아 이름을 바꾸면 diff 만 커진다.
export const PINK = "var(--gold-bright)";
export const INK = "var(--bone)";
export const BODY = "var(--bone-soft)";
export const MUTE = "var(--bone-faint)";
export const LINE = "var(--gold-line)";
export const PAPER = "var(--gold-pale)";
export const CHIP = "var(--chip-bg)";
export const CHIP_TEXT = "var(--chip-text)";

/** 섹션 헤드 — 서예체 24px. 두 줄 중 **한 줄만** 색을 준다(둘 다 칠하면 위계가 죽는다). */
export function BrushHead({
  lines,
  accent,
}: {
  lines: [string, string?];
  /** 색을 줄 줄 번호(0|1). 안 주면 전부 먹색 */
  accent?: 0 | 1;
}) {
  return (
    // 폰트는 tailwind 유틸리티가 아니라 변수를 직접 문다 —
    // theme.fontFamily 에 키를 넣어도 dev 가 유틸리티를 새로 안 만드는 경우가 있었다(실측).
    <p
      className="text-center text-[24px] leading-[1.5]"
      // 원본 헤드는 600 인데 가평한석봉은 400/700 두 벌뿐이다 — 없는 굵기를 쓰면 브라우저가
      // 가짜로 굵혀(합성 볼드) 획이 뭉갠다. 서예체는 특히 티가 나므로 실제로 있는 700 을 쓴다.
      style={{ fontFamily: "var(--font-head-brush), serif", fontWeight: 700, color: INK }}
    >
      {lines.map((t, i) =>
        t ? (
          <span key={i} style={i === accent ? { color: PINK } : undefined}>
            {i > 0 && <br />}
            {t}
          </span>
        ) : null,
      )}
    </p>
  );
}

/** POINT 배지 — 알약, 테두리만 핑크. 배경은 비운다. */
export function PointBadge({ n }: { n: number }) {
  return (
    // ⚠ 예전엔 얇은 테두리 + 연한 글자였다. POINT 가 다섯 번 이어지는데 배지가 그렇게 약하면
    // 섹션이 바뀐 걸 알아볼 표시가 화면에 하나도 안 남는다(형님 지적 — 스크롤하면 다 같은 판).
    // 배지를 채워서 **섹션의 시작점**이 눈에 박히게 한다.
    <p className="text-center">
      <span
        className="inline-block rounded-full px-4 py-[5px] text-[12px]"
        style={{ background: PINK, color: "#ffffff", fontWeight: 700, letterSpacing: "0.1em" }}
      >
        POINT {n}
      </span>
    </p>
  );
}

/**
 * POINT 판 — 섹션 하나를 **한 장**으로 묶는다.
 *
 * 티저는 밝은 달빛 판 하나 위에 POINT 1~5 가 연달아 서는 구조인데, 전부 같은 바탕에 같은
 * 조판이라 스크롤하는 손님 눈에는 끝없는 한 덩어리로 보였다. 섹션마다 바탕을 한 톤 내리고
 * 테두리를 둘러 **경계**를 만든다 — 안에 드는 근거 카드(흰색)는 그 위에서 오히려 더 뜬다.
 */
export function PointCard({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <section
      className="mt-12 rounded-[16px] px-4 py-7"
      style={{
        // 각도는 판(teaser-light, 168deg)과 같이 간다 — 다른 각도로 깔면 두 그라데가 서로 어긋나
        // 판 안에서 사각형이 떠 보인다. 위(배지)가 짙고 가운데가 열렸다가 아래에서 다시 달빛으로.
        background:
          "linear-gradient(168deg, rgba(91,63,143,0.13) 0%, rgba(91,63,143,0.035) 52%, rgba(139,110,190,0.11) 100%)",
        border: `1px solid ${LINE}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <PointBadge n={n} />
      {children}
    </section>
  );
}

/** 본문 — 16/400/24. 티저의 기본 글줄. */
export function T({ children, center = true }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`text-[16px] leading-[24px] ${center ? "text-center" : ""}`}
      style={{ color: BODY, fontWeight: 400 }}
    >
      {children}
    </p>
  );
}

/** 캡션·각주 — 13/MUTE. 자간만 normal 로 되돌린다(원본도 여기서만 normal).
 *
 * ⚠ 원래 `#a1a1a1` 하드코딩이었다 — 청월당 원본(바탕 #f3f2ef)에서 뜬 값인데, 우리 판은
 *   달빛(#EDE7F6)이라 같은 회색이 대비 2.14 로 깔렸다(실측 2026-08-24, 기준선 4.5).
 *   이 파일 머리의 규칙(값은 스킨 토큰에만 둔다)을 이 한 줄이 어기고 있었다 → MUTE 로 되돌린다.
 *   크기도 12 → 13: 여기 걸리는 문장 중엔 각주가 아닌 것이 섞여 있다
 *   (「A4 여덟 장 · 다 읽는 데 열다섯 분」은 분량을 파는 값이다). */
export function Cap({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[13px] leading-[19px]" style={{ color: MUTE, letterSpacing: "normal" }}>
      {children}
    </p>
  );
}

/** 짧은 구분선 — 헤드와 서브 사이. 원본이 얇은 선을 아주 많이 쓴다. */
export function Rule() {
  return <div className="mx-auto my-4 h-px w-8" style={{ background: LINE }} />;
}

/** 강조 한 조각 — 핑크 굵게. 한 문장에 하나만. */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: PINK, fontWeight: 700 }}>{children}</span>
  );
}

/** 큰 숫자 — 30/800/핑크. 단위는 14 로 작게 붙인다.
 *  원본의 「나의 연애 기회: 9회」가 이 규격이다. */
export function BigNum({ value, unit }: { value: number | string; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="text-[30px] leading-[30px]" style={{ color: PINK, fontWeight: 800 }}>
        {value}
      </span>
      <span className="text-[14px] leading-[18px]" style={{ color: "#424242", fontWeight: 400 }}>
        {unit}
      </span>
    </span>
  );
}

/** 값 줄 — 연월처럼 확정값을 쓰는 자리(16/500/#111). */
export function Val({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[16px] leading-[24px]" style={{ color: INK, fontWeight: 500 }}>
      {children}
    </span>
  );
}

/** 잠금 줄 — 행간을 24 가 아니라 **16** 으로 조인다(원본 실측). 값은 DOM 에 넣지 않는다. */
export function LockRow({ label, mask = "████" }: { label: string; mask?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
      <span className="text-[16px] leading-[16px]" style={{ color: BODY }}>
        {label}
      </span>
      <span className="text-[16px] leading-[16px] select-none" style={{ color: "#c9c9c9", letterSpacing: "0.05em" }}>
        {mask}
      </span>
    </div>
  );
}

/**
 * 열린 달 카드 — 티저에서 **유일하게 날짜가 붙은 공짜 답**을 왕으로 세우는 자리.
 *
 * 왜 카드인가: 예전엔 열린 달과 잠긴 달이 같은 15px 목록체로 나란히 서 있어서, 이 화면의
 * 결론(「가장 가까운 달이 언제다」)이 잠금 줄과 구분이 안 됐다. 장식은 정작 곁가지(2030년
 * 붓 동그라미)가 다 가져가고 있었다. 조판 규칙대로 **정점 한 줄만** 키우고 색을 준다.
 *
 * 여백 규칙(형님 지시 2026-08-24): 왕은 혼자 있어야 왕이다.
 *   · 카드 안 패딩을 넉넉히(px-5 pt-7 pb-6) — 비좁으면 보물이 아니라 표가 된다
 *   · 「달」과 아래 잠금 덩어리 사이(mt-7)를 잠금 줄끼리 간격(mt-3)의 2배 이상으로
 *   · 카드 자체도 위(mt-9)를 크게 비워 앞 문단에서 떼어 놓는다
 *
 * 달 그림은 **위 격자에서 쓴 것과 같은 부품**이다 — 같은 기호가 두 번 나와야 손님이
 * 「10월 = 저 보름달」을 설명 없이 잇는다.
 */
export function OpenMonthCard({
  year,
  month,
  desc,
  note,
  moon,
  locks,
}: {
  year: number;
  month: number;
  desc: string;
  /** 카드 밑에 까는 한 줄 — 「여기까지 무료」를 말이 아니라 자리로 알린다 */
  note?: string;
  moon?: React.ReactNode;
  /** 잠긴 달들 — 값이 아니라 **가려진 자리의 개수와 모양**이 정보다 */
  locks?: { label: string }[];
}) {
  return (
    <div
      className="mt-9 bg-white px-5 pb-6 pt-7"
      style={{ borderRadius: 14, border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(20,12,40,0.10)" }}
    >
      <p className="flex items-center gap-2.5">
        {moon}
        <span className="font-myeongjo text-[17px]" style={{ color: INK, fontWeight: 700 }}>
          {year}년{" "}
          {/* 이 화면의 정점 — 크기·색은 여기 한 곳에만 준다 */}
          <span className="text-[34px] leading-[1.1] tracking-[-0.02em]" style={{ color: PINK, fontWeight: 800 }}>
            {month}월
          </span>
        </span>
      </p>
      <p className="mt-2.5 text-[17px] leading-[26px]" style={{ color: INK, fontWeight: 700 }}>
        {desc}
      </p>
      {note && (
        <p className="mt-1.5 text-[13px] leading-[20px]" style={{ color: MUTE }}>
          {note}
        </p>
      )}
      {locks && locks.length > 0 && (
        <div className="mt-7 space-y-3 border-t pt-5" style={{ borderColor: "#EFE9F8" }}>
          {locks.map((l, i) => (
            <div key={i} className="flex items-center gap-3">
              <NeonMask text="20○○년 ○월" scribble={false} />
              <span className="text-[15px] leading-[22px]" style={{ color: BODY }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 흰 카드 — 좌측 세로 핑크 바. 후기·장 제목이 쓰는 원본 카드 규격(radius 10). */
export function BarCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden bg-white px-4 py-4"
      style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      <span className="absolute left-0 top-0 h-full w-[4px]" style={{ background: PINK }} />
      {children}
    </div>
  );
}

/** 태그 칩 — 연분홍 배경. 후기 카드의 「솔로탈출 가능해요」 자리. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[12px]"
      style={{ background: CHIP, color: CHIP_TEXT, letterSpacing: "normal" }}
    >
      {children}
    </span>
  );
}

/** 한지 목차 카드 — 이중 테두리 + 네 모서리 문양.
 *  원본은 장(章)마다 풀이 줄을 4~6개씩 펼쳐 **약 30줄**을 보여준다(우리 기존 5줄의 6배). */
export function HanjiCard({ children }: { children: React.ReactNode }) {
  return (
    // 종이 질감을 깐다 — 단색이면 「div 카드」로 읽히고, 얼룩이 있으면 한지로 읽힌다.
    // 텍스처 이미지가 오면 HANJI_BG 한 곳만 갈아끼우면 전 카드에 반영된다.
    <div className="p-1.5" style={{ border: `1px solid ${PINK}55`, ...HANJI_BG }}>
      <div className="relative px-4 py-6" style={{ border: `1px solid ${PINK}33` }}>
        {(["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"] as const).map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} h-3 w-3`}
            style={{ border: `2px solid ${PINK}66`, opacity: 0.7 }}
          />
        ))}
        {children}
      </div>
    </div>
  );
}

/** 장 제목 + 풀이 줄들 — 목차 카드 안에 반복해서 쌓는다. */
export function TocChapter({ title, items }: { title: string; items: string[] }) {
  return (
    // ⚠ 장 사이 간격은 **호출부**가 준다. 여기 `mt-10 first:mt-0` 을 걸어 뒀더니, 호출부가 장마다
    // `<div>` 로 감싸는 구조라 모든 장이 각자 first 가 되어 mt-10 이 한 번도 안 먹었다 —
    // 장 끝 코멘트와 다음 장 제목이 간격 0 으로 붙어, 코멘트가 다음 장에 달린 말로 읽혔다(운영 실측).
    <div>
      <p className="flex items-center gap-2.5 text-[17px]" style={{ color: INK, fontWeight: 700 }}>
        <span className="inline-block h-[16px] w-[3px]" style={{ background: PINK }} />
        {title}
      </p>
      <ul className="mt-2">
        {items.map((it, i) => (
          <li key={it} className="py-3 text-[15px] leading-[24px]" style={{ color: BODY, borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontWeight: 700 }}>풀이 {i + 1}.</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 가격 비교 카드 — VS 표의 한 칸. 금액 범위를 `~` 로 **세로** 배치하는 게 원본 규격. */
export function VsCard({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div
      className="shrink-0 bg-white px-5 py-4 text-center"
      style={{ borderRadius: 10, border: `1px solid ${PINK}33`, minWidth: 132 }}
    >
      <span
        className="inline-block rounded-full px-3 py-1 text-[13px]"
        style={{ background: PINK, color: "#fff", letterSpacing: "normal" }}
      >
        {label}
      </span>
      <p className="mt-3 text-[17px] leading-[26px]" style={{ color: INK, fontWeight: 700 }}>
        {from}
        <br />
        <span style={{ fontWeight: 400, color: MUTE }}>~</span>
        <br />
        {to}
      </p>
    </div>
  );
}

/** ⊕ 로 이어지는 이득 목록 — 가격 아래. 항목마다 핵심어만 핑크. */
export function PlusList({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="mt-6">
      {items.map((it, i) => (
        <div key={i}>
          {i > 0 && (
            <div className="flex items-center gap-2 py-1">
              <span className="h-px flex-1" style={{ background: LINE }} />
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[13px]"
                style={{ background: "#333", color: "#fff" }}
              >
                +
              </span>
              <span className="h-px flex-1" style={{ background: LINE }} />
            </div>
          )}
          <p className="text-center text-[15px] leading-[24px]" style={{ color: BODY }}>
            {it}
          </p>
        </div>
      ))}
    </div>
  );
}

/** 어두운 대비 밴드 — 채팅 목업이 사는 자리.
 *  원본은 어두운 구간을 **짧게** 끼운다(전체의 2%). 길게 깔면 그게 밤티가 된다. */
export function DarkBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="-mx-5 px-5 py-12" style={{ background: "#242424" }}>
      {children}
    </section>
  );
}

/** 채팅 목업 한 줄 — 어두운 밴드 위. 손님이 스스로 자기 고민을 체크하게 만드는 장치. */
export function ChatLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-2 rounded-[14px] px-4 py-3 text-[15px] leading-[22px]"
      style={{ background: "#424242", color: "rgba(255,255,255,0.8)" }}
    >
      {children}
    </div>
  );
}
