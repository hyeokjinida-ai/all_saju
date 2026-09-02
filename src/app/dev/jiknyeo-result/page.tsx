// 직녀 결과지 조판 미리보기 — **개발 전용**.
// 산군(dev/sangun-result)과 같은 방식: 결제 없이 조판을 눈으로 확인하는 문.
// 실제 결제 경로와 **같은 부품**(buildResultView·computeInyeonFacts·buildChartRows)만 쓴다 —
// 여기서만 다른 계산을 쓰면 미리보기가 거짓말이 된다.
//
// 샘플 md 가 없어도 조판은 봐야 하므로, 없으면 짧은 더미 본문으로 채워 화면을 세운다
// (달력·명식은 실제 계산이라 더미가 아니다 — 조판 확인에는 그게 핵심이다).
//
// ⚠ 손님 스위치(?who=) — 2026-08-24 추가. 예전에는 명식이 지수로 **고정**인데 본문만 tmp 의
//   최신 md 를 집어 왔다. 서윤·은비 샘플을 뽑아 두면 화면이 "지수 명식 + 은비 본문"이 되어
//   달력·카드·본문이 서로 다른 사람을 가리킨다. 명식·본문·이름을 한 세트로 묶어 고른다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { notFound } from "next/navigation";
import { JiknyeoResult } from "@/components/saju/JiknyeoResult";
import { buildResultView } from "@/lib/saju/result-view";
import { buildChartRows } from "@/lib/saju/teaser";
import { computeInyeonFacts, ganjiToMyeongsik, type SajuAnalysisResponse } from "@/lib/saju/saju-api";
import { REUNION_CHAPTER_BADGES } from "@/lib/saju/prompt";

export const dynamic = "force-dynamic";
export const metadata = { title: "직녀 결과지 미리보기 (dev)" };

const FALLBACK_MD = `### 내 인연 그릇
인연 그릇 72점. 먼저 다가가지 않아도 사람이 붙는 자리인데, 확신이 설 때까지 마음을 안 여는 쪽이에요.

### 만나는 달 세 개
가장 가까운 달부터 순서대로 짚어드려요. 각 달마다 준비가 다릅니다.

### 내게 올 사람
말수가 적고 약속을 먼저 정하는 사람이에요. 세 번째 만남부터 다르게 보이기 시작해요.

### 걸어온 길
2019년부터 자리가 한 번 크게 바뀌었어요. 그 무렵 사람보다 일이 먼저였을 거예요.
2023년에는 마음이 한 발 늦어 놓친 자리가 있었고요. 지나갔다고 없던 일이 되진 않아요.`;

/** 재회 더미 본문 — **장 제목만** 실제 목차(prompt.ts reunion-saju outline)와 1:1 로 맞춘다.
 *  조판 확인용이라 본문은 짧아도 되지만, 제목이 다르면 장 사이 부품·배지 자리가 거짓말이 된다. */
const FALLBACK_MD_REUNION = `### 두 사람의 별
저도 일 년에 하루, 강 건너를 바라보는 놈입니다. 기다리는 마음은 압니다. 그 사람 마음은, 장부를 열면 보입니다.

### 강이 갈라진 날
그날 강이 갈라진 건 모자라서가 아닙니다. 그 무렵 흐름이 같이 꺾여 있었습니다.

### 그 사람의 지금
연락을 미룰 때 하는 행동, 마음이 식었을 때 하는 행동으로만 적습니다.

### 아직 이어져 있는 것
재회 가능성은 보통입니다. 왜 그 등급이 나왔는지 근거부터 폅니다.

### 다리가 놓이는 달
다시 이어지는 달을 하나씩 별도 단락으로 적습니다.

### 연락의 달
연락해도 되는 달과 먼저 연락하면 안 되는 달을 갈라 적습니다.

### 하면 안 되는 것
매달릴 때 되풀이되는 행동 셋과, 대신 할 행동입니다.

### 다시 보고 싶은 사람으로
내 쪽에서 바꾸는 것 셋입니다.

### 강을 건너지 않는다면
그 사람이 아니어도 되는 이유와, 다음에 올 사람입니다.

### 견우의 배웅
이번 주에 할 것 셋으로 시작해 편지로 닫습니다.`;

/** 샘플 손님 — 명식 캐시·본문·생일을 한 세트로 묶는다(따로 고르면 화면이 거짓말을 한다). */
const WHO: Record<
  string,
  { name: string; cache: string; birthDate: string; birthTime: string; suffix?: string; exclude?: string }
> = {
  지수: {
    name: "지수",
    cache: "analysis-19930515-female-14.json",
    birthDate: "1993-05-15",
    birthTime: "14:30",
    exclude: "-연애중", // 같은 이름의 「연애중」 판이 최신이면 그쪽이 잡혀 버린다
  },
  "지수-연애중": {
    name: "지수",
    cache: "analysis-19930515-female-14.json",
    birthDate: "1993-05-15",
    birthTime: "14:30",
    suffix: "-연애중",
  },
  서윤: { name: "서윤", cache: "analysis-19940606-female-20.json", birthDate: "1994-06-06", birthTime: "20:10" },
  은비: { name: "은비", cache: "analysis-19900524-female-17.json", birthDate: "1990-05-24", birthTime: "17:00" },
};

export default async function DevJiknyeoResultPage({
  searchParams,
}: {
  searchParams: Promise<{ marriage?: string; who?: string; reunion?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { marriage, who, reunion } = await searchParams;
  // ?reunion=1 — 견우(재회) 조판. 같은 부품에 직녀 얼굴만 꺼지는지 눈으로 확인하는 문이다.
  const isReunion = reunion === "1";
  const person = WHO[who ?? (isReunion ? "서윤" : "지수")] ?? WHO["지수"];

  // sample-results.ts 가 tmp 에 남긴 것을 **파일명 규칙으로 찾는다**.
  // 규칙: 명식 `analysis-<생일>-<성별>-<시>.json` · 본문 `sample-<slug>-<이름>-<모델태그>.md`
  // 모델 태그가 바뀔 때마다 파일명이 달라지므로 하드코딩하지 않고 최신 것을 집는다.
  const tmp = os.tmpdir();
  const anPath = path.join(tmp, person.cache);
  const pick = (prefix: string, exclude?: string) => {
    const hits = fs
      .readdirSync(tmp)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".md") && (!exclude || !f.includes(exclude)))
      .map((f) => ({ f, t: fs.statSync(path.join(tmp, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return hits[0] ? path.join(tmp, hits[0].f) : null;
  };
  const slug = isReunion ? "reunion-saju" : marriage === "1" ? "marriage-saju" : "inyeon-saju";
  const found = pick(`sample-${slug}-${person.name}${person.suffix ?? ""}-`, person.exclude);
  const mdPath = found ?? "";
  if (!fs.existsSync(anPath)) {
    return (
      <p style={{ padding: 40, color: "#fff" }}>
        명식 캐시가 없습니다({person.cache}) — <code>npx tsx scripts/sample-results.ts</code> 를 한 번 돌리세요.
      </p>
    );
  }

  const analysis = JSON.parse(fs.readFileSync(anPath, "utf8")) as SajuAnalysisResponse;
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) notFound();

  const markdown = mdPath && fs.existsSync(mdPath)
    ? fs.readFileSync(mdPath, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "")
    : isReunion
      ? FALLBACK_MD_REUNION
      : FALLBACK_MD;

  const view = buildResultView({
    myeongsik,
    rawAnalysis: analysis,
    name: person.name,
    birthDate: person.birthDate,
    birthTime: person.birthTime,
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
          "radial-gradient(ellipse 120% 42% at 50% 0%,rgba(36,28,70,.10) 0%,rgba(36,28,70,0) 60%)," +
          "linear-gradient(180deg,#F7F3EA 0%,#FBF8F1 40%,#F4EFE4 100%)",
        color: "#2A2434",
        padding: "30px 12px 64px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <JiknyeoResult
          view={view}
          markdown={markdown}
          name={person.name}
          inyeon={computeInyeonFacts(analysis, "female", "male")}
          chartRows={buildChartRows(analysis)}
          isMarriage={marriage === "1"}
          isReunion={isReunion}
          badges={isReunion ? REUNION_CHAPTER_BADGES : undefined}
          // dev 확인용 더미 — 운영은 ownerId 있을 때만 값이 온다
          reviewOrderId="00000000-0000-0000-0000-000000000000"
        />
      </div>
    </div>
  );
}
