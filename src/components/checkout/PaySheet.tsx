"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckoutExitDialog } from "./CheckoutExitDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  sangun?: boolean;
  totalDiscount?: number;
  busy?: boolean;
  children: React.ReactNode;
};

export function PaySheet({ open, onClose, dark, sangun = false, totalDiscount = 0, busy = false, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const exitTriggerRef = useRef<HTMLElement | null>(null);
  const previouslyShowingExit = useRef(false);
  const showExit = exitOpen && !busy;
  const continueCheckout = useCallback(() => setExitOpen(false), []);
  const leaveCheckout = useCallback(() => {
    setExitOpen(false);
    onClose();
  }, [onClose]);
  const requestClose = useCallback(() => {
    if (sangun && !busy) {
      exitTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setExitOpen(true);
    } else leaveCheckout();
  }, [sangun, busy, leaveCheckout]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open || busy) setExitOpen(false);
  }, [open, busy]);
  useEffect(() => {
    if (previouslyShowingExit.current && !showExit && open && !busy) {
      const trigger = exitTriggerRef.current;
      if (trigger?.isConnected && trigger !== document.body) trigger.focus({ preventScroll: true });
      else closeButtonRef.current?.focus({ preventScroll: true });
    }
    previouslyShowingExit.current = showExit;
  }, [showExit, open, busy]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || showExit) return;
      event.preventDefault();
      requestClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, showExit, requestClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className={`${dark ? "world-sangun" : "world-jiknyeo"} fixed inset-0 z-[60]`}>
      <div className="absolute inset-0" inert={showExit} aria-hidden={showExit || undefined}>
        <div onClick={requestClose} className="absolute inset-0" style={{ background: "rgba(4,3,6,0.72)" }} />
        <div
          id="pay-sheet"
          role="dialog"
          aria-modal={!showExit}
          aria-labelledby="pay-sheet-title"
          className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-md overflow-y-auto px-5 pb-6 ${sangun ? "rounded-t-[24px] pt-4 font-sans" : "rounded-t-2xl pt-3"}`}
          style={{
            maxHeight: "92vh",
            background: sangun ? "#111111" : dark ? "#0b0a0f" : "#fbf8f4",
            borderTop: sangun ? "none" : "1px solid var(--gold-line)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.55)",
          }}
        >
          <div className={`${sangun ? "mb-3" : "mb-2"} flex items-center justify-between gap-3`}>
            <span id="pay-sheet-title" className={sangun ? "font-sans text-[20px] font-bold" : "font-myeongjo text-[15px] font-bold"} style={{ color: sangun ? "#FFFFFF" : dark ? "var(--bone)" : "#241a08" }}>
              {sangun ? "박수무당 사주 결제 안내" : dark ? "장부를 펴려면" : "결제"}
            </span>
            <button ref={closeButtonRef} type="button" onClick={requestClose} aria-label="닫기" className={sangun ? "-mr-2 flex h-10 w-10 shrink-0 items-center justify-center text-[18px] text-[#BDBDC2] focus-visible:outline-[#E87964]" : "p-2 text-[18px] text-bone-faint"}>
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
      {showExit && (
        <CheckoutExitDialog totalDiscount={totalDiscount} onContinue={continueCheckout} onLeave={leaveCheckout} />
      )}
    </div>,
    document.body,
  );
}
