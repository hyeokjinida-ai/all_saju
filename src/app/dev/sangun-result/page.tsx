// 산군 결과지 조판 미리보기 — **개발 전용**.
// 실물 결과지가 DB에 없어도(주문 1건·결과 0건) 조판을 눈으로 확인해야 해서,
// sample-results.ts 가 만든 샘플(md) + 명식 캐시(json)를 그대로 SangunResult 에 흘린다.
// 실제 결제 파이프라인과 같은 부품(buildResultView·computeWealthFacts·computeInyeonFacts)만 쓴다 —
// 여기서만 다른 계산을 쓰면 미리보기가 거짓말이 된다.
//
// ※ 이 미리보기에만 보라색 사이트 헤더·푸터가 뜬다. 실제 결과지(/results/…)는 ChromeGate 의
//   bare 목록에 들어 있어 크롬이 아예 안 붙는다 — 여기 보이는 보라는 쫓아갈 버그가 아니다.
//
// 2026-08-23 · `?case=` 파라미터 추가. 광고 소재 캡처(cap_page.mjs)가 **손님마다 다른 결과지**를
// 찍어야 해서다(v5 서윤 UGC). 케이스 값은 sample-results.ts 의 CASES 와 **같은 생일·같은 고민**이어야
// 명식·본문·카드가 서로 어긋나지 않는다. 파일명 규칙도 그 스크립트와 같다:
//   md    = sample-<slug>-<name>-<tag>.md      (tag = LLM_MODEL 에서 영숫자만)
//   명식  = analysis-<YYYYMMDD>-<gender>-<hour>.json
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { notFound } from "next/navigation";
import { SangunResult } from "@/components/saju/SangunResult";
import { buildResultView } from "@/lib/saju/result-view";
import { buildChartRows } from "@/lib/saju/teaser";
import {
  computeInyeonFacts,
  computeWealthFacts,
  computeWealthYears,
  computeDaeunTimeline,
  ganjiToMyeongsik,
  type SajuAnalysisResponse,
} from "@/lib/saju/saju-api";
import { computePrescription } from "@/lib/saju/prescription";

export const dynamic = "force-dynamic";
export const metadata = { title: "산군 결과지 미리보기 (dev)" };

type DevCase = {
  /** sample-results.ts 가 md 파일명에 박는 이름. 옛 샘플(이름 없는 파일명)은 null */
  fileName: string | null;
  name: string;
  birthDate: string;
  birthTime: string;
  gender: "female" | "male";
  concerns: string[];
  /** 명식 캐시 파일명 — 옛 파일(analysis-sangun-sinjeom.json)도 그대로 지원 */
  analysisFile: string;
};

const CASES: Record<string, DevCase> = {
  // 기본값 = 옛 지수 샘플(파일명에 이름이 없던 시절). 링크가 이미 퍼져 있어 그대로 둔다.
  jisu: {
    fileName: null,
    name: "지수",
    birthDate: "1993-05-15",
    birthTime: "14:30",
    gender: "female",
    concerns: ["올해 이직해도 될까요"],
    analysisFile: "analysis-sangun-sinjeom.json",
  },
  // 광고 v5 「서윤」 — 무성 UGC 광고의 카드가 전부 이 결과지 캡처다.
  // 계획서 marketing/소재/산군/광고영상_기획_v5_서윤UGC_2026-08-23.md §3-1
  seoyun: {
    fileName: "서윤",
    name: "서윤",
    birthDate: "1994-06-06",
    birthTime: "20:10",
    gender: "female",
    concerns: ["헤어진 지 석 달인데, 아직 미련이 남은 건지 모르겠어요"],
    analysisFile: "analysis-19940606-female-20.json",
  },
};

/** md 후보 — 모델 태그가 바뀌어도 찾도록 실재하는 파일 중 **가장 최근** 것을 집는다.
 *  (tag 를 하드코딩하면 모델을 바꿔 재생성했을 때 옛 본문을 계속 보여준다) */
function findMarkdown(c: DevCase): string | null {
  const dir = os.tmpdir();
  const prefix = c.fileName ? `sample-sangun-sinjeom-${c.fileName}-` : "sample-sangun-sinjeom-";
  let best: { p: string; mtime: number } | null = null;
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith(prefix) || !f.endsWith(".md")) continue;
    // 이름 없는 옛 규칙(jisu)은 이름이 붙은 파일을 집으면 안 된다
    if (!c.fileName && /^sample-sangun-sinjeom-[^-]*[가-힣]/.test(f)) continue;
    const p = path.join(dir, f);
    const mtime = fs.statSync(p).mtimeMs;
    if (!best || mtime > best.mtime) best = { p, mtime };
  }
  return best?.p ?? null;
}

export default async function DevSangunResultPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  // 프로덕션 번들에도 라우트는 실리지만 즉시 404 — 배포에서 샘플이 보이면 안 된다.
  if (process.env.NODE_ENV !== "development") notFound();

  const sp = await searchParams;
  const c = CASES[sp.case ?? "jisu"] ?? CASES.jisu;

  const mdPath = findMarkdown(c);
  const anPath = path.join(os.tmpdir(), c.analysisFile);
  if (!mdPath || !fs.existsSync(anPath)) {
    return (
      <p style={{ padding: 40, color: "#fff" }}>
        샘플이 없습니다({sp.case ?? "jisu"}) — 먼저 <code>npx tsx scripts/sample-results.ts</code> 를 돌리세요.
        <br />
        찾은 md: <code>{mdPath ?? "없음"}</code> / 명식: <code>{anPath}</code>
      </p>
    );
  }

  const markdown = fs.readFileSync(mdPath, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "");
  const analysis = JSON.parse(fs.readFileSync(anPath, "utf8")) as SajuAnalysisResponse;
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) notFound();

  // sample-results.ts 의 케이스와 **같은 값** — 다르면 명식이 어긋난다
  const view = buildResultView({
    myeongsik,
    rawAnalysis: analysis,
    name: c.name,
    birthDate: c.birthDate,
    birthTime: c.birthTime,
    timeUnknown: false,
    gender: c.gender,
    calendar: "solar",
    concerns: c.concerns,
    showScores: true,
    showDaeun: false,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        // 실제 결과지 페이지(results/[resultId])의 산군 바탕과 같은 값 — 다르면 미리보기가 거짓말이 된다
        background: "radial-gradient(85% 50% at 50% 0%,#191106,#0a0806 55%,#050403)",
        padding: "30px 12px 64px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <SangunResult
          view={view}
          markdown={markdown}
          name={c.name}
          chartRows={buildChartRows(analysis)}
          wealth={computeWealthFacts(analysis)}
          inyeon={computeInyeonFacts(analysis, c.gender, undefined)}
          wealthYears={computeWealthYears(analysis)}
          daeunTimeline={computeDaeunTimeline(analysis)}
          prescription={computePrescription(analysis)}
          // dev 확인용 더미 — 운영은 ownerId 있을 때만 값이 온다
          reviewOrderId="00000000-0000-0000-0000-000000000000"
        />
      </div>
    </div>
  );
}
