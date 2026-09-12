import type { Metadata } from "next";
import { AnalyzingScreen } from "@/components/saju/AnalyzingScreen";
import { worldOfSlug } from "@/lib/world";

export const metadata: Metadata = { title: "분석중 미리보기", robots: { index: false } };

// 디자인 확인용 — ⑧ 결제완료·분석중 대기화면 미리보기.
// `?slug=sangun-sinjeom` / `inyeon-saju` / `reunion-saju` 로 상품별 판을 본다.
// 결제 없이 네 판(기본 포함)을 다 볼 수 있어야 눈검수가 결제에 안 묶인다.
// 상품 slug 를 그대로 받는 이유: 운영이 쓰는 판정(worldOfSlug)을 **똑같이** 태워야
// 미리보기와 실제 화면이 갈라지지 않는다. 번들 slug 를 넣어도 그대로 재현된다.
export default async function AnalyzingDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const sp = await searchParams;
  return <AnalyzingScreen variant="paid" world={worldOfSlug(sp.slug)} />;
}
