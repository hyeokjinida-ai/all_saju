import Link from "next/link";

// 결제 직전 마지막 불안을 더는 신뢰 스트립.
// 사실 기반만 사용: 사회적 증거(사이트 공통 수치)·토스 안전결제·개인정보 사용범위·환불정책 링크.
// (없는 보장/허위 문구는 넣지 않음)
export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-bone-faint tracking-[0.02em] ${className}`}
    >
      <span className="text-gold-soft">
        ★ <span className="text-bone-soft">4.96</span>
      </span>
      <span className="opacity-50">·</span>
      <span>
        누적 <span className="text-bone-soft">11,300명</span>이 받아봤어요
      </span>
      <span className="opacity-50">·</span>
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
