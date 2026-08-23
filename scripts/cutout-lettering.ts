/**
 * 레터링 누끼 — `pnpm art:cutout`
 *
 * ChatGPT 웹에서 받아온 레터링을 **투명 WebP** 로 바꿔
 * `public/home/lettering/<slug>.webp` 에 넣는다. 카드가 어두워서 배경이 그대로 얹히면
 * 글자 뒤에 판이 깔린 꼴이 된다.
 *
 * ── 왜 크로마키인가 (2026-08-23, 형님 「누끼도 다음에는 제대로 따고」) ──────────
 * 처음엔 **흰 배경 + 밝기 문턱 + flood fill** 로 땄다. 결과가 두 가지로 무너졌다:
 *   · 은·자개 글자 — 가장자리가 거의 흰색이라 배경과 못 갈려 **흰 테**가 남았다
 *   · 금박 글자   — 그 테를 지우려고 깎았더니(erode) **획이 잘려나갔다**
 * 원인은 알고리즘이 아니라 **입력**이다. 밝기 하나로는 흰 배경과 흰 글자를 못 가른다.
 * 그래서 배경을 글자에 절대 안 쓰는 색(**순수 초록**)으로 받는다. 그러면 밝기가 아니라
 * **색상**으로 갈리고, 반투명 경계(안티에일리어싱)까지 그대로 살아난다.
 * 영화·방송이 크로마키를 쓰는 이유와 같다. 원본 굽기는 scripts/make-lettering.ts.
 *
 * 흰 배경 그림이 들어오면(옛 산출물) 예전 방식으로 자동 전환한다.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/** 초록 정도 = G - max(R,B). 클수록 배경 */
const KEY_HIGH = 60; // 이 이상이면 완전 투명
const KEY_LOW = 12; // 이 이하면 완전 불투명 (사이는 부드러운 경사)
/** 흰 배경 폴백에서 "흰색"으로 칠 문턱 */
const WHITE = 238;

const ROOT = process.cwd();
const IN_DIR = path.join(ROOT, "직녀", "레터링", "gpt");
const OUT_DIR = path.join(ROOT, "public", "home", "lettering");

type Cut = { data: Buffer; removed: number };

/** 배경이 초록인지 흰색인지 — 네 모서리를 보고 정한다 */
function detectBg(data: Buffer, w: number, h: number, ch: number): "green" | "white" {
  const at = (x: number, y: number) => {
    const o = (y * w + x) * ch;
    return [data[o], data[o + 1], data[o + 2]];
  };
  const pts = [at(3, 3), at(w - 4, 3), at(3, h - 4), at(w - 4, h - 4)];
  const green = pts.filter(([r, g, b]) => g - Math.max(r, b) > KEY_HIGH).length;
  return green >= 3 ? "green" : "white";
}

/** 크로마키 — 색상으로 가른다. 경계는 경사로 부드럽게, 초록 번짐은 눌러 없앤다. */
function chroma(data: Buffer, w: number, h: number, ch: number): Cut {
  const out = Buffer.alloc(w * h * 4);
  let removed = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const key = g - Math.max(r, b);

    let a: number;
    if (key >= KEY_HIGH) a = 0;
    else if (key <= KEY_LOW) a = 255;
    else a = Math.round(255 * (1 - (key - KEY_LOW) / (KEY_HIGH - KEY_LOW)));
    if (a === 0) removed++;

    // 초록 번짐 제거 — 글자 가장자리에 밴 초록기를 이웃 채널 수준으로 눌러 준다.
    // 안 하면 어두운 카드 위에서 글자 테두리가 형광 초록으로 뜬다.
    const gClamped = Math.min(g, Math.round((r + b) / 2 + 8));

    out[i * 4] = r;
    out[i * 4 + 1] = gClamped;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return { data: out, removed };
}

/** 흰 배경 폴백 — 가장자리에서 시작하는 flood fill(글자 안쪽 하이라이트는 안 뚫린다) */
function whiteFlood(data: Buffer, w: number, h: number, ch: number): Cut {
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
  const out = Buffer.alloc(w * h * 4);
  let removed = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    out[i * 4] = data[o];
    out[i * 4 + 1] = data[o + 1];
    out[i * 4 + 2] = data[o + 2];
    out[i * 4 + 3] = bg[i] ? 0 : 255;
    if (bg[i]) removed++;
  }
  return { data: out, removed };
}

async function cut(slug: string, src: string) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const kind = detectBg(data, w, h, ch);
  const res = kind === "green" ? chroma(data, w, h, ch) : whiteFlood(data, w, h, ch);
  const out = res.data;

  // 투명 여백 잘라내기 — sharp 의 trim() 은 RGB 만 보는 판이 있어 배경이 단색이면
  // 엉뚱하게 자른다. 알파로 직접 경계를 잡는다.
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
  if (x1 < 0) throw new Error(`${slug}: 남은 그림이 없습니다 — 문턱값을 보세요`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dest = path.join(OUT_DIR, `${slug}.webp`);
  // 카드에서 이 그림이 차지하는 폭은 300px 남짓 — 2배(900)면 충분하다.
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(dest);

  const m = await sharp(dest).metadata();
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(
    `  ${slug}.webp  ${m.width}×${m.height}  ${kb}KB  · ${kind === "green" ? "크로마키" : "흰배경"} ${Math.round((res.removed / (w * h)) * 100)}% 제거`,
  );
}

async function main() {
  if (!fs.existsSync(IN_DIR)) {
    console.log(`${path.relative(ROOT, IN_DIR)} 가 없습니다 — GPT 산출물을 여기에 <slug>_gpt.png 로 두세요.`);
    return;
  }
  const jobs = fs
    .readdirSync(IN_DIR)
    .filter((f) => f.endsWith("_gpt.png"))
    .map((f) => ({ slug: f.replace(/_gpt\.png$/, ""), src: path.join(IN_DIR, f) }));

  if (!jobs.length) {
    console.log("자를 그림이 없습니다.");
    return;
  }
  console.log("레터링 누끼 → public/home/lettering/");
  for (const j of jobs) await cut(j.slug, j.src);
  console.log(`\n${jobs.length}장 완료. src/config/home.ts 의 LETTERING 에 등록하면 카드가 씁니다.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
