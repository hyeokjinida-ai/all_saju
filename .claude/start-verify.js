// 검증 전용 서버 — 포트 3100, 산출물은 .next-verify.
//
// 왜 있나: 이 저장소에서 다른 작업이 dev 서버(3000, .next)를 띄워 둔 채로
// 화면 검증을 해야 할 때가 있다. 같은 .next 를 공유하면 서로 덮어써서 상대가 500 으로
// 죽는다(실측 이력). 포트와 산출물 경로를 둘 다 갈라 두면 서로 모른 채로 돌아간다.
//
// 쓰는 법: `NEXT_DIST_DIR=.next-verify pnpm build` 로 먼저 굽고, 이 파일을 실행.
const { spawn } = require("node:child_process");
const path = require("node:path");

const next = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "--port", "3100"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: ".next-verify" },
  cwd: path.join(__dirname, ".."),
});
child.on("exit", (code) => process.exit(code ?? 0));
