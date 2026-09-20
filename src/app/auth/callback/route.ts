import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * `next` 는 **우리 사이트 안쪽 경로**일 때만 따라간다.
 *
 * 왜: 예전엔 받은 값을 그대로 `${origin}${next}` 에 붙였다. `next=//evil.com` 이면
 * 브라우저는 `https://evil.com` 으로 읽는다 — 카카오 로그인 링크를 미끼로 손님을
 * 바깥으로 내보낼 수 있는 자리였다. 우리가 실제로 쓰는 값은 `/mypage` 와
 * `/checkout/<주문번호>?claim=1` 둘뿐이라, 안쪽 경로만 통과시켜도 잃는 게 없다.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/mypage";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/mypage"; // 바깥 주소로 읽히는 두 형태
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패해도 **가려던 곳을 안 버린다** — 결제 칸에서 온 손님(`?claim=1`)이 다시 눌렀을 때
  // 주문으로 돌아가야 1,900원 할인이 이어진다. 로그인 화면은 `error=callback` 을 읽어 한 줄 띄운다.
  const back = new URLSearchParams({ error: "callback" });
  if (next !== "/mypage") back.set("redirect", next);
  return NextResponse.redirect(`${origin}/login?${back.toString()}`);
}
