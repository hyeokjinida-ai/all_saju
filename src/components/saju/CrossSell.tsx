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

// 결제 후 업셀 — 같은 명식 재사용 "원클릭 재구매". 지금은 인생 프리미엄 풀이만 노출.
export function CrossSell({
  products,
  input,
  email,
}: {
  products: CrossSellProduct[];
  input: CrossSellInput;
  signal?: CrossSellSignal | null;
  email?: string | null; // 비회원 재구매용 — 첫 결제 때 받은 이메일 재사용
}) {
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
        <div style={{ fontFamily: "'Ma Shan Zheng', cursive", fontSize: 26, color: "#c9a8ff", lineHeight: 1 }}>緣</div>
        <h2 style={{ marginTop: 8, fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 19, color: "#f3edff" }}>
          같은 명식으로 이어서 보기
        </h2>
        <p style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.6, color: "#9a8cd0" }}>
          정보를 다시 입력할 필요 없이, 한 번의 클릭으로 바로 받아보실 수 있어요.
        </p>
      </div>

      {/* 인생 프리미엄 풀이 — 추천 카드(자수정 글로우) */}
      <div
        style={{
          borderRadius: 18,
          padding: "20px 18px",
          background: "linear-gradient(160deg, rgba(150,90,255,.18), rgba(40,20,80,.5))",
          border: "2px solid #b794ff",
          boxShadow: "0 14px 34px rgba(120,60,240,.3)",
        }}
      >
        <span style={{ display: "inline-block", marginBottom: 12, padding: "4px 11px", borderRadius: 999, background: "#dcc8ff", color: "#3a1a8a", fontSize: 11, fontWeight: 800 }}>
          추천 · 끝판왕 풀이
        </span>
        <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontWeight: 800, fontSize: 21, color: "#fff" }}>{premium.name}</div>
        <p style={{ marginTop: 9, fontSize: 13, lineHeight: 1.7, color: "#dcd0ff" }}>
          대운 60년 흐름과 재물·직업·관계·건강운을 한 번에 통합 분석합니다. 지금 보신 풀이의 큰 그림까지 이어서 봐요.
        </p>
        <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "#b8a4e0", letterSpacing: ".04em", marginBottom: 3 }}>같은 명식 · 재입력 없이</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{formatKRW(premium.price)}</div>
          </div>
          <button
            type="button"
            onClick={buy}
            disabled={busy}
            className="shrink-0 transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ padding: "13px 22px", borderRadius: 13, background: "linear-gradient(180deg,#fff,#f1eaff)", color: "#3a1a8a", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer" }}
          >
            {busy ? "이동 중…" : "바로 보기 →"}
          </button>
        </div>
      </div>

      <p style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "#9a8cd0" }}>
        이미 입력하신 생년월일·시각이 그대로 적용됩니다.
      </p>
    </section>
  );
}
