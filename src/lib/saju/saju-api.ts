// =====================================================
// 사주 풀 분석 API 어댑터 (luckyloveme.com)
// =====================================================
// POST https://luckyloveme.com/api/saju-full-analysis
// 환경변수 SAJU_API_URL + SAJU_API_KEY 가 설정돼 있을 때만 호출됩니다.
// 호출 측은 isSajuApiConfigured() 로 분기하거나 SajuApiError 를 잡아 mock 으로 대체하세요.
//
// 자세한 응답 스키마는 운세위키 API 문서 참고: https://luckyloveme.com/api-service

import { serverEnv } from "@/lib/env";
import { recordSajuApiCall, getUsageCount, TOTAL_LIMIT, type SajuApiSource } from "./usage";
import { birthCacheKey, getCachedAnalysis, putCachedAnalysis } from "./analysis-cache";
// 얼굴 카드 문구를 프롬프트에도 넣기 위해서만 쓴다. partner-face 는 이 파일을 type 으로만 참조하므로
// 런타임 순환이 생기지 않는다.
import { buildPartnerFace } from "./partner-face";

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

  // 영속 캐시(생일키) — demo/confirm(고객 대면·한도 소모)만 조회. manual/compare(엔진 검증)는 항상 신선.
  // 히트 시 실제 콜 0 → 한도·기록 미소모. 무료에서 저장한 결과를 결제(confirm)가 그대로 재사용(이중과금 제거).
  const useCache = source === "demo" || source === "confirm";
  const cacheKey = useCache ? birthCacheKey(birthInfo, fields) : "";
  if (useCache) {
    const cached = await getCachedAnalysis(cacheKey);
    if (cached) return cached;
  }

  // 누적 한도 강제 — 무료(demo)는 90%에서 차단해 결제(confirm) 한도를 보존.
  const used = await getUsageCount();
  const cap = source === "demo" ? Math.floor(TOTAL_LIMIT * 0.9) : TOTAL_LIMIT;
  if (used >= cap) {
    throw new SajuApiError(`사주 API 누적 한도 도달(${used}/${TOTAL_LIMIT})`, 429);
  }

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
        // 200 이어도 ganji 없는 비정상 바디(빈 객체·에러 envelope)는 캐시 금지 — 안 그러면
        // 그 생일이 영구 포이즌(무료 no_ganji·유료 'ganji missing', 재시도도 캐시히트로 무력화).
        if (useCache && data.ganji) await putCachedAnalysis(cacheKey, data);
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
  //
  // ⚠ current_age 는 **세는나이**다(2026-08-21 실측: 1993-05-15 생 → current_age 34,
  //    같은 날 만나이는 33). 그런데 우리는 이 값을 오래 「만 N세」로 라벨해 프롬프트에 넣었고,
  //    그래서 결과지가 손님 나이를 한 살 많게 적어 왔다. 손님이 제 나이를 못 알아보면
  //    나머지 풀이도 같이 의심받는 자리라 라벨을 사실에 맞춘다.
  // 숫자만 주면 모델이 나머지를 계산하다 틀리고(실측: 33세 자리에 27·36세),
  // 라벨 없이 둘 다 주면 숫자와 라벨을 섞는다 — 그래서 **짝지어** 주고 그대로 베끼게 한다.
  const daeun = rec(analysis.daeun);
  if (daeun.current_age != null) {
    const man = Number(daeun.current_age);
    lines.push(
      Number.isFinite(man)
        ? `- 독자의 현재 나이: **${man}세**(세는나이) · 만 ${man - 1}세 — 둘 중 하나를 쓰되 **숫자와 라벨을 짝지어 그대로** 옮겨 적는다.
` +
          `  「만 ${man}세」처럼 세는나이 숫자에 '만'을 붙이지 말 것.
` +
          `  ※ 대운 구간의 나이(예: 27~36세)는 별개다 — 그건 대운 자료에 적힌 대로 쓴다.`
        : `- 독자의 현재 나이: ${s(daeun.current_age)}세(세는나이) — 이 표현을 그대로 옮겨 적을 것`,
    );
  }
  const cd = rec(daeun.current_daeun);
  if (cd.ganji)
    // 한자 병기를 여기서 주면 모델이 그대로 베껴 "경신(庚申)"이 본문에 나온다(실측).
    // 결과지 문체 규칙이 '한자 병기 금지'인데 입력이 그걸 어기고 있었다 — 입력에서 뺀다.
    lines.push(
      `- 현재 대운: ${s(cd.ganji)} · ${s(cd.age_start)}~${s(cd.age_end)}세(${s(cd.year_start)}~${s(cd.year_end)})`,
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

// ── 재물 확정값 ("돈 들어오는 달" 전용) ─────────────────
// 재물그릇 점수·좋은 달·나쁜 달을 코드에서 한 번만 계산해 확정값으로 주입한다.
// 챕터 병렬 생성 시 모델이 챕터마다 점수/달을 다르게 지어내는 모순(실측: 40점↔80점,
// 같은 10월이 좋은 달이자 새는 달)을 지시문으로는 못 막아서, 값 자체를 고정한다.
export type WealthMonth = { label: string; verdict: string; score: number };
export type WealthFacts = { score: number; top: WealthMonth[]; bad: WealthMonth[] };

/** 재물 확정값의 구조체 판 — 프롬프트 문자열(buildWealthFactsBlock)과 결과지 달력 표가
 *  **같은 계산 하나**를 쓰게 뽑아냈다. 표를 따로 계산하면 결과지 본문과 표가 다른 달을 말하게 된다. */
export function computeWealthFacts(analysis: SajuAnalysisResponse): WealthFacts {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const w = rec(analysis.weolun);
  const toRow = (v: unknown): WealthMonth | null => {
    const m = rec(v);
    const j = rec(m.yongsinJudgment);
    const score = typeof j.종합점수 === "number" ? j.종합점수 : null;
    if (!m.monthLabel || score == null) return null;
    return { label: String(m.monthLabel), verdict: String(j.종합판정 ?? ""), score };
  };
  const months = [
    toRow(w.currentWeolun),
    toRow(w.nextWeolun),
    ...(Array.isArray(w.upcomingWeoluns) ? w.upcomingWeoluns.map(toRow) : []),
  ].filter((m): m is WealthMonth => m != null);

  // 재물그릇 점수 — 십성 분포·용신으로 결정적 산출(같은 명식이면 항상 같은 점수)
  const sum = rec(rec(analysis.sipseong).summary);
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const jae = n(sum.jaeseong);
  const sik = n(sum.siksang);
  const inseong = n(sum.inseong);
  const yongSipsin = String(rec(rec(rec(analysis.gyeokguk)).yongsin).십신 ?? "");
  const yongIsJae = /재/.test(yongSipsin);
  const score = Math.max(
    38,
    Math.min(92, 42 + jae * 9 + sik * 5 + (yongIsJae ? 12 : 0) - Math.max(0, inseong - 3) * 3),
  );

  let top: WealthMonth[] = [];
  let bad: WealthMonth[] = [];
  if (months.length >= 4) {
    const sorted = [...months].sort((a, b) => b.score - a.score);
    top = sorted.slice(0, 3);
    const topLabels = new Set(top.map((m) => m.label));
    bad = sorted
      .slice(-3)
      .filter((m) => !topLabels.has(m.label) && m.score < 15)
      .sort((a, b) => a.score - b.score);
  }
  return { score, top, bad };
}

export function buildWealthFactsBlock(analysis: SajuAnalysisResponse): string {
  const { score, top, bad } = computeWealthFacts(analysis);
  const lines: string[] = [];
  lines.push(`- 재물그릇 점수: ${score}점 (100점 만점) — 결과지 전체에서 이 점수 하나만 사용`);
  const fmt = (m: WealthMonth) => `${m.label}(${m.verdict}${m.verdict ? " · " : ""}${m.score}점)`;
  if (top.length) lines.push(`- 돈이 들어오는 달 TOP3: ${top.map(fmt).join(", ")}`);
  if (bad.length) lines.push(`- 돈이 새는(조심할) 달: ${bad.map(fmt).join(", ")}`);
  // 연 단위 재물 피크 — 달력 표의 "크게 벌리는 해" 행과 같은 계산. 해 얘기는
  // '크게 바뀌는 해' 장이 독점하므로 어느 장에서 쓰는지도 여기서 못 박는다.
  const years = computeWealthYears(analysis);
  if (years.length) {
    lines.push(
      `- 크게 벌리는 해: ${years.map(fmt).join(", ")} — 이 해는 '네 인생이 크게 바뀌는 해' 장에서만 언급할 것`,
    );
  }

  return `[재물 확정값 — 점수와 달은 아래 값을 그대로 인용할 것. 다른 점수·다른 달을 지어내지 말 것]\n${lines.join("\n")}`;
}

// ── 인연 확정값 ("인연 들어오는 달" 전용) ─────────────
// 점수·달·해·나이대를 코드에서 한 번 확정해 주입한다(챕터 병렬 생성 시 값이 갈라지는 1호 실측 버그 방지).
// 핵심: 용신 종합점수를 주축으로 쓰면 짝과 무관한 달이 1위가 된다(실측) → 용신은 /8로 눌러 보조축,
// 배우자 십성(여=관성, 남=재성)·배우자 자리(일지)와의 합·도화/홍염에 가중치를 준다.

// 지지 관계표 — 월운에는 hapChungRelations 가 오지 않아 코드에서 직접 계산한다.
const JIJI_YUKHAP: Record<string, string> = { 자: "축", 축: "자", 인: "해", 해: "인", 묘: "술", 술: "묘", 진: "유", 유: "진", 사: "신", 신: "사", 오: "미", 미: "오" };
const JIJI_SAMHAP: string[][] = [["신", "자", "진"], ["해", "묘", "미"], ["인", "오", "술"], ["사", "유", "축"]];
const JIJI_BANGHAP: string[][] = [["인", "묘", "진"], ["사", "오", "미"], ["신", "유", "술"], ["해", "자", "축"]];
const JIJI_CHUNG: Record<string, string> = { 자: "오", 오: "자", 축: "미", 미: "축", 인: "신", 신: "인", 묘: "유", 유: "묘", 진: "술", 술: "진", 사: "해", 해: "사" };
const JIJI_WONJIN: Record<string, string> = { 자: "미", 미: "자", 축: "오", 오: "축", 인: "유", 유: "인", 묘: "신", 신: "묘", 진: "해", 해: "진", 사: "술", 술: "사" };
const JIJI_PA: [string, string][] = [["자", "유"], ["축", "진"], ["인", "해"], ["묘", "오"], ["사", "신"], ["술", "미"]];
const JIJI_HYEONG: [string, string][] = [["인", "사"], ["사", "신"], ["인", "신"], ["축", "술"], ["술", "미"], ["축", "미"], ["자", "묘"]];

// 두 지지의 관계 — 합이 우선(인·해처럼 합과 파가 겹치면 합으로 본다)
// export: 재회예보가 **나↔상대 일지 대조**에 같은 자를 쓴다(reunion.ts). 표를 따로 만들면
// 「합이라던 달」과 「두 사람이 합」이 서로 다른 기준으로 갈린다.
export function jijiRel(a: string, b: string): { score: number; tag: string } | null {
  if (!a || !b || a === b) return null;
  if (JIJI_YUKHAP[a] === b) return { score: 14, tag: "배우자 자리와 찰떡 합" };
  if (JIJI_CHUNG[a] === b) return { score: -18, tag: "배우자 자리 흔들림" };
  if (JIJI_WONJIN[a] === b) return { score: -12, tag: "마음이 어긋나기 쉬움" };
  if (JIJI_SAMHAP.some((g) => g.includes(a) && g.includes(b))) return { score: 12, tag: "배우자 자리와 큰 합" };
  if (JIJI_BANGHAP.some((g) => g.includes(a) && g.includes(b))) return { score: 8, tag: "배우자 자리와 같은 결" };
  if (JIJI_PA.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) || JIJI_HYEONG.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
    return { score: -10, tag: "긁히기 쉬움" };
  return null;
}

// "크게 바뀌는 해"를 고를 때 보는 창(올해 포함 N년). 멀면 팔리지 않고, 너무 좁으면 고를 게 없다.
const NEAR_YEARS = 5;

// 12운성 이름 → 활력 순위(레벨 필드가 없을 때 폴백)
const FORTUNE_RANK: Record<string, number> = { 장생: 10, 목욕: 6, 관대: 9, 건록: 11, 제왕: 12, 쇠: 5, 병: 3, 사: 2, 묘: 1, 절: 1, 태: 4, 양: 7 };

// 천간·지지 한 글자 → 오행. API 가 한글로 줄 때도 한자로 줄 때도 같은 답이 나오게 둘 다 깐다.
// (한글 "신"은 천간 辛·지지 申 둘 다인데 오행이 똑같이 금이라 충돌하지 않는다.)
const OH_OF: Record<string, string> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 유: "금", 술: "토", 해: "수",
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화", 午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};

// 인연 확정값의 "계산" 부분 — 문자열 조립과 분리해서 무료 티저도 같은 값을 쓰게 한다.
// (티저에서 "2029년에 크게 바뀐다" 라고 해놓고 결제 후 결과지가 다른 해를 말하면 그 자리에서 신뢰가 끝난다.)
export type InyeonRow = {
  label: string;
  year: number;
  month: number;
  age: number;
  score: number;
  tags: string[];
  verdict: string;
};
export type InyeonFacts = {
  score: number;
  spouseCount: number;
  dohwaCount: number;
  hongyeomCount: number;
  hasCheoneul: boolean;
  hasGeumyeo: boolean;
  ilji: string;
  iljiFortune: string;
  iljiLevel: number;
  iljiHurt: boolean;
  yongOh: string;
  heeOh: string;
  meetHint: string;
  ageDir: string;
  /** 짝의 결(오행 한 글자: 목/화/토/금/수) — 얼굴 카드와 본문의 인상이 갈라지지 않게 잡는 키 */
  spouseOh: string;
  /** 정(正)=바르게 오래 가는 인연 / 편(偏)=강렬하게 끌리는 인연 */
  spouseType: "정" | "편";
  /** 상대 성별 — 얼굴 카드가 남/여 풀을 고르는 기준(손님 성별이 아니다) */
  spouseSex: "male" | "female";
  top3: InyeonRow[];
  shaky: InyeonRow[];
  topYears: InyeonRow[];
  /** 앞으로 열두 달 전부(시간순) — 티저 12칸 달력이 등급을 전부 펴려면 TOP3 밖의 달도 필요하다.
   *  top3·shaky 와 **같은 rowOf 계산**에서 나온 같은 점수다(따로 계산하면 달력과 본문이 어긋난다). */
  months: InyeonRow[];
  /** 3장 「내가 놓치는 패턴」의 판정 — 모델이 고르게 두면 명식이 달라도 같은 답이 나온다
   *  (2026-08-24 실측: 서로 다른 명식 3개가 전부 "확신이 설 때까지 안 여는 쪽"). */
  pattern: { key: "물러남" | "검증" | "설렘" | "계산"; verdict: string; cause: string };
  /** 6장 「알아보는 신호 셋」 중 코드가 정하는 둘 — 짝의 결(오행)에서 나온다 */
  signals: string[];
  /** 1장 소제목 두 곳에 쓸 장면 — 아우트라인 괄호 예시를 지우고 여기서 돌린다 */
  scenes: [string, string];
};

// ── 판정 픽 (결정론) ─────────────────────────────────────────────
// 십성 분포로 「놓치는 패턴」을 코드가 단정한다. 네 갈래로 나눈 이유: 셋으로는 재성 우세와
// 관성 우세가 같은 칸에 묶여 손님이 갈리지 않았다(실측: 지수·서윤이 같은 답).
const PATTERN_TEXT: Record<string, { verdict: string; cause: string }> = {
  설렘: {
    verdict: "좋은 사람인 걸 알면서도 설레지 않으면 흘려보내는 쪽",
    cause: "표현하고 읽어내는 힘(식상)이 커서 대화의 밀도부터 재기 때문",
  },
  물러남: {
    verdict: "상대가 애매하면 먼저 연락을 줄이고 거리를 두는 쪽",
    cause: "스스로 버티는 힘(비겁)이 크고 관계에 이름을 붙이는 자리(관성)가 약하기 때문",
  },
  계산: {
    verdict: "마음보다 조건과 생활이 맞는지를 먼저 재다가 마음이 늦게 도착하는 쪽",
    cause: "현실을 재는 힘(재성)이 관계의 이름(관성)보다 앞서 있기 때문",
  },
  검증: {
    verdict: "확신이 설 때까지 마음을 안 여는 쪽",
    cause: "관계의 기준과 책임(관성)이 뚜렷해 행동이 쌓이기 전에는 문을 안 열기 때문",
  },
};

/** 짝의 결(오행)별 「알아보는 신호」 풀 — 정(오래 가는 결)과 편(끌리는 결)이 다르게 드러난다. */
const SIGNAL_POOL: Record<string, { 정: string[]; 편: string[] }> = {
  목: {
    정: ["다음에 할 일을 먼저 제안하고 날짜를 자기가 좁힌다", "약속이 밀리면 대안을 그날 안에 내놓는다"],
    편: ["새로운 자리나 장소로 데려가려 한다", "내 계획에 자기 일정을 얹어 같이 움직이려 한다"],
  },
  화: {
    정: ["좋다는 말을 그 자리에서 한다", "연락이 늦어지면 이유를 먼저 말한다"],
    편: ["감정이 올라온 순간을 숨기지 않는다", "만나는 텀이 짧아지고 자기 사람들에게 나를 보여주려 한다"],
  },
  토: {
    정: ["지난 대화에서 들은 걸 다음 만남에서 챙긴다", "바쁜 주에도 짧게라도 상황을 알린다"],
    편: ["말보다 손이 먼저 나가 필요한 걸 해결해 둔다", "자기 생활 반경 안으로 나를 들인다"],
  },
  금: {
    정: ["시간 약속이 정확하고 어길 것 같으면 미리 알린다", "돈이나 조건 이야기를 피하지 않고 숫자로 말한다"],
    편: ["결정을 미루지 않고 그 자리에서 정한다", "애매한 관계를 오래 두지 않고 이름을 먼저 붙인다"],
  },
  수: {
    정: ["내가 지나가듯 말한 걸 기억했다가 되묻는다", "내 말을 끊지 않고 끝까지 들은 뒤 자기 생각을 붙인다"],
    편: ["대화의 결이 매번 달라 다음이 궁금해진다", "내 기분 변화를 먼저 알아채고 묻는다"],
  },
};

/** 1장 장면 풀 — 아우트라인에 예시를 적으면 모델은 고르지 않고 베낀다(실측 4/4 동일). */
const SCENE_POOL = [
  "회식 자리에서",
  "오랜만에 만난 친구 앞에서",
  "동료 결혼식 뒤풀이에서",
  "명절에 친척들이 모인 자리에서",
  "취미 모임이 끝나고 카페로 자리를 옮겼을 때",
  "일이 몰린 주에 누가 안부를 물어왔을 때",
  "친구의 소개 자리에 나가기 전날 밤",
  "퇴근길에 아는 사람과 우연히 마주쳤을 때",
];

export function computeInyeonFacts(
  analysis: SajuAnalysisResponse,
  gender: "male" | "female",
  /**
   * 인연 상대의 성별. 배우자성이 여기서 갈린다 — 명리에서 남편(남자)은 관성, 아내(여자)는 재성이라
   * 기준은 "내 성별"이 아니라 "상대 성별"이다. 손님 성별만 보면 동성 인연에서 계산이 뒤집힌다.
   * 안 주면 이성 인연으로 본다(예전 동작 그대로).
   */
  partnerSex?: "male" | "female",
): InyeonFacts {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const s = (v: unknown): string => (v == null ? "" : String(v));
  const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

  // ① 원국 앵커
  const birthYear = n(rec(rec(analysis.daeun).birth_info).year);
  const ilji = s(rec(rec(analysis.ganji).day).ji);
  const sum = rec(rec(analysis.sipseong).summary);
  // 상대가 남자면 관성, 여자면 재성. 안 물었으면 이성 인연으로 본다.
  const partner = partnerSex ?? (gender === "female" ? "male" : "female");
  const spouseCount = partner === "male" ? n(sum.gwanseong) : n(sum.jaeseong);
  const spouseMain = partner === "male" ? "정관" : "정재"; // 결혼으로 이어지는 인연
  const spouseSub = partner === "male" ? "편관" : "편재"; // 강렬한 인연

  // 짝의 결(오행) — 결제 전 얼굴 카드와 결제 후 '네 짝의 인상' 단락이 같은 사람을 그리게 하는 키다.
  // 배우자성이 붙은 글자에서 뽑되 정(正)을 먼저 보고, 배우자성이 아예 없으면 배우자궁인 일지로 본다
  // (무관·무재는 궁으로 본다는 통설. 이 폴백이 없으면 배우자성 0인 명식이 통째로 빈칸이 된다.)
  const sipCells = arr(rec(analysis.sipseong).sipseongs);
  const spouseCell =
    sipCells.find((p) => s(p.sipseong) === spouseMain) ?? sipCells.find((p) => s(p.sipseong) === spouseSub);
  const spouseType: "정" | "편" = spouseCell && s(spouseCell.sipseong) === spouseSub ? "편" : "정";
  // ganji 는 그 자리 한 글자일 수도, "경신"처럼 기둥 두 글자일 수도 있다.
  // position("년간"/"월지"…)의 끝 글자로 어느 쪽을 집을지 가른다 — 두 글자인데 무조건 뒤를 집으면
  // 천간 자리에서 지지 글자를 읽어 오행이 통째로 틀어진다.
  const cellChar = (() => {
    const g = s(spouseCell?.ganji).trim();
    if (g.length <= 1) return g;
    return s(spouseCell?.position).endsWith("간") ? g.slice(0, 1) : g.slice(-1);
  })();
  const spouseOh = OH_OF[cellChar] || OH_OF[ilji] || "";

  const dohwaArr = arr(rec(analysis.dohwa).dohwa);
  const hongyeomArr = arr(rec(analysis.hongyeom).hongyeom);
  const dohwaJi = new Set(dohwaArr.map((d) => s(d.ji)).filter(Boolean));
  const hongyeomJi = new Set(hongyeomArr.map((d) => s(d.ji)).filter(Boolean));
  const guiin = rec(analysis.guiin);
  const cheoneulJi = new Set(arr(guiin.cheoneul).map((d) => s(d.ji)).filter(Boolean));
  const hasCheoneul = cheoneulJi.size > 0;
  const hasGeumyeo = arr(guiin.geumyeo).length > 0;

  const fortunes = arr(rec(analysis.twelveFortune).fortunes);
  const iljuF = fortunes.find((f) => s(f.position) === "일주");
  const iljuInterp = rec(iljuF?.interpretation);
  const iljiLevel = n(iljuInterp.level) || FORTUNE_RANK[s(iljuF?.fortune)] || 6;
  const iljiHurt = arr(analysis.hapchung).some(
    (h) => /충|원진/.test(s(h.type)) && (s(h.sourcePosition) === "일주" || s(h.targetPosition) === "일주"),
  );

  // ② 인연 그릇 점수 — 같은 명식·같은 성별이면 항상 같은 값 (41~94)
  const score = Math.max(
    41,
    Math.min(
      94,
      46 +
        Math.min(spouseCount, 3) * 7 +
        Math.min(dohwaJi.size, 2) * 6 +
        Math.min(hongyeomJi.size, 2) * 5 +
        (hasCheoneul ? 5 : 0) +
        (hasGeumyeo ? 4 : 0) +
        Math.trunc((iljiLevel - 6) / 2) -
        (iljiHurt ? 6 : 0) -
        (spouseCount === 0 ? 5 : 0),
    ),
  );

  // ③ 달·해 공용 인연 점수
  type Row = InyeonRow;
  const rowOf = (o: Record<string, unknown>, labelKey: "monthLabel" | "year"): Row | null => {
    const label = labelKey === "monthLabel" ? s(o.monthLabel) : o.year != null ? `${s(o.year)}년(${s(o.age)}세)` : "";
    if (!label) return null;
    const j = rec(o.yongsinJudgment);
    const verdict = s(j.종합판정);
    let sc = Math.trunc(Math.max(-120, Math.min(120, n(j.종합점수))) / 8);
    const tags: string[] = [];
    const relG = s(rec(o.sipseongRelation).gan);
    const relJ = s(rec(o.sipseongRelation).ji);
    if (relG === spouseMain) { sc += 22; tags.push("짝을 뜻하는 자리가 겉으로 드러남"); }
    else if (relG === spouseSub) { sc += 16; tags.push("강렬한 끌림이 드러남"); }
    if (relJ === spouseMain) { sc += 11; tags.push("짝을 뜻하는 자리가 속에 깔림"); }
    else if (relJ === spouseSub) { sc += 8; tags.push("끌림이 속에 깔림"); }
    const rel = jijiRel(s(o.ji), ilji);
    if (rel) { sc += rel.score; tags.push(rel.tag); }
    if (dohwaJi.has(s(o.ji))) { sc += 9; tags.push("눈에 띄는 신호(도화) 켜짐"); }
    if (hongyeomJi.has(s(o.ji))) { sc += 7; tags.push("매력이 짙어짐"); }
    if (cheoneulJi.has(s(o.ji))) { sc += 6; tags.push("귀인이 다리를 놓음"); }
    if (tags.length === 0 && verdict) tags.push(`전체 흐름이 ${verdict}`);
    // ⚠ 월운 행에는 age 가 없다(공급사 미제공). 그대로 n(o.age) 를 쓰면 0 이 되어 화면에 「0세」가 찍힌다
    //   (2026-08-25 실측). 세는나이 = 해당 연도 - 출생연도 + 1 로 채운다 — 결과지 전체가 쓰는 그 자다.
    const rowYear = n(o.year);
    const age = n(o.age) || (birthYear && rowYear ? rowYear - birthYear + 1 : 0);
    return { label, year: rowYear, month: n(o.month), age, score: sc, tags, verdict };
  };

  // ④ 인연이 들어오는 달 TOP3 (과거 제외, 대흉 제외 — 부족하면 게이트 해제)
  const w = rec(analysis.weolun);
  const monthRows: Row[] = [];
  const seen = new Set<string>();
  for (const m of [w.currentWeolun, w.nextWeolun, ...arr(w.upcomingWeoluns)]) {
    const r = rowOf(rec(m), "monthLabel");
    if (r && !seen.has(r.label)) { seen.add(r.label); monthRows.push(r); }
  }
  const byScore = (a: Row, b: Row) => b.score - a.score || a.year - b.year || a.month - b.month;
  let topPool = monthRows.filter((r) => r.verdict !== "대흉");
  if (topPool.length < 3) topPool = monthRows; // 상품 약속이 세 개
  const top3 = [...topPool].sort(byScore).slice(0, 3);
  const topLabels = new Set(top3.map((r) => r.label));

  // ⑤ 마음이 흔들리는 달 (최대 2, TOP3와 중복 금지)
  const rest = monthRows.filter((r) => !topLabels.has(r.label));
  const shakeTagged = rest
    .filter((r) => r.tags.some((t) => /흔들리|어긋나/.test(t)))
    .sort((a, b) => a.year - b.year || a.month - b.month);
  const shaky: Row[] = [];
  if (shakeTagged[0]) shaky.push(shakeTagged[0]);
  const lowPool = rest
    .filter((r) => !shaky.some((x) => x.label === r.label))
    .filter((r) => !r.tags.some((t) => /합|도화|매력|귀인/.test(t)))
    .sort((a, b) => a.score - b.score);
  if (lowPool[0]) shaky.push(lowPool[0]);

  // ⑥ 인연이 가장 크게 바뀌는 해 (상위 2)
  const se = rec(analysis.seun);
  const yearRows: Row[] = [];
  const seenY = new Set<string>();
  for (const y of [se.currentSeun, ...arr(se.upcomingSeuns)]) {
    const r = rowOf(rec(y), "year");
    if (r && !seenY.has(r.label)) { seenY.add(r.label); yearRows.push(r); }
  }
  let yearPool = yearRows.filter((r) => r.verdict !== "대흉");
  if (yearPool.length < 2) yearPool = yearRows;
  // 후보를 올해 포함 5년으로 좁힌다 — 세운 전체(10년+)에서 최고점만 뽑으면 30대 고객에게
  // "11년 뒤에 갈린다"가 나와 상품이 안 팔린다(실측: 4명 중 2명이 11년 뒤). 기준연도는
  // currentSeun.year 를 쓴다(Date 미사용 → 같은 명식이면 항상 같은 값).
  const baseYear = n(rec(se.currentSeun).year);
  const nearPool = baseYear ? yearPool.filter((r) => r.year >= baseYear && r.year < baseYear + NEAR_YEARS) : [];
  const topYears = [...(nearPool.length >= 2 ? nearPool : yearPool)].sort(byScore).slice(0, 2);

  // ⑦ 나이대 방향 — 반드시 한쪽으로만
  const spousePos = sipCells.filter((p) => s(p.sipseong) === spouseMain || s(p.sipseong) === spouseSub).map((p) => s(p.position));
  const inElder = spousePos.some((p) => p.startsWith("년") || p.startsWith("월"));
  const inYounger = spousePos.some((p) => p.startsWith("일") || p.startsWith("시"));
  let ageDir: string;
  if (inElder && !inYounger) ageDir = "연상 쪽";
  else if (inYounger && !inElder) ageDir = "연하 쪽";
  else if (dohwaArr.some((d) => s(d.meaning).includes("연상"))) ageDir = "연상 쪽";
  else ageDir = iljiLevel >= 7 ? "동갑 언저리" : "연상 쪽";

  // ⑧ 만날 사람의 결 / 만나는 길
  const gg = rec(analysis.gyeokguk);
  const yongOh = s(rec(gg.yongsin).오행);
  const heeOh = s(gg.희신오행);
  const meetHint = s(dohwaArr[0]?.meaning).split(". ").slice(0, 2).join(". ");

  // 판정 픽 — 순서가 곧 우선순위다(먼저 걸리는 축이 그 사람의 결이다)
  const sik = n(sum.siksang), inn = n(sum.inseong), bi = n(sum.bigyeop);
  const jae = n(sum.jaeseong), gwan = n(sum.gwanseong);
  const patternKey: "물러남" | "검증" | "설렘" | "계산" =
    sik >= 3 || sik > inn + gwan ? "설렘"
    : gwan === 0 || bi >= 3 ? "물러남"
    : jae > gwan ? "계산"
    : "검증";
  const oh = spouseOh || "토";
  const pool = SIGNAL_POOL[oh] ?? SIGNAL_POOL["토"];
  const signals = pool[spouseType] ?? pool["정"];
  // 장면은 명식에서 결정론적으로 고른다(같은 사람은 늘 같은 장면, 다른 사람은 다른 장면)
  const seed =
    [...ilji].reduce((a, ch) => a + ch.charCodeAt(0), 0) + inn * 3 + sik * 5 + bi * 7 + jae * 11 + gwan * 13;
  const scenes: [string, string] = [
    SCENE_POOL[seed % SCENE_POOL.length],
    SCENE_POOL[(seed + 3) % SCENE_POOL.length],
  ];

  return {
    score,
    spouseCount,
    dohwaCount: dohwaJi.size,
    hongyeomCount: hongyeomJi.size,
    hasCheoneul,
    hasGeumyeo,
    ilji,
    iljiFortune: s(iljuF?.fortune),
    iljiLevel,
    iljiHurt,
    yongOh,
    heeOh,
    meetHint,
    ageDir,
    spouseOh,
    spouseType,
    spouseSex: partner,
    top3,
    shaky,
    topYears,
    months: monthRows,
    pattern: { key: patternKey, ...PATTERN_TEXT[patternKey] },
    signals,
    scenes,
  };
}

export function buildInyeonFactsBlock(
  analysis: SajuAnalysisResponse,
  gender: "male" | "female",
  partnerSex?: "male" | "female",
  /**
   * 점수 줄의 이름. 결혼사주는 같은 계산을 쓰되 본문에서 「결혼 그릇 점수」라고 부른다.
   * ⚠ 이 이름이 챕터 지시문과 **글자까지 같아야** 한다 — 「결혼 그릇 점수를 쓰라」고 시켰는데
   *    블록엔 「인연 그릇 점수」만 있으면 모델은 값이 없다고 판단하고 본문 대신
   *    「점수를 보내주세요」라는 안내문을 뱉는다(2026-08-21 실측: 결혼 1장이 매번 이렇게 날아갔다).
   */
  scoreLabel: string = "인연 그릇 점수",
): string {
  const f = computeInyeonFacts(analysis, gender, partnerSex);
  const face = buildPartnerFace(f);

  // ⑨ 출력
  const fmt = (r: InyeonRow) => `${r.label}(${r.tags.slice(0, 2).join(" + ")} / 인연점수 ${r.score})`;
  const lines = [
    `- ${scoreLabel}: ${f.score}점 (100점 만점) — 결과지 전체에서 이 점수 하나만 사용`,
    // ⚠ 「n/12」 를 주지 않는다 — 모델이 그 분수를 본문에 그대로 옮긴다
    //   (2026-08-31 표본 실측: 「배우자 자리의 활력은 5/12로,」). 손님에게 12분율은 뜻 없는
    //   기계 숫자라 「돌린 것」으로 읽히고, 린터의 내부점수노출(FAIL)에도 걸린다.
    //   등급 이름(제왕·병 …)만 주면 모델이 말로 풀어 쓴다 — 판정은 그대로고 표기만 감춘다.
    `- 계산 근거: 짝을 뜻하는 자리 ${f.spouseCount}개 · 눈에 띄는 신호 ${f.dohwaCount ? "도화 있음" : "도화 없음"}${f.hongyeomCount ? "·홍염 있음" : ""} · 배우자 자리 활력 ${f.iljiFortune || "보통"}${iljuHurtNote(f.iljiHurt)}`,
    `- 타고난 끌림 신호: ${[f.dohwaCount ? `도화 ${f.dohwaCount}개` : "", f.hongyeomCount ? `홍염 ${f.hongyeomCount}개` : "", f.hasCheoneul ? "천을귀인" : "", f.hasGeumyeo ? "금여성" : ""].filter(Boolean).join(" · ") || "은은한 편(꾸준함이 무기)"}`,
    `- 배우자 자리(일지): ${f.ilji}${f.iljiFortune ? ` · 활력 ${f.iljiFortune}` : ""}${f.iljiHurt ? " · 원국에서 흔들림 있음" : ""}`,
    // 짝의 결과 내 용신은 다른 값이다. 예전엔 용신 하나를 "만날 사람의 결"로 줬는데,
    // 그러면 결제 전 얼굴 카드(배우자성 오행)와 본문이 다른 사람을 그리게 된다 — 갈라놓는다.
    // "정/편"은 내부 판정값이다 — 글자를 그대로 주면 본문에 "정(바르게 오래 가는 인연)"처럼
    // 괄호째 튀어나온다(실측). 대길/대흉과 같은 병이라 여기서부터 말로 바꿔서 준다.
    `- 짝의 결(오행): ${f.spouseOh || "미상"} · ${f.spouseType === "편" ? "강렬하게 끌리는 인연(불꽃이 먼저 튄다)" : "바르게 오래 가는 인연(신뢰가 먼저 쌓인다)"} — 짝의 인상은 반드시 이 결로 그릴 것(부르는 말은 상품 보이스를 따른다)`,
    // 얼굴 카드는 결과지 인연 章 머리에 표로 먼저 떠 있다. 모델이 이 표를 못 보면 같은 오행을 받고도
    // 다른 인상을 쓴다(실측: 카드는 "눈매가 깊고", 본문은 "키가 크고").
    // 그렇다고 표를 그냥 주면 작은 모델은 통째로 베껴 오고(실측), 줄이다가 비문까지 만든다
    // ("조직이나 직장 내에서 높을 가능성이 높으니"). 그래서 **역할을 갈라서** 준다 —
    // 표가 인상을 맡고, 본문은 근거와 그다음(어떻게 만나 어떻게 흘러가는지)을 맡는다.
    `- 얼굴 카드가 이 단락 바로 위에 표로 떠 있다. 표에 적힌 것은 **전부 상대(짝)의 것이지 독자 본인의 것이 아니다** — 외모 "${face.look}" / 성격 "${face.nature}" / 만나는 자리 "${face.place}"`,
    `  → 이 세 줄을 **본문이 반드시 회수할 것** — 표의 문구를 그대로 옮겨 붙이지 말고, 그 인상·성격·자리가 실제로 어떻게 드러나는지 **장면으로 풀어 쓴다**(표가 "눈매가 깊다"면 본문은 그 눈이 대화에서 어떻게 느껴지는지를 쓴다). 같은 값을 두 번 말하는 게 목적이다: 표가 진짜 계산에서 나왔다는 걸 본문이 증명한다. 이어서 ①왜 그런 사람인지(배우자 자리의 결) ②어디서 어떻게 만나게 되는지 ③나이대 ④만난 뒤 관계가 어떻게 흘러가는지를 쓴다. 표와 어긋나는 인상(다른 외모·다른 성격)은 절대 쓰지 말 것`,
    `- 나에게 이로운 결: ${f.yongOh || "미상"}${f.heeOh ? ` · 도움이 되는 결 ${f.heeOh}` : ""}`,
    f.meetHint ? `- 만나는 길 힌트: ${f.meetHint}` : "",
    `- 나이대: ${f.ageDir} — 이 한쪽으로만 쓸 것`,
    // 아래 셋은 **모델이 고르면 안 되는 판정**이다. 고르게 뒀더니 명식이 달라도 같은 답이 나왔다.
    `- 놓치는 패턴(3장에서 이것 하나만 단정할 것): ${f.pattern.verdict} — 이유는 성격이 아니라 구조다: ${f.pattern.cause}`,
    `- 알아보는 신호(6장의 셋 중 둘은 이것을 쓸 것, 나머지 하나만 이 명식에서 골라 붙일 것): ${f.signals.map((x) => `「${x}」`).join(" / ")}`,
    `- 1장 두 소제목에 쓸 장면(각각 하나씩, 다른 장에서는 쓰지 말 것): 「${f.scenes[0]}」 / 「${f.scenes[1]}」`,
    `- 인연이 들어오는 달 TOP3: ${f.top3.map(fmt).join(", ")}`,
    f.shaky.length ? `- 마음이 흔들리는 달: ${f.shaky.map(fmt).join(", ")}` : "",
    f.topYears.length ? `- 인연이 가장 크게 바뀌는 해: ${f.topYears.map(fmt).join(" / 그다음 ")}` : "",
  ].filter(Boolean);

  return `[인연 확정값 — 점수와 달·해·나이대는 아래 값을 그대로 인용할 것. 다른 값을 지어내지 말 것]\n${lines.join("\n")}`;
}

function iljuHurtNote(hurt: boolean): string {
  return hurt ? " (흔들림 감점 반영)" : "";
}

// ── 대운 연대기 (결정론 · LLM 0원) ───────────────────
// 타이트 결과지의 "억까가 끝나는 시기" 서사가 이 데이터다 — 대운 열 개를 표로 세우면
// 결과지에 인생 전체가 걸린다. 유불리는 result-view 대운 곡선과 같은 잣대(용신/희신/기신/구신)를
// 쓴다 — 곡선과 연대기가 다른 판정을 내면 한 결과지 안에서 두 명이 말하는 꼴이 된다.

export type DaeunRow = {
  /** "27~36세" */
  range: string;
  /** "2019~2028" — 서사 앵커용(과거 검증 문장이 이 연도를 짚는다) */
  years: string;
  ganji: string;
  /** "정재·상관" — 간/지 십성 이름 */
  sip: string;
  /** 유리 | 보통 | 조심 | 무거움 */
  favor: string;
  /** 조견표 한 줄 — 십성 카테고리 × 유불리 */
  line: string;
  when: "past" | "now" | "future";
};

const DAEUN_CATEGORY_LINE: Record<string, string> = {
  비겁성: "내 힘과 사람이 붙는 때",
  식상성: "말·재주·일 벌임이 커지는 때",
  재성: "돈과 현실이 손에 잡히는 때",
  관성: "자리·책임·이름이 붙는 때",
  인성: "배움·문서·귀인이 드는 때",
};
const DAEUN_FAVOR_LINE: Record<string, string> = {
  유리: "바람이 등 뒤에서 분다",
  보통: "평지 걸음이다",
  조심: "기운이 과열되니 눌러 가야 한다",
  무거움: "무겁게 지나는 구간이다",
};

export function computeDaeunTimeline(analysis: SajuAnalysisResponse): DaeunRow[] {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
  const d = rec(analysis.daeun);
  const all = Array.isArray(d.all_daeun) ? (d.all_daeun as unknown[]) : [];
  if (!all.length) return [];

  const gg = rec(analysis.gyeokguk);
  const yong = String(rec(gg.yongsin).오행 ?? "");
  const hee = String(gg.희신오행 ?? "");
  const gi = String(gg.기신오행 ?? "");
  const gu = String(gg.구신오행 ?? "");
  const nowAge = n(d.current_age);

  return all.map((item) => {
    const o = rec(item);
    const sip = rec(o.sipseong);
    const ganjiKo = String(o.ganji ?? "");
    // 유불리 잣대는 천간 오행(대운의 얼굴). result-view deriveDaeun 과 같은 기준.
    const elKo = OH_OF[ganjiKo.charAt(0)] ?? "";
    const favor = elKo && (elKo === yong || elKo === hee) ? "유리" : elKo === gi ? "조심" : elKo === gu ? "무거움" : "보통";
    const cat = String(sip.ganCategory ?? "");
    const ageStart = n(o.age_start);
    const ageEnd = n(o.age_end);
    return {
      range: `${ageStart}~${ageEnd}세`,
      years: o.year_start && o.year_end ? `${o.year_start}~${o.year_end}` : "",
      ganji: ganjiKo,
      sip: [String(sip.gan ?? ""), String(sip.ji ?? "")].filter(Boolean).join("·"),
      favor,
      line: `${DAEUN_CATEGORY_LINE[cat] ?? "흐름이 바뀌는 때"} — ${DAEUN_FAVOR_LINE[favor]}`,
      when: ageEnd < nowAge ? "past" : ageStart <= nowAge && nowAge <= ageEnd ? "now" : "future",
    };
  });
}

// ── 크게 벌리는 해 (결정론 · LLM 0원) ─────────────────
// 인연 topYears 와 같은 패턴을 재물 잣대로 — 세운 용신 점수에 재성(정재·편재)·식상 가점.
// 식상을 치는 이유: 재성이 "돈 자체"라면 식상은 "돈을 만드는 일"이라, 식상 해에 벌인 일이
// 재성 해에 돈이 된다(고전 식상생재). 재성만 보면 벌 준비가 된 해를 놓친다.

export function computeWealthYears(analysis: SajuAnalysisResponse): WealthMonth[] {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
  const s = (v: unknown): string => (v == null ? "" : String(v));

  const se = rec(analysis.seun);
  const rows: { label: string; year: number; score: number; verdict: string }[] = [];
  const seen = new Set<string>();
  for (const y of [se.currentSeun, ...arr(se.upcomingSeuns)]) {
    const o = rec(y);
    if (o.year == null) continue;
    const label = `${s(o.year)}년(${s(o.age)}세)`;
    if (seen.has(label)) continue;
    seen.add(label);
    const j = rec(o.yongsinJudgment);
    let sc = Math.trunc(Math.max(-120, Math.min(120, n(j.종합점수))) / 8);
    const relG = s(rec(o.sipseongRelation).gan);
    const relJ = s(rec(o.sipseongRelation).ji);
    if (/^(정재|편재)$/.test(relG)) sc += 20;
    if (/^(정재|편재)$/.test(relJ)) sc += 10;
    if (/^(식신|상관)$/.test(relG)) sc += 8;
    rows.push({ label, year: n(o.year), score: sc, verdict: s(j.종합판정) });
  }

  // 인연 topYears 와 같은 창(NEAR_YEARS) — "11년 뒤에 번다"는 상품이 안 된다.
  const baseYear = n(rec(se.currentSeun).year);
  let pool = rows.filter((r) => r.verdict !== "대흉");
  if (pool.length < 2) pool = rows;
  const near = baseYear ? pool.filter((r) => r.year >= baseYear && r.year < baseYear + NEAR_YEARS) : pool;
  return [...(near.length >= 2 ? near : pool)]
    .sort((a, b) => b.score - a.score || a.year - b.year)
    .slice(0, 2)
    .map((r) => ({ label: r.label, verdict: r.verdict, score: r.score }));
}

// ── 크로스셀 개인화 신호 ────────────────────────────
// 결과지 하단 "이어서 보기" 추천을 명식 근거로 부드럽게 개인화하기 위한 작은 신호.
// (공포 마케팅 금지: 단정적 약점 단언이 아니라 "더 깊이 보면 좋다"는 호기심 톤으로만 사용)
export type CrossSellSignal = {
  jaeseongCount: number | null; // 재성(財) 개수 — 0이면 재물 흐름을 따로 볼 만한 신호
  hasYearClash: boolean;        // 올해 세운에 충/파/형 — 변동이 큰 해
};

export function extractCrossSellSignal(analysis: SajuAnalysisResponse): CrossSellSignal {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const summary = rec(rec(analysis.sipseong).summary);
  const jaeseong = summary.jaeseong;
  const jaeseongCount = typeof jaeseong === "number" ? jaeseong : null;

  const rels = rec(rec(analysis.seun).currentSeun).hapChungRelations;
  const hasYearClash = Array.isArray(rels)
    ? rels.some((r) => /충|파|형/.test(String(rec(r).type ?? "")))
    : false;

  return { jaeseongCount, hasYearClash };
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
