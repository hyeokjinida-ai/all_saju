// 상품 에셋 — **파일을 폴더에 던지면 그 자리가 켜진다**(코드 수정 0).
//
// 직녀 전용이던 readJiknyeoAssets 의 상품 고정을 푼 판(2026-08-23).
// 슬롯은 이름으로만 약속하고, 실제 파일 유무는 요청 시점에 디스크를 봐서 정한다:
//   · <id>.webp|png|jpg 있으면 → 그 컷이 이미지로 뜬다
//   · <id>.mp4 같이 있으면  → 자동으로 영상으로 승격된다(이미지는 poster 로 남는다)
//   · 아무것도 없으면       → 라벨 붙은 플레이스홀더 (페이지는 그대로 성립한다)
//
// ⚠ 서버 전용이다(node:fs). 클라이언트 컴포넌트에서 import 하면 빌드가 깨진다 —
//    page.tsx(서버)에서 읽어 props 로 내려보낸다. 라벨·노트만 필요한 화면은 슬롯 정의를 직접 가져간다.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Asset, AssetMap, SlotDef } from "@/components/kit/scale";

/** public/<dir> 를 훑어 실제로 있는 파일만 URL 로 만든다. dir 은 "products/jiknyeo" 처럼 public 아래 경로. */
export function readProductAssets(dir: string, slots: readonly SlotDef[]): AssetMap {
  const base = join(process.cwd(), "public", ...dir.split("/"));
  const out: AssetMap = {};
  for (const { id } of slots) {
    const a: Asset = {};
    for (const ext of ["webp", "png", "jpg"]) {
      if (existsSync(join(base, `${id}.${ext}`))) {
        a.img = `/${dir}/${id}.${ext}`;
        break;
      }
    }
    if (existsSync(join(base, `${id}.mp4`))) a.video = `/${dir}/${id}.mp4`;
    if (a.img || a.video) out[id] = a;
  }
  return out;
}

/** 채워진 슬롯 수 — 개발 중 진행률 표시에 쓴다(운영에선 안 보인다). */
export function assetProgress(map: AssetMap, slots: readonly SlotDef[]): { filled: number; total: number } {
  return { filled: Object.keys(map).length, total: slots.length };
}
