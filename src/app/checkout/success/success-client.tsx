"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackConfirmedPurchase } from "@/lib/analytics";
import type { PurchaseReceipt } from "@/lib/purchase-event";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";
import { LAST_ORDER_SLUG_KEY } from "@/components/checkout/TossWidget";
import { worldOfSlug, type World } from "@/lib/world";

// 결제 승인·자가복구·전환 전송 — 브라우저에서만 되는 일.
// 화면 껍데기(세계관)와 토스가 준 파라미터는 **서버가 읽어 내려 준다**.
//
// ⚠ 여기서 useSearchParams() 를 부르면 안 된다. 그 훅 하나 때문에 페이지를 <Suspense> 로
//   감싸야 했는데, 서버 컴포넌트 아래에서는 그 경계가 끝내 안 닫혀
//   **이 컴포넌트가 영영 안 뜼다** = 결제 승인 요청이 안 나간다.
//   (2026-09-07 실측: 화면은 대기 중인데 confirm 요청 0건)
//   서버가 어차피 같은 파라미터를 읽으니 props 로 받는 게 짧고 안전하다.
export function SuccessClient({
  world: serverWorld,
  paymentKey,
  orderId,
  amount,
}: {
  world: World | null;
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);
  // 비회원은 마이페이지에 못 들어간다. 결과지가 보류된 채 이 탭을 닫으면 돌아올 길이
  // 완전히 사라진다(메일도 RESEND 미설정이면 안 감) — 돈만 내고 아무것도 못 받는 상태.
  // 그래서 비회원에겐 마이페이지 대신 **이 페이지 주소**를 쥐여 준다.
  // 이 URL 은 paymentKey·orderId 를 들고 있고 confirm 이 멱등이라, 나중에 다시 열면
  // 그때 완성된 결과지로 그대로 들어간다.
  const [isGuest, setIsGuest] = useState(false);
  const [copied, setCopied] = useState(false);
  // 대기 화면 세계관 — **서버가 준 값이 정본**이다(page.tsx 가 주문번호로 DB 에서 읽는다).
  // 그래야 첫 페인트부터 제 상품 화면이 나간다. 예전엔 이 판정을 여기서만 했는데,
  // useEffect 는 하이드레이션 뒤에야 도니 결제 직후 **2.7초 동안 보라 나경반 + 존댓말**이
  // 떠 있었다(2026-09-07 운영 실측 · 390px · 4G).
  //
  // sessionStorage 는 이제 폴백이다 — 서버 조회가 실패했을 때만 쓴다.
  // (결제 시작점 TossWidget 이 심어 둔다. 시크릿 모드 등에선 읽기가 막혀 null 이 되고,
  //  그때는 기본 화면으로 내려앉아 흐름은 안 깨진다.)
  const [world, setWorld] = useState<World | null>(serverWorld);
  useEffect(() => {
    if (serverWorld) return;
    try {
      setWorld(worldOfSlug(sessionStorage.getItem(LAST_ORDER_SLUG_KEY)));
    } catch {
      // 접근 불가 환경 — 기본 화면
    }
  }, [serverWorld]);

  // Browser fallback uses the server receipt's canonical amount and event ID.
  // The server ledger/CAPI does not depend on this tab remaining open.
  const purchaseSent = useRef(false);
  const sendPurchase = useCallback((purchase: PurchaseReceipt | null | undefined) => {
    if (!purchase || purchaseSent.current) return;
    purchaseSent.current = trackConfirmedPurchase(purchase);
  }, []);

  useEffect(() => {
    const amountNum = Number(amount);
    if (!paymentKey || !orderId || !amountNum) {
      setState("error");
      setMessage("필수 파라미터가 누락되었습니다.");
      return;
    }
    // 결제 보류 시 결과지 생성을 몇 차례 재시도(자가복구) — 사용자가 떠나기 전에
    // 일시적 API/LLM 장애를 흡수한다. 끝내 실패하면 크론/웹훅이 백업으로 마무리.
    // 폴링 창은 **생성 시간보다 넉넉해야** 한다. 예전 6초×4=24초는 gpt-4o-mini(8~19초)
    // 기준이었는데, 루나 11장 결과지는 실측 평균 26초·최대 36초다(15인 배치) — 그대로 두면
    // 정상 생성인데도 "보류" 화면을 보게 된다. 8초×8=64초로 늘려 첫 화면에서 끝내게 한다.
    // (그래도 못 받으면 기존대로 크론·웹훅이 백업)
    const selfHeal = async (oid: string): Promise<boolean> => {
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        try {
          const r = await fetch("/api/orders/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: oid, paymentKey }),
          });
          const j = await r.json();
          if (typeof j.guest === "boolean") setIsGuest(j.guest);
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

    // Read the receipt during slow result generation. This endpoint never generates
    // another result or approves another payment. A pending deposit returns null.
    let stopped = false;
    let polling = false;
    const receiptTimer = setInterval(async () => {
      if (stopped || polling || purchaseSent.current) return;
      polling = true;
      try {
        const response = await fetch("/api/orders/purchase-receipt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentKey }), signal: AbortSignal.timeout(4000),
        });
        if (response.ok && !stopped) sendPurchase((await response.json()).purchase);
      } catch { /* CAPI and the confirm response remain independent fallbacks */ }
      finally { polling = false; }
    }, 5000);
    (async () => {
      try {
        const res = await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount: amountNum, purchaseTrackingVersion: 1 }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "결제 승인 실패");
        sendPurchase(json.purchase);
        const guest = json.guest === true;
        if (guest) setIsGuest(true);
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
            guest
              ? "결제는 완료됐어요. 결과지는 곧 자동으로 완성됩니다 — 아래 주소를 저장해 두셨다가 잠시 후 다시 열어 주세요."
              : "결제는 완료됐어요. 결과지는 곧 자동으로 완성되어 마이페이지에 도착해요. 잠시 후 마이페이지에서 확인해 주세요.",
          );
        }
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "결제 승인 중 오류가 발생했습니다.");
      } finally {
        clearInterval(receiptTimer);
      }
    })();
    return () => { stopped = true; clearInterval(receiptTimer); };
  }, [paymentKey, orderId, amount, sendPurchase]);

  // ── 대기 화면: 분석 중 — 풀스크린. 방금 산 상품의 세계관을 그대로 이어간다 ──
  if (state === "loading") {
    return <AnalyzingScreen variant="paid" world={world} />;
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
              fontFamily: "var(--font-serif-kr), serif",
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
  const guestPending = state === "ok" && isGuest;
  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{state === "error" ? "결제 처리 실패" : "결제 완료"}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {guestPending && (
            <>
              {/* 비회원의 유일한 귀환 경로 — 주문번호까지 같이 보여 준다(문의할 때 필요) */}
              <div className="rounded-md border border-gold-line p-3">
                <p className="text-xs text-bone-faint">내 결과지 주소 (저장해 두세요)</p>
                <p className="mt-1 break-all text-[11px] leading-relaxed text-bone-soft">
                  {typeof window !== "undefined" ? window.location.href : ""}
                </p>
                <p className="mt-2 text-[11px] text-bone-faint">
                  주문번호 {orderId}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // 클립보드 차단 환경 — 주소가 위에 그대로 보이므로 흐름은 안 깨진다
                  }
                }}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                {copied ? "복사했어요" : "주소 복사하기"}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                지금 다시 확인하기
              </button>
            </>
          )}
          {!guestPending && (
            <Link
              href={state === "error" ? "/products" : "/mypage/orders"}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              {state === "error" ? "상품으로" : "마이페이지에서 확인"}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
