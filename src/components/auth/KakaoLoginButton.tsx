"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";

// ── Kakao provider 가 Supabase 에서 켜져 있는지 ─────────────────────────────
// `/auth/v1/settings` 는 공개 엔드포인트라 anon 키로 읽힌다. 꺼져 있으면 버튼을 **아예 안 그린다.**
// 실측(2026-08-23): 운영 Supabase 의 kakao=false 였다. 그 상태로 배포하면 결제 화면의
// "카카오로 1초 만에 로그인" 버튼이 손님 앞에서 에러 토스트를 띄운다 — 결제 직전에 깨진 버튼은
// 최악이다. 대시보드에서 켜는 순간 새로고침 한 번으로 나타난다(코드 배포 불필요).
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

async function fetchKakaoEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((j) => (cached = !!j?.external?.kakao))
      .catch(() => (cached = false));
  }
  return inflight;
}

/** null = 아직 모름(첫 렌더) · true/false = 확인됨 */
export function useKakaoEnabled(): boolean | null {
  const [on, setOn] = useState<boolean | null>(cached);
  useEffect(() => {
    let alive = true;
    fetchKakaoEnabled().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

// 카카오 OAuth 로그인 버튼.
// Supabase 대시보드에서 Kakao 프로바이더를 활성화해야 실제로 동작합니다(아래 docs 참고).
// 로그인 성공 → /auth/callback?next=<redirect> 가 세션 교환 후 redirect 로 보냅니다.
export function KakaoLoginButton({
  redirect = "/mypage",
  label = "카카오로 3초 만에 시작하기",
  onBeforeRedirect,
  divider,
}: {
  redirect?: string;
  label?: string;
  onBeforeRedirect?: () => void;
  /** 버튼 아래 「또는 이메일로」 구분선 — 버튼이 숨으면 같이 숨는다(로그인·가입 페이지용) */
  divider?: string;
}) {
  const [loading, setLoading] = useState(false);
  const enabled = useKakaoEnabled();

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

  // 꺼져 있거나 아직 확인 전이면 그리지 않는다 — 눌러서 깨지는 버튼보다 없는 버튼이 낫다
  if (!enabled) return null;

  return (
    <>
    <button type="button" onClick={handle} disabled={loading} className="btn-kakao disabled:opacity-70">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <path
          fill="#191919"
          d="M9 1.6C4.86 1.6 1.5 4.2 1.5 7.42c0 2.04 1.36 3.83 3.4 4.87-.15.53-.54 1.9-.62 2.2-.1.36.13.36.28.26.12-.08 1.84-1.25 2.59-1.76.41.06.83.09 1.25.09 4.14 0 7.5-2.6 7.5-5.82S13.14 1.6 9 1.6z"
        />
      </svg>
      {loading ? "카카오로 이동 중…" : label}
    </button>
    {divider && (
      <div className="my-5 flex items-center gap-3 text-xs text-bone-faint">
        <span className="h-px flex-1 bg-hairline" />
        {divider}
        <span className="h-px flex-1 bg-hairline" />
      </div>
    )}
    </>
  );
}
