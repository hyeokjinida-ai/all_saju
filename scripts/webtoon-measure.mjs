// 웹툰 회차 자동 판독기 — `node scripts/webtoon-measure.mjs --url <회차 URL> --out <폴더>`
//
// 2026-08-29 칠흑 48·54화 판독은 손으로 쟀다(캡처 눈대중 + 부분 실측). 그 판독이 여백·무드·
// 반전 절단 세 문법을 건졌지만, 표본이 한 작품 두 회차다. 표본을 넓히려면 손이 아니라
// 자가 있어야 한다 — 이 스크립트가 그 자다.
//
// 재는 축 (8/29 판독에서 손으로 재던 것 + 그때 못 재던 것):
//   ① 컷 리듬  — 컷(이미지)마다 높이·앞 간격. 큰 숨(기본 44px+)이 어디서 몇 번 나오는지.
//   ② 명암 곡선 — 화면(뷰포트) 단위로 평균 밝기·백색%·흑색%. 「어둠은 구두점」을 수치로.
//   ③ 절단    — 마지막 1.5화면에 뭐가 있는지(컷/여백 비율)와 그 캡처. 회차가 어떻게 끊는지.
//   ④ 눈 검수 재료 — 화면 단위 슬라이스 PNG 전부 저장. 대사 밀도·시선 유도는 눈이 잰다.
//
// ⚠ 규칙 4(캡처 픽셀 판독 금지)와의 관계: 컷의 **위치·크기**는 여기서도 DOM(getBoundingClientRect)
//   으로 잰다. 픽셀은 **명암 통계**에만 쓴다 — 평균 밝기는 요소 경계와 달리 겹침의 영향을 안 받는다.
//
// 크롬 탐색: CHROME_BIN → 리눅스(원격 컨테이너 /opt/pw-browsers) → 윈도(형님 PC).
// 둘 다에서 돌아야 한다 — 망이 열리면 컨테이너가, 아니면 PC 세션이 잰다.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_ = arg("url");
const OUT = arg("out", "직녀/판독/_최근");
const SEL = arg("sel", "img"); // 컷 셀렉터 — 플랫폼마다 다르면 바꾼다
const WIDTH = Number(arg("width", 390)); // 폰 390 — 8/29 판독과 같은 자
const SCREEN_H = Number(arg("screen", 844)); // 「화면」 단위(iPhone 기준). 16.4화면 같은 수치와 호환
const GAP_MIN = Number(arg("gap", 44)); // 큰 숨 문턱 — 결과지 눈금(컷 44~48)과 같다
const WAIT = Number(arg("wait", 15000));
if (!URL_) { console.error("--url 이 필요하다"); process.exit(1); }

const CHROME =
  process.env.CHROME_BIN ??
  [
    "/opt/pw-browsers/chromium", // 원격 컨테이너(리눅스) — 파일이 아니라 폴더면 아래에서 실행파일을 찾는다
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].find((p) => existsSync(p));
if (!CHROME) { console.error("크롬을 못 찾았다 — CHROME_BIN 을 주면 된다"); process.exit(1); }

const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const PORT = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--mute-audio",
  `--remote-debugging-port=${PORT}`, `--user-agent=${UA}`, `--window-size=${WIDTH},${SCREEN_H}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* 아직 안 떴다 */ }
    await sleep(250);
  }
  throw new Error("크롬 CDP 접속 실패");
}

// 최소 CDP 클라이언트 — 의존성 0. measure-dom.mjs 와 같은 방식.
function cdp(ws) {
  let id = 0;
  const waits = new Map();
  const sock = new WebSocket(ws);
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      waits.set(mid, { resolve, reject });
      sock.send(JSON.stringify(sessionId ? { id: mid, method, params, sessionId } : { id: mid, method, params }));
    });
  const opened = new Promise((r) => (sock.onopen = r));
  sock.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waits.has(m.id)) {
      const { resolve, reject } = waits.get(m.id);
      waits.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  };
  return { send, opened, close: () => sock.close() };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const c = cdp(await wsUrl());
  await c.opened;
  const { targetId } = await c.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await c.send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => c.send(m, p, sessionId);
  await S("Page.enable");
  await S("Runtime.enable");
  await S("Emulation.setDeviceMetricsOverride", {
    width: WIDTH, height: SCREEN_H, deviceScaleFactor: 1, mobile: true,
  });
  await S("Page.navigate", { url: URL_ });
  await sleep(Math.min(WAIT, 8000));

  const evalJs = async (expr) =>
    (await S("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

  // ── 끝까지 스크롤 — 웹툰 뷰어는 lazy 라 안 내리면 컷이 DOM 에 안 실린다.
  //    컷 수와 문서 높이가 두 바퀴 연속 같아지면 다 실린 것으로 본다.
  await evalJs(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let prev = "";
    for (let i = 0; i < 80; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(700);
      const now = document.querySelectorAll(${JSON.stringify(SEL)}).length + ":" + document.body.scrollHeight;
      if (now === prev && i > 2) break;
      prev = now;
    }
    window.scrollTo(0, 0);
    await sleep(500);
  })()`);

  // ── ① 컷 리듬 — DOM 실측
  const cuts = await evalJs(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(SEL)})]
      .map((el) => { const r = el.getBoundingClientRect(); return {
        y: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width),
        src: (el.currentSrc || el.src || "").slice(-40) }; })
      .filter((b) => b.h > 8 && b.w > ${WIDTH} * 0.5) // 아이콘·장식 제거 — 반폭 이상만 컷으로 친다
      .sort((a, b) => a.y - b.y);
    return { cuts: els, docH: document.body.scrollHeight };
  })()`);

  const rows = cuts.cuts.map((b, i) => ({
    ...b,
    gapBefore: i === 0 ? b.y : b.y - (cuts.cuts[i - 1].y + cuts.cuts[i - 1].h),
  }));
  const breaths = rows.filter((r, i) => i > 0 && r.gapBefore >= GAP_MIN);
  const screens = cuts.docH / SCREEN_H;

  // ── ② 명암 곡선 — 화면 단위 슬라이스 캡처 → sharp 통계. sharp 는 리포 의존성에 이미 있다.
  //    스크롤 후 캡처는 lazy 재배치·스크롤 반영 시점에 물릴 수 있어 **절대좌표 clip** 으로 뜬다
  //    (captureBeyondViewport — 스크롤과 무관하게 문서 y 를 직접 지정. scale 1 고정).
  //    ⚠ 통짜 풀페이지 캡처는 안 쓴다 — 크롬 텍스처 상한(16,384px)에서 잘린다(shoot-url.ps1 과 같은 병).
  const sharp = (await import("sharp")).default;
  const curve = [];
  const nSlices = Math.ceil(cuts.docH / SCREEN_H);
  for (let i = 0; i < nSlices; i++) {
    const shot = await S("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: i * SCREEN_H, width: WIDTH, height: Math.min(SCREEN_H, cuts.docH - i * SCREEN_H), scale: 1 },
    });
    const buf = Buffer.from(shot.data, "base64");
    const raw = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
    let sum = 0, white = 0, black = 0;
    for (const v of raw.data) { sum += v; if (v >= 245) white++; else if (v <= 25) black++; }
    const n = raw.data.length;
    curve.push({
      screen: i + 1,
      lum: Math.round(sum / n),
      whitePct: Math.round((white / n) * 100),
      blackPct: Math.round((black / n) * 100),
    });
    writeFileSync(path.join(OUT, `s${String(i + 1).padStart(2, "0")}.png`), buf);
  }

  // ── ③ 절단 — 마지막 1.5화면 확대 캡처는 슬라이스 마지막 두 장이 이미 갖고 있다.
  const lastCut = rows.at(-1);
  const tail = lastCut ? cuts.docH - (lastCut.y + lastCut.h) : null; // 마지막 컷 뒤 여백 = 끊고 남긴 숨

  const report = {
    url: URL_, width: WIDTH, screenH: SCREEN_H, docH: cuts.docH,
    screens: Math.round(screens * 10) / 10,
    cutCount: rows.length,
    cutHeights: rows.map((r) => r.h),
    gaps: rows.map((r) => r.gapBefore),
    breaths: breaths.map((b) => ({ beforeCutAt: b.y, gap: b.gapBefore })),
    tailAfterLastCut: tail,
    lumCurve: curve,
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  // 사람이 읽는 요약 — 커밋 메시지·판독 문서에 그대로 옮겨 적는 용도
  const lumMin = Math.min(...curve.map((c) => c.lum));
  const lumMax = Math.max(...curve.map((c) => c.lum));
  console.log(`문서 ${cuts.docH}px = ${report.screens}화면 · 컷 ${rows.length}장`);
  console.log(`컷 높이 px: ${rows.map((r) => r.h).join(" ")}`);
  console.log(`컷 앞 간격 px: ${rows.map((r) => r.gapBefore).join(" ")}`);
  console.log(`큰 숨(${GAP_MIN}px+): ${breaths.length}곳 → ${breaths.map((b) => b.gapBefore + "px@" + Math.round((b.y / SCREEN_H) * 10) / 10 + "화면").join(" · ")}`);
  console.log(`명암: 밝기 ${lumMin}~${lumMax} · 화면별 [밝기/백%/흑%] ${curve.map((c) => `${c.lum}/${c.whitePct}/${c.blackPct}`).join(" ")}`);
  console.log(`마지막 컷 뒤 여백: ${tail}px · 슬라이스 ${nSlices}장 → ${OUT}/`);

  c.close();
  chrome.kill();
}

main().catch((e) => { console.error(e.message ?? e); chrome.kill(); process.exit(1); });
