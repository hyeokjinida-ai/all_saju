import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_UPDATE_PATH, safeAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthRedirect(searchParams.get("next"));
  const recovery = next.split(/[?#]/)[0] === PASSWORD_UPDATE_PATH;

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const recovered = data && "redirectType" in data && data.redirectType === "recovery";
        const destination = recovery || recovered ? PASSWORD_UPDATE_PATH : next;
        return NextResponse.redirect(`${origin}${destination}`);
      }
    } catch {}
  }

  if (recovery) return NextResponse.redirect(`${origin}${PASSWORD_UPDATE_PATH}?error=expired`);

  // 실패해도 **가려던 곳을 안 버린다** — 결제 칸에서 온 손님(`?claim=1`)이 다시 눌렀을 때
  // 주문으로 돌아가야 1,900원 할인이 이어진다. 로그인 화면은 `error=callback` 을 읽어 한 줄 띄운다.
  const back = new URLSearchParams({ error: "callback" });
  if (next !== "/mypage") back.set("redirect", next);
  return NextResponse.redirect(`${origin}/login?${back.toString()}`);
}
