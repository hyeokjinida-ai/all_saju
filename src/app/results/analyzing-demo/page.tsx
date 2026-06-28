import type { Metadata } from "next";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";

export const metadata: Metadata = { title: "분석중 미리보기", robots: { index: false } };

// 디자인 확인용 — ⑧ 결제완료·분석중 대기화면 미리보기.
export default function AnalyzingDemoPage() {
  return <AnalyzingScreen />;
}
