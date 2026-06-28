import type { Metadata } from "next";
import { ResultScroll } from "@/components/saju/ResultScroll";
import { DEMO_RESULT_VIEW } from "@/lib/saju/result-view";

export const metadata: Metadata = { title: "결과지 미리보기", robots: { index: false } };

// 디자인 확인용 — 핸드오프 샘플(己丙壬甲 / 火 추진력형)로 결과지 화면을 데이터 없이 미리 본다.
export default function ResultDemoPage() {
  return <ResultScroll view={DEMO_RESULT_VIEW} />;
}
