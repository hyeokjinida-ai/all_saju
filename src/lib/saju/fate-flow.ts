import { computeDaeunTimeline, type SajuAnalysisResponse } from "./saju-api";

export type FateFlowPoint = {
  ageStart: number;
  ageEnd: number;
  favor: "유리" | "보통" | "조심" | "무거움";
  current: boolean;
};
export type FateFlow = { points: FateFlowPoint[] };

// Use the paid report's classifications; chart height is ordinal, not a success score.
// Missing analysis must never turn into an invented neutral curve or a fake current point.
export function buildFateFlow(analysis: SajuAnalysisResponse): FateFlow | null {
  const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const daeun = record(analysis.daeun);
  const all = Array.isArray(daeun.all_daeun) ? daeun.all_daeun : [];
  const gg = record(analysis.gyeokguk);
  const validElement = (value: unknown) => typeof value === "string" && ["목", "화", "토", "금", "수"].includes(value);
  const validAge = (value: unknown) => (typeof value === "number" || typeof value === "string" && value.trim() !== "")
    && Number.isFinite(Number(value)) && Number(value) >= 0;
  if (!validElement(record(gg.yongsin).오행) && !validElement(gg.희신오행)) return null;
  if (all.length < 2 || all.some((item) => {
    const row = record(item);
    return !/^[갑을병정무기경신임계]/.test(String(row.ganji ?? ""))
      || !validAge(row.age_start) || !validAge(row.age_end)
      || Number(row.age_end) < Number(row.age_start);
  })) return null;

  const hasCurrentAge = validAge(daeun.current_age);
  const points = computeDaeunTimeline(analysis).map(row => {
    const match = /^(\d+)~(\d+)세$/.exec(row.range);
    if (!match || !["유리", "보통", "조심", "무거움"].includes(row.favor)) return null;
    return { ageStart: Number(match[1]), ageEnd: Number(match[2]),
      favor: row.favor as FateFlowPoint["favor"], current: hasCurrentAge && row.when === "now" };
  }).filter((point): point is FateFlowPoint => point !== null).sort((a, b) => a.ageStart - b.ageStart);
  if (points.length < 2 || points.some((point, i) => i > 0 && point.ageStart <= points[i - 1].ageEnd)) return null;
  // Six readable age labels, including the actual current interval when present.
  const currentIndex = points.findIndex(point => point.current);
  const start = Math.max(0, Math.min(currentIndex - 2, points.length - 6));
  return { points: points.slice(start, start + 6) };
}
