// 임의 JS 를 폰 뷰포트에서 실행하고 결과를 찍는 얇은 프로브.
// 사용: node probe.mjs --url <url> --js "<expr>" [--width 390] [--wait 9000] [--scroll 1]
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url"); const WIDTH = Number(arg("width", 390)); const HEIGHT = Number(arg("height", 844));
const WAIT = Number(arg("wait", 9000)); const SCROLL = arg("scroll", "0") === "1";
const JSFILE = arg("jsfile"); const JS = JSFILE ? readFileSync(JSFILE, "utf8") : arg("js", "document.title");
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((p)=>existsSync(p));
const UA = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9750 + Math.floor(Math.random()*200);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars","--mute-audio",`--remote-debugging-port=${PORT}`,`--user-agent=${UA}`,`--window-size=${WIDTH},${HEIGHT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r)=>setTimeout(r,ms));
async function wsUrl(){ for(let i=0;i<80;i++){ try{ const j=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{} await sleep(250);} throw new Error("포트 안 열림"); }
function cdp(ws){ let id=0; const w=new Map(); ws.addEventListener("message",(ev)=>{ const m=JSON.parse(ev.data); if(m.id&&w.has(m.id)){ const {resolve,reject}=w.get(m.id); w.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result);} }); return (method,params={},sessionId)=>new Promise((resolve,reject)=>{ const n=++id; w.set(n,{resolve,reject}); ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})})); }); }
const main = async () => {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r)=>ws.addEventListener("open", r, { once:true }));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m,p={}) => send(m,p,sessionId);
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true, screenWidth: WIDTH, screenHeight: HEIGHT });
  await call("Page.navigate", { url: URL_ });
  await sleep(WAIT);
  if (SCROLL) {
    const h = (await call("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value;
    for (let y=0; y<h+HEIGHT; y+=Math.floor(HEIGHT*0.7)) { await call("Runtime.evaluate", { expression: `window.scrollTo(0,${y})` }); await sleep(130); }
    await call("Runtime.evaluate", { expression: "window.scrollTo(0,0)" }); await sleep(500);
  }
  const { result, exceptionDetails } = await call("Runtime.evaluate", { expression: JS, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) console.error("EXC", JSON.stringify(exceptionDetails).slice(0,800));
  console.log(typeof result.value === "string" ? result.value : JSON.stringify(result.value, null, 1));
  ws.close(); chrome.kill();
};
main().catch((e)=>{ console.error(e); chrome.kill(); process.exit(1); });
