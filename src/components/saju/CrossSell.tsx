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

// 명식 근거 개인화 신호 (saju-api extractCrossSellSignal 와 같은 형태)
export type CrossSellSignal = {
  jaeseongCount: number | null;
  hasYearClash: boolean;
};

// 결과지 세계관별 색 — 업셀 카드는 결과지 **바로 밑**에 붙으므로 옷을 안 맞추면
// 검은 신당 결과지 끝에서 보라 카드가 튀어나온다(웹툰 말풍선 때와 같은 이음매).
const TONE = {
  saju: {
    hanja: "#c9a8ff", title: "#f3edff", sub: "#9a8cd0", body: "#dcd0ff", small: "#b8a4e0",
    card: "linear-gradient(160deg, rgba(150,90,255,.18), rgba(40,20,80,.5))",
    border: "2px solid #b794ff", shadow: "0 14px 34px rgba(120,60,240,.3)",
    badgeBg: "#dcc8ff", badgeText: "#3a1a8a",
    btn: "linear-gradient(180deg,#fff,#f1eaff)", btnText: "#3a1a8a",
  },
  sangun: {
    hanja: "#e8c96a", title: "#f3ead6", sub: "rgba(232,201,106,0.55)", body: "#d8ccb4", small: "#9c9179",
    card: "linear-gradient(160deg, rgba(143,43,30,.24), rgba(18,12,8,.75))",
    border: "2px solid rgba(232,201,106,0.5)", shadow: "0 14px 34px rgba(120,40,20,.35)",
    badgeBg: "#7a2317", badgeText: "#f3e6cf",
    btn: "linear-gradient(180deg,#f0d98c,#d3b055)", btnText: "#2a1a08",
  },
} as const;

// 결제 후 업셀 — 같은 명식 재사용 "원클릭 재구매". 지금은 인생 프리미엄 풀이만 노출.
export function CrossSell({
  products,
  input,
  email,
  tone = "saju",
}: {
  products: CrossSellProduct[];
  input: CrossSellInput;
  signal?: CrossSellSignal | null;
  email?: string | null; // 비회원 재구매용 — 첫 결제 때 받은 이메일 재사용
  tone?: keyof typeof TONE;
}) {
  const c = TONE[tone];
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const premium = products.find((p) => p.slug === "premium-saju");
  if (!premium) return null; // 이미 프리미엄을 봤거나 비활성이면 숨김

  async function buy() {
    if (!premium) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: premium.productId,
          name: input.name ?? "",
          birthDate: input.birthDate,
          birthTime: input.timeUnknown ? null : input.birthTime?.slice(0, 5) ?? null,
          timeUnknown: input.timeUnknown,
          gender: input.gender,
          calendar: input.calendar,
          concerns: input.concerns,
          email: email && email.trim() ? email.trim() : undefined, // 비회원이면 이메일 재사용
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "주문 생성에 실패했습니다");
      router.push(`/checkout/${json.orderId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다");
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-hanja), cursive", fontSize: 26, color: c.hanja, lineHeight: 1 }}>緣</div>
        <h2 style={{ marginTop: 8, fontFamily: "var(--font-myeongjo-nanum),serif", fontWeight: 800, fontSize: 19, color: c.title }}>
          같은 사주로 이어서 보기
        </h2>
        <p style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.6, color: c.sub }}>
          정보를 다시 입력할 필요 없이, 한 번의 클릭으로 바로 받아보실 수 있어요.
        </p>
      </div>

      {/* 인생 프리미엄 풀이 — 추천 카드 */}
      <div
        style={{
          borderRadius: 18,
          padding: "20px 18px",
          background: c.card,
          border: c.border,
          boxShadow: c.shadow,
        }}
      >
        <span style={{ display: "inline-block", marginBottom: 12, padding: "4px 11px", borderRadius: 999, background: c.badgeBg, color: c.badgeText, fontSize: 11, fontWeight: 800 }}>
          추천 · 끝판왕 풀이
        </span>
        <div style={{ fontFamily: "var(--font-myeongjo-nanum),serif", fontWeight: 800, fontSize: 21, color: "#fff" }}>{premium.name}</div>
        <p style={{ marginTop: 9, fontSize: 13, lineHeight: 1.7, color: c.body }}>
          인생 60년의 큰 흐름과 재물·직업·관계·건강운을 한 번에 통합 분석합니다. 지금 보신 풀이의 큰 그림까지 이어서 봐요.
        </p>
        <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: c.small, letterSpacing: ".04em", marginBottom: 3 }}>다시 입력하지 않아도 돼요</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{formatKRW(premium.price)}</div>
          </div>
          <button
            type="button"
            onClick={buy}
            disabled={busy}
            className="shrink-0 transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ padding: "13px 22px", borderRadius: 13, background: c.btn, color: c.btnText, fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer" }}
          >
            {busy ? "이동 중…" : "바로 보기 →"}
          </button>
        </div>
      </div>

      <p style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: c.sub }}>
        이미 입력하신 생년월일·시각이 그대로 적용됩니다.
      </p>
    </section>
  );
}
