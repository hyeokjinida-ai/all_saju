// 직녀 결과지 조판 미리보기 — **개발 전용**.
// 산군(dev/sangun-result)과 같은 방식: 결제 없이 조판을 눈으로 확인하는 문.
// 실제 결제 경로와 **같은 부품**(buildResultView·computeInyeonFacts·buildChartRows)만 쓴다 —
// 여기서만 다른 계산을 쓰면 미리보기가 거짓말이 된다.
//
// 샘플 md 가 없어도 조판은 봐야 하므로, 없으면 짧은 더미 본문으로 채워 화면을 세운다
// (달력·명식은 실제 계산이라 더미가 아니다 — 조판 확인에는 그게 핵심이다).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { notFound } from "next/navigation";
import { JiknyeoResult } from "@/components/saju/JiknyeoResult";
import { buildResultView } from "@/lib/saju/result-view";
import { buildChartRows } from "@/lib/saju/teaser";
import { computeInyeonFacts, ganjiToMyeongsik, type SajuAnalysisResponse } from "@/lib/saju/saju-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "직녀 결과지 미리보기 (dev)" };

const FALLBACK_MD = `### 내 인연 그릇
인연 그릇 72점. 먼저 다가가지 않아도 사람이 붙는 자리인데, 확신이 설 때까지 마음을 안 여는 쪽이에요.

### 만나는 달 세 개
가장 가까운 달부터 순서대로 짚어드려요. 각 달마다 준비가 다릅니다.

### 내게 올 사람
말수가 적고 약속을 먼저 정하는 사람이에요. 세 번째 만남부터 다르게 보이기 시작해요.`;

export default async function DevJiknyeoResultPage({
  searchParams,
}: {
  searchParams: Promise<{ marriage?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { marriage } = await searchParams;

  // sample-results.ts 가 tmp 에 남긴 것을 **파일명 규칙으로 찾는다**.
  // 규칙: 명식 `analysis-<생일>-<성별>-<시>.json` · 본문 `sample-<slug>-<이름>-<모델태그>.md`
  // 모델 태그가 바뀔 때마다 파일명이 달라지므로 하드코딩하지 않고 최신 것을 집는다.
  const tmp = os.tmpdir();
  const anPath = path.join(tmp, "analysis-19930515-female-14.json"); // 지수 · 1993-05-15 14:30 여
  const pick = (prefix: string) => {
    const hits = fs
      .readdirSync(tmp)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
      .map((f) => ({ f, t: fs.statSync(path.join(tmp, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return hits[0] ? path.join(tmp, hits[0].f) : null;
  };
  const slug = marriage === "1" ? "marriage-saju" : "inyeon-saju";
  const found = pick(`sample-${slug}-`);
  const mdPath = found ?? "";
  if (!fs.existsSync(anPath)) {
    return (
      <p style={{ padding: 40, color: "#fff" }}>
        명식 캐시가 없습니다 — <code>npx tsx scripts/sample-results.ts</code> 를 한 번 돌리세요.
      </p>
    );
  }

  const analysis = JSON.parse(fs.readFileSync(anPath, "utf8")) as SajuAnalysisResponse;
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) notFound();

  const markdown = mdPath && fs.existsSync(mdPath)
    ? fs.readFileSync(mdPath, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "")
    : FALLBACK_MD;

  const view = buildResultView({
    myeongsik,
    rawAnalysis: analysis,
    name: "지수",
    birthDate: "1993-05-15",
    birthTime: "14:30",
    timeUnknown: false,
    gender: "female",
    calendar: "solar",
    concerns: ["올해는 진짜 만나고 싶어요"],
    showScores: true,
    showDaeun: false,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        // 실제 결과지의 직녀 바탕과 같은 값 — 다르면 미리보기가 거짓말이 된다
        background:
          "radial-gradient(ellipse 120% 50% at 50% 0%,#241C46 0%,rgba(36,28,70,0) 58%)," +
          "linear-gradient(180deg,#0D0B1C 0%,#12112A 46%,#0B0F1A 100%)",
        padding: "30px 12px 64px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <JiknyeoResult
          view={view}
          markdown={markdown}
          name="지수"
          inyeon={computeInyeonFacts(analysis, "female", "male")}
          chartRows={buildChartRows(analysis)}
          isMarriage={marriage === "1"}
        />
      </div>
    </div>
  );
}
