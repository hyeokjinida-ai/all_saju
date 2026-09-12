"use client";

// 후기 노출 스위치 — 표 한 줄에 하나씩.
//
// 낙관적으로 먼저 뒤집고, 서버가 거절하면 되돌린다. 어드민 표라 줄이 많고,
// 매번 새로고침을 기다리면 여러 건을 훑어 켜는 일이 느려진다.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ReviewApproveToggle({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(approved);
  const [busy, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved: next }),
      });
      if (!res.ok) throw new Error();
      // 목록 위의 「승인 대기 N」 숫자를 서버에서 다시 세게 한다.
      startTransition(() => router.refresh());
    } catch {
      setOn(!next); // 되돌린다 — 화면만 켜져 있고 DB 는 꺼진 상태가 제일 위험하다
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs transition-colors ${
        on ? "border-ink bg-ink text-canvas" : "border-hairline text-mute hover:border-ink hover:text-ink"
      }`}
      title={on ? "지금 화면에 보이는 중 — 누르면 내린다" : "숨겨진 상태 — 누르면 화면에 세운다"}
    >
      {failed ? "실패, 다시" : on ? "노출 중" : "숨김"}
    </button>
  );
}
