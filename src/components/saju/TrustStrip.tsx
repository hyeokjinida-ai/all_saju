import Link from "next/link";
import { SHOW_SOCIAL_PROOF } from "@/config/site";

// 결제 직전 마지막 불안을 더는 신뢰 스트립.
// 사실 기반만 사용: 토스 안전결제·환불정책 링크.
// 평점·누적 수치는 예시값이라 실후기 확보 전(SHOW_SOCIAL_PROOF=false)엔 숨긴다.
export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-bone-faint tracking-[0.02em] ${className}`}
    >
      {SHOW_SOCIAL_PROOF && (
        <>
          <span className="text-gold-soft">
            ★ <span className="text-bone-soft">4.96</span>
          </span>
          <span className="opacity-50">·</span>
          <span>
            누적 <span className="text-bone-soft">11,300명</span>이 받아봤어요
          </span>
          <span className="opacity-50">·</span>
        </>
      )}
      <span>토스페이먼츠 안전결제</span>
      <span className="opacity-50">·</span>
      <Link
        href="/legal/refund-policy"
        className="underline underline-offset-2 hover:text-bone-soft"
      >
        환불 안내
      </Link>
    </div>
  );
}
