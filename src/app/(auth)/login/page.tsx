"use client";

// 로그인 — 가입 화면과 같은 규칙으로 카카오가 첫 얼굴이고 이메일은 접혀 있다.
// 접는 이유·안 없애는 이유는 `(auth)/signup/page.tsx` 머리말 참고.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KakaoLoginButton, KakaoButtonSkeleton, useKakaoEnabled } from "@/components/auth/KakaoLoginButton";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") ?? "/mypage";
  // /auth/callback 이 세션 교환에 실패하면 여기로 돌려보낸다. 예전엔 이 값을 아무도 안 읽어서
  // 손님은 **아무 말 없이 로그인 화면으로 되돌아온 것처럼** 보였다.
  const failed = search.get("error") === "callback";
  const kakao = useKakaoEnabled(); // null=확인 중 · true/false=확정
  const [openEmail, setOpenEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const emailOpen = kakao === false || openEmail;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("로그인되었습니다");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <CardContent>
          {failed && (
            <p
              className="mb-4 rounded-md px-3 py-2.5 text-center text-[13px]"
              style={{ border: "1px solid var(--gold-line)", background: "var(--gold-pale)" }}
            >
              로그인이 끝까지 되지 않았습니다. 한 번만 다시 눌러 주세요.
            </p>
          )}

          {kakao === null ? <KakaoButtonSkeleton /> : <KakaoLoginButton redirect={redirectTo} label="카카오로 로그인" />}

          {kakao === true && !openEmail && (
            <p className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setOpenEmail(true)}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                이메일로 로그인
              </button>
            </p>
          )}

          {emailOpen && (
            <form onSubmit={handleSubmit} className={`space-y-4 ${kakao ? "mt-6" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          )}

          <div className="mt-6 flex justify-between text-sm">
            <Link href="/signup" className="text-muted-foreground hover:text-foreground">회원가입</Link>
            <Link href="/reset" className="text-muted-foreground hover:text-foreground">비밀번호 재설정</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
