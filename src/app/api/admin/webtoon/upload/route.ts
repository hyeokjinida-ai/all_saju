// 컷 이미지 업로드 — 어드민 전용. Storage 'webtoon' 버킷에 넣고 공개 URL을 돌려준다.
// 파일은 브라우저에서 이미 webp로 줄여서 보낸다(원본 3MB → 200KB 수준). 여기선 크기 상한만 지킨다.
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 4 * 1024 * 1024; // 줄인 뒤에도 이보다 크면 뭔가 잘못된 것
const ALLOWED = /^image\/(webp|png|jpeg|avif)$/;

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "misc").replace(/[^a-z0-9_-]/gi, "") || "misc";

  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!ALLOWED.test(file.type)) return NextResponse.json({ error: `지원하지 않는 형식: ${file.type}` }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다 (${Math.round(file.size / 1024)}KB)` }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const db = createServiceClient();
  const { error } = await db.storage
    .from("webtoon")
    .upload(key, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from("webtoon").getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl, key, bytes: file.size });
}
