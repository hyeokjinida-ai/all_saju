// 광고용 풀페이지 캡처 — headless 크롬 + CDP (2026-08-23, probe.mjs 계보)
// usage: node cap_page.mjs --url <url> --out <dir/prefix> [--w 390] [--dpr 3] [--wait 8000] [--maxh 24000] [--chunk 1200] [--draft] [--click "<selector>"] [--js "<expr>"] [--rects "<expr>"] [--y0 N --y1 N]
//   --chunk 은 조각 높이이자 **뷰포트 높이**다 — 100svh 화면(게이트·입력)은 chunk 를 영상 뷰포트(9:16=693, 4:5=487)로 맞춰 찍는다.
//
// 왜 따로 만드나 (실측으로 밟은 함정 2개):
//   1) `chrome --screenshot --window-size=448,12000` 은 16384px(3x 기준 ~5460 CSS px) 아래가 래스터되지 않는다.
//      → 텍스처 한도. 티저 캡처가 y≈17000 에서 배경만 남는 이유였다.
//   2) 창 너비 하한(~458~504px) 때문에 390 으로 안 그려진다.
//      → Emulation.setDeviceMetricsOverride 로 뷰포트를 못박는다(probe.mjs 와 같은 해법).
// 그래서 뷰포트를 390×chunk 로 고정하고 **스크롤하며 조각으로** 찍은 뒤 PIL 로 잇는다.
//   - 조각마다 fixed/sticky 요소가 반복되므로 2번째 조각부터는 visibility:hidden 으로 지운다.
//   - 첫 조각 전에 끝까지 한 번 스크롤해 lazy 이미지·useInView 연출을 전부 깨워 둔다.
// 출력: <prefix>_00.png, _01.png … + <prefix>.json(조각 높이·전체 높이·dpr). 잇기는 build_ads.py 쪽(stitch_chunks).
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFileSync } from "node:fs";

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "1";
    args[k] = v;
  }
}
const url = args.url;
const out = args.out;
const width = Number(args.w || 390);
const dpr = Number(args.dpr || 3);
const wait = Number(args.wait || 8000);
const maxH = Number(args.maxh || 24000);
const chunk = Number(args.chunk || 1200); // 1170×3600px — 1170×6000 부터 captureScreenshot 이 응답하지 않는다(실측)
if (!url || !out) { console.error("need --url and --out"); process.exit(2); }

const PORT = 9300 + Math.floor(Math.random() * 90);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--window-size=${width},900`,
  // 사주 차트 API 가 "headless" UA 를 막는다 → 모바일 크롬 UA
  "--user-agent=Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "about:blank",
], { stdio: "ignore" });

let targets;
for (let i = 0; i < 60; i++) {
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
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
if (args.draft) {
  // 산군 랜딩: 위저드 초안이 세션에 있으면 게이트·스토리를 건너뛰고 입력 스테이지로 바로 들어간다(SangunWebtoon.tsx)
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try{sessionStorage.setItem("myeongunrok:order-wizard-draft", JSON.stringify({slug:"sangun-sinjeom"}))}catch(e){}`,
  });
}
await send("Emulation.setDeviceMetricsOverride", { width, height: chunk, deviceScaleFactor: dpr, mobile: true });

// ⚠ Page.navigate 는 **간헐적으로 씹힌다**(2026-08-23 실측: 같은 명령이 어떤 회차엔 about:blank 에 머물러
//   백지 PNG + scrollHeight=뷰포트높이 가 나왔다. 조용히 실패해서 "캡처는 됐는데 내용이 없는" 결과가 된다).
//   → 이동을 확인하고, 본문이 뷰포트보다 길어질 때까지 기다린다. 안 되면 다시 navigate.
for (let attempt = 1; attempt <= 3; attempt++) {
  await send("Page.navigate", { url });
  await sleep(attempt === 1 ? wait : Math.max(wait, 8000));
  const st = await evaluate(`({href:location.href, ready:document.readyState, h:document.documentElement.scrollHeight, len:(document.body?document.body.innerText:'').length})`);
  const ok = st && !/^about:blank/.test(st.href) && (st.h > chunk + 5 || st.len > 400);
  console.error(`nav ${attempt}: ${JSON.stringify(st)?.slice(0, 160)} -> ${ok ? "ok" : "retry"}`);
  if (ok) break;
  if (attempt === 3) console.error("nav: giving up, capturing whatever is there");
}

if (args.js) {
  // 로드 후 임의 JS(예: 「건너뛰기」 눌러 생년월일 단계로) — 문자열 그대로 평가
  const r = await evaluate(args.js);
  console.error("js ->", JSON.stringify(r)?.slice(0, 200));
  await sleep(Number(args.clickwait || 2500));
}
if (args.click) {
  // 선택자 하나를 눌러 스테이지를 넘긴다(예: 게이트 입장 버튼)
  await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(args.click)}); if(el){el.click(); return 'clicked'} return 'none'})()`);
  await sleep(Number(args.clickwait || 2500));
}

// 끝까지 한 번 훑어 lazy 이미지·스크롤 진입 연출을 깨운다
await evaluate(`(async()=>{const s=(ms)=>new Promise(r=>setTimeout(r,ms)); const H=()=>document.documentElement.scrollHeight; for(let y=0;y<Math.min(H(),${maxH});y+=500){window.scrollTo(0,y); await s(60);} window.scrollTo(0,0); await s(800); return H();})()`);
await sleep(1200);

// --rects "<expr>": 잘라낼 블록의 좌표를 같이 받아 둔다(페이지 좌표, CSS px). 결과는 <prefix>.json 의 rects 에.
//   예) --rects "(()=>{const e=[...document.querySelectorAll('p')].find(x=>/작년/.test(x.textContent));const r=e.getBoundingClientRect();return {past:[r.left,r.top+scrollY,r.width,r.height]}})()"
let rects = null;
if (args.rects) {
  try { rects = await evaluate(args.rects); } catch (e) { console.error("rects failed", String(e)); }
  console.error("rects ->", JSON.stringify(rects)?.slice(0, 400));
}
const total = Math.min(Number(await evaluate(`document.documentElement.scrollHeight`)), maxH);
// --y0/--y1 (CSS px): 페이지 일부만 찍는다 — 카드 한 장을 dpr 5 로 크게 뜰 때(전체를 5배로 뜨면 11만px 짜리가 된다)
const y0 = Number(args.y0 || 0);
const y1 = Math.min(total, Number(args.y1 || total));
const parts = [];
for (let y = y0, n = 0; y < y1; y += chunk, n++) {
  const h = Math.min(chunk, y1 - y);
  if (n === 0 && y0 === 0) {
    // 첫 조각: 화면 아래쪽 fixed(하단 결제바·Next 개발 배지)만 지운다 — 폰에서는 늘 떠 있는 것이지만
    // 풀페이지 PNG 에 박히면 페이지 한가운데 박제된다. 상단 헤더(sticky/fixed top)는 첫 조각에만 남긴다.
    await evaluate(`(()=>{let c=0;const vh=window.innerHeight;for(const el of document.querySelectorAll('body *')){const p=getComputedStyle(el).position;if(p==='fixed'){const r=el.getBoundingClientRect();if(r.top>vh/2||el.tagName==='NEXTJS-PORTAL'){el.style.visibility='hidden';c++}}}for(const el of document.querySelectorAll('nextjs-portal')){el.style.display='none'}return c})()`);
  } else if (n === 1 || (n === 0 && y0 > 0)) {
    // 중간부터 찍을 때(--y0)는 첫 조각부터 지운다 — 안 그러면 sticky 헤더가 카드 머리를 덮는다(실측)
    // 2번째 조각부터 fixed/sticky 는 전부 지운다(조각마다 반복돼 이음새에 중복으로 남는다)
    await evaluate(`(()=>{let c=0;for(const el of document.querySelectorAll('body *')){const p=getComputedStyle(el).position;if(p==='fixed'||p==='sticky'){el.style.visibility='hidden';c++}}for(const el of document.querySelectorAll('nextjs-portal')){el.style.display='none'}return c})()`);
  }
  if (h !== chunk) await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: dpr, mobile: true });
  await evaluate(`(()=>{window.scrollTo(0,${y});return window.scrollY})()`);
  await sleep(450);
  const sy = Number(await evaluate(`window.scrollY`));
  const png = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  if (!png.result?.data) { console.error("capture failed", JSON.stringify(png).slice(0, 300)); break; }
  const file = `${out}_${String(n).padStart(2, "0")}.png`;
  writeFileSync(file, Buffer.from(png.result.data, "base64"));
  parts.push({ file, y, scrollY: sy, h });
  console.error(`chunk ${n}: y=${y} (scrollY=${sy}) h=${h}`);
}
writeFileSync(`${out}.json`, JSON.stringify({ url, width, dpr, total, chunk, parts, rects }, null, 1));
console.log(JSON.stringify({ total, n: parts.length, width, dpr }));
ws.close();
chrome.kill();
process.exit(0);
