"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

// 분석 대기 중 보여줄 후기(사회적 증거) — 생성 ~수십 초 동안 이탈 방지 + 기대감
const REVIEWS: { tag: string; stars: number; body: string }[] = [
  { tag: "재물 · 52", stars: 5, body: "돈에 대한 압박이 컸는데, 무엇을 기다리고 무엇을 움직일지 시기를 알게 된 게 가장 컸어요." },
  { tag: "인연 · 29", stars: 5, body: "‘왜 같은 사람만 만나지?’ 그 답을 들었어요. 인연이 끊긴 게 아니라 제 흐름이 거기 머물러 있던 거였더라고요." },
  { tag: "진로 · 41", stars: 5, body: "이직 시기를 두고 일 년을 고민했는데, 풀이 보고 두 달 만에 결정했어요. 이유가 명확해지는 느낌." },
  { tag: "종합 · 47", stars: 5, body: "반신반의했는데 ‘완전 내 얘기네’ 싶어서 소름. 다른 고민도 보고 싶어졌어요." },
  { tag: "관계 · 38", stars: 5, body: "생각보다 훨씬 구체적이라 깜짝 놀랐어요. 캡처해서 친구한테 바로 보냈네요." },
];

function CheckoutSuccessInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [state, setState] = useState<"loading" | "ready" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  // 후기 회전 (대기 중)
  useEffect(() => {
    if (state !== "loading") return;
    const t = setInterval(() => setIdx((i) => (i + 1) % REVIEWS.length), 3500);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    const paymentKey = search.get("paymentKey");
    const orderId = search.get("orderId");
    const amount = Number(search.get("amount"));
    if (!paymentKey || !orderId || !amount) {
      setState("error");
      setMessage("필수 파라미터가 누락되었습니다.");
      return;
    }
    // 결제 보류 시 결과지 생성을 몇 차례 재시도(자가복구) — 사용자가 떠나기 전에
    // 일시적 API/LLM 장애를 흡수한다. 끝내 실패하면 크론/웹훅이 백업으로 마무리.
    const selfHeal = async (oid: string): Promise<boolean> => {
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 6000));
        try {
          const r = await fetch("/api/orders/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: oid }),
          });
          const j = await r.json();
          if (j.resultId) {
            setResultId(j.resultId);
            setState("ready");
            return true;
          }
        } catch {
          // 폴링 일시 실패는 무시하고 다음 시도
        }
      }
      return false;
    };

    (async () => {
      try {
        const res = await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "결제 승인 실패");
        if (json.resultId) {
          setResultId(json.resultId);
          setState("ready");
          return;
        }
        // 결제는 완료, 결과지는 보류 → 자가복구 폴링
        const healed = await selfHeal(orderId);
        if (!healed) {
          setState("ok");
          setMessage(
            "결제는 완료됐어요. 결과지는 곧 자동으로 완성되어 마이페이지에 도착해요. 잠시 후 마이페이지에서 확인해 주세요.",
          );
        }
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "결제 승인 중 오류가 발생했습니다.");
      }
    })();
  }, [router, search]);

  // ── 대기 화면: 분석 중 + 후기 회전 ──
  if (state === "loading") {
    const r = REVIEWS[idx];
    return (
      <div className="container py-16 max-w-md text-center">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-3">命式</p>
        <h1 className="font-myeongjo text-2xl font-semibold text-bone glow-bone">
          사주를 분석하고 있어요
        </h1>
        <p className="mt-3 text-sm text-bone-soft">
          정통 만세력으로 명식을 세우고, 풀이를 정성껏 쓰는 중이에요.
        </p>

        {/* 진행 인디케이터 */}
        <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: "200ms" }} />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
        <p className="mt-3 text-[11px] text-bone-faint tracking-[0.04em]">보통 1분 안에 완성돼요 · 창을 닫지 마세요</p>

        <div className="gold-diamond mx-auto mt-8" />

        {/* 후기 회전 */}
        <p className="mt-6 font-myeongjo text-xs text-gold-soft tracking-[0.1em]">먼저 받아본 분들의 후기</p>
        <div
          key={idx}
          className="svc-fade mt-3 rounded-md border border-gold-pale bg-[rgba(13,6,8,0.5)] p-5 text-left min-h-[120px]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gold-bright text-sm tracking-[0.1em]">{"★".repeat(r.stars)}</span>
            <span className="font-mono text-[10px] text-bone-faint tracking-[0.1em]">{r.tag}</span>
          </div>
          <p className="text-sm text-bone-soft leading-relaxed">{r.body}</p>
        </div>

        {/* 점 인디케이터 */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {REVIEWS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                background: i === idx ? "var(--gold-bright)" : "rgba(212,175,106,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 생성 완료 ──
  if (state === "ready" && resultId) {
    return (
      <div className="container py-20 max-w-md text-center">
        <p className="font-brush text-gold-soft/60 text-2xl tracking-[0.3em] mb-3">受</p>
        <h1 className="font-myeongjo text-2xl font-semibold text-bone glow-bone leading-snug">
          결과지가
          <br />
          완성되었어요!
        </h1>
        <p className="mt-3 text-sm text-bone-soft">정성껏 풀어드린 내 사주 기록, 지금 확인해보세요.</p>
        <div className="gold-diamond mx-auto mt-6" />
        <div className="mt-7">
          <Link
            href={`/results/${resultId}`}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 font-bold text-base tracking-[0.1em]"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              background: "linear-gradient(180deg,#e8c878,#d4af6a)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 24px rgba(212,175,106,0.3)",
            }}
          >
            결과지 확인하기
            <span className="font-brush text-xl">覽</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── 보류/오류 ──
  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{state === "error" ? "결제 처리 실패" : "결제 완료"}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={state === "error" ? "/products" : "/mypage/orders"}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            {state === "error" ? "상품으로" : "마이페이지에서 확인"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
