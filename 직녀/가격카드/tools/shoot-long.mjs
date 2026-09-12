// 긴 페이지(결과지)를 폰 폭으로 통째 찍는다 — CDP 직결.
//
// 왜 따로 만들었나: shoot-url.ps1 은 --window-size 높이만큼만 찍어서 16,000px 에서 잘린다.
// 결과지는 13,000자 + 카드라 그보다 길다(2026-08-24 실측: 은비 결과지가 16,000 을 넘김).
// CDP 의 captureBeyondViewport + clip 을 쓰면 뷰포트보다 긴 구간도 정확히 잘라 찍는다.
//
// 사용:
//   node 직녀/가격카드/tools/shoot-long.mjs --url "http://localhost:3000/..." --out out/은비 --width 448
//   옵션: --slice 5000 (구간 높이·기본 5000, 0이면 통짜 한 장) · --wait 9000 · --scale 1
//         --clip 3200,1400 (특정 구간만: y,높이)
// 출력: <out>.png (통짜) 또는 <out>-1.png, <out>-2.png … (구간)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_ = arg("url");
const OUT = arg("out", "shot");
const WIDTH = Number(arg("width", 448));
const SLICE = Number(arg("slice", 5000));
const WAIT = Number(arg("wait", 9000));
const SCALE = Number(arg("scale", 1));
const CLIP = arg("clip", "");
if (!URL_) { console.error("--url 이 필요하다"); process.exit(1); }

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));
if (!CHROME) { console.error("크롬을 못 찾았다"); process.exit(1); }

// 사주 API 가 UA 에 "headless" 가 들어가면 막는다 — 폰 크롬으로 위장(shoot-url.ps1 과 같은 값).
const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9300 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--mute-audio", "--autoplay-policy=no-user-gesture-required",
  `--remote-debugging-port=${PORT}`, `--user-agent=${UA}`,
  `--window-size=${WIDTH},900`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* 아직 안 떴다 */ }
    await sleep(250);
  }
  throw new Error("크롬 디버깅 포트가 안 열렸다");
}

function cdp(ws) {
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { resolve, reject } = waiting.get(m.id);
      waiting.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
}

const main = async () => {
  const url = await wsUrl();
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws);

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p = {}) => send(m, p, sessionId);

  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width: WIDTH, height: 900, deviceScaleFactor: SCALE, mobile: true,
  });
  await call("Page.navigate", { url: URL_ });
  await sleep(WAIT);

  const metrics = await call("Page.getLayoutMetrics");
  const full = Math.ceil(metrics.cssContentSize?.height ?? metrics.contentSize.height);
  console.log(`페이지 실측: ${WIDTH} x ${full}px`);

  mkdirSync(dirname(OUT) || ".", { recursive: true });
  const shot = async (y, h, file) => {
    const { data } = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y, width: WIDTH, height: h, scale: SCALE },
    });
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`  ${file}  (y ${y} ~ ${y + h})`);
  };

  if (CLIP) {
    const [y, h] = CLIP.split(",").map(Number);
    await shot(y, h, `${OUT}.png`);
  } else if (!SLICE || full <= SLICE) {
    await shot(0, full, `${OUT}.png`);
  } else {
    let i = 0;
    for (let y = 0; y < full; y += SLICE) {
      i += 1;
      await shot(y, Math.min(SLICE, full - y), `${OUT}-${i}.png`);
    }
  }

  ws.close();
  chrome.kill();
};

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
