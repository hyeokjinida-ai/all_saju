import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import { Analytics } from "@/components/analytics/Analytics";
import { Logo } from "@/components/brand/Logo";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { siteConfig, businessInfo } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    locale: "ko_KR",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 로그인 여부에 따라 헤더 메뉴 분기. Supabase 미설정(데모) 모드면 무조건 비로그인 취급.
  const isLoggedIn = isSupabaseConfigured() ? !!(await getCurrentUser()) : false;

  return (
    <html lang="ko" className={fontVariables}>
      <head>
        {/* Pretendard 는 Google Fonts 에 없어 next/font 로 못 옮긴다.
            대신 globals.css 의 @import(요청이 3단으로 밀림)에서 꺼내 여기로 올렸다 —
            HTML 파싱 즉시 요청이 나가고, preconnect 로 TLS 왕복까지 미리 끝낸다.
            Pretendard 는 통짜(static)에서 dynamic-subset 으로 바꿨다: 한글을 유니코드
            블록별로 쪼개 실제 쓰는 조각만 내려온다.

            ⚠ Wanted Sans 는 걷어냈다(2026-08-30). `src/` 전체에서 이 글씨체를 font-family 로
            부르는 규칙이 **0곳**이었다 — 어느 글자도 이걸로 안 그려지는데 **렌더를 막는
            크로스오리진 스타일시트**를 매 페이지 받고 있었다(실측 11.8KB + 왕복 1회).
            되살릴 일이 생기면 어딘가의 font-family 스택에 먼저 넣고 링크를 붙일 것. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body suppressHydrationWarning>
        <Analytics />
        <ChromeGate header={<SiteHeader isLoggedIn={isLoggedIn} />} footer={<SiteFooter />}>
          <main className="min-h-[calc(100vh-7rem)]">{children}</main>
        </ChromeGate>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

// Ollama: 56px utility nav, primary nav on canvas, no shadow.
function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="border-b border-hairline bg-night/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center group" aria-label={siteConfig.name}>
          <Logo tone="ivory" height={24} priority className="opacity-90 transition-opacity group-hover:opacity-100" />
        </Link>
        <nav className="flex items-center gap-7 text-[13px] tracking-[0.04em]">
          <Link href="/products" className="text-bone-soft hover:text-gold transition-colors">상품</Link>
          {isLoggedIn ? (
            <>
              <Link href="/mypage" className="text-bone-soft hover:text-gold transition-colors">마이페이지</Link>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="text-bone-soft hover:text-gold transition-colors">로그아웃</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-bone-soft hover:text-gold transition-colors">로그인</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

// Ollama: footer is a quiet caption-gray strip with hairline divider.
function SiteFooter() {
  // 사업자정보 한 줄 — 운세위키 푸터 포맷: "회사 | 사업자등록번호: ... | 통신판매업 신고번호: ... | 대표: ... | 주소: ..."
  const businessLine = [
    businessInfo.companyName,
    `사업자등록번호: ${businessInfo.businessNumber}`,
    `통신판매업 신고번호: ${businessInfo.mailOrderNumber}`,
    `대표: ${businessInfo.representative}`,
    `주소: ${businessInfo.address}`,
  ].join(" | ");

  const contactLine = [
    `고객센터: ${businessInfo.email}`,
    businessInfo.phone
      ? `핸드폰${businessInfo.phoneNote ? `(${businessInfo.phoneNote})` : ""}: ${businessInfo.phone}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <footer className="border-t border-hairline mt-20">
      <div className="container py-10 text-xs text-body space-y-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          <Link href="/legal/terms" className="hover:text-ink">이용약관</Link>
          <Link href="/legal/privacy" className="hover:text-ink">개인정보처리방침</Link>
          <Link href="/legal/refund-policy" className="hover:text-ink">환불정책</Link>
        </div>
        <p className="text-mute leading-relaxed">{businessLine}</p>
        <p className="text-mute leading-relaxed">{contactLine}</p>
        {/* 서체 출처 — 가평한석봉은 가평군 공공서체다. 무료 사용이지만 출처 표기를 요청하고 있다. */}
        <p className="text-mute">서체: 가평한석봉(가평군) · 김중철손글씨(정림건축) · Pretendard</p>
        <p className="text-mute">© {new Date().getFullYear()} {siteConfig.name}</p>
      </div>
    </footer>
  );
}
