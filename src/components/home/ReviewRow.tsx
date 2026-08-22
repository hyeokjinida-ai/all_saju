// 실시간 후기 행 — 청월당 실측: 카드 256×153, rounded-lg px-4 py-3, 아바타 44, 별 16.
//
// ⚠ **실제 후기만.** 3건 미만이면 섹션 자체를 그리지 않는다.
//    lib/reviews.ts 의 샘플 후기(예시 이름·날짜)는 여기 절대 들어오지 않는다 —
//    광고 집행 전 가짜 후기 노출은 표시광고법 문제이기도 하고, 무엇보다 우리 원칙이다.
import { timeAgo } from "@/lib/utils";
import type { HomeReview } from "@/lib/home-data";
import { HOME_COPY } from "@/config/home";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-[1px]" aria-label={`별 ${n}개`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.6 4.1 13.7l.8-4.4L1.7 6.2l4.4-.6z"
            fill={i <= n ? "#F5C451" : "rgba(255,255,255,0.18)"}
          />
        </svg>
      ))}
    </span>
  );
}

export function ReviewRow({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length < 3) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between px-5">
        <h3 className="px-1 text-[20px] font-bold leading-[130%] tracking-[-0.025em]" style={{ color: "#FAFAFA" }}>
          {HOME_COPY.reviewTitle}
        </h3>
      </div>
      <div className="no-scrollbar mt-4 w-full overflow-x-auto overflow-y-hidden pl-5">
        <div className="flex gap-3 after:h-px after:w-2 after:flex-none after:content-['']">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="relative w-64 shrink-0 rounded-lg px-4 py-3"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center justify-start gap-2">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.10)", color: "#FAFAFA" }}
                  aria-hidden="true"
                >
                  {r.who[0]}
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1.5">
                  <div className="flex w-full items-center justify-between gap-2">
                    <Stars n={r.rating} />
                    <span className="shrink-0 text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  <div className="mr-auto flex min-w-0 items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                    <span className="shrink-0 font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>
                      {r.who}
                    </span>
                    {r.productName && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.20)" }}>|</span>
                        <span className="truncate">{r.productName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p
                className="mt-2 line-clamp-3 min-h-16 text-start text-[12px] leading-[150%]"
                style={{ color: "rgba(255,255,255,0.90)" }}
              >
                {r.content}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
