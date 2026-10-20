const reviews = [
  {
    author: "89년생 여성",
    content: "30만 원짜리 신점도 많이 봤는데 거의 비슷하다… 아니, 신점 볼 필요가 없네요. 내 인생을 들여다본 느낌.",
  },
  {
    author: "02년생 여성",
    content: "소름 돋게 잘 맞아요. 사주 앱 많이 봤는데 이렇게 잘 맞은 건 처음이에요.",
  },
  {
    author: "94년생 여성",
    content: "과거를 다 맞추니 할 말이 없네요. 고민거리들은 그냥 사주 믿고 해보려고요.",
  },
];

function Review({ author, content }: { author: string; content: string }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-1.5 text-[11px] text-[#A1A1A6]">{author}</figcaption>
      <blockquote className="m-0 text-[13px] leading-relaxed text-[#E5E5E7]">“{content}”</blockquote>
    </figure>
  );
}

export function CheckoutReviews() {
  return (
    <section aria-label="이용 후기" className="mb-5 rounded-xl border border-[#353537] bg-[#191919] px-4 pt-3 font-sans">
      <h3 className="mb-2 text-[12px] font-semibold text-white">이용 후기</h3>
      <Review {...reviews[0]} />
      <details className="group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[12px] text-[#E87964] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E87964] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">후기 2개 더 보기</span>
          <span className="hidden group-open:inline">후기 접기</span>
          <span aria-hidden="true" className="group-open:rotate-180">⌄</span>
        </summary>
        <div className="space-y-4 border-t border-[#353537] py-3">
          {reviews.slice(1).map(review => <Review key={review.author} {...review} />)}
        </div>
      </details>
    </section>
  );
}
