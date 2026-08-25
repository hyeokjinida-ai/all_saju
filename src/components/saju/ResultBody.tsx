import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { InkMark } from "./InkMark";

// 명운록 결과지 본문 — 마크다운을 증서 느낌의 구획된 섹션으로 렌더.
// ## = 결과지 대제목(상단 1회), ### = 각 챕터(디바이더 + 아이콘 + 본문).
// 가독성: 어두운 결과지 위에서 본문은 밝게(#ece6ff), 챕터엔 주제 아이콘을 붙인다.

/** 결과지 바탕 톤. night = 밤 카드(기존·산군) / hanji = 한지 판(직녀 章 본문).
 *  청월당 유료 결과지는 간지만 어둡고 본문은 밝다 — 긴 글의 가독성과 삽화 발색을 같이 얻는 구조다.
 *  색을 두 벌 두는 대신 팔레트 하나로 갈라, 같은 마크다운이 두 배경에서 다 살게 한다. */
export type BodyTone = "night" | "hanji";

type Pal = {
  body: string; head: string; strong: string; icon: string; iconBg: string; iconLine: string;
  hlPaint: string; hlText: string; quote: string; quoteBg: string; thText: string; thBg: string;
  /** 문단 타이포 — 한지(밝은 판)는 글이 주인공이라 호흡을 더 넓게 잡는다(형님 검토 2026-08-25:
   *  "술술 읽히게". 크기 한 단, 문단 사이 한 단, 소제목 존재감 한 단). */
  pClass: string; h4Class: string;
};

const PALETTE: Record<BodyTone, Pal> = {
  night: {
    body: "#ece6ff", head: "#f6f1ff", strong: "#ffffff",
    icon: "#c9a8ff", iconBg: "rgba(150,90,255,.16)", iconLine: "rgba(180,140,255,.3)",
    // 어두운 판에서는 붉은 칠 위에 밝은 글자가 선다(타이트 형광펜 기법)
    hlPaint: "rgba(143,43,30,0.62)", hlText: "#ffe9d8",
    quote: "#ded4ff", quoteBg: "rgba(150,90,255,.08)",
    thText: "#dcc8ff", thBg: "rgba(150,90,255,0.12)",
    pClass: "my-3.5 text-[15.5px] leading-[1.9]",
    h4Class: "mt-5 mb-2 font-myeongjo text-base font-semibold",
  },
  hanji: {
    // 먹빛 글자 — 순검정은 한지에서 튄다. 남보라를 살짝 섞어 직녀 팔레트 안에 둔다.
    body: "#2A2434", head: "#1B1729", strong: "#120F1C",
    icon: "#6B4C9A", iconBg: "rgba(107,76,154,.10)", iconLine: "rgba(107,76,154,.28)",
    // 한지 위 형광은 금빛(낙관 색). 붉은 칠은 직녀 그림채 규칙(화면에 빨강 0)과 어긋난다.
    // ⚠ 0.42 로 깔았더니 한지(#faf7f0) 위에서 칠이 거의 안 보였다(2026-08-25 화면 실측).
    //   밝은 종이에서는 밤 배경보다 **더 진하게** 칠해야 같은 강도로 읽힌다.
    hlPaint: "rgba(206,164,44,0.62)", hlText: "#1F1809",
    quote: "#3A3348", quoteBg: "rgba(107,76,154,.07)",
    thText: "#4A3C6B", thBg: "rgba(107,76,154,0.10)",
    pClass: "my-[19px] text-[16px] leading-[2.0]",
    h4Class: "mt-7 mb-2.5 font-myeongjo text-[17px] font-bold",
  },
};

// ── 형광펜 — 타이트 실측에서 훔쳐온 기법 ──
// 문단 속 핵심 한 문장만 칠해서, 긴 글을 안 읽어도 하이라이트만 따라가면 요지가 잡히게.
// 프롬프트(lib/saju/prompt.ts)가 챕터당 한 문장을 ==문장== 으로 표시하고 여기서 칠한다.
// 타이트는 붉은 형광펜을 쓴다 — 우리 결과지는 보라/금 톤이라 붉은 칠이 오히려 대비로 선다.
const highlightStyle = (pal: Pal): CSSProperties => ({
  // 붓이 좌→우로 지나가며 칠해진다. 단색 배경으로 두면 "이미 칠해져 있던 것"이고,
  // 그려지면 "산군이 방금 그은 것"이 된다 — 전환점 카드의 붓 동그라미와 같은 원리.
  // mark 는 브라우저 기본 스타일이 background-color: yellow 다. 반투명 붉은 칠을 그 위에 얹으면
  // 노랑이 비쳐 올리브색이 된다(실측에서 걸렸다) — 기본 배경부터 지우고 칠한다.
  backgroundColor: "transparent",
  backgroundImage: `linear-gradient(${pal.hlPaint}, ${pal.hlPaint})`,
  backgroundRepeat: "no-repeat",
  // 칠하는 동작(background-size 0%→100%)은 CSS 클래스 `.ink-swipe`/`.is-drawn` 이 맡는다.
  // 인라인 animation 으로 두면 요소가 만들어질 때 재생돼, 11장짜리 결과지에서 형광펜 열몇 개가
  // 페이지 뜨는 순간 한꺼번에 칠해지고 끝난다 — 읽어 내려온 손님은 이미 칠해진 것만 본다.
  color: pal.hlText,
  padding: "0.08em 0.25em",
  borderRadius: 2,
  // 줄바꿈에 걸쳐도 칠(패딩·모서리)이 각 줄에 이어지게
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
});

// 문자열 하나에서 ==...== 짝을 찾아 <mark> 로 쪼갠다.
// 짝이 맞는 구간만 변환하고, 홀수 개·깨진 마커는 건드리지 않는다 —
// 어설프게 반만 변환해서 깨진 결과를 내느니 원문 그대로 두는 쪽이 안전하다.
function highlightString(text: string, pal: Pal): ReactNode {
  if (!text.includes("==")) return text;
  // [^=] 로 제한: "====" 같은 연속 = 를 빈 하이라이트로 오인하지 않게
  const re = /==([^=]+?)==/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <InkMark key={m.index} style={highlightStyle(pal)}>
        {m[1]}
      </InkMark>,
    );
    last = m.index + m[0].length;
  }
  if (parts.length === 0) return text; // 짝이 하나도 안 맞음 → 원문 그대로
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// children 의 '텍스트 노드'만 골라 형광펜 처리. remark 파싱이 끝난 뒤에 동작하므로
// 마크다운 문법과 충돌하지 않고, **==문장==** 처럼 굵게와 겹친 경우도
// strong 오버라이드가 자기 children 텍스트를 다시 이 함수로 처리해서 동작한다.
// (한계: ==가 요소 경계를 넘어 갈라진 경우는 짝을 못 찾아 원문 그대로 남는다 — 의도된 폴백)
function withHighlights(children: ReactNode, pal: Pal): ReactNode {
  if (typeof children === "string") return highlightString(children, pal);
  if (Array.isArray(children))
    return children.map((c, i) =>
      typeof c === "string" ? <Fragment key={`hl-${i}`}>{highlightString(c, pal)}</Fragment> : c,
    );
  return children;
}

function nodeText(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in (node as { props?: { children?: ReactNode } }))
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children);
  return "";
}

// 챕터 제목 키워드 → 인라인 아이콘(그림). 한자=장식이 아니라 주제 픽토그램.
export function HeadingIcon({ title, tone = "night" }: { title: string; tone?: BodyTone }) {
  const pal = PALETTE[tone];
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
  else if (/대운|세운|시기|올해|흐름|계절|때|연도|연표|3년|월별/.test(t))
    path = (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>);
  else if (/행동|조언|실천|팁|가이드|방향/.test(t))
    path = (<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>);
  else if (/일간|기운|중심|성격|기질|강점|성향|구조|그림|나/.test(t))
    path = <path d="M12 3l2.6 5.7L21 9.6l-4.5 4.3 1.1 6.1L12 17.2 6.4 20l1.1-6.1L3 9.6l6.4-.9z" />;
  else path = <path d="M12 3l9 9-9 9-9-9z" />;
  return (
    <span style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 9, background: pal.iconBg, border: `1px solid ${pal.iconLine}` }}>
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={pal.icon} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}

export function makeMarkdownComponents(tone: BodyTone = "night"): Components {
  const pal = PALETTE[tone];
  return {
  // 대제목: 페이지/카드 헤더에서 이미 보여주므로 본문에선 숨김(중복 방지)
  h2: ({ children }) => <h2 className="sr-only">{children}</h2>,
  // 챕터 제목 — 디바이더 + 주제 아이콘 + 밝은 제목
  h3: ({ children }) => (
    <div className="mt-8 mb-3 first:mt-0">
      <div className="gold-rule mb-3 opacity-60" />
      <h3 className="flex items-center gap-2.5 font-myeongjo text-[19px] font-semibold tracking-[0.01em] leading-snug" style={{ color: pal.head }}>
        <HeadingIcon title={nodeText(children)} tone={tone} />
        <span>{children}</span>
      </h3>
    </div>
  ),
  h4: ({ children }) => (
    <h4 className={pal.h4Class} style={{ color: pal.head }}>{children}</h4>
  ),
  p: ({ children }) => (
    <p className={pal.pClass} style={{ color: pal.body }}>{withHighlights(children, pal)}</p>
  ),
  ul: ({ children }) => <ul className="my-3 space-y-2.5 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 space-y-2.5 pl-1">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-5 text-[15.5px] leading-[1.85] before:absolute before:left-0 before:top-[0.62em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-gold/80" style={{ color: pal.body }}>
      {withHighlights(children, pal)}
    </li>
  ),
  strong: ({ children }) => <strong className="font-bold" style={{ color: pal.strong }}>{withHighlights(children, pal)}</strong>,
  em: ({ children }) => <em className="not-italic font-medium" style={{ color: pal.strong }}>{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-md border-l-2 border-gold py-2 pl-4" style={{ color: pal.quote, background: pal.quoteBg }}>
      {withHighlights(children, pal)}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-gold-line">
      <table className="w-full text-sm" style={{ color: pal.body }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-gold-line px-3 py-2 text-left font-myeongjo" style={{ color: pal.thText, background: pal.thBg }}>
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-gold-pale px-3 py-2 align-top">{children}</td>,
  hr: () => <div className="gold-rule my-6 opacity-50" />,
  };
}

/** 기존 호출부(산군·챕터 목록)는 밤 톤 그대로 — 이 상수를 유지해 회귀를 막는다. */
export const markdownComponents: Components = makeMarkdownComponents("night");

export function ResultBody({ markdown, tone = "night" }: { markdown: string; tone?: BodyTone }) {
  return (
    <div className="font-myeongjo">
      <ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={makeMarkdownComponents(tone)}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
