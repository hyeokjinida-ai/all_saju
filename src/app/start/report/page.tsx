import type { Metadata } from "next";
import ProductDetailPage from "@/app/products/[slug]/page";

export const metadata: Metadata = {
  title: "사주 바로 풀이",
  description: "생년월일을 입력하고 나의 사주 미리보기를 확인하세요. 전체 풀이의 구성과 가격을 보고 선택할 수 있어요.",
  robots: { index: false, follow: false },
};

type EntryParams = { c?: string; demo?: string };

export default async function DirectReportPage({ searchParams }: { searchParams: Promise<EntryParams> }) {
  const incoming = await searchParams;
  return ProductDetailPage({
    params: Promise.resolve({ slug: "sangun-sinjeom" }),
    searchParams: Promise.resolve({ c: incoming.c, demo: incoming.demo, view: "report" }),
  });
}
