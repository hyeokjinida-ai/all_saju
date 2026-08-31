// =====================================================
// 상세 풀이 — 챕터별 카드. interpretation_md의 ### 챕터를 각각 독립 카드로 쪼갠다.
// (한 카드에 길게 vs 챕터별로 나눠 읽기 편하게 — 위쪽 영역별 카드와 통일)
// =====================================================
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HeadingIcon, markdownComponents, ResultBody } from "./ResultBody";

// 파서는 `lib/saju/chapters` 한 곳에만 산다 — 출고 검사(서버)가 같은 자를 써야 하기 때문이다.
// 여기서 다시 내보내는 건 기존 호출부(JiknyeoResult·SangunResult·verify-money-path) 호환용.
export type { Chapter } from "@/lib/saju/chapters";
export { splitChapters } from "@/lib/saju/chapters";
import { splitChapters } from "@/lib/saju/chapters";

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "rgba(9,5,22,.72)",
  border: "1px solid rgba(180,140,255,.22)",
  padding: "18px 20px",
  scrollMarginTop: 14,
};

export function ResultChapters({ markdown }: { markdown: string }) {
  const { intro, chapters } = splitChapters(markdown);

  // 챕터가 안 잡히면(예: ### 없음) 기존 단일 카드로 폴백
  if (chapters.length === 0) {
    return (
      <div style={cardStyle}>
        <ResultBody markdown={markdown} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {intro && (
        <div style={cardStyle}>
          <ResultBody markdown={intro} />
        </div>
      )}
      {chapters.map((c, i) => (
        <section key={i} style={cardStyle}>
          <div className="flex items-center gap-2.5">
            <HeadingIcon title={c.title} />
            <h3 className="font-myeongjo text-[18px] font-semibold leading-snug" style={{ color: "#f6f1ff" }}>
              {c.title}
            </h3>
          </div>
          <div className="font-myeongjo mt-1">
            <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={markdownComponents}>
              {c.body}
            </ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  );
}
