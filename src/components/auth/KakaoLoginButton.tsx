"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// 카카오 OAuth 로그인 버튼.
// Supabase 대시보드에서 Kakao 프로바이더를 활성화해야 실제로 동작합니다(아래 docs 참고).
// 로그인 성공 → /auth/callback?next=<redirect> 가 세션 교환 후 redirect 로 보냅니다.
export function KakaoLoginButton({
  redirect = "/mypage",
  label = "카카오로 3초 만에 시작하기",
  onBeforeRedirect,
}: {
  redirect?: string;
  label?: string;
  onBeforeRedirect?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      onBeforeRedirect?.(); // 위저드 입력 등 떠나기 직전 저장 훅
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) {
        toast.error(
          error.message?.includes("provider is not enabled")
            ? "카카오 로그인이 아직 설정되지 않았어요. (관리자: Supabase에서 Kakao 활성화 필요)"
            : `카카오 로그인을 시작하지 못했습니다: ${error.message}`,
        );
        setLoading(false);
      }
      // 성공 시 카카오 인증 페이지로 리다이렉트되므로 이 아래는 실행되지 않습니다.
    } catch {
      toast.error("카카오 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handle} disabled={loading} className="btn-kakao disabled:opacity-70">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path
          fill="#191919"
          d="M9 1.6C4.86 1.6 1.5 4.2 1.5 7.42c0 2.04 1.36 3.83 3.4 4.87-.15.53-.54 1.9-.62 2.2-.1.36.13.36.28.26.12-.08 1.84-1.25 2.59-1.76.41.06.83.09 1.25.09 4.14 0 7.5-2.6 7.5-5.82S13.14 1.6 9 1.6z"
        />
      </svg>
      {loading ? "카카오로 이동 중…" : label}
    </button>
  );
}
