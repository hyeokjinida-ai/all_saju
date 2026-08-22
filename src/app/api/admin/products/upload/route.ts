// 상품 카드 그림 업로드 — 어드민 전용.
//
// 원본 한 장을 받아 **홈이 실제로 쓰는 세 크기로 잘라서** 넣는다(hero/big/row).
// 자르는 규칙은 scripts/make-home-art.ts 와 같다 — 4:5 로 자르고, 세로 위치는
// 어드민이 슬라이더로 준 pos 를 따른다. 그래야 어드민 미리보기와 홈이 같은 그림이 된다.
//
// ⚠ Vercel 라우트 본문 한도가 4.5MB 라 상한을 4MB 로 둔다.
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = /^image\/(webp|png|jpeg|avif)$/;

const SIZES = {
  hero: { w: 864, h: 1080 },
  big: { w: 600, h: 752 },
  row: { w: 400, h: 500 },
} as const;

type Slot = keyof typeof SIZES;

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const slot = String(form.get("slot") ?? "row") as Slot;
  const slug = String(form.get("slug") ?? "misc").replace(/[^a-z0-9-]/gi, "") || "misc";
  const posX = Number(form.get("posX") ?? 50) / 100;
  const posY = Number(form.get("posY") ?? 50) / 100;

  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!ALLOWED.test(file.type)) return NextResponse.json({ error: `지원하지 않는 형식: ${file.type}` }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다 (${Math.round(file.size / 1024)}KB · 4MB까지)` }, { status: 400 });
  }
  if (!(slot in SIZES)) return NextResponse.json({ error: "slot 이 이상합니다" }, { status: 400 });

  const { w, h } = SIZES[slot];
  let webp: Buffer;
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: false });
    const meta = await input.metadata();
    const sw = meta.width ?? 0;
    const sh = meta.height ?? 0;
    if (!sw || !sh) throw new Error("이미지 크기를 못 읽었습니다");

    // 원본 안에 들어가는 가장 큰 4:5 창
    const target = w / h;
    let cw = sw;
    let ch = Math.round(sw / target);
    if (ch > sh) {
      ch = sh;
      cw = Math.round(sh * target);
    }
    const left = Math.max(0, Math.min(sw - cw, Math.round(posX * sw - cw / 2)));
    const top = Math.max(0, Math.min(sh - ch, Math.round(posY * sh - ch / 2)));

    webp = await input
      .extract({ left, top, width: cw, height: ch })
      .resize(w, h, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    return NextResponse.json({ error: `이미지를 자르지 못했습니다: ${(e as Error).message}` }, { status: 400 });
  }

  const key = `products/${slug}/${slot}-${Date.now().toString(36)}.webp`;
  const db = createServiceClient();
  const { error } = await db.storage
    .from("product-art")
    .upload(key, webp, { contentType: "image/webp", upsert: false });
  if (error) {
    const msg = error.message.toLowerCase().includes("bucket")
      ? "product-art 버킷이 없습니다 — 0011 마이그레이션을 먼저 적용하세요"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data } = db.storage.from("product-art").getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl, key, bytes: webp.length });
}
