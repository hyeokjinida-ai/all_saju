"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { formatKRW } from "@/lib/utils";

export function CheckoutExitDialog({ totalDiscount, onContinue, onLeave }: {
  totalDiscount: number;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const leaveRef = useRef<HTMLButtonElement>(null);
  const hasDiscount = Number.isFinite(totalDiscount) && totalDiscount > 0;

  useEffect(() => {
    const previousFocus = document.activeElement;
    continueRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onContinue();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    event.stopPropagation();
    const focusedOnContinue = document.activeElement === continueRef.current;
    const focusedOnLeave = document.activeElement === leaveRef.current;
    if (event.shiftKey) {
      (focusedOnContinue ? leaveRef : continueRef).current?.focus({ preventScroll: true });
    } else {
      (focusedOnLeave ? continueRef : leaveRef).current?.focus({ preventScroll: true });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onContinue();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-[360px] overflow-y-auto rounded-[20px] bg-[#111] p-6 text-left font-sans text-white"
      >
        <h2 id={titleId} className="flex items-start gap-2 font-sans text-xl font-bold leading-7 tracking-[-0.025em] text-white">
          <span aria-hidden="true" className="shrink-0 text-2xl leading-7">🎁</span>
          <span className="min-w-0 break-words">
            {hasDiscount ? `${formatKRW(totalDiscount)} 할인 적용 중이에요` : "결제를 나가시겠어요?"}
          </span>
        </h2>
        <p id={descriptionId} className="mt-4 whitespace-pre-line text-[15px] leading-[1.45] text-[#C7C7CB]">
          {"선택한 상품과 금액을 다시 확인하고\n결제를 계속하시겠어요?"}
        </p>
        <div className="mt-7 grid gap-3">
          <button
            ref={leaveRef}
            type="button"
            onClick={onLeave}
            className="h-14 w-full min-w-0 rounded-full bg-[#27272B] px-3 text-base font-semibold leading-5 text-[#B8B8BE] transition-colors hover:bg-[#313136] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111]"
          >
            나가기
          </button>
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className="h-14 w-full min-w-0 rounded-full bg-[#B9473C] px-3 text-base font-bold leading-5 text-white transition-colors hover:bg-[#A63F35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111]"
          >
            {hasDiscount ? "혜택 받고 계속하기" : "계속하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
