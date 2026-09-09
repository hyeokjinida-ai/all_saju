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
import { gateChapters, lockedChapterBody, nextUnlockAt } from "@/lib/saju/month-gate";

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "rgba(9,5,22,.72)",
  border: "1px solid rgba(180,140,255,.22)",
  padding: "18px 20px",
  scrollMarginTop: 14,
};

/** 열두 달 장부 전용 — 아직 오지 않은 달의 장을 가린다.
 *
 *  ⚠ **저장된 본문은 손대지 않는다.** 결제 시 12개월치를 다 만들어 두고(만세력 한도 6,000회)
 *    화면에서만 가린다. 그래서 크론도 배치도 없고, 열리는 순간 이미 글이 거기 있다. */
type MonthLock = { createdAt: string | Date; now?: Date } | null;

export function ResultChapters({
  markdown,
  monthLock = null,
}: {
  markdown: string;
  monthLock?: MonthLock;
}) {
  const { intro, chapters } = splitChapters(markdown);

  // 챕터가 안 잡히면(예: ### 없음) 기존 단일 카드로 폴백
  if (chapters.length === 0) {
    return (
      <div style={cardStyle}>
        <ResultBody markdown={markdown} />
      </div>
    );
  }

  const created = monthLock ? new Date(monthLock.createdAt) : null;
  const now = monthLock?.now ?? new Date();
  // created 가 Invalid Date 면 잠그지 않는다 — 날짜를 못 읽었다고 손님 글을 가리면 안 된다.
  const gates =
    created && !Number.isNaN(created.getTime())
      ? gateChapters(chapters.map((c) => c.title), created, now)
      : null;
  const opensNext = created && !Number.isNaN(created.getTime()) ? nextUnlockAt(created, now) : null;

  return (
    <div className="space-y-3">
      {intro && (
        <div style={cardStyle}>
          <ResultBody markdown={intro} />
        </div>
      )}
      {chapters.map((c, i) => {
        const g = gates?.[i];
        const locked = g ? !g.open : false;
        return (
          <section
            key={i}
            style={locked ? { ...cardStyle, opacity: 0.62, borderStyle: "dashed" } : cardStyle}
          >
            <div className="flex items-center gap-2.5">
              <HeadingIcon title={c.title} />
              <h3
                className="font-myeongjo text-[18px] font-semibold leading-snug"
                style={{ color: locked ? "#b9a8e0" : "#f6f1ff" }}
              >
                {c.title}
              </h3>
              {locked && (
                <span
                  className="ml-auto shrink-0 rounded-full px-2 py-0.5"
                  style={{ fontSize: 11, color: "#c9a8ff", border: "1px solid rgba(180,140,255,.35)" }}
                >
                  잠김
                </span>
              )}
            </div>
            <div className="font-myeongjo mt-1">
              <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={markdownComponents}>
                {locked ? lockedChapterBody(g?.opensAt ?? null) : c.body}
              </ReactMarkdown>
            </div>
          </section>
        );
      })}
      {opensNext && (
        <p className="px-1 text-center" style={{ fontSize: 12, color: "#c9a8ff" }}>
          다음 달의 장부는 <strong>{fmtKstDay(opensNext)}</strong>에 열립니다. 그때 다시 오세요.
        </p>
      )}
    </div>
  );
}

/** KST 달력 날짜로 표기. 서버는 UTC 라 toLocaleDateString 을 쓰면 하루가 밀린다. */
function fmtKstDay(d: Date): string {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}
