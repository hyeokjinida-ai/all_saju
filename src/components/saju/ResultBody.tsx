import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";

// 명운록 결과지 본문 — 마크다운을 증서 느낌의 구획된 섹션으로 렌더.
// ## = 결과지 대제목(상단 1회), ### = 각 챕터(디바이더 + 아이콘 + 본문).
// 가독성: 어두운 결과지 위에서 본문은 밝게(#ece6ff), 챕터엔 주제 아이콘을 붙인다.

const BODY = "#ece6ff"; // 본문 — 어두운 배경에서 또렷하게
const ICON = "#c9a8ff";

function nodeText(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in (node as { props?: { children?: ReactNode } }))
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children);
  return "";
}

// 챕터 제목 키워드 → 인라인 아이콘(그림). 한자=장식이 아니라 주제 픽토그램.
export function HeadingIcon({ title }: { title: string }) {
  const t = title;
  let path: ReactNode;
  if (/돈|재물|재성|자산|금전/.test(t))
    path = (<><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5h5M9.5 14h5M12 8v8" /></>);
  else if (/직업|진로|사업|일\b|커리어|퇴직|이직/.test(t))
    path = (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
  else if (/관계|가족|애정|결혼|연애|인연|사람|배우|자녀|부부/.test(t))
    path = <path d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11z" />;
  else if (/건강|체력|몸|수면/.test(t))
    path = <path d="M3 12h4l2-5 3 9 2-6 1.5 2H21" />;
  else if (/대운|세운|시기|올해|흐름|계절|때|연도|3년|월별/.test(t))
    path = (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>);
  else if (/행동|조언|실천|팁|가이드|방향/.test(t))
    path = (<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>);
  else if (/일간|기운|중심|성격|기질|강점|성향|구조|그림|나/.test(t))
    path = <path d="M12 3l2.6 5.7L21 9.6l-4.5 4.3 1.1 6.1L12 17.2 6.4 20l1.1-6.1L3 9.6l6.4-.9z" />;
  else path = <path d="M12 3l9 9-9 9-9-9z" />;
  return (
    <span style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 9, background: "rgba(150,90,255,.16)", border: "1px solid rgba(180,140,255,.3)" }}>
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={ICON} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}

export const markdownComponents: Components = {
  // 대제목: 페이지/카드 헤더에서 이미 보여주므로 본문에선 숨김(중복 방지)
  h2: ({ children }) => <h2 className="sr-only">{children}</h2>,
  // 챕터 제목 — 디바이더 + 주제 아이콘 + 밝은 제목
  h3: ({ children }) => (
    <div className="mt-8 mb-3 first:mt-0">
      <div className="gold-rule mb-3 opacity-60" />
      <h3 className="flex items-center gap-2.5 font-myeongjo text-[19px] font-semibold tracking-[0.01em] leading-snug" style={{ color: "#f6f1ff" }}>
        <HeadingIcon title={nodeText(children)} />
        <span>{children}</span>
      </h3>
    </div>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 mb-2 font-myeongjo text-base font-semibold" style={{ color: "#f6f1ff" }}>{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-3.5 text-[15.5px] leading-[1.9]" style={{ color: BODY }}>{children}</p>
  ),
  ul: ({ children }) => <ul className="my-3 space-y-2.5 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 space-y-2.5 pl-1">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-5 text-[15.5px] leading-[1.85] before:absolute before:left-0 before:top-[0.62em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-gold/80" style={{ color: BODY }}>
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-bold" style={{ color: "#ffffff" }}>{children}</strong>,
  em: ({ children }) => <em className="not-italic font-medium" style={{ color: "#fff" }}>{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-md border-l-2 border-gold py-2 pl-4" style={{ color: "#ded4ff", background: "rgba(150,90,255,.08)" }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-gold-line">
      <table className="w-full text-sm" style={{ color: BODY }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-gold-line bg-[rgba(150,90,255,0.12)] px-3 py-2 text-left font-myeongjo" style={{ color: "#dcc8ff" }}>
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-gold-pale px-3 py-2 align-top">{children}</td>,
  hr: () => <div className="gold-rule my-6 opacity-50" />,
};

export function ResultBody({ markdown }: { markdown: string }) {
  return (
    <div className="font-myeongjo">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
