import { notFound } from "next/navigation";
import { SajuPaidReport } from "@/components/saju/SajuPaidReport";
import { buildResultView } from "@/lib/saju/result-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "보고서 결과지 조판 확인 (dev)", robots: { index: false, follow: false } };

export default function DevReportResultPage() {
  // Synthetic layout fixture only. This page cannot expose paid customer results.
  if (process.env.NODE_ENV !== "development") notFound();
  const view = buildResultView({
    myeongsik: { year: { cheongan: "갑", jiji: "술" }, month: { cheongan: "기", jiji: "사" }, day: { cheongan: "무", jiji: "오" }, hour: null },
    name: "조판 확인용", birthDate: "1994-06-01", birthTime: null, timeUnknown: true,
    gender: "male", calendar: "solar", concerns: [], showScores: false, showDaeun: false,
  });
  return <main style={{ background: "#f8f7f1", color: "#192b3c", padding: "24px 16px", maxWidth: 680, margin: "0 auto" }}>
    <p style={{ padding: 16, background: "#fff0d7", fontSize: 14 }}>개발용 조판 예시입니다. 아래 본문은 실제 고객 결과나 개인 사주 풀이가 아닌 화면 검증용 문장입니다.</p>
    <SajuPaidReport view={view} displayName="사주 전체 풀이 · 개발용 예시" name="조판 확인용" recordedAt={null}
      markdown={"## 1. 나의 성향\n\n이 문장은 유료 본문의 크기와 줄 간격을 확인하기 위한 예시입니다. 저장된 실제 본문은 내용 변경 없이 이 자리에 표시됩니다.\n\n## 2. 일과 생활\n\n긴 글에서도 목차로 원하는 부분을 바로 찾을 수 있습니다.\n\n- 입력 정보에 따른 계산값은 표로 표시합니다.\n- 생성된 전체 풀이 본문은 순서대로 읽을 수 있습니다.\n\n## 3. 살펴볼 흐름\n\n| 항목 | 설명 |\n| --- | --- |\n| 본문 | 글 중심으로 표시 |\n| 삽화 | 표시하지 않음 |\n\n![표시되면 안 되는 검증 이미지](/not-requested-report-image.png)"} />
  </main>;
}
