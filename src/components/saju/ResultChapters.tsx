// =====================================================
// 상세 풀이 — 챕터별 카드. interpretation_md의 ### 챕터를 각각 독립 카드로 쪼갠다.
// (한 카드에 길게 vs 챕터별로 나눠 읽기 편하게 — 위쪽 영역별 카드와 통일)
// =====================================================
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HeadingIcon, markdownComponents, ResultBody } from "./ResultBody";

export type Chapter = { title: string; body: string };

// ## 대제목은 버리고, ### 단위로 챕터를 가른다. 첫 ### 이전 글은 intro.
// (산군 결과지(SangunResult)도 같은 파서를 쓴다 — 따로 만들면 챕터 경계가 어긋난다)
export function splitChapters(md: string): { intro: string; chapters: Chapter[] } {
  const chapters: Chapter[] = [];
  const intro: string[] = [];
  let cur: { title: string; body: string[] } | null = null;
  // CRLF 내성: 윈도우에서 저장·복사된 md 는 줄끝에 \r 이 남는다. \r 이 있으면 `(.*)$` 가
  // 통째로 안 걸려 챕터 0개 → 결과지 전체가 intro 로 뭉개진다(회귀 테스트에서 실측).
  for (const rawLine of md.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      if (cur) chapters.push({ title: cur.title, body: cur.body.join("\n").trim() });
      cur = { title: h3[1].trim(), body: [] };
    } else if (/^##\s+/.test(line)) {
      continue; // 전체 제목 줄은 버림(상단에서 이미 노출)
    } else if (cur) {
      cur.body.push(line);
    } else {
      intro.push(line);
    }
  }
  if (cur) chapters.push({ title: cur.title, body: cur.body.join("\n").trim() });
  return { intro: intro.join("\n").trim(), chapters };
}

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
