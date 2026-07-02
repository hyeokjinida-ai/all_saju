// =====================================================
// 결과지(⑨ 종합 결과지) 뷰모델 — 디자인 핸드오프 "결과지 디자인.dc.html" 재현용.
// =====================================================
// DB의 myeongsik(항상) + raw_analysis(프리미엄)에서 결과지 화면이 쓸 형태로 가공한다.
// - 명식·오행 분포: myeongsik 8글자만으로 결정론적 계산(추가 데이터 불필요).
// - 영역별 점수(재물/직업/애정/건강): luckyloveme 응답에 없음 → 십성·오행에서 "성향 지표"로 파생.
//   (마케팅용 가짜 수치가 아니라 실제 명식 데이터에서 산출. 데이터 없으면 섹션을 숨긴다.)
// - 대운 곡선: raw_analysis.daeun 있을 때만. 격국 용신/희신 대비 유불리로 높낮이.
import type { Myeongsik, Pillar } from "@/lib/saju/manseryeok";
import type { SajuAnalysisResponse } from "@/lib/saju/saju-api";

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
export type CategoryKey = "wealth" | "career" | "love" | "health";

// 오행 메타 — 색/한자/오브 이미지/유형명. 색은 design 토큰(--o-*)과 동일.
export const ELEMENT_META: Record<
  ElementKey,
  { ko: string; hanja: string; bar: string; barTo: string; rgb: string; text: string; orb: string; type: string }
> = {
  wood: { ko: "목", hanja: "木", bar: "#7fc8a0", barTo: "#3a9a6c", rgb: "127,200,160", text: "#aef0cc", orb: "/assets/saju/type3d/wood.svg", type: "木 성장형" },
  fire: { ko: "화", hanja: "火", bar: "#ff9a7a", barTo: "#d0563c", rgb: "255,150,110", text: "#ffc4b8", orb: "/assets/saju/type3d/fire.svg", type: "火 추진력형" },
  earth: { ko: "토", hanja: "土", bar: "#e4c878", barTo: "#b4933a", rgb: "228,200,120", text: "#f0dca0", orb: "/assets/saju/type3d/earth.svg", type: "土 안정형" },
  metal: { ko: "금", hanja: "金", bar: "#c8cdd4", barTo: "#9098a4", rgb: "200,205,212", text: "#e6eaf0", orb: "/assets/saju/type3d/metal.svg", type: "金 결단형" },
  water: { ko: "수", hanja: "水", bar: "#88a8e0", barTo: "#4868c0", rgb: "136,168,224", text: "#bcd0ff", orb: "/assets/saju/type3d/water.svg", type: "水 지혜형" },
};

export const ELEMENT_ORDER: ElementKey[] = ["wood", "fire", "earth", "metal", "water"];

const KO_TO_KEY: Record<string, ElementKey> = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };

// 천간/지지(한글·한자) → 오행 한글
const GAN_OH: Record<string, string> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
};
const JI_OH: Record<string, string> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화", 午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
// 한글 → 한자 (브러시/명조 표시용). 이미 한자면 그대로.
const GAN_HANJA: Record<string, string> = { 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" };
const JI_HANJA: Record<string, string> = { 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" };
// 한자 → 한글 읽기(역방향). 입력이 한글이면 그대로 사용.
const GAN_READ: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const JI_READ: Record<string, string> = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const readGan = (c: string) => (GAN_HANJA[c] ? c : GAN_READ[c] ?? c); // 한글이면 그대로, 한자면 한글로
const readJi = (c: string) => (JI_HANJA[c] ? c : JI_READ[c] ?? c);

// 일간(천간 한자) → 시적 별칭. "한낮의 태양 · 丙火" 형태로 조합.
export const ILGAN_TITLE: Record<string, string> = {
  甲: "하늘로 뻗는 큰 나무", 乙: "바람에 유연한 풀꽃",
  丙: "한낮의 태양", 丁: "어둠을 밝히는 등불",
  戊: "굳건한 큰 산", 己: "씨앗을 품는 기름진 밭",
  庚: "단단한 무쇠", 辛: "빛나는 보석",
  壬: "흐르는 큰 강물", 癸: "촉촉이 적시는 이슬비",
};

const elKey = (ko: string | undefined): ElementKey => (ko && KO_TO_KEY[ko]) || "earth";
const toHanjaGan = (c: string) => GAN_HANJA[c] ?? c;
const toHanjaJi = (c: string) => JI_HANJA[c] ?? c;

export type ResultView = {
  brand: { title: string; sub: string };
  ilgan: { element: ElementKey; title: string; type: string };
  birthLine: string;
  pillars: { label: string; isDay?: boolean; gan: { char: string; read: string; element: ElementKey }; ji: { char: string; read: string; element: ElementKey } }[];
  ohaeng: { key: ElementKey; count: number; emphasis?: "strong" | "absent" }[];
  categories: { key: CategoryKey; label: string; score: number; body: string; primary?: boolean }[];
  daeun?: { points: { age: number; label: string; value: number; current?: boolean }[] };
  advice?: { quote?: string; body: string };
};

// ── raw_analysis에서 느슨하게 꺼내기(응답 구조 변동에 안전하게) ──
type Loose = Record<string, unknown> | null | undefined;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);

function sipseongSummary(raw: Loose) {
  const s = obj(obj(raw).sipseong).summary;
  const o = obj(s);
  return {
    inseong: num(o.inseong),
    bigyeop: num(o.bigyeop),
    siksang: num(o.siksang),
    jaeseong: num(o.jaeseong),
    gwanseong: num(o.gwanseong),
  };
}

const clamp = (n: number, lo = 30, hi = 96) => Math.max(lo, Math.min(hi, Math.round(n)));

// 영역별 "성향 지표" — 실제 십성/오행 카운트에서 파생(가짜 아님). 데이터 없으면 호출부에서 숨김.
function deriveCategories(
  raw: Loose,
  ohaengCounts: Record<ElementKey, number>,
  gender: "male" | "female",
  primaryKey: CategoryKey | null,
  dominant: ElementKey,
): ResultView["categories"] {
  const sp = sipseongSummary(raw);
  const missing = ELEMENT_ORDER.filter((k) => ohaengCounts[k] === 0).length;
  const maxCount = Math.max(...ELEMENT_ORDER.map((k) => ohaengCounts[k]));

  const wealth = clamp(46 + sp.jaeseong * 16 + sp.siksang * 4);
  const career = clamp(46 + sp.gwanseong * 13 + sp.siksang * 7);
  const love = clamp(44 + (gender === "male" ? sp.jaeseong : sp.gwanseong) * 12 + sp.inseong * 3);
  const health = clamp(86 - missing * 11 - Math.max(0, maxCount - 2) * 7);

  const domKo = ELEMENT_META[dominant].ko;
  const band = (s: number) => (s >= 78 ? "high" : s >= 60 ? "mid" : "low");
  const blurbs: Record<CategoryKey, Record<string, string>> = {
    wealth: {
      high: "재물 그릇이 단단한 편 — 흐름을 타면 차곡차곡 쌓이는 구조예요.",
      mid: "큰돈은 한 번에보다 흐름을 타고 쌓이는 형. 들어오는 길과 새는 구멍을 함께 봐야 해요.",
      low: "재물은 모으는 습관과 때가 관건. 본격적인 재물길이 열리는 시기를 잡는 게 핵심이에요.",
    },
    career: {
      high: "내 이름을 거는 일에서 빛나는 사주 — 주도권을 쥘수록 운이 따라와요.",
      mid: "꾸준함이 무기인 직업운. 움직일 타이밍을 고르면 한 단계 올라설 수 있어요.",
      low: "방향을 정하면 강해지는 유형. 흔들리는 시기를 지나면 자리를 잡습니다.",
    },
    love: {
      high: "사람을 끌어당기는 기운이 좋아요 — 인연의 폭이 넓은 편이에요.",
      mid: "천천히 데워지는 관계가 오래가는 사주. 내게 맞는 결을 알면 한결 편해져요.",
      low: "관계는 패턴을 아는 게 먼저예요. 반복되는 인연의 결을 풀면 길이 보여요.",
    },
    health: {
      high: "오행이 비교적 고른 편 — 큰 기복 없이 관리만 받쳐주면 좋아요.",
      mid: `${domKo} 기운이 강해 강약이 또렷한 체질. 부족한 기운을 채우면 균형이 잡혀요.`,
      low: `${domKo} 기운에 치우쳐 약한 곳이 분명해요. 비는 기운을 보완하는 게 보약이에요.`,
    },
  };

  const list: ResultView["categories"] = [
    { key: "wealth", label: "재물운", score: wealth, body: blurbs.wealth[band(wealth)] },
    { key: "career", label: "직업 · 진로운", score: career, body: blurbs.career[band(career)] },
    { key: "love", label: "애정 · 결혼운", score: love, body: blurbs.love[band(love)] },
    { key: "health", label: "건강운", score: health, body: blurbs.health[band(health)] },
  ];
  if (primaryKey) {
    const i = list.findIndex((c) => c.key === primaryKey);
    if (i > 0) {
      const [p] = list.splice(i, 1);
      p.primary = true;
      list.unshift(p);
    } else if (i === 0) list[0].primary = true;
  }
  return list;
}

// 대운 곡선 — raw_analysis.daeun.all_daeun 기반. 용신/희신 오행과 맞을수록 높게.
function deriveDaeun(raw: Loose): ResultView["daeun"] | undefined {
  const d = obj(obj(raw).daeun);
  const all = Array.isArray(d.all_daeun) ? (d.all_daeun as unknown[]) : [];
  if (all.length < 2) return undefined;
  const gk = obj(obj(raw).gyeokguk);
  const yong = (obj(gk.yongsin)["오행"] as string) || (gk["희신오행"] as string) || "";
  const heeKo = (gk["희신오행"] as string) || yong;
  const giKo = (gk["기신오행"] as string) || "";
  const guKo = (gk["구신오행"] as string) || "";
  const curSeq = num(obj(d.current_daeun).sequence);

  const points = all.slice(0, 7).map((item) => {
    const o = obj(item);
    const ganji = (o.ganji_hanja as string) || (o.ganji as string) || "";
    const ageStart = num(o.age_start);
    const seq = num(o.sequence);
    const ganChar = ganji.charAt(0);
    const elKo = GAN_OH[ganChar] || "";
    let value = 0.58;
    if (elKo && (elKo === yong || elKo === heeKo)) value = 0.86;
    else if (elKo && elKo === giKo) value = 0.5;
    else if (elKo && elKo === guKo) value = 0.32;
    return { age: ageStart, label: ganji, value, current: seq === curSeq };
  });
  if (!points.some((p) => p.current)) points[Math.floor(points.length / 2)].current = true;
  return { points };
}

export function buildResultView(args: {
  myeongsik: Myeongsik;
  rawAnalysis?: SajuAnalysisResponse | null;
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  timeUnknown?: boolean | null;
  gender?: "male" | "female" | "M" | "F" | null;
  calendar?: "solar" | "lunar" | null;
  concerns?: string[] | null;
  showScores?: boolean;
  showDaeun?: boolean;
}): ResultView {
  const { myeongsik: m, rawAnalysis: raw } = args;
  const gender: "male" | "female" = args.gender === "female" || args.gender === "F" ? "female" : "male";

  // 원국 4기둥 — 표시 순서 시·일·월·년
  const order: { label: string; p: Pillar | null; isDay?: boolean }[] = [
    { label: "태어난 시", p: m.hour },
    { label: "나 · 태어난 날", p: m.day, isDay: true },
    { label: "태어난 달", p: m.month },
    { label: "태어난 해", p: m.year },
  ];
  const pillars = order.map((o) => ({
    label: o.label,
    isDay: o.isDay,
    gan: o.p
      ? { char: toHanjaGan(o.p.cheongan), read: readGan(o.p.cheongan), element: elKey(GAN_OH[o.p.cheongan]) }
      : { char: "?", read: "", element: "earth" as ElementKey },
    ji: o.p
      ? { char: toHanjaJi(o.p.jiji), read: readJi(o.p.jiji), element: elKey(JI_OH[o.p.jiji]) }
      : { char: "?", read: "", element: "earth" as ElementKey },
  }));

  // 오행 분포 카운트
  const counts: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const tally = (p: Pillar | null) => {
    if (!p) return;
    const g = GAN_OH[p.cheongan];
    const j = JI_OH[p.jiji];
    if (g) counts[KO_TO_KEY[g]]++;
    if (j) counts[KO_TO_KEY[j]]++;
  };
  [m.year, m.month, m.day, m.hour].forEach(tally);
  const maxCount = Math.max(1, ...ELEMENT_ORDER.map((k) => counts[k]));
  const dominant = ELEMENT_ORDER.reduce((a, b) => (counts[b] > counts[a] ? b : a), "earth" as ElementKey);
  const ohaeng = ELEMENT_ORDER.map((key) => ({
    key,
    count: counts[key],
    emphasis: counts[key] === 0 ? ("absent" as const) : counts[key] === maxCount && counts[key] > 1 ? ("strong" as const) : undefined,
  }));

  // 일간
  const dayGanHanja = toHanjaGan(m.day.cheongan);
  const ilEl = elKey(GAN_OH[m.day.cheongan]);
  const ilgan = {
    element: ilEl,
    title: `${ILGAN_TITLE[dayGanHanja] ?? "타고난 기운"} · ${dayGanHanja}${ELEMENT_META[ilEl].hanja}`,
    type: ELEMENT_META[ilEl].type,
  };

  // 생년 라인
  const dateStr = args.birthDate ? args.birthDate.replace(/-/g, ".") : "";
  const genderStr = gender === "female" ? "여" : "남";
  const calStr = args.calendar === "lunar" ? "음력" : "양력";
  const hourStr = args.timeUnknown ? "시 모름" : m.hour ? `${JI_READ[toHanjaJi(m.hour.jiji)] ?? m.hour.jiji}시` : "시 모름";
  const birthLine = [dateStr, genderStr, calStr, hourStr].filter(Boolean).join(" · ");

  // 영역별 점수 — 데이터(raw)가 있고 showScores일 때만
  const concerns = args.concerns ?? [];
  const primaryKey: CategoryKey | null = (() => {
    const c = concerns.join(" ");
    if (/돈|재물|재정|money/i.test(c)) return "wealth";
    if (/일|직업|진로|이직|커리어/i.test(c)) return "career";
    if (/연애|결혼|사랑|관계|이성|배우/i.test(c)) return "love";
    if (/건강|몸|병/i.test(c)) return "health";
    return null;
  })();
  const categories = args.showScores && raw ? deriveCategories(raw, counts, gender, primaryKey, dominant) : [];

  const daeun = args.showDaeun && raw ? deriveDaeun(raw) : undefined;

  const advice = concerns.length
    ? { quote: concerns[0].slice(0, 120), body: "적어주신 고민은 아래 상세 풀이에서 가장 먼저, 가장 깊게 짚었어요. 사주의 큰 흐름과 함께 읽어보세요." }
    : undefined;

  return {
    brand: { title: "명운록", sub: "SAJU LAB" },
    ilgan,
    birthLine,
    pillars,
    ohaeng,
    categories,
    daeun,
    advice,
  };
}

// =====================================================
// 데모 — 핸드오프 "결과지 디자인.dc.html" 샘플(己丙壬甲 / 火 추진력형) 그대로.
// /results/demo 에서 실제 결과지 화면을 데이터 없이 미리 보기.
// =====================================================
export const DEMO_RESULT_VIEW: ResultView = {
  brand: { title: "명운록", sub: "SAJU LAB" },
  ilgan: { element: "fire", title: "한낮의 태양 · 丙火", type: "火 추진력형" },
  birthLine: "1989.07.22 · 남 · 양력 · 해시",
  pillars: [
    { label: "태어난 시", gan: { char: "己", read: "기", element: "earth" }, ji: { char: "亥", read: "해", element: "water" } },
    { label: "나 · 태어난 날", isDay: true, gan: { char: "丙", read: "병", element: "fire" }, ji: { char: "寅", read: "인", element: "wood" } },
    { label: "태어난 달", gan: { char: "壬", read: "임", element: "water" }, ji: { char: "午", read: "오", element: "fire" } },
    { label: "태어난 해", gan: { char: "甲", read: "갑", element: "wood" }, ji: { char: "子", read: "자", element: "water" } },
  ],
  ohaeng: [
    { key: "wood", count: 2 },
    { key: "fire", count: 3, emphasis: "strong" },
    { key: "earth", count: 1 },
    { key: "metal", count: 0, emphasis: "absent" },
    { key: "water", count: 2 },
  ],
  categories: [
    { key: "wealth", label: "재물운", score: 78, primary: true, body: "큰돈은 한 번에 들어오기보다 흐름을 타고 쌓이는 형. 본격적인 재물길은 37세 庚午 대운부터 열려요." },
    { key: "career", label: "직업 · 진로운", score: 82, body: "내 이름을 거는 일에서 빛나요. 이직은 올해 하반기(申·酉월)가 가장 좋은 타이밍이에요." },
    { key: "love", label: "애정 · 결혼운", score: 65, body: "천천히 데워지는 관계가 오래가요. 결혼은 36세 이후 안정기의 인연을 길게 보세요." },
    { key: "health", label: "건강운", score: 70, body: "火가 강해 심장·수면이 약점. 충분한 물과 휴식이 보약이에요." },
  ],
  daeun: {
    points: [
      { age: 17, label: "戊辰", value: 0.5 },
      { age: 27, label: "己巳", value: 0.62 },
      { age: 37, label: "庚午", value: 0.92, current: true },
      { age: 47, label: "辛未", value: 0.72 },
      { age: 57, label: "壬申", value: 0.5 },
      { age: 67, label: "癸酉", value: 0.42 },
    ],
  },
  advice: {
    quote: "이직과 결혼을 동시에 고민 중… 돈이 잘 안 모여요",
    body: "두 가지를 한꺼번에 풀려 하지 마세요. 일을 먼저 정리하면 재물과 인연이 따라오는 구조예요. 올해 하반기에 진로를 매듭짓고, 결혼은 庚午 대운이 무르익는 38세 전후가 순리예요.",
  },
};
