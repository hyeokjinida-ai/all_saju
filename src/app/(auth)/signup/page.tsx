"use client";

// 회원가입 — 카카오가 첫 얼굴이고 이메일은 접혀 있다(2026-09-21 형님 지시 「카카오톡 간편가입으로」).
//
// ⚠ 이메일 가입을 없애지 않은 이유: 유입이 100% 메타 인앱 브라우저라, 인앱에서 카카오가
//    막히는 손님이 생기면 **가입할 길이 0** 이 된다. 그래서 접어 두기만 한다.
// ⚠ 카카오가 꺼져 있으면(`useKakaoEnabled()===false`) 이메일 폼을 **처음부터 펼친다** —
//    안 그러면 스위치가 꺼진 동안 가입 화면이 텅 빈 채로 뜬다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KakaoLoginButton, KakaoButtonSkeleton, useKakaoEnabled } from "@/components/auth/KakaoLoginButton";
import { publicEnv } from "@/lib/env";
import { MEMBER_DISCOUNT } from "@/lib/pricing";
import { formatKRW } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const kakao = useKakaoEnabled(); // null=확인 중 · true/false=확정
  const [openEmail, setOpenEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const emailOpen = kakao === false || openEmail;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("가입 완료! 마이페이지로 이동합니다.");
    router.push("/mypage");
    router.refresh();
  }

  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>회원은 결제할 때 {formatKRW(MEMBER_DISCOUNT)} 싸게 삽니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {kakao === null ? <KakaoButtonSkeleton /> : <KakaoLoginButton redirect="/mypage" label="카카오로 3초 만에 시작하기" />}

          {kakao === true && !openEmail && (
            <p className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setOpenEmail(true)}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                이메일로 가입하기
              </button>
            </p>
          )}

          {emailOpen && (
            <form onSubmit={handleSubmit} className={`space-y-4 ${kakao ? "mt-6" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 (8자 이상)</Label>
                <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "가입 중..." : "가입하기"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-center">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">로그인</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
