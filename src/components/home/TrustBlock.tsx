// 권위 블록 — 청월당의 「THE HYUNDAI」 배너 자리.
//
// 걔넨 더현대 팝업(오프라인 권위)을 걸고, 타이트는 「나는솔로 출연자 인증」을 건다.
// 우리는 그런 게 없다 — 대신 **가진 것**을 건다: 다른 만세력과 대운 간지를 실제로
// 대조해 본 계산(scripts/verify-daeun.ts). 없는 권위를 지어내지 않는다.
//
// 조판은 원본 그대로: 알약(10px, 가운데, mb-18) → 제목(18px bold 가운데) → 아래.
import { TrustStrip } from "@/components/saju/TrustStrip";
import { HOME_COPY } from "@/config/home";

export function TrustBlock() {
  return (
    <section className="px-5">
      <div
        className="mx-auto mb-[1.125rem] w-fit rounded-full px-3 py-1.5 text-[10px] font-semibold leading-[130%] tracking-[-0.025em]"
        style={{ border: "1px solid rgba(255,255,255,0.20)", color: "#D4D4D8" }}
      >
        {HOME_COPY.trustPill}
      </div>
      <h3
        // break-keep: 없으면 "…풀 / 니다" 처럼 단어 중간에서 끊긴다(실측)
        className="mb-3.5 break-keep px-2 text-center text-[18px] font-bold leading-[140%] tracking-[-0.025em]"
        style={{ color: "#FAFAFA" }}
      >
        {HOME_COPY.trustHeadline}
      </h3>
      <TrustStrip />
    </section>
  );
}
