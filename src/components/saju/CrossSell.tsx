"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";

export type CrossSellInput = {
  name: string | null;
  birthDate: string;
  birthTime: string | null;
  timeUnknown: boolean;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  concerns: string[];
};

export type CrossSellProduct = {
  productId: string;
  slug: string;
  name: string;
  description: string;
  price: number;
};

// 명식 근거 개인화 신호 (saju-api extractCrossSellSignal 와 같은 형태 — 클라이언트용 로컬 타입)
export type CrossSellSignal = {
  jaeseongCount: number | null;
  hasYearClash: boolean;
};

// 신호가 가리키는 상품의 "부드러운 근거" 한 줄 (공포 X, 호기심 O)
function signalReasonFor(slug: string, signal?: CrossSellSignal | null): string | null {
  if (!signal) return null;
  if (slug === "wealth-saju" && signal.jaeseongCount === 0)
    return "사주에 재물을 담는 기운(재성)이 약하게 잡혀요 — 돈이 들어오는 길과 머무는 구조를 따로 짚어보면 도움이 됩니다.";
  if (slug === "monthly-luck" && signal.hasYearClash)
    return "올해는 흐름의 변동이 큰 해로 보여요 — 어느 달에 움직이고 어느 달에 멈출지 미리 정리해두면 좋습니다.";
  return null;
}

// 고민(concern) → 어떤 상품을 밀지 매핑 (freeReading.ts 의 4050 고민 키와 일치)
const CONCERN_MATCH: Record<string, string[]> = {
  "wealth-saju": ["재물", "노후", "직장·사업"],
  "love-saju": ["부부·연애", "자녀", "가족"],
  "monthly-luck": ["올해 운", "건강"],
  "premium-saju": ["재물", "직장·사업", "건강", "노후", "올해 운", "부부·연애", "자녀", "가족"],
};

function reasonFor(slug: string, matched: string[]): string {
  if (slug === "wealth-saju")
    return matched.length
      ? `${matched.join("·")}을(를) 궁금해하셨죠 — 돈이 들어오고 새는 구조, 올해 지출 흐름을 더 깊게 봅니다`
      : "돈이 들어오고 새는 구조와 올해 재물 흐름을 깊게 봅니다";
  if (slug === "love-saju")
    return matched.length
      ? `${matched.join("·")}을(를) 궁금해하셨죠 — 반복되는 관계 패턴과 잘 맞는 사람을 깊이 풀어드려요`
      : "부부·연애·자녀·가족, 반복되는 관계 패턴을 깊게 봅니다";
  if (slug === "monthly-luck")
    return matched.length
      ? `${matched.join("·")} — 1~12월 좋은 달·조심할 달을 따로 정리해드립니다`
      : "올해 1~12월 좋은 달과 조심할 달을 따로 정리해드립니다";
  if (slug === "premium-saju")
    return matched.length
      ? `${matched.join("·")}까지 — 대운 60년에 재물·직업·관계·건강을 한 번에 통합해 봅니다`
      : "대운 60년 흐름과 재물·직업·관계·건강운을 통합 분석합니다";
  if (slug === "today-fortune") return "매일 아침 가볍게 보는 오늘 하루의 흐름 한 줄";
  return "";
}

// 결제 후 개인화 크로스셀 — 저장된 명식·고민을 재사용해 "재입력 없는 원클릭 재구매".
export function CrossSell({
  products,
  input,
  signal,
}: {
  products: CrossSellProduct[];
  input: CrossSellInput;
  signal?: CrossSellSignal | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // 정렬: ① 고민 매칭 ② 명식 신호(재성 약함·올해 변동) ③ 프리미엄 업셀 가산점
  // 신호 근거가 있으면 그 한 줄을 이유로 우선 노출(고민을 안 골랐어도 추천이 비지 않게).
  const enriched = products
    .map((p) => {
      const matched = (CONCERN_MATCH[p.slug] ?? []).filter((c) => input.concerns.includes(c));
      const sigReason = signalReasonFor(p.slug, signal);
      const score =
        matched.length * 10 + (sigReason ? 12 : 0) + (p.slug === "premium-saju" ? 1 : 0);
      return {
        ...p,
        matched,
        sigReason,
        reason: sigReason ?? reasonFor(p.slug, matched),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 크로스셀은 최대 3개까지만 노출

  if (!enriched.length) return null;
  const [primary, ...rest] = enriched;

  async function buy(p: CrossSellProduct) {
    setBusy(p.productId);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.productId,
          name: input.name ?? "",
          birthDate: input.birthDate,
          birthTime: input.timeUnknown ? null : input.birthTime,
          timeUnknown: input.timeUnknown,
          gender: input.gender,
          calendar: input.calendar,
          concerns: input.concerns,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "주문 생성에 실패했습니다");
      router.push(`/checkout/${json.orderId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다");
      setBusy(null);
    }
  }

  return (
    <section className="mt-14 pt-10 border-t border-gold-line">
      <header className="text-center mb-7">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">緣</p>
        <h2 className="font-myeongjo text-xl font-semibold text-bone">같은 명식으로 이어서 보기</h2>
        <p className="mt-2 text-xs text-bone-soft tracking-[0.04em]">
          정보를 다시 입력할 필요 없이, 한 번의 클릭으로 바로 풀이를 받아보실 수 있어요.
        </p>
      </header>

      {/* 1순위 추천 — 고민에 가장 잘 맞는 상품을 강조 */}
      <div
        className="relative rounded-md p-6"
        style={{
          border: "1.5px solid var(--gold)",
          background:
            "linear-gradient(180deg, rgba(212,175,106,0.10) 0%, rgba(13,6,8,0.65) 100%)",
          boxShadow: "0 0 24px rgba(212,175,106,0.15)",
        }}
      >
        {(primary.matched.length > 0 || primary.sigReason) && (
          <div className="seal absolute -top-3 right-4 w-11 h-11 text-[13px] flex items-center justify-center" style={{ transform: "rotate(-8deg)" }}>
            <span className="relative z-[2]">推</span>
          </div>
        )}
        {primary.sigReason ? (
          <p className="font-mono text-[10px] text-gold tracking-[0.25em] mb-2">· 당신의 명식이 가리키는 것 ·</p>
        ) : primary.matched.length > 0 ? (
          <p className="font-mono text-[10px] text-gold tracking-[0.25em] mb-2">
            · 당신이 궁금해한 {primary.matched.join("·")} ·
          </p>
        ) : null}
        <p className="font-myeongjo text-lg font-bold text-gold-bright">{primary.name}</p>
        <p className="mt-2 text-sm text-bone-soft leading-relaxed">{primary.reason}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-serif text-2xl font-bold text-gold-bright">{formatKRW(primary.price)}</span>
          <button
            type="button"
            onClick={() => buy(primary)}
            disabled={!!busy}
            className="shrink-0 px-6 py-3 text-sm font-bold tracking-[0.12em] disabled:opacity-60"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              background: "linear-gradient(180deg,#e8c878,#d4af6a)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 20px rgba(212,175,106,0.3)",
            }}
          >
            {busy === primary.productId ? "이동 중…" : "바로 보기 受"}
          </button>
        </div>
      </div>

      {/* 나머지 상품 */}
      {rest.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rest.map((p) => (
            <div
              key={p.productId}
              className="border border-gold-pale bg-[rgba(13,6,8,0.5)] rounded-md p-5 flex flex-col"
            >
              {p.matched.length > 0 && (
                <p className="font-mono text-[9px] text-gold tracking-[0.2em] mb-1.5">
                  · {p.matched.join("·")} ·
                </p>
              )}
              <p className="font-myeongjo text-base font-semibold text-bone">{p.name}</p>
              <p className="mt-2 text-xs text-bone-soft leading-relaxed flex-1">{p.reason}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-serif text-lg font-bold text-gold">{formatKRW(p.price)}</span>
                <button
                  type="button"
                  onClick={() => buy(p)}
                  disabled={!!busy}
                  className="shrink-0 px-4 py-2.5 text-sm font-bold tracking-[0.08em] border border-gold text-gold disabled:opacity-60"
                  style={{ fontFamily: "'Noto Serif KR', serif", background: "transparent" }}
                >
                  {busy === p.productId ? "이동 중…" : "바로 보기"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-bone-faint tracking-[0.04em]">
        이미 입력하신 생년월일·시각이 그대로 적용됩니다.
      </p>
    </section>
  );
}
