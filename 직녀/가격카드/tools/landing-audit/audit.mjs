// 랜딩/티저 전수 실측기 — 폰 390 기준. CDP(getBoundingClientRect + getComputedStyle) 로만 잰다.
// 캡처 픽셀 판독 금지(밤 그림/밤 배경이 안 갈린다), 그라데이션 배경 처리 포함(투명 오탐 방지).
import { spawn } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url");
const WIDTH = Number(arg("width", 390));
const HEIGHT = Number(arg("height", 844));
const OUT = arg("out", "audit.json");
const WAIT = Number(arg("wait", 9000));
if (!URL_) { console.error("--url 필요"); process.exit(1); }

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));
const UA = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--mute-audio",
  `--remote-debugging-port=${PORT}`, `--user-agent=${UA}`, `--window-size=${WIDTH},${HEIGHT}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch {}
    await sleep(250);
  }
  throw new Error("디버깅 포트 안 열림");
}
function cdp(ws, onEvent) {
  let id = 0; const waiting = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const { resolve, reject } = waiting.get(m.id); waiting.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
    else if (m.method && onEvent) onEvent(m);
  });
  return (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const n = ++id; waiting.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const NET = [];
const main = async () => {
  const ws = new WebSocket(await wsUrl());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws, (m) => {
    if (m.method === "Network.responseReceived") {
      NET.push({ id: m.params.requestId, url: m.params.response.url, type: m.params.type, status: m.params.response.status, enc: m.params.response.encodedDataLength || 0, mime: m.params.response.mimeType });
    }
    if (m.method === "Network.loadingFinished") {
      const row = NET.find((n) => n.id === m.params.requestId);
      if (row) row.enc = m.params.encodedDataLength;
    }
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p = {}) => send(m, p, sessionId);
  await call("Page.enable"); await call("Network.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true, screenWidth: WIDTH, screenHeight: HEIGHT });
  await call("Page.navigate", { url: URL_ });
  await sleep(WAIT);

  // 스크롤 훑기 — lazy 이미지 + useInView 연출을 전부 깨운다
  for (let pass = 0; pass < 2; pass++) {
    const h = (await call("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value;
    for (let y = 0; y < h + HEIGHT; y += Math.floor(HEIGHT * 0.7)) {
      await call("Runtime.evaluate", { expression: `window.scrollTo(0,${y})` });
      await sleep(140);
    }
    await sleep(700);
  }
  await call("Runtime.evaluate", { expression: "window.scrollTo(0,0)" });
  await sleep(500);

  const expr = String.raw`(() => {
    const W = window.innerWidth;
    function parseColor(s){ if(!s) return null; s=String(s).trim(); if(s.startsWith("#")){ let h=s.slice(1); if(h.length===3) h=h.split("").map(c=>c+c).join(""); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length>=8?parseInt(h.slice(6,8),16)/255:1}; } const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(",").map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
    const firstGradColor = (bgImage) => { const m = String(bgImage).match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g); if(!m) return null; for (const tok of m){ const c=parseColor(tok); if(c && c.a>0.5) return c; } return null; };
    const lum = (c) => { const f=(v)=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
    const mix = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a:1 });
    const contrast = (a,b) => { const l1=lum(a), l2=lum(b); const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return +((hi+0.05)/(lo+0.05)).toFixed(2); };
    function effBg(el){
      let n = el, guard=0;
      while(n && n !== document.documentElement && guard++ < 40){
        const cs = getComputedStyle(n);
        const bc = parseColor(cs.backgroundColor);
        if (bc && bc.a > 0.5) return { c: bc, kind:"solid" };
        if (cs.backgroundImage && cs.backgroundImage !== "none"){
          if (cs.backgroundImage.includes("url(")) return { c: parseColor("#404040"), kind:"image" };
          const g = firstGradColor(cs.backgroundImage);
          if (g) return { c: g, kind:"gradient" };
        }
        n = n.parentElement;
      }
      const body = parseColor(getComputedStyle(document.body).backgroundColor) || {r:255,g:255,b:255,a:1};
      return { c: body, kind:"body" };
    }
    const clean = (s) => s.replace(/\s+/g," ").trim();

    const texts = [];
    const skipTag = new Set(["SCRIPT","STYLE","NOSCRIPT"]);
    document.querySelectorAll("body *").forEach((el) => {
      if (skipTag.has(el.tagName)) return;
      if (el.closest("svg")) return;
      let own = "";
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      own = clean(own);
      if (!own) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const fg0 = parseColor(cs.color) || {r:0,g:0,b:0,a:1};
      const bg = effBg(el);
      const fg = fg0.a < 1 ? mix(fg0, bg.c) : fg0;
      const op = parseFloat(cs.opacity);
      texts.push({
        t: own.slice(0,120), len: own.length,
        y: Math.round(window.scrollY + r.top), x: Math.round(r.left), w: Math.round(r.width),
        fs: +parseFloat(cs.fontSize).toFixed(1), fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
        color: cs.color, bg: "rgb("+Math.round(bg.c.r)+","+Math.round(bg.c.g)+","+Math.round(bg.c.b)+")",
        bgKind: bg.kind, cr: contrast(fg, bg.c), op: isNaN(op)?1:op, ta: cs.textAlign,
        ff: cs.fontFamily.split(",")[0].replace(/["']/g,""), tag: el.tagName.toLowerCase(),
      });
    });

    const imgs = [...document.querySelectorAll("img")].map((el) => {
      const r = el.getBoundingClientRect();
      return { src: el.currentSrc || el.src, alt: el.alt||"", y: Math.round(window.scrollY+r.top), w: Math.round(r.width), h: Math.round(r.height),
        nw: el.naturalWidth, nh: el.naturalHeight, loading: el.getAttribute("loading")||"", fp: el.getAttribute("fetchpriority")||"",
        pctW: +(r.width/W*100).toFixed(1), ok: el.complete && el.naturalWidth>0 };
    });
    const videos = [...document.querySelectorAll("video")].map((el)=>{ const r=el.getBoundingClientRect(); return { src: el.currentSrc||el.getAttribute("src")||"", y: Math.round(window.scrollY+r.top), w: Math.round(r.width), h: Math.round(r.height) }; });

    const tappable = [...document.querySelectorAll("a,button,summary,input,select,textarea,[role=button]")].map((el)=>{
      const r = el.getBoundingClientRect(); const cs=getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), t: clean(el.textContent||"").slice(0,70), href: el.getAttribute("href")||"",
        y: Math.round(window.scrollY+r.top), x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
        fs:+parseFloat(cs.fontSize).toFixed(1), disabled: el.disabled===true, type: el.getAttribute("type")||"" };
    }).filter(b=>b.w>1&&b.h>1);

    const overflow = [];
    document.querySelectorAll("body *").forEach((el)=>{ const r=el.getBoundingClientRect(); if (r.width>2 && (r.right > W+1.5 || r.left < -1.5)) {
      const cls = el.className && el.className.baseVal!==undefined ? el.className.baseVal : String(el.className||"");
      overflow.push({ tag: el.tagName.toLowerCase(), cls: cls.slice(0,50), left: Math.round(r.left), right: Math.round(r.right), y: Math.round(window.scrollY+r.top), t: clean(el.textContent||"").slice(0,40) }); } });

    let best=null, bestH=0;
    document.querySelectorAll("body *").forEach((el)=>{ const r=el.getBoundingClientRect(); const kids=[...el.children].filter(k=>k.getBoundingClientRect().height>8).length; if (r.height>bestH && kids>=4 && r.height < document.documentElement.scrollHeight*1.05) { bestH=r.height; best=el; } });
    const outline = [];
    if (best) [...best.children].forEach((el)=>{ const r=el.getBoundingClientRect(); if (r.height<8) return;
      const cls = el.className && el.className.baseVal!==undefined ? el.className.baseVal : String(el.className||"");
      outline.push({ tag: el.tagName.toLowerCase(), cls: cls.slice(0,60), y: Math.round(window.scrollY+r.top), h: Math.round(r.height), t: clean(el.textContent||"").slice(0,90) }); });

    return JSON.stringify({
      url: location.href, W, docH: document.documentElement.scrollHeight, title: document.title,
      texts, imgs, videos, tappable, overflow, outline, bodyBg: getComputedStyle(document.body).backgroundColor,
    });
  })()`;
  const { result } = await call("Runtime.evaluate", { expression: expr, returnByValue: true });
  if (!result.value) { console.error("평가 실패", JSON.stringify(result).slice(0,600)); chrome.kill(); process.exit(1); }
  const data = JSON.parse(result.value);
  data.net = NET.filter(n=>n.enc>0).map(n=>({ u: n.url.split("/").slice(-1)[0].slice(0,70), type: n.type, kb: +(n.enc/1024).toFixed(1), status: n.status }));
  mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  writeFileSync(OUT, JSON.stringify(data, null, 1), "utf8");
  console.log(`OK  ${data.url}  높이 ${data.docH}px · 텍스트 ${data.texts.length} · 이미지 ${data.imgs.length} · 클릭 ${data.tappable.length} · 넘침 ${data.overflow.length} → ${OUT}`);
  ws.close(); chrome.kill();
};
main().catch((e)=>{ console.error(e); chrome.kill(); process.exit(1); });
