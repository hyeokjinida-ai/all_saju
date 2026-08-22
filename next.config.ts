import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // 빌드/실행 산출물 경로. 같은 저장소에서 dev 서버와 build 가 동시에 돌면 .next 를 서로
  // 덮어써 dev 가 500 으로 죽는다(실측 이력 있음). 다른 작업이 dev 를 띄워 둔 상태에서
  // 검증 빌드를 돌려야 할 때 `NEXT_DIST_DIR=.next-verify` 로 격리한다. 평소엔 .next 그대로.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default config;
