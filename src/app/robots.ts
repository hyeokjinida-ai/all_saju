import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// 검색엔진 크롤링 규칙 — 공개 페이지는 허용, 개인/결제/관리 경로는 색인 제외
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/mypage", "/checkout", "/api", "/auth", "/admin"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
