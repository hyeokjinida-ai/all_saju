"use client";

// 판·카드 — 글이 앉는 그릇. 크기는 자(FS)로 갈았다(직녀 판은 청월당 실측 16/12 를 물고 있었다).
// 규칙: **그림은 끝까지, 판은 한 단 안쪽**(2026-08-12 확정).
import { FS, LH } from "@/components/kit/scale";

/** 한지 카드 — 이중 테두리 + 네 모서리 문양. 목차·발췌가 앉는 자리.
 *  단색이면 「div 카드」로 읽히고, 얼룩이 있으면 한지로 읽힌다(질감은 .tx-hanji). */
export function HanjiCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="tx-hanji p-1.5" style={{ border: "1px solid var(--gold-line)" }}>
      <div className="relative px-4 py-6" style={{ border: "1px solid var(--gold-line)" }}>
        {(["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"] as const).map((pos) => (
          <span key={pos} className={`absolute ${pos} h-3 w-3`} style={{ border: "2px solid var(--gold-line)", opacity: 0.7 }} />
        ))}
        {children}
      </div>
    </div>
  );
}

/** 세로 바 카드 — 좌측에 포인트색 바. 후기·장 제목·근거 블록이 쓰는 규격. */
export function BarCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden px-4 py-4"
      style={{ background: "var(--gold-pale)", borderRadius: 10, border: "1px solid var(--gold-line)" }}
    >
      <span className="absolute left-0 top-0 h-full w-[4px]" style={{ background: "var(--gold-bright)" }} />
      {children}
    </div>
  );
}

/** 칩 — 짧은 꼬리표. 「솔로탈출 가능해요」 자리. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1"
      style={{ fontSize: FS.aux, background: "var(--chip-bg, var(--gold-pale))", color: "var(--chip-text, var(--bone))", letterSpacing: "normal" }}
    >
      {children}
    </span>
  );
}

/** 잠금 줄 — 행간을 본문보다 **조인다**(값이 없는 줄이라 여백이 뜨면 빈칸으로 보인다).
 *  ⚠ 값은 DOM 에 넣지 않는다 — 흐리게만 하면 소스에서 그대로 읽힌다. */
export function LockRow({ label, mask = "████" }: { label: string; mask?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--gold-line)" }}>
      <span style={{ fontSize: FS.body, lineHeight: 1, color: "var(--bone-soft)" }}>{label}</span>
      <span className="select-none" style={{ fontSize: FS.body, lineHeight: 1, color: "var(--bone-faint)", letterSpacing: "0.05em" }}>
        {mask}
      </span>
    </div>
  );
}

/** 어두운 대비 밴드 — 목업·인용이 사는 자리.
 *  ⚠ **짧게** 끼운다(원본은 전체의 2%). 길게 깔면 그게 밤티가 된다. */
export function DarkBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="-mx-5 px-5 py-12" style={{ background: "var(--night-edge)" }}>
      {children}
    </section>
  );
}

/** 채팅 목업 한 줄 — 어두운 밴드 위. 손님이 스스로 자기 고민을 체크하게 만드는 장치. */
export function ChatLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-2 rounded-[14px] px-4 py-3"
      // 바탕은 **그 세계관의 밤을 살짝 들어올린 것**. 값을 새로 고르지 않고 토큰끼리 섞어 뽑는다 —
      // var(--night-2) 를 쓰면 스킨이 안 덮어서 모든 세계관이 자수정 보라를 물려받는다(실측).
      style={{
        fontSize: FS.body,
        lineHeight: LH.body,
        background: "color-mix(in srgb, var(--night-edge) 84%, var(--bone) 16%)",
        color: "var(--bone-soft)",
      }}
    >
      {children}
    </div>
  );
}
