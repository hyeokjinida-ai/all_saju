// =====================================================
// 사주 풀 분석 API 어댑터 (luckyloveme.com)
// =====================================================
// POST https://luckyloveme.com/api/saju-full-analysis
// 환경변수 SAJU_API_URL + SAJU_API_KEY 가 설정돼 있을 때만 호출됩니다.
// 호출 측은 isSajuApiConfigured() 로 분기하거나 SajuApiError 를 잡아 mock 으로 대체하세요.
//
// 자세한 응답 스키마는 운세위키 API 문서 참고: https://luckyloveme.com/api-service

import { serverEnv } from "@/lib/env";
import { recordSajuApiCall, type SajuApiSource } from "./usage";

export type AnalysisField =
  | "ganji"            // 천간지지 (사주 원국)
  | "guiin"            // 귀인 (16종)
  | "hongyeom"         // 홍염살
  | "dohwa"            // 도화살
  | "hwagae"           // 화개살
  | "bigyeonGeobjae"   // 비견 · 겁재
  | "sibisinsals"      // 12신살
  | "sipseong"         // 십성
  | "sinStrength"      // 신강 / 신약 (7단계)
  | "daeun"            // 대운 (10년 주기)
  | "seun"             // 세운 (연간)
  | "hapchung"         // 합 · 충 · 형 · 해 · 파
  | "gyeokguk"         // 격국 (억부용신)
  | "gyeokgukYongsin"  // 격국용신 (자평진전 체계) — fields 에 명시해야 반환됨
  | "twelveFortune"    // 12운성
  | "weolun";          // 월운 (최근 3개월 + 현재 + 향후 11개월)

export type BirthInfo = {
  birthYear: string;        // "1990"
  birthMonth: string;       // "5"  (1~12)
  birthDay: string;         // "15" (1~31)
  birthHour?: string;       // "14" (0~23) — 선택
  birthMinute?: string;     // "30" (0~59) — 선택
  calendarType: "양력" | "음력";
  gender: "male" | "female";
  isLeapMonth?: boolean;    // 음력 윤달
  useYajasiRule?: boolean;  // 야자시/조자시 규칙 적용
};

// 응답은 요청한 field 만 포함됩니다. 자세한 필드별 스키마는 API 문서를 따르세요.
export type SajuAnalysisResponse = Partial<Record<AnalysisField, unknown>>;

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [500, 1500, 3500];

export class SajuApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "SajuApiError";
  }
}

export function isSajuApiConfigured(): boolean {
  const env = serverEnv();
  return !!(env.SAJU_API_URL && env.SAJU_API_KEY);
}

export type FetchSajuOptions = {
  source?: SajuApiSource; // 누적 카운터에 기록될 호출 출처 (기본: "manual")
};

// 5xx / 네트워크 오류 / 타임아웃 → 최대 3회 재시도 (4xx 는 즉시 실패)
export async function fetchSajuAnalysis(
  birthInfo: BirthInfo,
  fields: AnalysisField[] = [],
  options: FetchSajuOptions = {},
): Promise<SajuAnalysisResponse> {
  const env = serverEnv();
  const source: SajuApiSource = options.source ?? "manual";
  if (!env.SAJU_API_URL || !env.SAJU_API_KEY) {
    throw new SajuApiError("SAJU_API_URL / SAJU_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  const url = env.SAJU_API_URL;
  const apiKey = env.SAJU_API_KEY;

  const body = JSON.stringify({ ...birthInfo, fields });
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 3500);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SajuBookClient/1.0",
          "X-SAJU-BOOK-API-KEY": apiKey,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as SajuAnalysisResponse;
        await recordSajuApiCall(true, source);
        return data;
      }

      // 4xx 는 입력 오류 — 재시도해도 의미 없으므로 즉시 실패
      if (res.status < 500) {
        const detail = await res.text().catch(() => "");
        await recordSajuApiCall(false, source);
        throw new SajuApiError(`Saju API ${res.status}: ${detail || res.statusText}`, res.status);
      }

      lastError = new SajuApiError(`Saju API ${res.status}`, res.status);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof SajuApiError && err.status && err.status < 500) throw err;
      lastError = err;
    }
  }

  // 모든 재시도 소진 → 실패로 기록
  await recordSajuApiCall(false, source);
  if (lastError instanceof Error) throw lastError;
  throw new SajuApiError("Saju API 요청이 최대 재시도 횟수를 초과했습니다.");
}

// 분석 응답 → LLM 프롬프트용 한국어 텍스트
export function formatSajuToManseryeok(
  analysis: SajuAnalysisResponse,
  birthInfo: BirthInfo,
): string {
  const head = [
    `[명식 기본 정보]`,
    `생년월일: ${birthInfo.birthYear}-${pad2(birthInfo.birthMonth)}-${pad2(birthInfo.birthDay)} (${birthInfo.calendarType}${birthInfo.isLeapMonth ? ", 윤달" : ""})`,
    birthInfo.birthHour != null && birthInfo.birthHour !== ""
      ? `출생시각: ${pad2(birthInfo.birthHour)}:${pad2(birthInfo.birthMinute ?? "00")}`
      : `출생시각: 모름`,
    `성별: ${birthInfo.gender === "male" ? "남성" : "여성"}`,
  ].join("\n");

  // 출력 순서를 보기 좋게 고정
  const order: { key: AnalysisField; label: string }[] = [
    { key: "ganji",          label: "천간지지 (사주 원국)" },
    { key: "sipseong",        label: "십성" },
    { key: "sinStrength",     label: "신강/신약" },
    { key: "gyeokguk",        label: "격국 (억부용신)" },
    { key: "gyeokgukYongsin", label: "격국용신 (자평진전)" },
    { key: "twelveFortune",   label: "12운성" },
    { key: "daeun",          label: "대운" },
    { key: "seun",           label: "세운" },
    { key: "weolun",         label: "월운" },
    { key: "guiin",          label: "귀인" },
    { key: "hongyeom",       label: "홍염살" },
    { key: "dohwa",          label: "도화살" },
    { key: "hwagae",         label: "화개살" },
    { key: "sibisinsals",    label: "12신살" },
    { key: "bigyeonGeobjae", label: "비견/겁재" },
    { key: "hapchung",       label: "합·충·형·해·파" },
  ];

  const sections = order
    .map(({ key, label }) => {
      const value = analysis[key];
      if (value == null) return null;
      return `[${label}]\n${stringifyValue(value)}`;
    })
    .filter((v): v is string => !!v);

  return [head, ...sections].join("\n\n");
}

// ── LLM 입력 다이어트 ────────────────────────────────
// 전체(formatSajuToManseryeok)는 ~31k 토큰이라 좋은 모델에서 분당 한도에 걸리고 비용도 큼.
// 결과지 생성에 실제로 필요한 핵심만 추려 ~6~9k 토큰으로 줄인 버전.
// - 세운: 수십 년치 배열 대신 '올해(currentSeun)' + 향후 몇 년만
// - 대운: all_daeun 전체·계산 메타 제거, current/next 와 간단 목록만
// - 월운: 12개월 핵심만
export function formatSajuCompact(
  analysis: SajuAnalysisResponse,
  birthInfo: BirthInfo,
): string {
  const head = [
    `[명식 기본 정보]`,
    `생년월일: ${birthInfo.birthYear}-${pad2(birthInfo.birthMonth)}-${pad2(birthInfo.birthDay)} (${birthInfo.calendarType}${birthInfo.isLeapMonth ? ", 윤달" : ""})`,
    birthInfo.birthHour != null && birthInfo.birthHour !== ""
      ? `출생시각: ${pad2(birthInfo.birthHour)}:${pad2(birthInfo.birthMinute ?? "00")}`
      : `출생시각: 모름`,
    `성별: ${birthInfo.gender === "male" ? "남성" : "여성"}`,
  ].join("\n");

  const sections: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value == null) return;
    const text = stringifyValue(value).trim();
    if (text) sections.push(`[${label}]\n${text}`);
  };

  // 그대로 넣어도 작은 핵심 분석들
  push("천간지지 (사주 원국)", analysis.ganji);
  push("십성", analysis.sipseong);
  push("신강/신약", analysis.sinStrength);
  push("격국 (억부용신)", analysis.gyeokguk);
  push("격국용신 (자평진전)", analysis.gyeokgukYongsin);
  push("12운성", analysis.twelveFortune);

  // 대운: 무거운 메타/전체배열 제거, 핵심만
  const daeun = analysis.daeun as Record<string, unknown> | undefined;
  if (daeun) {
    const slim: Record<string, unknown> = {
      현재나이: daeun.current_age,
      대운시작나이: daeun.daeun_start_age,
      방향: daeun.direction,
      현재대운: daeun.current_daeun,
      다음대운: daeun.next_daeun,
    };
    // 전체 대운 목록은 'ganji + 나이구간'만 한 줄로 요약
    const all = daeun.all_daeun as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(all)) {
      slim["대운목록"] = all
        .map((d) => `${d.age_start}~${d.age_end}세 ${d.ganji ?? ""}`)
        .join(" / ");
    }
    push("대운", slim);
  }

  // 세운: 올해(currentSeun) + (있으면) 향후 몇 년만
  const seun = analysis.seun as Record<string, unknown> | undefined;
  if (seun) {
    const slim: Record<string, unknown> = { 올해: seun.currentSeun };
    const list = (seun.seunList ?? seun.list ?? seun.upcomingSeun) as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(list)) {
      const cur = (seun.currentSeun as Record<string, unknown>)?.year as number | undefined;
      const future = list
        .filter((s) => typeof s.year === "number" && (cur == null || (s.year as number) >= cur))
        .slice(0, 4)
        .map((s) => `${s.year} ${s.ganji ?? ""}: ${s.interpretation ?? ""}`.trim());
      if (future.length) slim["향후흐름"] = future;
    }
    push("세운(올해 중심)", slim);
  }

  // 월운: 핵심만 (이미 12개월 정도라 그대로)
  push("월운", analysis.weolun);

  // 신살류는 간단해서 그대로
  push("도화살", analysis.dohwa);
  push("귀인", analysis.guiin);
  push("12신살", analysis.sibisinsals);
  push("합·충·형·해·파", analysis.hapchung);

  return [head, ...sections].join("\n\n");
}

// ── 확정 사실 카드 ("떠먹이기") ──────────────────────
// 명식/대운/세운/용신은 AI가 직접 추론하면 자주 틀리거나(환각) 두루뭉술해진다.
// 이미 계산된 핵심 사실을 한눈에 박아 넣어, 모델은 추론 대신 "그대로 인용해 풀어쓰기"만 하게 한다.
// (덜 똑똑한 모델일수록 효과 큼. 강의안 3교시 "명식·대운은 프로그램으로 고정" 원칙.)
export function buildKeyFactsBlock(
  analysis: SajuAnalysisResponse,
  birthInfo: BirthInfo,
): string {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const s = (v: unknown): string => (v == null ? "" : String(v));
  const lines: string[] = [];

  // 일간(나 자신) + 오행/음양
  const day = rec(rec(analysis.ganji).day);
  if (day.gan) {
    const oh = s(rec(day.ohaeng).gan);
    const eum = s(rec(day.eumyang).gan);
    lines.push(
      `- 일간(나 자신): ${s(day.gan)}${day.ganHanja ? `(${s(day.ganHanja)})` : ""}` +
        (oh ? ` — ${eum}${oh}(오행 ${oh})` : ""),
    );
  }

  // 오행 분포 (없는 기운 강조)
  const oc = rec(rec(rec(rec(analysis.sipseong).cheonganHap).ohaengImpact).originalCount);
  if (Object.keys(oc).length) {
    const order = ["목", "화", "토", "금", "수"];
    const parts = order.map((k) => `${k}${s(oc[k] ?? 0)}`).join(" ");
    const missing = order.filter((k) => !Number(oc[k]));
    lines.push(`- 오행 분포: ${parts}${missing.length ? ` (없는 기운: ${missing.join("·")})` : ""}`);
  }

  // 십성 분포
  const sum = rec(rec(analysis.sipseong).summary);
  if (Object.keys(sum).length) {
    lines.push(
      `- 십성 분포: 인성${s(sum.inseong ?? 0)} 식상${s(sum.siksang ?? 0)} 비겁${s(sum.bigyeop ?? 0)} 재성${s(sum.jaeseong ?? 0)} 관성${s(sum.gwanseong ?? 0)}`,
    );
  }

  // 신강/신약
  const sin = rec(analysis.sinStrength);
  if (sin.strength) {
    lines.push(
      `- 신강도: ${s(sin.strength)}${sin.level ? `(${s(sin.level)}/7단계)` : ""}${sin.qualitativeType ? ` · ${s(sin.qualitativeType)}` : ""}`,
    );
  }

  // 격국 · 용신 · 희신 · 기신
  const gg = rec(analysis.gyeokguk);
  const yong = rec(gg.yongsin);
  const ggBits: string[] = [];
  if (gg.name) ggBits.push(`격국 ${s(gg.name)}`);
  if (yong.오행) ggBits.push(`용신 ${s(yong.오행)}${yong.십신 ? `(${s(yong.십신)})` : ""}`);
  if (gg.희신오행) ggBits.push(`희신 ${s(gg.희신오행)}`);
  if (gg.기신오행) ggBits.push(`기신 ${s(gg.기신오행)}`);
  if (ggBits.length) lines.push(`- ${ggBits.join(" · ")}`);

  // 만 나이 · 현재/다음 대운
  const daeun = rec(analysis.daeun);
  if (daeun.current_age != null) lines.push(`- 현재 만나이: ${s(daeun.current_age)}세`);
  const cd = rec(daeun.current_daeun);
  if (cd.ganji)
    lines.push(
      `- 현재 대운: ${s(cd.ganji)}${cd.ganji_hanja ? `(${s(cd.ganji_hanja)})` : ""} · ${s(cd.age_start)}~${s(cd.age_end)}세(${s(cd.year_start)}~${s(cd.year_end)})`,
    );
  const nd = rec(daeun.next_daeun);
  if (nd.ganji) lines.push(`- 다음 대운: ${s(nd.ganji)} · ${s(nd.age_start)}~${s(nd.age_end)}세부터(${s(nd.year_start)}~)`);

  // 올해 세운
  const cs = rec(rec(analysis.seun).currentSeun);
  if (cs.ganji) {
    const rel = rec(cs.sipseongRelation);
    const relStr = rel.gan || rel.ji ? ` · 십성 ${s(rel.gan)}/${s(rel.ji)}` : "";
    const tf = s(rec(cs.twelveFortune).fortune);
    lines.push(
      `- 올해(${s(cs.year)}) 세운: ${s(cs.ganji)}${cs.ganji_hanja ? `(${s(cs.ganji_hanja)})` : ""}${relStr}${tf ? ` · 12운성 ${tf}` : ""}`,
    );
  }

  // birthInfo 는 시그니처 일관성용(추후 절기·진태양시 보정 표기 등에 사용). 현재는 미사용.
  void birthInfo;

  if (!lines.length) return "";
  return `[확정 사실 — 이미 계산된 값이다. 절대 다시 계산하지 말고 그대로 인용해 풀어쓸 것]\n${lines.join("\n")}`;
}

// API 호출 + 텍스트 변환을 한 번에 실행 (전체 fields 자동 요청)
export async function generateManseryeok(
  birthInfo: BirthInfo,
  options: FetchSajuOptions = {},
): Promise<string> {
  const analysis = await fetchSajuAnalysis(birthInfo, [], options); // [] = 전체
  return formatSajuToManseryeok(analysis, birthInfo);
}

// luckyloveme ganji 응답 → 기존 Myeongsik (4기둥 단순 형식)
// MyeongsikTable 컴포넌트에 그대로 꽂아쓸 수 있는 형식으로 변환
export type SimpleMyeongsik = {
  year: { cheongan: string; jiji: string };
  month: { cheongan: string; jiji: string };
  day: { cheongan: string; jiji: string };
  hour: { cheongan: string; jiji: string } | null;
};

export function ganjiToMyeongsik(analysis: SajuAnalysisResponse): SimpleMyeongsik | null {
  const g = analysis.ganji as
    | {
        year: { gan: string; ji: string };
        month: { gan: string; ji: string };
        day: { gan: string; ji: string };
        hour?: { gan: string; ji: string };
      }
    | undefined;
  if (!g) return null;
  const pillar = (p: { gan: string; ji: string }) => ({ cheongan: p.gan, jiji: p.ji });
  return {
    year: pillar(g.year),
    month: pillar(g.month),
    day: pillar(g.day),
    hour: g.hour ? pillar(g.hour) : null,
  };
}

// ── helpers ───────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pad2(v: string | number): string {
  const s = String(v);
  return s.length >= 2 ? s : `0${s}`;
}

function stringifyValue(v: unknown, indent = ""): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) {
    return v
      .map((item) => `${indent}- ${stringifyValue(item, indent + "  ").replace(/^\n+/, "")}`)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        const formatted = stringifyValue(val, indent + "  ");
        return formatted.includes("\n")
          ? `${indent}${k}:\n${formatted}`
          : `${indent}${k}: ${formatted}`;
      })
      .join("\n");
  }
  return JSON.stringify(v);
}
