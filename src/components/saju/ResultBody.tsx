import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// 명운록 결과지 본문 — 마크다운을 증서 느낌의 구획된 섹션으로 렌더.
// ## = 결과지 대제목(상단 1회), ### = 각 챕터(골드 디바이더 + 본문 카드).

const components: Components = {
  // 대제목: 보통 페이지 헤더에서 이미 보여주므로 본문에선 작게 (중복 방지용 구분)
  h2: ({ children }) => (
    <h2 className="sr-only">{children}</h2>
  ),
  // 챕터 제목 — 골드 디바이더 + 한자 장식 느낌
  h3: ({ children }) => (
    <div className="mt-9 mb-3 first:mt-0">
      <div className="gold-rule mb-3 opacity-70" />
      <h3 className="font-myeongjo text-lg font-semibold text-gold-bright tracking-[0.02em] leading-snug">
        {children}
      </h3>
    </div>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 mb-2 font-myeongjo text-base font-semibold text-bone">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-[1.85] text-[15px] text-bone-soft">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 space-y-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 space-y-2 pl-1 [counter-reset:item]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="relative pl-5 text-[15px] leading-[1.8] text-bone-soft before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-gold/70">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gold-bright">{children}</strong>
  ),
  em: ({ children }) => <em className="text-bone not-italic font-medium">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-gold pl-4 py-1 text-bone-soft italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-gold-pale">
      <table className="w-full text-sm text-bone-soft">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-gold-line bg-[rgba(150,90,255,0.08)] px-3 py-2 text-left font-myeongjo text-gold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-gold-pale px-3 py-2 align-top">{children}</td>
  ),
  hr: () => <div className="gold-rule my-6 opacity-50" />,
};

export function ResultBody({ markdown }: { markdown: string }) {
  return (
    <div className="font-myeongjo">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
