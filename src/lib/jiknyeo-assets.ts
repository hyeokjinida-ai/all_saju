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

export const JIKNYEO_DIR = "products/jiknyeo";

/** 슬롯 하나 = 화면의 컷 하나. label 은 플레이스홀더에 그대로 찍혀 형님이 뭘 채울지 보인다. */
export type SlotId =
  | "j1" | "j2" | "j3"
  | "w1" | "w2" | "w3" | "w4" | "w5" | "w6" | "w7"
  | "t2" | "t3" | "t4";

export const SLOTS: { id: SlotId; label: string; note: string; video?: boolean }[] = [
  { id: "j3", label: "J3 · 베틀 전경", note: "달빛 창 + 은하수 + 까치 — 첫 화면", video: true },
  { id: "j1", label: "J1 · 정면 반신", note: "기준 얼굴(시드). 손에 나무 북", video: true },
  { id: "j2", label: "J2 · 옆모습", note: "짜다 만 천을 내려다봄 — 반론 처리 자리" },
  { id: "w1", label: "웹툰 1 · 산군의 신당", note: "갓 그림자 박수가 장부를 덮고 옆방을 본다" },
  { id: "w2", label: "웹툰 2 · 열리는 곁방", note: "문틈으로 베틀 방의 달빛이 샌다" },
  { id: "w3", label: "웹툰 3 · 베틀 앞 직녀", note: "반쯤 짠 천, 은색 씨실" },
  { id: "w4", label: "웹툰 4 · 손 클로즈업", note: "날실과 은사가 교차하는 지점을 쓸어본다" },
  { id: "w5", label: "웹툰 5 · 은하수", note: "창밖을 올려다보는 옆모습, 까치가 날아든다" },
  { id: "w6", label: "웹툰 6 · 북을 든 순간", note: "정지된 동작, 긴장" },
  { id: "w7", label: "웹툰 7 · 천을 건넨다", note: "다 짠 천 한 폭을 두 손으로" },
  { id: "t2", label: "T2 · 빈 베틀", note: "날실만 걸려 있음 — 「못 바꾸는 것」" },
  { id: "t3", label: "T3 · 은사가 지나감", note: "별무늬가 생기는 순간 — 「지나가는 것」" },
  { id: "t4", label: "T4 · 천의 끝단", note: "여기서 끊긴 자리 — 잠금 블록" },
];

export type Asset = { img?: string; video?: string };
export type AssetMap = Partial<Record<SlotId, Asset>>;

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
    if (a.img || a.video) out[id] = a;
  }
  return out;
}

/** 채워진 슬롯 수 — 개발 중 진행률 표시에 쓴다(운영에선 안 보인다). */
export function assetProgress(map: AssetMap): { filled: number; total: number } {
  return { filled: Object.keys(map).length, total: SLOTS.length };
}
