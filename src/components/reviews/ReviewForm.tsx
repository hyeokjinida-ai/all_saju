"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  orderId: string;
  productName: string;
};

export function ReviewForm({ orderId, productName }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (content.trim().length < 5) {
      toast.error("후기는 5자 이상 작성해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "후기 저장 실패");

      // 답례로 질문권이 붙었으면 **결과지의 질문 칸으로 바로 보낸다.**
      // 마이페이지로 보내면 「질문권이 생겼다」는 말만 남고 쓸 자리는 손님이 찾아야 한다 —
      // 그 한 칸이 비면 답례가 그냥 안내 문구가 된다.
      if (json.creditGranted && json.resultId) {
        toast.success("후기 고맙습니다 — 질문 하나가 생겼어요");
        router.push(`/results/${json.resultId}#ask`);
      } else {
        toast.success("후기가 등록되었습니다");
        router.push("/mypage/reviews");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-body mb-1">상품</p>
        <p className="text-base font-medium text-ink">{productName}</p>
      </div>

      <div className="space-y-2">
        <Label>별점</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n}점`}
              className="text-2xl leading-none w-9 h-9 flex items-center justify-center"
            >
              <span className={n <= rating ? "text-ink" : "text-hairline-strong"}>★</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">후기 내용</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="결과가 어떠셨나요? 다른 분들께 도움이 되는 후기를 남겨주세요."
        />
        <p className="text-xs text-mute text-right">{content.length} / 2000</p>
      </div>

      <Button type="submit" disabled={submitting} size="lg" className="w-full">
        {submitting ? "등록 중..." : "후기 등록"}
      </Button>
    </form>
  );
}
