import type { Metadata } from "next";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";

export const metadata: Metadata = { title: "분석중 미리보기", robots: { index: false } };

// 디자인 확인용 — ⑧ 결제완료·분석중 대기화면 미리보기.
// `?product=inyeon` 으로 직녀판(베틀 앰비언트 영상 배경), `?theme=sangun` 으로 산군판을 본다.
export default async function AnalyzingDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; theme?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AnalyzingScreen
      product={sp.product === "inyeon" ? "inyeon" : undefined}
      theme={sp.theme === "sangun" ? "sangun" : undefined}
    />
  );
}
