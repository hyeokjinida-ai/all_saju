import type { Metadata } from "next";
import { FunnelFlow } from "@/components/funnel/FunnelFlow";

export const metadata: Metadata = { title: "무료 사주 분석", robots: { index: false } };

export default function FunnelPage() {
  return <FunnelFlow />;
}
