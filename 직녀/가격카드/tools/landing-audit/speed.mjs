// 회선 제한 하에서 첫 화면이 서는 시간 — 광고 트래픽 기준 지표.
// LCP / FCP / DOMContentLoaded / 첫 5초·10초까지 받은 바이트.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url");
const PROFILE = arg("net", "4g"); // 4g | slow4g | none
const WIDTH = 390, HEIGHT = 844;
const PROFILES = {
  "4g":     { downloadThroughput: 4000 * 1024 / 8, uploadThroughput: 3000 * 1024 / 8, latency: 70 },
  "slow4g": { downloadThroughput: 1600 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
  "3g":     { downloadThroughput: 780 * 1024 / 8,  uploadThroughput: 330 * 1024 / 8, latency: 300 },
  "none":   null,
};
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((p)=>existsSync(p));
const UA = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9900 + Math.floor(Math.random()*90);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars","--mute-audio",`--remote-debugging-port=${PORT}`,`--user-agent=${UA}`,`--window-size=${WIDTH},${HEIGHT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){ for(let i=0;i<80;i++){ try{ const j=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{} await sleep(250);} throw new Error("포트"); }
function cdp(ws,on){ let id=0; const w=new Map(); ws.addEventListener("message",(ev)=>{ const m=JSON.parse(ev.data); if(m.id&&w.has(m.id)){const {resolve,reject}=w.get(m.id); w.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result);} else if(m.method&&on) on(m); }); return (method,params={},sessionId)=>new Promise((resolve,reject)=>{ const n=++id; w.set(n,{resolve,reject}); ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})})); }); }
const main = async () => {
  const ws = new WebSocket(await wsUrl());
  await new Promise(r=>ws.addEventListener("open", r, { once:true }));
  let bytes = 0; const marks = [];
  const t0ref = { t: 0 };
  const send = cdp(ws, (m)=>{ if(m.method==="Network.loadingFinished"){ bytes += m.params.encodedDataLength||0; } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m,p={}) => send(m,p,sessionId);
  await call("Page.enable"); await call("Network.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true, screenWidth: WIDTH, screenHeight: HEIGHT });
  if (PROFILES[PROFILE]) await call("Network.emulateNetworkConditions", { offline: false, ...PROFILES[PROFILE] });
  await call("Emulation.setCPUThrottlingRate", { rate: Number(arg("cpu", 4)) });
  const t0 = Date.now(); t0ref.t = t0;
  await call("Page.navigate", { url: URL_ });
  const snaps = [];
  for (const at of [2000, 4000, 6000, 8000, 12000, 20000]) {
    while (Date.now() - t0 < at) await sleep(120);
    const r = await call("Runtime.evaluate", { expression: `JSON.stringify({
      fcp: (performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0,
      dcl: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      load: performance.timing.loadEventEnd>0 ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
      txt: (document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,80),
      vids: [...document.querySelectorAll('video')].map(v=>({p:v.paused, rs:v.readyState})),
      imgOk: [...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth>0).length,
      imgAll: document.querySelectorAll('img').length })`, returnByValue: true });
    let v = {}; try { v = JSON.parse(r.result.value); } catch {}
    snaps.push({ at, kb: +(bytes/1024).toFixed(0), ...v });
  }
  console.log(`\n== ${URL_}\n== 회선 ${PROFILE} · CPU ${arg("cpu",4)}x 감속`);
  for (const s of snaps) console.log(`  ${String(s.at/1000).padStart(4)}초  ${String(s.kb).padStart(6)}KB  FCP=${Math.round(s.fcp)}ms DCL=${s.dcl}ms load=${s.load}ms  이미지 ${s.imgOk}/${s.imgAll}  영상 ${JSON.stringify(s.vids)}  | ${s.txt}`);
  ws.close(); chrome.kill();
};
main().catch((e)=>{ console.error(e); chrome.kill(); process.exit(1); });
