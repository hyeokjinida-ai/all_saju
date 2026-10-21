"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const reviews = [
  {
    author: "89년생 여성",
    content: "30만 원짜리 신점도 많이 봤는데 거의 비슷하다… 아니, 신점 볼 필요가 없네요. 내 인생을 들여다본 느낌.",
  },
  {
    author: "02년생 여성",
    content: "소름 돋게 잘 맞아요. 사주 앱 많이 봤는데 이렇게 잘 맞은 건 처음이에요.",
  },
  {
    author: "94년생 여성",
    content: "과거를 다 맞추니 할 말이 없네요. 고민거리들은 그냥 사주 믿고 해보려고요.",
  },
];

function Review({ author, content }: { author: string; content: string }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-[12px] font-semibold text-[#8C4A35]">{author}</figcaption>
      <blockquote className="m-0 text-[14px] font-medium leading-[1.8] text-[#3D2B22]">“{content}”</blockquote>
    </figure>
  );
}

export function CheckoutReviews() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const interacting = useRef(false);
  const focused = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    setActive(index);
    track.scrollTo({ left: index * track.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectPreference = () => { if (preference.matches) setPaused(true); };
    respectPreference();
    preference.addEventListener("change", respectPreference);
    return () => preference.removeEventListener("change", respectPreference);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track || !track.clientWidth || document.hidden || section.closest("[inert], [aria-hidden='true']") || hovering.current || interacting.current || focused.current) return;
      const bounds = section.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      const current = Math.round(track.scrollLeft / track.clientWidth);
      goTo((current + 1) % reviews.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paused, goTo]);

  return (
    <section
      ref={sectionRef}
      aria-label="이용 후기"
      aria-roledescription="캐러셀"
      className="relative mb-5 min-w-0 overflow-hidden rounded-2xl border border-[#D7AA7B] px-4 pt-4 font-sans"
      style={{ background: "linear-gradient(135deg, #FFF5E5 0%, #F2D9BC 100%)", boxShadow: "0 4px 18px rgba(130,66,35,0.16)" }}
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; interacting.current = false; }}
      onPointerDown={() => { interacting.current = true; }}
      onPointerUp={() => { interacting.current = false; }}
      onPointerCancel={() => { interacting.current = false; }}
      onFocusCapture={() => { focused.current = true; }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) focused.current = false; }}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#B9473C]" />
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-bold text-[#86382D]"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B9473C] pt-1 text-[26px] leading-none text-[#FFF5E5]">“</span>이용 후기</h3>
        <span className="rounded-full bg-[#B9473C]/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-[#86382D]">{active + 1} / {reviews.length}</span>
      </div>
      <div
        ref={trackRef}
        role="group"
        aria-label="좌우로 넘겨 후기 보기"
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#86382D]"
        onScroll={event => {
          const track = event.currentTarget;
          if (track.clientWidth) setActive(Math.max(0, Math.min(reviews.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
        }}
        onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          goTo((active + (event.key === "ArrowRight" ? 1 : reviews.length - 1)) % reviews.length);
        }}
      >
        {reviews.map((review, index) => (
          <div key={review.author} role="group" aria-roledescription="슬라이드" aria-label={`${index + 1} / ${reviews.length}`} aria-hidden={index !== active} className="w-full min-w-0 shrink-0 snap-start pr-1">
            <Review {...review} />
          </div>
        ))}
      </div>
      <div className="flex min-h-[44px] items-center justify-between">
        <div className="flex">
          {reviews.map((review, index) => (
            <button key={review.author} type="button" aria-label={`${index + 1}번째 후기 보기`} aria-current={active === index ? "true" : undefined} onClick={() => goTo(index)} className="flex h-11 w-8 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#86382D]">
              <span aria-hidden="true" className={`h-1.5 rounded-full ${active === index ? "w-4 bg-[#B9473C]" : "w-1.5 bg-[#C5AF95]"}`} />
            </button>
          ))}
        </div>
        <button type="button" aria-label={paused ? "후기 자동 넘김 시작" : "후기 자동 넘김 일시정지"} onClick={() => {
          setPaused(value => !value);
          if (paused) { focused.current = false; hovering.current = false; }
        }} className="min-h-[44px] rounded px-2 text-[11px] font-medium text-[#77513C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#86382D]">
          {paused ? "자동 넘김 켜기" : "일시정지"}
        </button>
      </div>
    </section>
  );
}

export function SangunCustomerReviews({ className = "" }: { className?: string }) {
  return (
    <section aria-label="이용 후기" className={className}>
      <h2 className="mb-5 text-center font-myeongjo text-[19px] font-bold" style={{ color: "var(--bone)" }}>먼저 받아 본 사람들의 후기</h2>
      <div className="space-y-4">
        {reviews.map(review => (
          <figure key={review.author} className="m-0 rounded-xl border p-5" style={{ borderColor: "var(--gold-line)", background: "rgba(0,0,0,0.3)" }}>
            <figcaption className="mb-3 font-myeongjo text-[14px] font-semibold" style={{ color: "var(--gold-bright)" }}>{review.author}</figcaption>
            <blockquote className="m-0 text-[15px] leading-[1.8]" style={{ color: "var(--bone-soft)" }}>“{review.content}”</blockquote>
          </figure>
        ))}
      </div>
    </section>
  );
}
