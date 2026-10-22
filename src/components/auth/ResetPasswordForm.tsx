"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitLock = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitLock.current) return;
    setErrorMessage(null);
    if (password.length < 8) {
      setErrorMessage("비밀번호를 8자 이상 입력해 주세요.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("두 비밀번호가 일치하지 않아요.");
      return;
    }
    submitLock.current = true;
    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const message = error.code === "same_password"
          ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
          : error.code === "weak_password"
          ? "더 안전한 비밀번호가 필요해요. 길이를 늘리고 문자·숫자·기호를 섞어 주세요."
          : "저장하지 못했어요. 링크가 만료됐다면 재설정 링크를 다시 받아 주세요.";
        setErrorMessage(message);
        return;
      }
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch {
      setErrorMessage("연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  if (complete) return (
    <div className="space-y-5">
      <p role="status" className="text-sm leading-relaxed">새 비밀번호를 저장했어요. 다음 로그인부터 새 비밀번호를 사용해 주세요.</p>
      <Link href="/mypage" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">보관함으로 가기</Link>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">새 비밀번호</Label>
        <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} disabled={loading} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="password-help" className="min-h-11 text-[16px]" />
        <p id="password-help" className="text-xs text-muted-foreground">8자 이상 입력해 주세요.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} disabled={loading} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="min-h-11 text-[16px]" />
      </div>
      {errorMessage && <p role="alert" className="text-sm leading-relaxed text-red-400">{errorMessage}</p>}
      <Button type="submit" disabled={loading} className="min-h-11 w-full">{loading ? "저장 중..." : "새 비밀번호 저장"}</Button>
      <Link href="/reset" className="block py-2 text-center text-sm text-muted-foreground underline underline-offset-4">재설정 링크 다시 받기</Link>
    </form>
  );
}
