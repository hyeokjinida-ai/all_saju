// 웹툰 회차 자동 판독기 — `node scripts/webtoon-measure.mjs --url <회차 URL> --out <폴더>`
//
// 2026-08-29 칠흑 48·54화 판독은 손으로 쟀다(캡처 눈대중 + 부분 실측). 그 판독이 여백·무드·
// 반전 절단 세 문법을 건졌지만, 표본이 한 작품 두 회차다. 표본을 넓히려면 손이 아니라
// 자가 있어야 한다 — 이 스크립트가 그 자다.
//
// ⚠ 2026-09-03 수리 두 건 (형님 PC 라이브 실측에서 잡힘 — 픽스처 검증이 못 밟은 함정):
//   ① 점프 스크롤(scrollTo 바닥)은 lazy 이미지를 안 깨운다 — 중간 이미지가 플레이스홀더
//      크기(390px 정사각)로 남아 세 작품이 같은 숫자를 냈다. → 사람처럼 **단계 스크롤**.
//   ② 네이버 모바일은 원본을 **균일 타일(690×1600)로 재절단**해 온다 — img 요소가 컷이
//      아니다. 컷 리듬·여백은 DOM 으로 못 재는 플랫폼이 있다. → 렌더된 픽셀의
//      **행(row) 프로파일**로 플랫 구간(여백·숨)과 콘텐츠 구간(컷)을 검출한다.
//      스트립 범위 자체는 DOM(이미지 체인)으로 잡는다 — 픽셀은 행 통계에만 쓴다(규칙 4).
//
// 재는 축:
//   ① 컷 리듬  — 콘텐츠 구간(플랫 사이) 높이 목록. 큰 숨(기본 44px+) 위치·길이·톤.
//   ② 여백 비율 — 스트립 안 플랫 행 합 / 스트립 높이 (칠흑 54화의 「33% 여백」 지표).
//   ③ 명암 곡선 — 화면(뷰포트) 단위 평균 밝기·백색%·흑색% (스트립 범위만, 꼬리 UI 오염 없음).
//   ④ 절단    — 스트립 마지막 1.5화면의 구성 + 마지막 콘텐츠/플랫. 캡처는 슬라이스가 갖고 있다.
//   ⑤ 눈 검수 재료 — 스트립 화면 단위 슬라이스 PNG 전부 저장. 대사 밀도·시선 유도는 눈이 잰다.
//
// 크롬 탐색: CHROME_BIN → 리눅스(원격 컨테이너 /opt/pw-browsers) → 윈도(형님 PC).
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
const FLAT_TOL = Number(arg("flattol", 16)); // 행이 「플랫」인 문턱: 행 안 max-min ≤ 이 값(jpeg 노이즈 허용)
const FLAT_MIN = Number(arg("flatmin", 16)); // 이보다 짧은 플랫 런은 잡음으로 버린다
const CHAIN_GAP = Number(arg("chaingap", 1200)); // 이미지 체인이 끊겼다고 보는 세로 간격
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

  // ── 로딩 — 점프 금지. 단계 스크롤로 lazy 를 전부 깨우고, 문서 높이가 안 변할 때까지 돈다.
  const loadStat = await evalJs(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let prevH = 0;
    for (let pass = 0; pass < 6; pass++) {
      const H = document.body.scrollHeight;
      for (let y = 0; y <= H; y += 700) { window.scrollTo(0, y); await sleep(150); }
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(800);
      if (document.body.scrollHeight === prevH) break;
      prevH = document.body.scrollHeight;
    }
    for (let i = 0; i < 40; i++) {
      const bad = [...document.querySelectorAll("img")].filter((el) => el.src && el.getBoundingClientRect().width > 100 && !el.naturalWidth).length;
      if (!bad) break;
      await sleep(300);
    }
    window.scrollTo(0, 0);
    await sleep(400);
    const bad = [...document.querySelectorAll("img")].filter((el) => el.src && el.getBoundingClientRect().width > 100 && !el.naturalWidth).length;
    return { docH: document.body.scrollHeight, unloaded: bad };
  })()`);

  // ── 스트립 탐지 — 반폭 이상 이미지들을 세로로 이어 붙인 체인 중 총높이 최대가 본편이다.
  //    (네이버는 균일 타일이라 img=컷이 아니지만, 스트립의 **범위**는 img 체인이 정확히 안다.)
  const domData = await evalJs(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(SEL)})]
      .map((el) => { const r = el.getBoundingClientRect(); return {
        y: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width),
        nw: el.naturalWidth, src: (el.currentSrc || el.src || "").slice(-40) }; })
      .filter((b) => b.h > 8 && b.w > ${WIDTH} * 0.5)
      .sort((a, b) => a.y - b.y);
    return { imgs: els, docH: document.body.scrollHeight };
  })()`);

  const chains = [];
  for (const im of domData.imgs) {
    const last = chains.at(-1);
    if (last && im.y - (last.bottom) <= CHAIN_GAP) {
      last.items.push(im);
      last.bottom = Math.max(last.bottom, im.y + im.h);
    } else {
      chains.push({ top: im.y, bottom: im.y + im.h, items: [im] });
    }
  }
  if (!chains.length) { console.error("스트립을 못 찾았다 — 이미지가 없다"); process.exit(1); }
  const strip = chains.reduce((a, b) => (b.bottom - b.top > a.bottom - a.top ? b : a));
  const stripH = strip.bottom - strip.top;
  const nextAfterStrip = domData.imgs.find((i) => i.y >= strip.bottom);
  const gapToNextSection = nextAfterStrip ? nextAfterStrip.y - strip.bottom : domData.docH - strip.bottom;

  // ── 슬라이스 캡처(스트립 범위만) + 행 프로파일 — 절대좌표 clip (16,384px 텍스처 상한 회피).
  const sharp = (await import("sharp")).default;
  const nSlices = Math.ceil(stripH / SCREEN_H);
  const rowMean = new Float32Array(stripH);
  const rowSpread = new Float32Array(stripH); // 행 안 max-min — 플랫 판정용
  const curve = [];
  for (let i = 0; i < nSlices; i++) {
    const y0 = strip.top + i * SCREEN_H;
    const h = Math.min(SCREEN_H, strip.bottom - y0);
    const shot = await S("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: y0, width: WIDTH, height: h, scale: 1 },
    });
    const buf = Buffer.from(shot.data, "base64");
    const raw = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: rh } = raw.info;
    let sum = 0, white = 0, black = 0;
    for (let r = 0; r < rh; r++) {
      let rs = 0, mn = 255, mx = 0;
      const off = r * w;
      for (let x = 0; x < w; x++) {
        const v = raw.data[off + x];
        rs += v;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
        if (v >= 245) white++; else if (v <= 25) black++;
      }
      sum += rs;
      const gy = i * SCREEN_H + r;
      if (gy < stripH) { rowMean[gy] = rs / w; rowSpread[gy] = mx - mn; }
    }
    const n = w * rh;
    curve.push({
      screen: i + 1,
      lum: Math.round(sum / n),
      whitePct: Math.round((white / n) * 100),
      blackPct: Math.round((black / n) * 100),
    });
    writeFileSync(path.join(OUT, `s${String(i + 1).padStart(2, "0")}.png`), buf);
  }

  // ── 플랫 런(여백·숨)과 콘텐츠 런(컷) — 행 프로파일에서 검출.
  const flats = [];
  let runStart = -1;
  for (let y = 0; y <= stripH; y++) {
    const isFlat = y < stripH && rowSpread[y] <= FLAT_TOL;
    if (isFlat && runStart < 0) runStart = y;
    if (!isFlat && runStart >= 0) {
      const len = y - runStart;
      if (len >= FLAT_MIN) {
        let toneSum = 0;
        for (let k = runStart; k < y; k++) toneSum += rowMean[k];
        const tone = Math.round(toneSum / len);
        flats.push({ y: runStart, len, tone, kind: tone >= 235 ? "백" : tone <= 30 ? "흑" : "톤" });
      }
      runStart = -1;
    }
  }
  const cuts = [];
  let prevEnd = 0;
  for (const f of flats) {
    if (f.y - prevEnd >= 24) cuts.push({ y: prevEnd, h: f.y - prevEnd });
    prevEnd = f.y + f.len;
  }
  if (stripH - prevEnd >= 24) cuts.push({ y: prevEnd, h: stripH - prevEnd });
  const breaths = flats.filter((f) => f.len >= GAP_MIN);
  const flatTotal = flats.reduce((s, f) => s + f.len, 0);
  const lastCut = cuts.at(-1);
  const lastFlat = flats.at(-1);
  const tailFlat = lastFlat && lastFlat.y + lastFlat.len >= stripH - 2 ? lastFlat.len : 0;

  const scr = (y) => Math.round((y / SCREEN_H) * 10) / 10;
  const report = {
    url: URL_, width: WIDTH, screenH: SCREEN_H, docH: domData.docH,
    unloadedImgs: loadStat.unloaded,
    strip: { top: strip.top, bottom: strip.bottom, h: stripH, screens: Math.round((stripH / SCREEN_H) * 10) / 10, tiles: strip.items.length },
    tileHeights: strip.items.map((i) => i.h),
    flatPct: Math.round((flatTotal / stripH) * 100),
    cutCount: cuts.length,
    cutHeights: cuts.map((r) => r.h),
    cuts,
    flats,
    breaths: breaths.map((b) => ({ atScreen: scr(b.y), len: b.len, kind: b.kind, tone: b.tone })),
    tailFlat,
    gapToNextSection,
    lastCutH: lastCut?.h ?? null,
    lumCurve: curve,
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  // 사람이 읽는 요약 — 커밋 메시지·판독 문서에 그대로 옮겨 적는 용도
  const lumMin = Math.min(...curve.map((c) => c.lum));
  const lumMax = Math.max(...curve.map((c) => c.lum));
  console.log(`스트립 ${stripH}px = ${report.strip.screens}화면 (타일 ${strip.items.length}장, 미로딩 ${loadStat.unloaded}) · 문서 ${domData.docH}px`);
  console.log(`여백(플랫) ${report.flatPct}% · 콘텐츠 구간(컷) ${cuts.length}개`);
  console.log(`컷 높이 px: ${cuts.map((r) => r.h).join(" ")}`);
  console.log(`큰 숨(${GAP_MIN}px+) ${breaths.length}곳: ${breaths.map((b) => `${b.len}px(${b.kind})@${scr(b.y)}화면`).join(" · ")}`);
  console.log(`명암: 밝기 ${lumMin}~${lumMax} · 화면별 [밝기/백%/흑%] ${curve.map((c) => `${c.lum}/${c.whitePct}/${c.blackPct}`).join(" ")}`);
  console.log(`절단: 마지막 컷 ${lastCut?.h ?? "-"}px · 스트립 끝 플랫 ${tailFlat}px · 다음 섹션까지 ${gapToNextSection}px · 슬라이스 ${nSlices}장 → ${OUT}/`);

  c.close();
  chrome.kill();
}

main().catch((e) => { console.error(e.message ?? e); chrome.kill(); process.exit(1); });
