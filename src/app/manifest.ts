// PWA 매니페스트 — 안드로이드 「홈 화면에 추가」.
//
// 왜 필요한가: 유입 100% 가 메타 → **카톡/인스타 인앱 브라우저**다. 인앱은 북마크가 없어서
// 손님이 다시 찾아오는 경로가 사실상 「홈 화면에 추가」뿐인데, 매니페스트가 없으면
// 안드로이드가 회색 기본 아이콘을 꽂는다. 아이콘은 命 원(먹) + 상아 바탕.
//
// Next 가 <link rel="manifest"> 를 자동으로 넣는다 — layout.tsx 는 손대지 않는다.
// 아이콘 2장은 손으로 만들지 말고 `design/brand/build_assets.py` 가 굽는다(maskable 안전영역 게이트 포함).
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    // 홈(HomeShell)이 검정이라 여기 맞춘다 — 앱 전환 애니메이션·상단바가 홈과 이어진다.
    background_color: "#0e0e10",
    theme_color: "#0e0e10",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      // maskable = OS 가 원/물방울로 잘라낸다. 마크를 지름 80% 안에 넣어 구웠다.
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
