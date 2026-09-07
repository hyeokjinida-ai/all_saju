"use client";

/**
 * 직녀 말풍선 자리표 + **화면에서 직접 옮기는 편집 모드**의 저장소.
 *
 * 왜 필요한가: 말풍선 자리는 그림마다 다르다. 코드에 좌표를 박아 두면 한 번 고칠 때마다
 * 「고치고 → 빌드하고 → 폰으로 보고」를 반복해야 해서, 결국 눈대중으로 대충 맞추고 끝난다
 * (운영에서 눈 1·손 2 를 가리고 있던 게 그렇게 나왔다).
 *
 * `?edit=say` 로 들어가면 말풍선을 **끌어서** 옮기고 폭·글씨를 조절할 수 있고,
 * 값은 브라우저에 저장된다. 다 맞춘 뒤 「코드 복사」를 누르면 아래 SAY_BOX 를 덮어쓸
 * 조각이 클립보드에 담긴다.
 *
 * 손님 화면에는 아무 영향이 없다 — 편집 모드는 쿼리로만 열리고, 저장값도 편집 모드에서만 읽는다.
 */
import { useCallback, useSyncExternalStore } from "react";

export type SayBox = {
  /** 컷 폭 기준 % — 말풍선 왼쪽 */
  x: number;
  /** 컷 높이 기준 % — 말풍선 위쪽 */
  y: number;
  /** 컷 폭 기준 % — 말풍선(원) 지름 */
  w: number;
};

/**
 * 컷별 기본 자리 — **그림을 재서 박은 값**(2026-08-24, 390px 폰 실측).
 *
 *   컷    얼굴            손·소품                      앉힌 자리
 *   j1    x30~62 y8~40    —                            좌하단(치마·어두운 배경)
 *   w3    x15~85 y0~62    — (클로즈업이라 빈 곳 없음)   하단(턱 아래 목·옷깃)
 *   j2    x38~62 y10~42   두루마리 x0~35 y60~85        우하단(한복 옷자락)
 *   t14   x33~62 y5~35    **손 x20~50 y72~95**         좌상단(은하수)
 *   w7    x55~80 y8~35    달력 x25~72 · 손가락 y45~57  좌상단(달·창)
 *
 * 규칙(청월당 티저원본 result_02·07·09 실측): 눈·입·손 위에는 **절대** 안 얹는다.
 * 머리카락 윤곽을 한 조각 스치는 건 저쪽도 한다 — 인물을 전부 피해 허공에 띄우면
 * 말풍선이 대사가 아니라 UI 라벨로 보인다.
 *
 * 폭은 대사 길이가 정한다. 글씨 16px 기준 **10글자 ≈ 폭 47%** 가 한계다(원 안쪽 현 길이).
 * 그림을 새로 구우면 이 표부터 다시 잰다.
 */
export const SAY_BOX_DEFAULT: Record<string, SayBox> = {
  j1: { x: 3, y: 54, w: 47 },
  w3: { x: 1, y: 53, w: 47 },
  j2: { x: 51, y: 53, w: 47 },
  t14: { x: 2, y: 4, w: 36 },
  w7: { x: 2, y: 1, w: 44 },
};

/** 말풍선 글씨 크기(px) 기본값. 본문 15.5px 보다 커야 대사로 읽힌다. */
export const SAY_FONT_DEFAULT = 16;

const STORAGE_KEY = "jiknyeo.sayBox.v1";

type Store = { boxes: Record<string, SayBox>; font: number };

let store: Store = { boxes: {}, font: SAY_FONT_DEFAULT };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>;
      store = { boxes: p.boxes ?? {}, font: typeof p.font === "number" ? p.font : SAY_FONT_DEFAULT };
    }
  } catch {
    /* 저장값이 깨졌으면 그냥 기본값으로 간다 — 편집 도구가 화면을 못 띄우게 하면 안 된다 */
  }
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 사파리 시크릿 등 — 저장만 실패하고 편집은 계속된다 */
  }
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** `?edit=say` 인가 — 편집 모드는 이 쿼리로만 열린다. */
export function isSayEditMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("edit") === "say";
}

export function useSayStore(): Store {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return store;
    },
    () => ({ boxes: {}, font: SAY_FONT_DEFAULT }),
  );
}

export function setSayBox(id: string, box: SayBox) {
  store = { ...store, boxes: { ...store.boxes, [id]: box } };
  save();
  emit();
}

export function setSayFont(px: number) {
  store = { ...store, font: Math.max(11, Math.min(24, Math.round(px))) };
  save();
  emit();
}

export function resetSayBoxes() {
  store = { boxes: {}, font: SAY_FONT_DEFAULT };
  save();
  emit();
}

/**
 * 편집 모드에서 만진 값이 있으면 그것을, 없으면 코드가 넘겨준 자리를 쓴다.
 *
 * ⚠ `fromCode` 가 없으면 **아무 자리도 주지 않는다**(기본표로 넘어가지 않는다).
 * 같은 슬롯 id 를 상품 상세(JiknyeoDetail)도 쓰는데 거기는 컷 비율·크롭이 달라서,
 * id 만 보고 티저용 좌표를 얹으면 상세 화면의 말풍선이 엉뚱한 데로 간다.
 */
export function useSayBox(id: string, fromCode?: SayBox) {
  const s = useSayStore();
  const edit = isSayEditMode() && !!fromCode;
  const box = (edit ? s.boxes[id] : undefined) ?? fromCode;
  const font = edit ? s.font : SAY_FONT_DEFAULT;
  return { box, font, edit };
}

/** 지금 값을 코드 조각으로 — 「복사」가 담아 주는 내용. */
export function useSayCodeSnippet() {
  const s = useSayStore();
  return useCallback(() => {
    const ids = Object.keys(SAY_BOX_DEFAULT);
    const rows = ids
      .map((id) => {
        const b = s.boxes[id] ?? SAY_BOX_DEFAULT[id];
        return `  ${id}: { x: ${b.x}, y: ${b.y}, w: ${b.w} },`;
      })
      .join("\n");
    return `// src/lib/jiknyeo-say-box.ts — SAY_BOX_DEFAULT 를 이걸로 바꾸면 됩니다\nexport const SAY_BOX_DEFAULT: Record<string, SayBox> = {\n${rows}\n};\nexport const SAY_FONT_DEFAULT = ${s.font};\n`;
  }, [s]);
}
