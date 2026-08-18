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

export const PINK = "#eb4465";
export const INK = "#111111";
export const BODY = "#242424";
export const MUTE = "#757575";
export const LINE = "#e5e7eb";
export const PAPER = "#f3f2ef";
export const CHIP = "#f5cbd4";

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
      style={{ fontFamily: "var(--font-head-brush), serif", fontWeight: 600, color: INK }}
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
    <p className="text-center">
      <span
        className="inline-block rounded-full px-4 py-1 text-[13px]"
        style={{ border: `1px solid ${PINK}`, color: PINK, fontWeight: 500 }}
      >
        POINT {n}
      </span>
    </p>
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

/** 캡션·각주 — 12/#a1a1a1. 자간만 normal 로 되돌린다(원본도 여기서만 normal). */
export function Cap({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[12px] leading-[16px]" style={{ color: "#a1a1a1", letterSpacing: "normal" }}>
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
      style={{ background: CHIP, color: "#8a2540", letterSpacing: "normal" }}
    >
      {children}
    </span>
  );
}

/** 한지 목차 카드 — 이중 테두리 + 네 모서리 문양.
 *  원본은 장(章)마다 풀이 줄을 4~6개씩 펼쳐 **약 30줄**을 보여준다(우리 기존 5줄의 6배). */
export function HanjiCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-1.5" style={{ border: `1px solid ${PINK}55`, background: "#faf7f0" }}>
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
    // 장과 장 사이는 크게 벌린다 — 원본 대조에서 우리 쪽이 붙어 보였다(풀이 마지막 줄과 다음 장 제목이 붙음).
    <div className="mt-10 first:mt-0">
      <p className="flex items-center gap-2.5 text-[17px]" style={{ color: INK, fontWeight: 700 }}>
        <span className="inline-block h-[16px] w-[3px]" style={{ background: PINK }} />
        {title}
      </p>
      <ul className="mt-2">
        {items.map((it, i) => (
          <li key={it} className="py-3 text-[15px] leading-[22px]" style={{ color: BODY, borderBottom: `1px solid ${LINE}` }}>
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
