// 산군 결과지 조판 미리보기 — **개발 전용**.
// 실물 결과지가 DB에 없어도(주문 1건·결과 0건) 조판을 눈으로 확인해야 해서,
// sample-results.ts 가 만든 샘플(md) + 명식 캐시(json)를 그대로 SangunResult 에 흘린다.
// 실제 결제 파이프라인과 같은 부품(buildResultView·computeWealthFacts·computeInyeonFacts)만 쓴다 —
// 여기서만 다른 계산을 쓰면 미리보기가 거짓말이 된다.
//
// ※ 이 미리보기에만 보라색 사이트 헤더·푸터가 뜬다. 실제 결과지(/results/…)는 ChromeGate 의
//   bare 목록에 들어 있어 크롬이 아예 안 붙는다 — 여기 보이는 보라는 쫓아갈 버그가 아니다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { notFound } from "next/navigation";
import { SangunResult } from "@/components/saju/SangunResult";
import { buildResultView } from "@/lib/saju/result-view";
import {
  computeInyeonFacts,
  computeWealthFacts,
  ganjiToMyeongsik,
  type SajuAnalysisResponse,
} from "@/lib/saju/saju-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "산군 결과지 미리보기 (dev)" };

export default async function DevSangunResultPage() {
  // 프로덕션 번들에도 라우트는 실리지만 즉시 404 — 배포에서 샘플이 보이면 안 된다.
  if (process.env.NODE_ENV !== "development") notFound();

  const mdPath = path.join(os.tmpdir(), "sample-sangun-sinjeom-gpt4omini.md");
  const anPath = path.join(os.tmpdir(), "analysis-sangun-sinjeom.json");
  if (!fs.existsSync(mdPath) || !fs.existsSync(anPath)) {
    return (
      <p style={{ padding: 40, color: "#fff" }}>
        샘플이 없습니다 — 먼저 <code>npx tsx scripts/sample-results.ts</code> 를 돌리세요.
      </p>
    );
  }

  const markdown = fs.readFileSync(mdPath, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "");
  const analysis = JSON.parse(fs.readFileSync(anPath, "utf8")) as SajuAnalysisResponse;
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) notFound();

  // sample-results.ts 의 케이스(지수 · 1993-05-15 14:30 · 여성)와 같은 값 — 다르면 명식이 어긋난다
  const view = buildResultView({
    myeongsik,
    rawAnalysis: analysis,
    name: "지수",
    birthDate: "1993-05-15",
    birthTime: "14:30",
    timeUnknown: false,
    gender: "female",
    calendar: "solar",
    concerns: ["올해 이직해도 될까요"],
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
          name="지수"
          wealth={computeWealthFacts(analysis)}
          inyeon={computeInyeonFacts(analysis, "female", undefined)}
        />
      </div>
    </div>
  );
}
