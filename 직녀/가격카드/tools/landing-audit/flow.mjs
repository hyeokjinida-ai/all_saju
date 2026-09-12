// 콜드 착지 전체 플로 주행기 — 게이트 → 설화 → 입력 → 분석 → 티저.
// 각 단계에서 화면에 보이는 것(제목/보조문/버튼)과 누른 것, 누적 탭 수·시간·전송량을 기록한다.
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url", "http://127.0.0.1:3000/products/inyeon-saju");
const OUT = arg("out", "flow.json");
const WIDTH = 390, HEIGHT = 844;
const MAXSTEP = Number(arg("max", 30));
const CHROME = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((p)=>existsSync(p));
const UA = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9500 + Math.floor(Math.random()*200);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars","--mute-audio",`--remote-debugging-port=${PORT}`,`--user-agent=${UA}`,`--window-size=${WIDTH},${HEIGHT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){ for(let i=0;i<80;i++){ try{ const j=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if(j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; }catch{} await sleep(250);} throw new Error("포트"); }
function cdp(ws,on){ let id=0; const w=new Map(); ws.addEventListener("message",(ev)=>{ const m=JSON.parse(ev.data); if(m.id&&w.has(m.id)){const {resolve,reject}=w.get(m.id); w.delete(m.id); m.error?reject(new Error(m.error.message)):resolve(m.result);} else if(m.method&&on) on(m); }); return (method,params={},sessionId)=>new Promise((resolve,reject)=>{ const n=++id; w.set(n,{resolve,reject}); ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})})); }); }

let bytes = 0; const netRows = [];
const SNAP = String.raw`(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width>1 && r.height>1 && r.bottom>0 && r.top<innerHeight+400 && cs.visibility!=="hidden" && cs.display!=="none" && +cs.opacity>0.05; };
  const clean = (s)=>String(s).replace(/\s+/g," ").trim();
  const texts=[]; document.querySelectorAll("body *").forEach(el=>{ if(el.closest("svg"))return; let own=""; for(const n of el.childNodes) if(n.nodeType===3) own+=n.nodeValue; own=clean(own); if(!own||!vis(el))return;
    const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); texts.push({t:own.slice(0,90), y:Math.round(r.top+scrollY), fs:+parseFloat(cs.fontSize).toFixed(1), fw:cs.fontWeight}); });
  const btns=[...document.querySelectorAll("button,a,[role=button],input,select,textarea,label")].filter(vis).map((el,i)=>{ const r=el.getBoundingClientRect();
    return { i, tag:el.tagName.toLowerCase(), type:el.getAttribute("type")||"", t:clean(el.textContent||el.value||el.placeholder||""), y:Math.round(r.top+scrollY), x:Math.round(r.left), w:Math.round(r.width), h:Math.round(r.height), dis:el.disabled===true }; });
  return JSON.stringify({ docH: document.documentElement.scrollHeight, texts, btns, url: location.href });
})()`;

const main = async () => {
  const ws = new WebSocket(await wsUrl());
  await new Promise(r=>ws.addEventListener("open", r, { once:true }));
  const send = cdp(ws, (m)=>{ if(m.method==="Network.loadingFinished"){ bytes += m.params.encodedDataLength||0; }
    if(m.method==="Network.responseReceived"){ netRows.push({u:m.params.response.url.split("/").pop().slice(0,50), t:m.params.type}); } });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m,p={}) => send(m,p,sessionId);
  await call("Page.enable"); await call("Network.enable"); await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true, screenWidth: WIDTH, screenHeight: HEIGHT });
  const t0 = Date.now();
  await call("Page.navigate", { url: URL_ });
  await sleep(7000);

  const log = [];
  let taps = 0;
  const snap = async () => JSON.parse((await call("Runtime.evaluate", { expression: SNAP, returnByValue: true })).result.value);

  const clickIdx = async (i) => {
    await call("Runtime.evaluate", { expression: `(() => { const vis=(el)=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight+400&&cs.visibility!=="hidden"&&cs.display!=="none"&&+cs.opacity>0.05;};
      const els=[...document.querySelectorAll("button,a,[role=button],input,select,textarea,label")].filter(vis); const el=els[${i}]; if(!el) return "없음"; el.scrollIntoView({block:"center"}); el.click(); return "클릭"; })()`, returnByValue: true });
    taps++;
  };
  const setVal = async (i, v) => {
    await call("Runtime.evaluate", { expression: `(() => { const vis=(el)=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight+400&&cs.visibility!=="hidden"&&cs.display!=="none"&&+cs.opacity>0.05;};
      const els=[...document.querySelectorAll("button,a,[role=button],input,select,textarea,label")].filter(vis); const el=els[${i}]; if(!el) return "없음";
      const proto = el.tagName==="SELECT" ? HTMLSelectElement.prototype : (el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype);
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set; setter.call(el, ${JSON.stringify(v)});
      el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); return "입력"; })()`, returnByValue: true });
  };

  for (let step = 0; step < MAXSTEP; step++) {
    const s = await snap();
    const head = s.texts.filter(t=>t.fs>=17).slice(0,4).map(t=>t.t);
    const entry = { step, url: s.url, docH: s.docH, taps, ms: Date.now()-t0, kb: +(bytes/1024).toFixed(0),
      head, texts: s.texts.slice(0,26).map(t=>`${t.fs}/${t.fw} ${t.t}`), btns: s.btns.map(b=>`[${b.i}]${b.tag}${b.type?":"+b.type:""} ${b.w}x${b.h} ${b.dis?"(비활성)":""} ${b.t.slice(0,40)}`) };
    log.push(entry);
    // 티저 도달?
    if (s.docH > 6000) { entry.note = "티저 도달"; break; }

    // 이번 화면에서 할 일 결정
    const B = s.btns;
    const find = (re, opt={}) => B.find(b=>re.test(b.t) && !b.dis && (opt.tag? b.tag===opt.tag : true));
    let acted = false;

    // 1) 날짜/텍스트 입력 채우기
    const dateIn = B.find(b=>b.tag==="input" && (b.type==="date"));
    const numIns = B.filter(b=>b.tag==="input" && (b.type==="number"||b.type==="tel"));
    const textIn = B.find(b=>b.tag==="input" && (b.type===""||b.type==="text"));
    const selects = B.filter(b=>b.tag==="select");
    const allText = s.texts.map(t=>t.t).join(" ");
    if (dateIn) { await setVal(dateIn.i, "1994-06-01"); entry.did = (entry.did||"")+" 생일=1994-06-01"; acted=true; await sleep(400); }
    else if (numIns.length>=3) { await setVal(numIns[0].i,"1994"); await setVal(numIns[1].i,"06"); await setVal(numIns[2].i,"01"); entry.did=(entry.did||"")+" 년월일 입력"; acted=true; await sleep(400); }
    else if (selects.length>=3) { await setVal(selects[0].i,"1994"); await setVal(selects[1].i,"6"); await setVal(selects[2].i,"1"); entry.did=(entry.did||"")+" 셀렉트 입력"; acted=true; await sleep(400); }
    else if (textIn && /태어나/.test(allText)) { await setVal(textIn.i, "19940601"); entry.did=(entry.did||"")+" 생일=19940601"; acted=true; await sleep(600); }
    else if (textIn && /이름|불러|성함/.test(allText)) { await setVal(textIn.i, "박지수"); entry.did=(entry.did||"")+" 이름=박지수"; acted=true; await sleep(300); }
    else if (textIn && /마음 쓰이는|물음|고민/.test(allText)) { await setVal(textIn.i, "올해 안에 만날 수 있을까요"); entry.did=(entry.did||"")+" 고민 입력"; acted=true; await sleep(300); }
    const ta = B.find(b=>b.tag==="textarea");
    if (ta) { await setVal(ta.i, "올해 안에 만날 수 있을까요"); entry.did=(entry.did||"")+" 물음 입력"; acted=true; await sleep(300); }

    // 2) 선택지가 필요한 화면 — 라디오/칩 성격 버튼
    const pick = find(/^여자$|^여성$/) || find(/^남자$/) || find(/모르|몰라/) || find(/혼자|없어|없다/);
    const next = find(/^다음|계속|들어가|시작|네,|확인|펴|보러|읽어|맞아|좋아/) || B.filter(b=>b.tag==="button"&&!b.dis&&b.h>=40).slice(-1)[0];

    // 화면 성격 판단: 선택 화면이면 먼저 하나 고르고 다음
    const askGender = /성별/.test(s.texts.map(t=>t.t).join(" "));
    const askPartner = /마음이 가는 쪽/.test(s.texts.map(t=>t.t).join(" "));
    const askRel = /곁에 사람/.test(s.texts.map(t=>t.t).join(" "));
    const askTime = /시각/.test(s.texts.map(t=>t.t).join(" "));
    const askConcern = /마음 쓰이는/.test(s.texts.map(t=>t.t).join(" "));

    if (askGender || askPartner) { const g = find(/^여자$|^여성$/) || find(/^남자$|^남성$/); if (g) { await clickIdx(g.i); entry.did=(entry.did||"")+` 선택:${g.t}`; await sleep(350); } }
    else if (askRel) { const g = find(/혼자/) || find(/없/); if (g) { await clickIdx(g.i); entry.did=(entry.did||"")+` 선택:${g.t}`; await sleep(350); } }
    else if (askTime) { const g = find(/모르|몰라/); if (g) { await clickIdx(g.i); entry.did=(entry.did||"")+` 선택:${g.t}`; await sleep(350); } }
    else if (askConcern) { const g = B.find(b=>b.tag==="button"&&!b.dis&&b.h>=30&&b.h<60&&b.w<300&&!/다음|건너|이전/.test(b.t)); if (g) { await clickIdx(g.i); entry.did=(entry.did||"")+` 칩:${g.t}`; await sleep(350); } }

    const s2 = await snap();
    const B2 = s2.btns;
    const find2 = (re) => B2.find(b=>re.test(b.t) && !b.dis);
    const go = find2(/^그냥 볼게$/) || find2(/^다음$|다음으로|계속|들어가기|시작|펴 ?볼|보러|읽어|확인했|맞아요|이대로/) || find2(/건너뛰기/) || B2.filter(b=>b.tag==="button"&&!b.dis&&b.h>=44).slice(-1)[0];
    if (go) { entry.pressed = go.t.slice(0,40) || `${go.tag} ${go.w}x${go.h}`; await clickIdx(go.i); acted=true; }
    else { entry.pressed = "(누를 것 없음)"; }
    await sleep(2200);
    if (!acted && !go) break;
  }
  writeFileSync(OUT, JSON.stringify({ url: URL_, totalTaps: taps, totalMs: Date.now()-t0, totalKB: +(bytes/1024).toFixed(0), log }, null, 1), "utf8");
  console.log(`플로 종료 · 탭 ${taps}회 · ${((Date.now()-t0)/1000).toFixed(1)}초 · ${(bytes/1024/1024).toFixed(2)}MB · 단계 ${log.length} → ${OUT}`);
  ws.close(); chrome.kill();
};
main().catch((e)=>{ console.error(e); chrome.kill(); process.exit(1); });
