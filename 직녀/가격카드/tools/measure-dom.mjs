// 폰 폭에서 **DOM 실측** — 픽셀 판독으로는 밤 그림과 밤 배경이 안 갈린다.
//
// 캡처 이미지를 재는 방식은 배경과 요소의 밝기·채도가 겹치면 무력하다(2026-08-25 실측:
// 컷 폭이 28%~94% 로 재질 때마다 다르게 나왔다). getBoundingClientRect 는 거짓말을 안 한다.
//
// 사용:
//   node 직녀/가격카드/tools/measure-dom.mjs --url "http://localhost:3000/..." --sel "img[src*='j2']" [--width 448]
//   여러 셀렉터는 쉼표로: --sel "img[src*='j2'],figure,[data-bubble]"
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_ = arg("url");
const SEL = arg("sel", "img");
const WIDTH = Number(arg("width", 448));
const WAIT = Number(arg("wait", 12000));
if (!URL_) { console.error("--url 이 필요하다"); process.exit(1); }

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));
const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9700 + Math.floor(Math.random() * 200);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--mute-audio",
  `--remote-debugging-port=${PORT}`, `--user-agent=${UA}`, `--window-size=${WIDTH},900`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* 대기 */ }
    await sleep(250);
  }
  throw new Error("디버깅 포트가 안 열렸다");
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
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p = {}) => send(m, p, sessionId);

  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: true });
  await call("Page.navigate", { url: URL_ });
  await sleep(WAIT);

  const expr = `(() => {
    const out = [];
    for (const sel of ${JSON.stringify(SEL)}.split(",")) {
      document.querySelectorAll(sel.trim()).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        out.push({
          sel: sel.trim(), i,
          x: Math.round(r.x), y: Math.round(window.scrollY + r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          pct: +(r.width / ${WIDTH} * 100).toFixed(1),
          ratio: +(r.width / r.height).toFixed(2),
          tag: el.tagName.toLowerCase(),
          src: (el.getAttribute("src") || "").split("/").pop() || "",
        });
      });
    }
    return JSON.stringify(out);
  })()`;
  const { result } = await call("Runtime.evaluate", { expression: expr, returnByValue: true });
  const rows = JSON.parse(result.value || "[]");
  console.log(`페이지 폭 ${WIDTH}px · ${rows.length}개 요소`);
  for (const r of rows) {
    console.log(`  ${r.tag}${r.src ? `[${r.src}]` : ""}  ${r.w}x${r.h}px · 폭비 ${r.pct}% · 종횡 ${r.ratio} · x=${r.x} y=${r.y}`);
  }
  ws.close();
  chrome.kill();
};

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
