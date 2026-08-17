import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// 검색엔진 크롤링 규칙 — 공개 페이지는 허용, 개인/결제/관리 경로는 색인 제외
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /jiknyeo 는 광고 전용 비공개 랜딩(R6)이다 — 색인되면 본 사이트와 가격·포지션이 섞인다.
      disallow: ["/mypage", "/checkout", "/api", "/auth", "/admin", "/jiknyeo"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
