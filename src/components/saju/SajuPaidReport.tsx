import { Fragment, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ELEMENT_META, type ResultView } from "@/lib/saju/result-view";
import type { ChartRow } from "@/lib/saju/teaser";
import type { WealthFacts, WealthMonth, InyeonFacts, DaeunRow } from "@/lib/saju/saju-api";
import type { Prescription } from "@/lib/saju/prescription";
import { buildPartnerFace } from "@/lib/saju/partner-face";
import { splitChapters } from "@/lib/saju/chapters";
import styles from "./SajuPaidReport.module.css";

export type SajuPaidReportProps = {
  view: ResultView;
  markdown: string;
  displayName: string;
  recordedAt: string | null;
  name?: string | null;
  chartRows?: ChartRow[];
  wealth?: WealthFacts | null;
  inyeon?: InyeonFacts | null;
  wealthYears?: WealthMonth[] | null;
  daeunTimeline?: DaeunRow[] | null;
  prescription?: Prescription | null;
};

// Line-based IDs let the original Markdown render in full, without reparsing or
// rewriting its chapter order. Ignore fenced code when collecting navigation.
function headingsOf(markdown: string) {
  const headings: { id: string; title: string; depth: number }[] = [];
  let fence: { char: string; length: number } | null = null;
  markdown.split(/\r?\n/).forEach((line, index) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      const run = marker[1];
      if (!fence) fence = { char: run[0], length: run.length };
      else if (run[0] === fence.char && run.length >= fence.length) fence = null;
      return;
    }
    if (fence) return;
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!heading) return;
    const title = heading[2].replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`~]|==/g, "").trim();
    if (title) headings.push({ id: `report-heading-${index + 1}`, title, depth: heading[1].length });
  });
  const chapterHeadings = headings.filter((heading) => heading.depth <= 3);
  return chapterHeadings.length ? chapterHeadings : headings;
}

function highlighted(children: ReactNode): ReactNode {
  if (Array.isArray(children)) return children.map((child, index) => <Fragment key={index}>{highlighted(child)}</Fragment>);
  if (typeof children !== "string" || !children.includes("==")) return children;
  return children.split(/(==[^=]+?==)/g).map((part, index) =>
    part.startsWith("==") && part.endsWith("==") && part.length > 4
      ? <mark key={index}>{part.slice(2, -2)}</mark> : part,
  );
}

const headingId = (line?: number) => line == null ? undefined : `report-heading-${line}`;

const markdownComponents: Components = {
  h1: ({ children, node }) => <h2 id={headingId(node?.position?.start.line)}>{children}</h2>,
  h2: ({ children, node }) => <h2 id={headingId(node?.position?.start.line)}>{children}</h2>,
  h3: ({ children, node }) => <h3 id={headingId(node?.position?.start.line)}>{children}</h3>,
  h4: ({ children, node }) => <h4 id={headingId(node?.position?.start.line)}>{children}</h4>,
  h5: ({ children, node }) => <h5 id={headingId(node?.position?.start.line)}>{children}</h5>,
  h6: ({ children, node }) => <h6 id={headingId(node?.position?.start.line)}>{children}</h6>,
  p: ({ children }) => <p>{highlighted(children)}</p>,
  strong: ({ children }) => <strong>{highlighted(children)}</strong>,
  li: ({ children }) => <li>{highlighted(children)}</li>,
  table: ({ children }) => <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="풀이 표"><table>{children}</table></div>,
  // Raw HTML is not enabled; Markdown images must not request artwork either.
  img: () => null,
};

function SavedReading({ markdown }: { markdown: string }) {
  return <ReactMarkdown skipHtml remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={markdownComponents}>{markdown}</ReactMarkdown>;
}

function recordedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul",
  }).format(date);
}

function FactList({ rows }: { rows: { label: string; value: string }[] }) {
  return <dl className={styles.factList}>{rows.filter((row) => row.value).map((row, index) => (
    <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>
  ))}</dl>;
}

/** Presentation only. The owning result route must perform its usual access
 * checks before passing the saved result and existing computed facts here. */
export function SajuPaidReport({
  view, markdown, displayName, recordedAt, name, chartRows = [], wealth, inyeon,
  wealthYears, daeunTimeline, prescription,
}: SajuPaidReportProps) {
  const headings = headingsOf(markdown);
  const savedDate = recordedDate(recordedAt);
  const pillars = view.pillars.slice().reverse().filter((pillar) => pillar.gan.char !== "?");
  // buildChartRows omits missing positions; join by position, never by index.
  const pillarColumns = pillars.map((pillar) => {
    const pos = pillar.isDay ? "나" : pillar.label.includes("해") ? "해"
      : pillar.label.includes("달") ? "달" : pillar.label.includes("시") ? "시" : null;
    return { pillar, row: pos ? chartRows.find((row) => row.pos === pos) : undefined };
  });
  const emptyChapters = splitChapters(markdown).chapters.filter((chapter) => !chapter.body.trim());
  const hasReadingBody = markdown.replace(/^#{1,6}\s.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim().length > 0;
  const partner = inyeon ? buildPartnerFace(inyeon) : null;
  const moneyRows = [
    ...(wealth?.top ?? []).map((row) => ({ label: "재물 흐름이 좋은 달", value: row.label })),
    ...(wealth?.bad ?? []).map((row) => ({ label: "재물 흐름에 유의할 달", value: row.label })),
    ...(wealthYears ?? []).map((row) => ({ label: "크게 벌리는 해", value: row.label })),
  ];
  const relationshipRows = inyeon ? [
    ...inyeon.top3.map((row) => ({ label: "인연이 드는 달", value: row.label })),
    ...inyeon.shaky.map((row) => ({ label: "마음이 흔들리는 달", value: row.label })),
    ...inyeon.topYears.map((row) => ({ label: "크게 바뀌는 해", value: row.label })),
  ] : [];

  return (
    <article className={styles.root} id="report-top">
      <header className={styles.header}>
        <a href="/" className={styles.brand}>명운록</a>
        <p className={styles.eyebrow}>나의 사주 보고서</p>
        <h1>{displayName}</h1>
        {name?.trim() && <p className={styles.owner}>{name.trim()}님의 풀이</p>}
        {savedDate && <p className={styles.date}>작성일 <time dateTime={recordedAt ?? undefined}>{savedDate}</time></p>}
      </header>

      <nav className={styles.contents} aria-label="보고서 목차">
        <h2>차례</h2>
        <ol>
          <li><a href="#report-chart">나의 명식과 오행</a></li>
          {moneyRows.length > 0 && <li><a href="#report-money">돈의 달력</a></li>}
          {inyeon && <li><a href="#report-relationship">인연의 흐름</a></li>}
          {!!daeunTimeline?.length && <li><a href="#report-daeun">대운 연대기</a></li>}
          {prescription && <li><a href="#report-prescription">생활 처방</a></li>}
          <li><a href="#report-reading">상세 풀이 전문</a></li>
        </ol>
        {headings.length > 0 && <details className={styles.chapterContents}>
          <summary>풀이별 바로 가기</summary>
          <ol>{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol>
        </details>}
      </nav>

      <section className={styles.card} id="report-chart" aria-labelledby="report-chart-title">
        <p className={styles.eyebrow}>사주 원국</p>
        <h2 id="report-chart-title">나의 명식과 오행</h2>
        {view.birthLine && <p className={styles.birthLine}>{view.birthLine}</p>}
        {pillars.length ? <div className={styles.tableScroll}>
          <table className={styles.pillarTable}>
            <caption className={styles.srOnly}>태어난 해부터 시까지의 사주 명식</caption>
            <thead><tr><th scope="col">구분</th>{pillarColumns.map(({ pillar, row }) => <th scope="col" key={pillar.label}>{row?.pos || pillar.label}</th>)}</tr></thead>
            <tbody>
              {chartRows.length > 0 && <tr><th scope="row">천간 십성</th>{pillarColumns.map(({ pillar, row }) => <td key={pillar.label}>{row?.ganSip || "—"}</td>)}</tr>}
              <tr><th scope="row">천간</th>{pillars.map((pillar, index) => <td key={index}><strong>{pillar.gan.char}</strong><small>{pillar.gan.read} · {ELEMENT_META[pillar.gan.element].ko}</small></td>)}</tr>
              <tr><th scope="row">지지</th>{pillars.map((pillar, index) => <td key={index}><strong>{pillar.ji.char}</strong><small>{pillar.ji.read} · {ELEMENT_META[pillar.ji.element].ko}</small></td>)}</tr>
              {chartRows.length > 0 && <><tr><th scope="row">지지 십성</th>{pillarColumns.map(({ pillar, row }) => <td key={pillar.label}>{row?.jiSip || "—"}</td>)}</tr>
                <tr><th scope="row">12운성</th>{pillarColumns.map(({ pillar, row }) => <td key={pillar.label}>{row?.fortune || "—"}</td>)}</tr></>}
            </tbody>
          </table>
        </div> : <p className={styles.note}>이 결과지에서 확인할 수 있는 명식 정보가 없습니다.</p>}
        <h3 className={styles.subheading}>오행 분포</h3>
        <ul className={styles.elements}>{view.ohaeng.map((element) => <li key={element.key}>
          <span>{ELEMENT_META[element.key].ko} <small>{ELEMENT_META[element.key].hanja}</small></span><strong>{element.count}<small>개</small></strong>
        </li>)}</ul>
        <p className={styles.note}>원국에 있는 천간과 지지의 오행 개수입니다. 태어난 시간을 모르면 시주는 제외됩니다.</p>
        {view.ilgan.title && <p className={styles.ilgan}><span>나의 일간</span><strong>{view.ilgan.title}</strong></p>}
      </section>

      {moneyRows.length > 0 && <section className={styles.card} id="report-money">
        <h2>돈의 달력</h2>
        {wealth && <p className={styles.metric}>재물 흐름 <strong>{wealth.score}점</strong></p>}
        <FactList rows={moneyRows} />
      </section>}

      {inyeon && <section className={styles.card} id="report-relationship">
        <h2>인연의 흐름</h2>
        <p className={styles.metric}>인연 흐름 <strong>{inyeon.score}점</strong></p>
        <FactList rows={relationshipRows} />
        {partner && <><h3 className={styles.subheading}>짝의 인상과 만나는 자리</h3>
          <FactList rows={[
            { label: "만나는 시기", value: inyeon.top3[0]?.label ?? "" },
            { label: "외모", value: partner.look }, { label: "성격", value: partner.nature },
            { label: "만나는 자리", value: partner.place }, { label: "나이대", value: inyeon.ageDir },
            { label: "배우자 자리의 결", value: partner.ohKo },
          ]} /></>}
        {!!inyeon.months.length && <details className={styles.more}><summary>열두 달의 흐름</summary>
          <FactList rows={inyeon.months.map((month) => ({ label: month.label, value: [month.verdict, ...month.tags].filter(Boolean).join(" · ") || "—" }))} />
        </details>}
      </section>}

      {!!daeunTimeline?.length && <section className={styles.card} id="report-daeun">
        <h2>대운 연대기</h2>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="대운 연대기 표"><table>
          <thead><tr><th scope="col">나이 · 시기</th><th scope="col">간지 · 십성</th><th scope="col">흐름</th></tr></thead>
          <tbody>{daeunTimeline.map((row, index) => <tr key={index} className={row.when === "now" ? styles.current : undefined}>
            <th scope="row">{row.range}<small>{row.years}</small>{row.when === "now" && <span className={styles.badge}>지금</span>}</th>
            <td>{row.ganji}<small>{row.sip}</small></td><td>{row.line}<small>{row.favor}</small></td>
          </tr>)}</tbody>
        </table></div>
      </section>}

      {prescription && <section className={styles.card} id="report-prescription">
        <h2>생활 처방</h2>
        <p className={styles.note}>이로운 결 {prescription.yongKo}{prescription.heeKo ? ` · 도움이 되는 결 ${prescription.heeKo}` : ""}{prescription.giKo ? ` · 조절할 결 ${prescription.giKo}` : ""}</p>
        <div className={styles.prescriptions}>{prescription.rows.map((row) => <section key={row.label}>
          <h3>{row.label}</h3><dl><div><dt>해볼 것</dt><dd>{row.do_}</dd></div><div><dt>피할 것</dt><dd>{row.avoid}</dd></div></dl>
        </section>)}</div>
      </section>}

      {view.categories.length > 0 && <section className={styles.card}>
        <h2>영역별 성향</h2>
        <p className={styles.note}>명식에서 읽는 성향 지표입니다.</p>
        <div className={styles.categories}>{view.categories.map((category) => <section key={category.key}>
          <h3>{category.label}<span>{category.score}점</span></h3><p>{category.body}</p>
        </section>)}</div>
      </section>}

      <section className={`${styles.card} ${styles.reading}`} id="report-reading" aria-labelledby="report-reading-title">
        <p className={styles.eyebrow}>나를 위한 풀이</p>
        <h2 id="report-reading-title" className={styles.readingTitle}>상세 풀이 전문</h2>
        {emptyChapters.length > 0 && <p className={styles.notice}>본문이 비어 있는 항목이 있습니다: {emptyChapters.map((chapter) => chapter.title).join(", ")}. 현재 저장된 내용까지 표시됩니다.</p>}
        {!hasReadingBody && <p className={styles.notice}>이 결과지에 저장된 상세 풀이가 없습니다. 잠시 후 다시 확인해 주세요.</p>}
        {markdown.trim() && <div className={styles.markdown}><SavedReading markdown={markdown} /></div>}
      </section>
      <footer className={styles.footer}><a href="#report-top">보고서 처음으로</a></footer>
    </article>
  );
}
