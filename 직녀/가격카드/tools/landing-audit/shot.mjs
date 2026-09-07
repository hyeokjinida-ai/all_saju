// 훑기(lazy 깨우기) 후 구간 캡처 — shoot-long 의 lazy 공백 함정을 피한다.
import { spawn } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url"), OUT = arg("out", "shot"), WIDTH = Number(arg("width", 390));
const SLICE = Number(arg("slice", 2600)), WAIT = Number(arg("wait", 12000));
const CLIP = arg("clip", "");
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((p)=>existsSync(p));
const UA = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9200 + Math.floor(Math.random()*90);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars","--mute-audio",`--remote-debugging-port=${PORT}`,`--user-agent=${UA}`,`--window-size=${WIDTH},844`,"about:blank"], { stdio:"ignore" });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){ for(let i=0;i<80;i++){ try{ const j=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{} await sleep(250);} throw new Error("포트"); }
function cdp(ws){ let id=0; const w=new Map(); ws.addEventListener("message",(ev)=>{ const m=JSON.parse(ev.data); if(m.id&&w.has(m.id)){const {resolve,reject}=w.get(m.id); w.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result);} }); return (method,params={},sessionId)=>new Promise((resolve,reject)=>{ const n=++id; w.set(n,{resolve,reject}); ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})})); }); }
const main = async () => {
  const ws = new WebSocket(await wsUrl());
  await new Promise(r=>ws.addEventListener("open", r, { once:true }));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url:"about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten:true });
  const call = (m,p={}) => send(m,p,sessionId);
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width:WIDTH, height:844, deviceScaleFactor:2, mobile:true, screenWidth:WIDTH, screenHeight:844 });
  await call("Page.navigate", { url: URL_ });
  await sleep(WAIT);
  for (let pass=0; pass<2; pass++) {
    const h = (await call("Runtime.evaluate", { expression:"document.documentElement.scrollHeight", returnByValue:true })).result.value;
    for (let y=0; y<h+844; y+=560) { await call("Runtime.evaluate", { expression:`window.scrollTo(0,${y})` }); await sleep(150); }
    await sleep(800);
  }
  await call("Runtime.evaluate", { expression:"window.scrollTo(0,0)" }); await sleep(600);
  const H = (await call("Runtime.evaluate", { expression:"document.documentElement.scrollHeight", returnByValue:true })).result.value;
  console.log(`실측 ${WIDTH} x ${H}px`);
  mkdirSync(path.dirname(path.resolve(OUT)), { recursive:true });
  const shoot = async (y, h, name) => {
    const { data } = await call("Page.captureScreenshot", { format:"png", captureBeyondViewport:true, clip:{ x:0, y, width:WIDTH, height:h, scale:1 } });
    writeFileSync(name, Buffer.from(data, "base64")); console.log("  " + name + `  (y ${y} ~ ${y+h})`);
  };
  if (CLIP) { const [y,h] = CLIP.split(",").map(Number); await shoot(y, h, `${OUT}.png`); }
  else { let i=1; for (let y=0; y<H; y+=SLICE) await shoot(y, Math.min(SLICE, H-y), `${OUT}-${i++}.png`); }
  ws.close(); chrome.kill();
};
main().catch((e)=>{ console.error(e); chrome.kill(); process.exit(1); });
