"use client";

// 히어로 슬라이드 — 청월당 실측: 슬라이드 432×540(4:5), rounded-2xl, 점은 mt-4 에 12×12 버튼 안 6×6.
//
// 원본은 swiper 의 'cards'(뒤 장이 3D 로 살짝 비치는) 효과지만 우리는 **의도적으로 생략**했다.
// 라이브러리 하나를 더 들이는 값에 비해 판정선(구조 ±6px) 밖이다. 대신 scroll-snap 으로
// 같은 동작(손가락으로 넘김·점 동기화·자동 넘김)을 만든다.
//
// ⚠ 데스크톱 마우스로는 스냅 스크롤을 못 넘긴다 → 점을 눌러 이동할 수 있게 했다.
// ⚠ prefers-reduced-motion 이면 자동 넘김을 끈다. 손을 대면(터치·스크롤) 자동 넘김 중지.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HeroLettering, RankRibbon } from "./HeroLettering";
import { homeArt, LETTERING } from "@/config/home";
import type { HomeProduct } from "@/lib/home-data";

export type HeroSlide = {
  product: HomeProduct;
  character: string;
  title: string;
  tagline: string;
};

const AUTO_MS = 6000;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[i] as HTMLElement | undefined;
    if (!child) return;
    // 슬라이드를 **가운데** 맞추는 값(snap-center 가 결국 앉는 자리와 같다).
    // 그냥 offsetLeft 만 쓰면 좌우 여백(px-2)만큼 어긋난다.
    const to = child.offsetLeft - track.offsetLeft - (track.clientWidth - child.offsetWidth) / 2;

    const from = track.scrollLeft;
    track.scrollTo({ left: to, behavior: "smooth" });

    // ⚠ behavior:"smooth" 는 합성기(compositor)가 굴린다 — 탭이 뒤에 있거나 화면을 안 그리는
    //    상황에서는 **한 픽셀도 안 움직인다**(실측 2026-08-23: 1.1초 뒤 scrollLeft 0 그대로,
    //    snap 을 꺼도·scrollIntoView 로 바꿔도 같았다). 그대로 두면 점을 눌러도, 자동 넘김이
    //    와도 첫 장에 갇힌다. 그래서 확인하고, 안 갔으면 그냥 옮긴다.
    //    ⚠ 부드럽게 가고 있는 중이면 끊지 않는다 — 움직임이 시작됐는지로 가른다.
    window.setTimeout(() => {
      const t = trackRef.current;
      if (!t || Math.abs(t.scrollLeft - to) <= 4) return;
      if (Math.abs(t.scrollLeft - from) < 2) {
        t.scrollLeft = to; // 시작도 안 했다 = smooth 가 안 도는 환경
        return;
      }
      window.setTimeout(() => {
        const t2 = trackRef.current;
        if (t2 && Math.abs(t2.scrollLeft - to) > 4) t2.scrollLeft = to;
      }, 400);
    }, 420);
  }, []);

  // 어느 장이 보이는지 — 스크롤 위치에서 직접 계산(IntersectionObserver 보다 스냅과 잘 맞는다).
  // ⚠ 여기서 requestAnimationFrame 으로 미루면 안 된다: 탭이 뒤에 있으면 rAF 가 멈춰
  //    점 표시가 영영 첫 장에 붙어 있는다(실측 2026-08-23, 배경 탭에서 재현).
  //    나눗셈 한 번이라 스크롤 이벤트에서 바로 계산해도 싸다.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const w = (track.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      setActive(Math.round(track.scrollLeft / w));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stop = () => {
      paused.current = true;
    };
    const track = trackRef.current;
    track?.addEventListener("pointerdown", stop, { passive: true });
    const id = setInterval(() => {
      if (paused.current) return;
      const track2 = trackRef.current;
      if (!track2) return;
      const w = (track2.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      const next = (Math.round(track2.scrollLeft / w) + 1) % slides.length;
      goTo(next);
    }, AUTO_MS);
    return () => {
      clearInterval(id);
      track?.removeEventListener("pointerdown", stop);
    };
  }, [slides.length, goTo]);

  if (!slides.length) return null;

  return (
    <section className="pt-6">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto px-2"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {slides.map((s, i) => (
          // 폭은 스크롤러의 콘텐츠 박스(448 - px-2 양쪽 16 = 432) 그대로 = 원본 슬라이드 폭.
          // ⚠ 여기서 또 16 을 빼면 416 이 된다(실측에서 -16 편차로 잡혔던 자리).
          <div key={s.product.id} className="w-full shrink-0 snap-center">
            <Link
              href={`/products/${s.product.slug}?via=home-hero`}
              className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl"
              style={{ background: "#18181B", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 사전 생성 webp */}
              <img
                src={s.product.art?.hero ?? homeArt(s.product.slug, "hero")}
                alt={s.product.name}
                fetchPriority={i === 0 ? "high" : "auto"}
                loading={i === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
              <HeroLettering
                character={s.character}
                title={s.title}
                tagline={s.tagline}
                lettering={s.product.art?.lettering ?? LETTERING[s.product.slug]}
              />
              <RankRibbon rank={i + 1} />
            </Link>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 flex items-center justify-center">
          {slides.map((s, i) => (
            <button
              key={s.product.id}
              type="button"
              onClick={() => {
                paused.current = true;
                setActive(i); // 스크롤이 끝나기 전에 점부터 반응하게
                goTo(i);
              }}
              aria-label={`${i + 1}번째 소개로`}
              className="flex shrink-0 items-center justify-center overflow-hidden transition-all duration-300"
              style={{ width: 12, height: 12, marginLeft: 1, marginRight: 1 }}
            >
              <span
                className="shrink-0 rounded-full transition-all duration-300"
                style={{
                  width: 6,
                  height: 6,
                  background: i === active ? "#FAFAFA" : "rgba(255,255,255,0.30)",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
