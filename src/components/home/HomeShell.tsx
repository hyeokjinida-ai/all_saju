"use client";

// 홈 앱셸 — 청월당 뼈대(헤더 60 + 탭 44 고정, 컨테이너 max-w-md) × 타이트 색(검정).
//
// 실측 근거는 계획서 §2-1(치수) · §2-3(색). 여기서 지키는 것 세 가지:
//   1) 헤더 60px, 탭 44px, 본문 시작 y=104 — 원본과 같은 자리에서 콘텐츠가 시작한다.
//   2) 폭은 max-w-md(448) 가운데. 고정 요소도 같은 폭으로 가운데 정렬한다.
//   3) 하단 탭바는 **타이트식 떠 있는 알약**(rounded-32, 반투명 검정, blur).
//
// ⚠ body 배경을 손대는 이유: 전역 globals.css 의 body 가 **자수정 그라데이션**이다.
//    홈 루트에만 검정을 깔면 iOS 바운스 영역·짧은 화면에서 보라색이 비친다.
//    그래서 이 화면에 있는 동안만 body 를 덮고, 떠날 때 원래대로 되돌린다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { T } from "@/config/home";
import { siteConfig } from "@/config/site";

export type ShellTab = { id: string; label: string };

const HEADER = 60;
const TABS_H = 44;

export function HomeShell({
  tabs,
  isLoggedIn,
  active = "home",
  children,
}: {
  tabs: ShellTab[];
  isLoggedIn: boolean;
  /** 하단 탭바에서 지금 어느 자리인지 */
  active?: "home" | "products" | "mypage";
  children: React.ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<string>("all");
  const clicked = useRef(0);

  // 전역 body 배경 덮기 → 떠날 때 복구
  useEffect(() => {
    const b = document.body.style.background;
    const bc = document.body.style.backgroundColor;
    document.body.style.background = "none";
    document.body.style.backgroundColor = T.canvas;
    return () => {
      document.body.style.background = b;
      document.body.style.backgroundColor = bc;
    };
  }, []);

  // 어느 행을 보고 있는지 — 탭 밑줄이 따라간다
  useEffect(() => {
    if (!tabs.length) return;
    const onScroll = () => {
      // 탭을 눌러 이동하는 동안(스무스 스크롤)엔 계산을 쉰다 — 밑줄이 튀는 걸 막는다
      if (Date.now() - clicked.current < 700) return;
      const line = HEADER + TABS_H + 24;
      let current = "all";
      for (const t of tabs) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= line) current = t.id;
      }
      if (window.scrollY < 40) current = "all";
      setTab(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tabs]);

  const go = (id: string) => {
    clicked.current = Date.now();
    setTab(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const allTabs: ShellTab[] = [{ id: "all", label: "전체" }, ...tabs];

  return (
    <div style={{ background: T.canvas, minHeight: "100dvh" }}>
      <div className="mx-auto w-full max-w-md" style={{ background: T.page, minHeight: "100dvh" }}>
        {/* ── 헤더 (fixed) ── */}
        <header
          className="fixed inset-x-0 top-0 z-50 mx-auto flex h-[60px] w-full max-w-md justify-center backdrop-blur"
          style={{ background: "rgba(0,0,0,0.90)" }}
        >
          <div className="flex w-full items-center justify-between px-5">
            <Link href="/" className="flex items-center" aria-label={siteConfig.name}>
              <Logo tone="ivory" height={24} priority />
            </Link>
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="메뉴 열기"
              className="flex h-7 w-7 items-center justify-center"
              style={{ color: T.title }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path
                  d="M4.7 7h18.6M4.7 14h18.6M15.2 21h8.1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* ── 카테고리 탭 (fixed, 헤더 아래) ── */}
        {allTabs.length > 1 && (
          <nav
            aria-label="홈 카테고리"
            className="fixed inset-x-0 z-40 mx-auto w-full max-w-md backdrop-blur"
            style={{
              top: HEADER,
              height: TABS_H,
              background: "rgba(0,0,0,0.90)",
              borderBottom: `1px solid ${T.line}`,
            }}
          >
            {/* 원본은 탭이 6개라 justify-between 이 딱 맞는다. 우리는 3개뿐이라 같은 규칙을
                쓰면 양 끝으로 벌어져 휑하다 → 5개 이상일 때만 벌리고, 적으면 왼쪽부터 붙인다. */}
            <div
              className={`no-scrollbar flex h-full w-full items-end gap-1 overflow-x-auto px-5 ${
                allTabs.length >= 5 ? "justify-between" : "justify-start gap-5"
              }`}
            >
              {allTabs.map((t) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go(t.id)}
                    className="shrink-0 whitespace-nowrap px-2 pt-3 text-[16px] leading-none tracking-[-0.025em]"
                    style={
                      on
                        ? { paddingBottom: 13, fontWeight: 700, color: T.title, borderBottom: `2px solid ${T.title}` }
                        : { paddingBottom: 16, fontWeight: 500, color: T.sub }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* ── 본문 — 원본과 같은 시작선(60+44) ── */}
        <div style={{ paddingTop: allTabs.length > 1 ? HEADER + TABS_H : HEADER }}>{children}</div>

        {/* ── 하단 탭바 (타이트식 알약) ── */}
        <nav
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <div
            className="flex max-w-[408px] flex-1 items-center rounded-[32px] p-[8px]"
            style={{
              border: "1px solid rgba(244,244,245,0.5)",
              background: "rgba(18,18,18,0.72)",
              backdropFilter: "blur(6px)",
            }}
          >
            <TabItem href="/" label="홈" on={active === "home"} icon={<IconHome />} />
            <TabItem href="/products" label="전체 풀이" on={active === "products"} icon={<IconGrid />} />
            <TabItem href="/mypage" label="보관함" on={active === "mypage"} icon={<IconArchive />} />
          </div>
        </nav>

        {/* ── 메뉴 서랍 ── */}
        {menu && (
          <div className="fixed inset-0 z-[60] flex justify-center" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setMenu(false)}
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.6)" }}
            />
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="absolute right-0 top-0 h-full w-[74%] px-6 pt-6"
                style={{ background: "#0B0B0C", borderLeft: `1px solid ${T.line}` }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-myeongjo text-[17px] font-bold tracking-[0.1em]" style={{ color: T.title }}>
                    {siteConfig.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenu(false)}
                    aria-label="닫기"
                    className="text-[22px] leading-none"
                    style={{ color: T.sub }}
                  >
                    ×
                  </button>
                </div>
                <ul className="flex flex-col">
                  <DrawerLink href="/products" onClick={() => setMenu(false)}>전체 풀이</DrawerLink>
                  <DrawerLink href="/mypage" onClick={() => setMenu(false)}>보관함</DrawerLink>
                  {isLoggedIn ? (
                    <li style={{ borderTop: `1px solid ${T.line}` }}>
                      <form action="/api/auth/signout" method="post">
                        <button type="submit" className="w-full py-4 text-left text-[15px]" style={{ color: T.soft }}>
                          로그아웃
                        </button>
                      </form>
                    </li>
                  ) : (
                    <DrawerLink href="/login" onClick={() => setMenu(false)}>로그인</DrawerLink>
                  )}
                  <DrawerLink href="/legal/refund-policy" onClick={() => setMenu(false)}>환불 안내</DrawerLink>
                </ul>
                <p className="mt-6 text-[12px] leading-relaxed" style={{ color: T.dim }}>
                  문의 {siteConfig.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <li style={{ borderTop: `1px solid ${T.line}` }}>
      <Link href={href} onClick={onClick} className="block py-4 text-[15px]" style={{ color: T.soft }}>
        {children}
      </Link>
    </li>
  );
}

function TabItem({ href, label, on, icon }: { href: string; label: string; on: boolean; icon: React.ReactNode }) {
  return (
    <div className="relative flex-1">
      <Link
        href={href}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-[40px] py-[8px] transition-colors"
        style={on ? { background: "rgba(255,255,255,0.20)" } : undefined}
      >
        <span style={{ color: on ? "#FFFFFF" : "rgba(255,255,255,0.72)" }}>{icon}</span>
        <span
          className="whitespace-nowrap text-[10px] leading-[10px]"
          style={on ? { fontWeight: 600, color: "#F4F4F5" } : { fontWeight: 500, color: "#D4D4D8" }}
        >
          {label}
        </span>
      </Link>
    </div>
  );
}

/* 아이콘 — 24px, 직접 그림(레퍼런스 path 복사 금지) */
const S = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none" } as const;
const stroke = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function IconHome() {
  return (
    <svg {...S} aria-hidden="true">
      <path d="M3.6 10.4 12 3.8l8.4 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-3.6v-6h-6.8v6H5a1.4 1.4 0 0 1-1.4-1.4z" {...stroke} />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg {...S} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" {...stroke} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" {...stroke} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" {...stroke} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" {...stroke} />
    </svg>
  );
}
function IconArchive() {
  return (
    <svg {...S} aria-hidden="true">
      <path d="M3.6 6.6h16.8v3.2H3.6z" {...stroke} />
      <path d="M5.2 9.8h13.6v9a1.4 1.4 0 0 1-1.4 1.4H6.6a1.4 1.4 0 0 1-1.4-1.4z" {...stroke} />
      <path d="M9.8 13.6h4.4" {...stroke} />
    </svg>
  );
}
