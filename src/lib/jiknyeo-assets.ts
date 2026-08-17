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

// 2026-08-17 스토리 개편(형님 확정): 산군 분리 + 날실·씨실·베틀 용어 폐기 →
// 견우직녀 설화(전 국민이 아는 이야기)로 전면 교체. 베틀은 '직녀의 소품'으로만 남는다
// (직녀가 베 짜는 여자라는 건 설화에 있어 설명이 필요 없다 — 금지는 그림이 아니라 용어다).
export const SLOTS: { id: SlotId; label: string; note: string; video?: boolean }[] = [
  { id: "j3", label: "J3 · 첫 화면", note: "은하수 아래 베틀에 앉은 직녀 — 멀리서", video: true },
  { id: "j1", label: "J1 · 정면 반신", note: "기준 얼굴(시드). 고개 살짝 기울임", video: true },
  { id: "j2", label: "J2 · 옆모습", note: "달력을 내려다보는 옆모습 — 반론 처리 자리" },
  { id: "w1", label: "웹툰 1 · 은하수", note: "밤하늘을 가르는 은하수 — 설화의 시작" },
  { id: "w2", label: "웹툰 2 · 기다리는 직녀", note: "창가에서 밤하늘을 보며 날을 세는 모습" },
  { id: "w3", label: "웹툰 3 · 확신의 얼굴", note: "달력 앞, 만나는 날을 아는 사람의 표정" },
  { id: "w4", label: "웹툰 4 · 까치 다리", note: "까치들이 은하수 위로 다리를 놓는 장관" },
  { id: "w5", label: "웹툰 5 · 당신에게도", note: "직녀가 손님 쪽을 돌아보는 컷" },
  { id: "w6", label: "웹툰 6 · 지나간 달", note: "넘겨진 달력 장들 — 아무도 몰랐던 날들" },
  { id: "w7", label: "웹툰 7 · 약속", note: "정면, 달 하나를 짚어 보이는 직녀" },
  { id: "t2", label: "T2 · 다리 없는 밤", note: "별 없는 캄캄한 밤하늘 — 대부분의 달" },
  { id: "t3", label: "T3 · 다리가 놓이는 밤", note: "까치 다리가 빛나는 밤 — 만나는 달" },
  { id: "t4", label: "T4 · 가려진 달력", note: "달 이름만 가려진 12칸 — 잠금 블록(티저 2차)" },
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
