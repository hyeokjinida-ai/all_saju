// 직녀 에셋 슬롯 — **파일을 폴더에 던지면 그 자리가 켜진다.** 코드 수정 0.
//
// 왜 이렇게 하나: 그림채 확정이 늦어져도 랜딩을 먼저 완성해 두려고 만들었다.
// 슬롯은 이름으로만 약속하고, 실제 파일 유무는 **빌드/요청 시점에 디스크를 봐서** 정한다.
//   · <id>.webp 있으면 → 그 컷이 이미지로 뜬다
//   · <id>.mp4  같이 있으면 → 자동으로 영상으로 승격된다(webp 는 poster 로 남는다)
//   · 아무것도 없으면 → 라벨 붙은 달빛 플레이스홀더 (페이지는 그대로 성립한다)
//
// ⚠ 서버 전용이다(node:fs). 클라이언트 컴포넌트에서 import 하지 말 것 —
//    page.tsx(서버)에서 읽어 props 로 내려보낸다.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { JIKNYEO_DIR, SLOTS, type Asset, type AssetMap, type SlotId } from "./jiknyeo-slots";

// 정의는 jiknyeo-slots.ts 한 곳에만 둔다 — 여기선 다시 내보내기만 한다(기존 import 경로 유지).
export { JIKNYEO_DIR, SLOTS };
export type { Asset, AssetMap, SlotId };


/** public/products/jiknyeo 를 훑어 실제로 있는 파일만 URL 로 만든다. */
export function readJiknyeoAssets(): AssetMap {
  const base = join(process.cwd(), "public", "products", "jiknyeo");
  const out: AssetMap = {};
  for (const { id } of SLOTS) {
    const a: Asset = {};
    for (const ext of ["webp", "png", "jpg"]) {
      if (existsSync(join(base, `${id}.${ext}`))) {
        a.img = `/${JIKNYEO_DIR}/${id}.${ext}`;
        break;
      }
    }
    if (existsSync(join(base, `${id}.mp4`))) a.video = `/${JIKNYEO_DIR}/${id}.mp4`;
    // <id>_loop.mp4 가 있으면: <id>.mp4 는 인트로(1회), _loop 는 이어지는 무한 루프 (직녀 게이트 2단 재생)
    if (existsSync(join(base, `${id}_loop.mp4`))) a.loopVideo = `/${JIKNYEO_DIR}/${id}_loop.mp4`;
    if (a.img || a.video) out[id] = a;
  }
  return out;
}

/** 채워진 슬롯 수 — 개발 중 진행률 표시에 쓴다(운영에선 안 보인다). */
export function assetProgress(map: AssetMap): { filled: number; total: number } {
  return { filled: Object.keys(map).length, total: SLOTS.length };
}
