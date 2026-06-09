"use client";

import { useEffect, useState } from "react";
import { formatKRW } from "@/lib/utils";

// 모바일 전용 하단 상시 결제바 — 스크롤 중 '사고 싶어진 순간' 바로 누를 CTA.
// 헤더(상단)와 페이지 맨 아래(푸터 근처)에서는 숨겨 본문 입력을 가리지 않음.
export function StickyBuyBar({ name, price }: { name: string; price: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 140;
      setShow(window.scrollY > 420 && !nearBottom);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 sm:hidden transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-t border-gold bg-[rgba(13,6,8,0.94)] backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-bone-faint truncate">{name}</div>
          <div className="text-sm text-gold-bright font-bold">{formatKRW(price)}</div>
        </div>
        <a
          href="#start"
          onClick={go}
          className="shrink-0 rounded-md px-5 py-2.5 text-sm font-bold"
          style={{ background: "linear-gradient(180deg,#e8c878,#d4af6a)", color: "var(--wine-deep)", fontFamily: "'Noto Serif KR', serif" }}
        >
          내 사주 풀이 시작 →
        </a>
      </div>
    </div>
  );
}
