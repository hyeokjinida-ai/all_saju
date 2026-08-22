/**
 * 레터링 누끼 — `pnpm art:cutout`
 *
 * ChatGPT 웹에서 받아온 레터링(흰 배경 위 글자)을 **투명 PNG** 로 바꿔
 * `public/home/lettering/<slug>.png` 에 넣는다. 카드가 어두워서 흰 배경이 그대로 얹히면
 * 글자 뒤에 흰 판이 깔린 꼴이 된다.
 *
 * 방법: **가장자리에서 시작하는 flood fill**.
 *   그냥 "흰 픽셀 전부 지우기"로 하면 글자 안쪽 하이라이트(금박의 밝은 부분)까지 구멍이 난다.
 *   테두리에서 이어진 흰색만 지우면 글자 안은 안전하다. (직녀 cutout.ps1 과 같은 원리)
 *
 * ⚠ 가장자리 1px 은 흰색과 섞인 반투명 띠라 그냥 두면 **어두운 카드 위에서 흰 실선**으로 보인다.
 *    마스크를 살짝 흐린 뒤 문턱을 올려 1px 안쪽으로 깎는다(erode + soft edge).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/** 배경으로 칠지 말지 — 이 값 이상이면 "흰색" */
const WHITE = 238;
/** 가장자리를 몇 px 안으로 깎을지(0~255 문턱). 클수록 많이 깎인다 */
const EDGE_BITE = 110;

type Job = { slug: string; src: string };

const ROOT = process.cwd();
const IN_DIR = path.join(ROOT, "직녀", "레터링", "gpt");
const OUT_DIR = path.join(ROOT, "public", "home", "lettering");

async function cut(job: Job) {
  const { data, info } = await sharp(job.src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  // ── 가장자리에서 흰색을 따라 들어간다 (flood fill, 스택 기반) ──
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const isWhite = (i: number) => {
    const o = i * ch;
    return data[o] >= WHITE && data[o + 1] >= WHITE && data[o + 2] >= WHITE;
  };
  const push = (i: number) => {
    if (!bg[i] && isWhite(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }

  // ── 마스크(불투명=255) 만들고 가장자리를 안으로 깎는다 ──
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = bg[i] ? 0 : 255;

  // ⚠ sharp 는 파이프라인에 따라 채널 수를 늘려서 돌려준다(1채널로 넣어도 3채널로 나올 수 있다).
  //    돌아온 버퍼를 그냥 `buf[i]` 로 읽으면 **한 픽셀씩 밀려** 알파가 통째로 뭉개진다
  //    (실측 2026-08-23: 글자 모양이 아니라 회색 덩어리가 나왔다). 반드시 info.channels 로 보폭을 잡는다.
  const er = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
    .blur(1.1)
    .linear(255 / (255 - EDGE_BITE), (-EDGE_BITE * 255) / (255 - EDGE_BITE))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const eStride = er.info.channels;

  // ── 원본 RGB + 새 알파 ──
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    out[i * 4] = data[o];
    out[i * 4 + 1] = data[o + 1];
    out[i * 4 + 2] = data[o + 2];
    out[i * 4 + 3] = er.data[i * eStride];
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dest = path.join(OUT_DIR, `${job.slug}.webp`);
  // 카드에서 이 그림이 차지하는 폭은 300px 남짓이다. 원본 2100px 을 그대로 내보내면
  // 히어로 한 장에 1.5MB 가 붙는다 — 카드 크기의 2배(=900)로 줄여 webp 로 내보낸다.
  // 투명 여백 잘라내기 — sharp 의 trim() 은 RGB 만 보는 판이 있어(배경이 전부 흰색이면 엉뚱하게 자른다)
  // 알파로 직접 경계를 잡는다.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (out[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("남은 그림이 없습니다 — 문턱값을 보세요");

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(dest);

  const m = await sharp(dest).metadata();
  const kb = Math.round(fs.statSync(dest).size / 1024);
  const cut = Math.round((bg.reduce((a, b) => a + b, 0) / (w * h)) * 100);
  console.log(`  ${job.slug}.webp  ${m.width}×${m.height}  ${kb}KB  (배경 ${cut}% 제거)`);
}

async function main() {
  if (!fs.existsSync(IN_DIR)) {
    console.log(`${path.relative(ROOT, IN_DIR)} 가 없습니다 — GPT 산출물을 여기에 <slug>_gpt.png 로 두세요.`);
    return;
  }
  const jobs: Job[] = fs
    .readdirSync(IN_DIR)
    .filter((f) => f.endsWith("_gpt.png"))
    .map((f) => ({ slug: f.replace(/_gpt\.png$/, ""), src: path.join(IN_DIR, f) }));

  if (!jobs.length) {
    console.log("자를 그림이 없습니다.");
    return;
  }
  console.log("레터링 누끼 → public/home/lettering/");
  for (const j of jobs) await cut(j);
  console.log(`\n${jobs.length}장 완료. src/config/home.ts 의 LETTERING 에 등록하면 카드가 씁니다.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
