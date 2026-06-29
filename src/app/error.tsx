"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// 오류 화면 — 브랜드 톤 + 복구(다시 시도)/퍼널 복귀. 내부 에러 메시지는 사용자에게 노출하지 않음.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // 기술적 상세는 콘솔에만(사용자 화면에는 노출하지 않음)
    console.error(error);
  }, [error]);

  return (
    <div className="container py-24 text-center">
      <p className="font-brush text-gold-soft/60 text-2xl tracking-[0.3em] mb-3">命</p>
      <h1 className="font-myeongjo text-2xl font-semibold tracking-[0.04em] text-bone">
        잠시 길이 엉켰어요
      </h1>
      <p className="mt-3 text-sm text-bone-soft leading-relaxed">
        일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
      </p>
      <div className="gold-diamond mx-auto mt-6" />
      <div className="mt-7 flex flex-col items-center gap-3">
        <Button onClick={reset} className="tracking-[0.08em]">다시 시도</Button>
        <Link
          href="/products/life-saju"
          className="text-xs text-bone-soft underline underline-offset-4 hover:text-gold"
        >
          내 사주 풀이 보기
        </Link>
      </div>
    </div>
  );
}
