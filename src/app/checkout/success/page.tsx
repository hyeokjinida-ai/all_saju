"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [state, setState] = useState<"loading" | "ready" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);

  // 결제 완료 전환 추적(결과지 생성 성공 시 1회). 금액·통화만, 개인정보 없음.
  useEffect(() => {
    if (!resultId) return;
    const amount = Number(search.get("amount"));
    track("purchase", { value: Number.isFinite(amount) && amount > 0 ? amount : undefined, currency: "KRW" });
  }, [resultId, search]);

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
            body: JSON.stringify({ orderId: oid, paymentKey }),
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

  // ── 대기 화면: 분석 중(회전 나경반 + 후기) — 풀스크린 ──
  if (state === "loading") {
    return <AnalyzingScreen variant="paid" />;
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
              background: "linear-gradient(180deg,#ffffff,#f1eaff)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 24px rgba(150,90,255,0.3)",
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
