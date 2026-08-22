"use client";

// 조판 — 글줄 부품. **직녀 것을 그대로 옮기지 않고 우리 자로 다시 짰다**(2026-08-23).
//
// 왜: 직녀 티저의 글줄 부품은 청월당 실측값(본문 16/행간 24 · 캡션 12 · 큰숫자 30 · 단위 14)을
// 그대로 물고 있다. 그걸 부품함에 넣으면 **이후 모든 상품이 청월당 자를 물려받는다** —
// 베낀 티가 시스템에 박히는 것이다. 그래서 짜임새(역할·굵기·색 규칙)만 가져오고 크기는 자(FS)로 갈았다.
// 직녀 옛 파일은 손대지 않는다(화면 변화 0).
//
// 원본에서 **가져온 것**: 위계를 크기가 아니라 굵기(400·500·700·800)와 색으로 만든다는 규칙.
// 숫자가 튀는 이유는 크기가 아니라 주변이 전부 무채색인데 혼자 컬러라서다.
import { FS, LH } from "@/components/kit/scale";

/** 섹션 헤드 — 서예체. 두 줄 중 **한 줄만** 색을 준다(둘 다 칠하면 위계가 죽는다). */
export function Head({
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
    // 굵기 700 고정: 가평한석봉은 400/700 두 벌뿐이라 600 을 주면 브라우저가 가짜로 굵혀 획이 뭉갠다.
    <p
      className="text-center"
      style={{ fontSize: FS.sub, lineHeight: LH.tight, fontFamily: "var(--font-head-brush), serif", fontWeight: 700, color: "var(--bone)" }}
    >
      {lines.map((t, i) =>
        t ? (
          <span key={i} style={i === accent ? { color: "var(--gold-bright)" } : undefined}>
            {i > 0 && <br />}
            {t}
          </span>
        ) : null,
      )}
    </p>
  );
}

/**
 * 정점 — **컷마다 한 줄만.** 조판 규칙 §7(2026-08-22 형님).
 *
 * 「강조는 크게가 아니라 대비다」. 원본은 같은 자리에서 얇게 → 굵게 → 크게 → **크게 + 색**으로
 * 계단을 밟고, 앞 블록들은 일부러 조용하다(400·무채색). 조용한 데가 진짜 조용해야 이 줄이 꽂힌다.
 * ⚠ 박스(칩)로 가두지 않는다 — 가두면 크기가 눌린다. 글자색만 바꾼다.
 */
export function Peak({ children, size = "big" }: { children: React.ReactNode; size?: "big" | "peak" }) {
  return (
    <p
      className="text-center"
      style={{ fontSize: size === "peak" ? FS.peak : FS.big, lineHeight: LH.tight, fontWeight: 800, color: "var(--gold-bright)" }}
    >
      {children}
    </p>
  );
}

/** 배지 — 알약, 테두리만 포인트색. 배경은 비운다. */
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center">
      <span
        className="inline-block rounded-full px-4 py-1"
        style={{ fontSize: FS.aux, border: "1px solid var(--gold-bright)", color: "var(--gold-bright)", fontWeight: 500 }}
      >
        {children}
      </span>
    </p>
  );
}

/** 본문 — 기본 글줄. 정점을 받치는 자리라 **400 무채색**을 지킨다. */
export function Body({ children, center = true }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={center ? "text-center" : ""} style={{ fontSize: FS.body, lineHeight: LH.body, color: "var(--bone-soft)", fontWeight: 400 }}>
      {children}
    </p>
  );
}

/** 캡션·각주 — 자간만 normal 로 되돌린다(스킨이 -0.025em 을 걸어둔 자리라). */
export function Cap({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center" style={{ fontSize: FS.cap, lineHeight: LH.body, color: "var(--bone-faint)", letterSpacing: "normal" }}>
      {children}
    </p>
  );
}

/** 짧은 구분선 — 헤드와 서브 사이. 얇은 선을 아주 많이 쓰는 게 원본 문법이다. */
export function Rule() {
  return <div className="mx-auto my-4 h-px w-8" style={{ background: "var(--gold-line)" }} />;
}

/** 강조 한 조각 — 포인트색 굵게. **한 문장에 하나만.** */
export function Em({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}>{children}</span>;
}

/** 값 줄 — 연월처럼 확정값을 쓰는 자리(본문 크기 + 500). */
export function Val({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: FS.body, lineHeight: LH.body, color: "var(--bone)", fontWeight: 500 }}>{children}</span>
  );
}

/** 큰 숫자 — 단위는 작게 붙인다. 「기회 9회」「그릇 68점」이 이 규격. */
export function BigNum({ value, unit }: { value: number | string; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span style={{ fontSize: FS.big, lineHeight: LH.tight, color: "var(--gold-bright)", fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: FS.aux, color: "var(--bone-faint)", fontWeight: 400 }}>{unit}</span>
    </span>
  );
}
