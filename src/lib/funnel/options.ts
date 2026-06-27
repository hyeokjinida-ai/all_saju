// 퍼널 선택지 — 라벨/단축라벨 (확인 화면·결과 우선순위에서 재사용)
import type { LifeStage, Concern } from "./types";

export const LIFE_STAGES: { key: LifeStage; label: string; short: string }[] = [
  { key: "early", label: "이제 막 사회에 첫발", short: "사회 첫발" },
  { key: "prime", label: "한창 일하며 달리는 중", short: "한창 달리는 중" },
  { key: "turning", label: "방향을 다시 잡는 전환점", short: "전환점" },
  { key: "late", label: "결실 · 노후를 준비하는 때", short: "결실·노후 준비" },
];

export const CONCERNS: { key: Concern; label: string; short: string }[] = [
  { key: "wealth", label: "돈 · 재물이 안 풀려요", short: "재물" },
  { key: "career", label: "일 · 진로가 막막해요", short: "진로" },
  { key: "relationship", label: "사람 · 관계에 지쳐요", short: "관계" },
  { key: "marriage", label: "결혼 · 연애가 고민이에요", short: "결혼·연애" },
  { key: "family", label: "자녀 · 가족이 마음 쓰여요", short: "가족" },
  { key: "health", label: "건강이 걱정돼요", short: "건강" },
  { key: "overall", label: "올해 전체가 궁금해요", short: "올해 전체" },
];

export const lifeStageShort = (s?: LifeStage) =>
  LIFE_STAGES.find((x) => x.key === s)?.short ?? "";
export const concernShort = (c: Concern) =>
  CONCERNS.find((x) => x.key === c)?.short ?? c;
