import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "마이페이지" };

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const items = [
    { href: "/mypage/orders", label: "결제 내역 / 결과지" },
    { href: "/mypage/reviews", label: "내 후기" },
  ];

  return (
    <div className="container py-12 max-w-xl">
      <header className="mb-10 text-center">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">命錄</p>
        <h1 className="font-myeongjo text-2xl font-semibold tracking-[0.04em] text-bone">
          {profile?.display_name ?? user.email}
        </h1>
        <p className="text-sm text-bone-soft mt-2">{profile?.email ?? user.email}</p>
        <div className="gold-diamond mx-auto mt-5" />
      </header>

      <ul className="divide-y divide-hairline border-y border-hairline">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between py-4 text-[15px] font-medium text-ink hover:text-body"
            >
              <span>{item.label}</span>
              <span className="text-mute">→</span>
            </Link>
          </li>
        ))}
        <li>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-between py-4 text-[15px] font-medium text-body hover:text-ink"
            >
              <span>로그아웃</span>
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
