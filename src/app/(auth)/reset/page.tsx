"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publicEnv } from "@/lib/env";
import { passwordResetCallbackUrl } from "@/lib/auth-redirect";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitLock = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setErrorMessage(null);
    setSent(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetCallbackUrl(publicEnv.NEXT_PUBLIC_SITE_URL),
      });
      if (error) {
        setErrorMessage("메일을 요청하지 못했어요. 주소를 확인하고 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSent(true);
      toast.success("비밀번호 재설정 안내를 요청했어요.");
    } catch {
      setErrorMessage("연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>비밀번호 재설정</CardTitle>
          <CardDescription>이메일로 재설정 링크를 보내드립니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" autoComplete="email" required disabled={loading} value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 text-[16px]" />
            </div>
            {errorMessage && <p role="alert" className="text-sm text-red-400">{errorMessage}</p>}
            {sent && <p role="status" className="text-sm leading-relaxed text-muted-foreground">가입한 이메일이라면 재설정 링크가 도착합니다. 스팸함도 확인하고, 링크를 요청한 브라우저에서 열어 주세요.</p>}
            <Button type="submit" disabled={loading} className="min-h-11 w-full">
              {loading ? "발송 중..." : sent ? "재설정 링크 다시 받기" : "재설정 링크 받기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
