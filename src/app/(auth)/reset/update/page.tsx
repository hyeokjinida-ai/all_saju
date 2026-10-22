import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "새 비밀번호 설정" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  let authenticated = false;
  if (!error) {
    try {
      const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
      authenticated = !authError && !!user;
    } catch {}
  }

  return (
    <div className="container max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>{authenticated ? "새 비밀번호 설정" : "재설정 링크를 다시 받아 주세요"}</CardTitle>
          <CardDescription>{authenticated ? "앞으로 사용할 비밀번호를 입력해 주세요." : "링크가 만료됐거나 인증을 확인하지 못했어요."}</CardDescription>
        </CardHeader>
        <CardContent>
          {authenticated ? <ResetPasswordForm /> : <div className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">재설정 링크를 새로 요청한 뒤, 요청한 브라우저에서 열어 주세요.</p>
            <Link href="/reset" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">재설정 링크 다시 받기</Link>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
