// 살아있는 페이지를 재는 도구 — headless 크롬 + CDP. (2026-08-23)
// usage: node probe.mjs <url> <width> "<js expression returning JSON-able>"
// 왜 만드나: 화면이 깨졌을 때 "보기 나쁘다"로 고치면 방향이 없어 헛돈다. 숫자로 재서 그것만 고친다.
//
// ⚠⚠ 이 도구가 있어야 하는 이유 (2026-08-23 실측으로 밟은 함정):
//   `chrome --headless --screenshot --window-size=390,900` 은 **390 으로 안 그린다.**
//   헤드리스 크롬 창에는 너비 하한(~458px)이 있어 레이아웃은 458 로 잡히고 이미지만 390 폭으로 잘린다.
//   → 멀쩡한 화면이 "오른쪽이 잘린" 것처럼 보인다. 그걸 보고 고치면 없는 결함을 쫓게 된다.
//   반드시 Emulation.setDeviceMetricsOverride 로 뷰포트를 못박고 Page.captureScreenshot 으로 찍을 것.
//   측정도 그림도 **같은 세션에서** 나와야 서로를 믿을 수 있다.
// SHOT=<경로> SHOT_H=<높이> 로 그림까지 같이 받는다.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const [url, widthArg, expr] = process.argv.slice(2);
const width = Number(widthArg || 390);
const PORT = 9333;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--window-size=${width},900`,
  "--user-agent=Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  "about:blank",
], { stdio: "ignore" });

let targets;
for (let i = 0; i < 40; i++) {
  await sleep(250);
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets?.length) break; } catch {}
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
// 뷰포트는 --window-size 로 안 잡힌다(헤드리스에서 무시되는 경우가 있다) — CDP 로 못박는다.
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url });
await sleep(4000); // 폰트·이미지까지 앉을 시간
const r = await send("Runtime.evaluate", { expression: `JSON.stringify((()=>{${expr}})())`, returnByValue: true });
console.log(r.result?.result?.value ?? JSON.stringify(r.result));

// 같은 세션에서 그림도 찍는다 — 측정과 픽셀이 다른 렌더에서 나오면 서로를 못 믿는다(실측으로 겪음).
const shot = process.env.SHOT;
if (shot) {
  const full = await send("Page.getLayoutMetrics");
  const h = Number(process.env.SHOT_H) || Math.min(Math.ceil(full.result.cssContentSize.height), 4000);
  await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(700);
  const png = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(shot, Buffer.from(png.result.data, "base64"));
  console.error(`shot -> ${shot} (${width}x${h} @2x)`);
}
ws.close();
chrome.kill();
process.exit(0);
