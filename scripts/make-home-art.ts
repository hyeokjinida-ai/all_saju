/**
 * 홈 카드 그림 사전 생성 — `pnpm art:home`
 *
 * 왜 미리 굽나:
 *   원본은 산군 webp 840×1260, 직녀 png 1024×1536(장당 2MB) 이다. 홈은 카드 9장이라
 *   그대로 내보내면 첫 화면에 20MB 가 나간다. 그런데 이 저장소는 `next/image` 를
 *   한 곳도 안 쓰고(전부 <img>) `sharp` 도 없었다 — 런타임 최적화에 기대면
 *   새 실패 축이 생긴다. 그래서 **빌드 전에 잘라서 public/home 에 굽고** 화면은
 *   평범한 <img> 로 둔다.
 *
 * 자르는 규칙:
 *   카드는 전부 4:5(청월당 295/370 ≈ 0.797, 우리는 0.8 로 정리).
 *   원본에서 얼굴이 어디 있느냐가 다르므로 슬롯마다 `pos`(0~1, object-position 과 같은 뜻)를
 *   준다 — 0.18 이면 "세로로 18% 지점이 중심". sharp 의 extract 로 그 위치를 잘라낸다.
 *
 * 크기(2x 기준): hero 864×1080 · big 600×752 · row 400×500.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Slot = "hero" | "big" | "row";
type Job = { slug: string; slot: Slot; src: string; posY: number; posX?: number };

const SIZES: Record<Slot, { w: number; h: number }> = {
  hero: { w: 864, h: 1080 },
  big: { w: 600, h: 752 },
  row: { w: 400, h: 500 },
};

const P = (...p: string[]) => path.join(process.cwd(), "public", "products", ...p);

/** 계획서 §3-1 / §3-2 / §3-5 의 표 그대로. 원본이 없으면 그 장만 건너뛴다. */
const JOBS: Job[] = [
  // 히어로 — 표지 컷
  { slug: "sangun-sinjeom", slot: "hero", src: P("sangun", "cover.webp"), posY: 0.18 },
  { slug: "inyeon-saju", slot: "hero", src: P("jiknyeo", "j1.png"), posY: 0.14 },
  { slug: "marriage-saju", slot: "hero", src: P("jiknyeo", "j2.png"), posY: 0.16 },

  // 큰 카드 — 히어로와 같은 그림을 두 번 쓰지 않는다(형님 규칙 6)
  { slug: "sangun-sinjeom", slot: "big", src: P("sangun", "face.webp"), posY: 0.3 },
  { slug: "inyeon-saju", slot: "big", src: P("jiknyeo", "j3.png"), posY: 0.62 },
  { slug: "marriage-saju", slot: "big", src: P("jiknyeo", "t14.png"), posY: 0.3 },

  // 행 카드
  { slug: "sangun-sinjeom", slot: "row", src: P("sangun", "t1-open.webp"), posY: 0.5 },
  { slug: "inyeon-saju", slot: "row", src: P("jiknyeo", "j1.png"), posY: 0.1 },
  { slug: "marriage-saju", slot: "row", src: P("jiknyeo", "j2.png"), posY: 0.16 },
  { slug: "wealth-saju", slot: "row", src: P("wealth", "cut-hand.webp"), posY: 0.35 },
];

async function crop(job: Job) {
  const { w, h } = SIZES[job.slot];
  const out = path.join(process.cwd(), "public", "home", `${job.slug}-${job.slot}.webp`);
  if (!fs.existsSync(job.src)) {
    console.log(`  건너뜀 ${job.slug}-${job.slot} — 원본 없음 (${path.basename(job.src)})`);
    return false;
  }

  const img = sharp(job.src, { limitInputPixels: false });
  const meta = await img.metadata();
  const sw = meta.width ?? 0;
  const sh = meta.height ?? 0;
  if (!sw || !sh) throw new Error(`크기를 못 읽음: ${job.src}`);

  // 4:5 로 잘라낼 창의 크기 — 원본 안에 들어가는 최대 크기
  const target = w / h; // 0.8
  let cw = sw;
  let ch = Math.round(sw / target);
  if (ch > sh) {
    ch = sh;
    cw = Math.round(sh * target);
  }

  // 창의 좌상단 — pos 는 "창의 중심이 원본의 몇 % 지점"
  const cx = Math.round((job.posX ?? 0.5) * sw - cw / 2);
  const cy = Math.round(job.posY * sh - ch / 2);
  const left = Math.max(0, Math.min(sw - cw, cx));
  const top = Math.max(0, Math.min(sh - ch, cy));

  await img
    .extract({ left, top, width: cw, height: ch })
    .resize(w, h, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(out);

  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ${job.slug}-${job.slot}.webp  ${w}×${h}  ${kb}KB  ← ${path.basename(job.src)} (${sw}×${sh} 에서 ${cw}×${ch} @ ${left},${top})`);
  return true;
}

async function main() {
  const dir = path.join(process.cwd(), "public", "home");
  fs.mkdirSync(dir, { recursive: true });
  console.log("홈 카드 그림 굽는 중 → public/home/");
  let made = 0;
  for (const job of JOBS) if (await crop(job)) made++;
  console.log(`\n${made}/${JOBS.length} 장 완료.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
