/**
 * 레터링 원본 굽기 — `pnpm art:lettering`
 *
 * 상품 카드에 얹을 제목 글자의 **원본**을 만든다. 이 원본을 ChatGPT 웹에 올려
 * "획은 그대로, 표면만 바꿔라" 로 시키면 유리·금박 질감이 붙어 돌아온다.
 * (직접 "연애예보라고 써줘" 로 시키면 「예」가 「얘」가 되는 식으로 획이 틀어진다 —
 *  그래서 반드시 원본을 올린다. 2026-08-22 직녀 가격카드에서 확인된 방식.)
 *
 * 글자체는 **Black Han Sans** — 직녀 「연애예보」 레터링을 만든 그 글자체다.
 * 굵고 각진 전각 디스플레이체라 한 글자가 네모를 꽉 채운다. 고딕(Noto Sans KR 900)을
 * 가로로 눌러 쓰던 이전 방식은 "늘린 폰트" 티가 나서 형님이 「밤티 난다」고 잡았다.
 *
 * 산출물: 직녀/레터링/<slug>_원본.png (흰 배경, 글자 딱 맞게 잘림)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

type Job = {
  slug: string;
  title: string;
  /** 원본 색 — GPT 가 표면을 바꿔도 이 색 계열은 유지하라고 시킬 기준 */
  from: string;
  to: string;
  edge: string;
  shadow: string;
};

const JOBS: Job[] = [
  // 산군 — 검정+금+주사 세계관(globals.css .world-sangun). 촛불 금색.
  {
    slug: "sangun-sinjeom",
    title: "박수무당",
    from: "#F2DFA4",
    to: "#8A6516",
    edge: "#FBEFC9",
    shadow: "#3A2708",
  },
  // 직녀 — 먹남색 밤 + 달빛·은사(.world-jiknyeo). 빨강 금기.
  {
    slug: "inyeon-saju",
    title: "연애예보",
    from: "#E7E3F5",
    to: "#6B5AA6",
    edge: "#F6F3FF",
    shadow: "#241C42",
  },
  {
    slug: "marriage-saju",
    title: "결혼예보",
    from: "#E7E3F5",
    to: "#6B5AA6",
    edge: "#F6F3FF",
    shadow: "#241C42",
  },
  // 돈달 — 먹바탕 + 금 + 주홍(.world-wealth). 지금은 비활성이지만 되살릴 때 바로 쓴다.
  {
    slug: "wealth-saju",
    title: "돈드는달",
    from: "#F3E2B0",
    to: "#9A6A20",
    edge: "#FCF2D5",
    shadow: "#3B2A0A",
  },
];

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "직녀", "레터링");
const FONT = path.join(ROOT, "직녀", "가격카드", "fonts", "BlackHanSans.ttf");
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

/** 글자 수에 맞춘 캔버스 — 넉넉히 잡고 나중에 잉크에 맞춰 자른다 */
const CANVAS = { w: 2000, h: 900 };

function html(job: Job, fontB64: string): string {
  const n = [...job.title.replace(/\s/g, "")].length;
  const size = n <= 4 ? 380 : n <= 6 ? 300 : 240;
  return `<!doctype html><meta charset="utf-8">
<style>
  @font-face{font-family:BHS;src:url(data:font/ttf;base64,${fontB64})format("truetype")}
  html,body{margin:0;padding:0;background:#fff}
  body{width:${CANVAS.w}px;height:${CANVAS.h}px;display:flex;align-items:center;justify-content:center}
  svg{overflow:visible}
  text{font-family:BHS;font-size:${size}px}
</style>
<svg width="${CANVAS.w}" height="${CANVAS.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${job.from}"/>
      <stop offset="55%"  stop-color="${mix(job.from, job.to, 0.55)}"/>
      <stop offset="100%" stop-color="${job.to}"/>
    </linearGradient>
  </defs>
  <!-- 그림자를 먼저: 오른쪽 아래로 살짝. GPT 가 입체를 잡는 단서가 된다 -->
  <text x="${CANVAS.w / 2 + 11}" y="${CANVAS.h / 2 + 14}" text-anchor="middle"
        dominant-baseline="central" fill="${job.shadow}">${job.title}</text>
  <text x="${CANVAS.w / 2}" y="${CANVAS.h / 2}" text-anchor="middle"
        dominant-baseline="central"
        stroke="${job.edge}" stroke-width="14" stroke-linejoin="round"
        paint-order="stroke" fill="url(#g)">${job.title}</text>
</svg>`;
}

/** 두 hex 를 t 비율로 섞는다 — 그라데이션 중간 스톱용 */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

async function main() {
  if (!CHROME) throw new Error("크롬을 못 찾았습니다");
  if (!fs.existsSync(FONT)) {
    throw new Error(
      `글자체가 없습니다: ${FONT}\n` +
        "  받는 법: curl -s https://raw.githubusercontent.com/google/fonts/main/ofl/blackhansans/BlackHanSans-Regular.ttf -o 직녀/가격카드/fonts/BlackHanSans.ttf",
    );
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fontB64 = fs.readFileSync(FONT).toString("base64");
  const tmp = path.join(OUT_DIR, "_tmp.html");

  for (const job of JOBS) {
    fs.writeFileSync(tmp, html(job, fontB64), "utf8");
    const raw = path.join(OUT_DIR, `_raw_${job.slug}.png`);
    if (fs.existsSync(raw)) fs.unlinkSync(raw);

    execFileSync(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--allow-file-access-from-files",
      "--virtual-time-budget=6000",
      `--screenshot=${raw}`,
      `--window-size=${CANVAS.w},${CANVAS.h}`,
      "file:///" + tmp.replace(/\\/g, "/"),
    ], { stdio: "ignore" });

    if (!fs.existsSync(raw)) {
      console.log(`  ✗ ${job.slug} — 렌더 실패`);
      continue;
    }

    // 흰 여백을 잘라낸다(임계값을 조금 줘야 안티에일리어싱 테두리가 안 남는다)
    const out = path.join(OUT_DIR, `${job.slug}_원본.png`);
    const img = sharp(raw);
    const meta = await img.metadata();
    await sharp(raw)
      .trim({ background: "#ffffff", threshold: 12 })
      .extend({ top: 40, bottom: 40, left: 40, right: 40, background: "#ffffff" })
      .png()
      .toFile(out);
    fs.unlinkSync(raw);

    const o = await sharp(out).metadata();
    console.log(`  ${job.slug}_원본.png  ${o.width}×${o.height}  「${job.title}」  (캔버스 ${meta.width}×${meta.height} 에서 잘라냄)`);
  }

  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  console.log(`\n${JOBS.length}장 완료 → ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
