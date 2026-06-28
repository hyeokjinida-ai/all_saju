// =====================================================
// /results/live — 실데이터(만세력 + LLM)를 새 자수정 결과지로 미리보기
// =====================================================
// 결제/DB 없이, 입력 → 만세력 → LLM 풀이가 새 결과지(ResultScroll + 상세 풀이)에
// 어떻게 얹히는지 실제로 보여준다. 비용 보호: 같은 입력은 모듈 캐시로 재호출 안 함.
// 기본값 외 ?y=&m=&d=&h=&min=&cal=양력/음력&g=male/female&concern=&nm=&slug= 로 바꿔볼 수 있음.
import type { Metadata } from "next";
import { ResultScroll } from "@/components/saju/ResultScroll";
import { ResultChapters } from "@/components/saju/ResultChapters";
import { CrossSell } from "@/components/saju/CrossSell";
import { buildResultView } from "@/lib/saju/result-view";
import {
  isSajuApiConfigured,
  fetchSajuAnalysis,
  ganjiToMyeongsik,
  formatSajuCompact,
  buildKeyFactsBlock,
  type BirthInfo,
  type SajuAnalysisResponse,
} from "@/lib/saju/saju-api";
import { buildChapterPrompts } from "@/lib/saju/prompt";
import { generateByChapters } from "@/lib/saju/llm";
import { hasRealInterpretation } from "@/lib/saju/generate-result";
import type { Myeongsik } from "@/lib/saju/manseryeok";

export const metadata: Metadata = { title: "결과지 실데이터 미리보기", robots: { index: false } };
export const dynamic = "force-dynamic";

const DEF = { y: "1988", m: "9", d: "15", h: "23", min: "30", concern: "올해 이직을 해도 될까요? 그리고 돈은 언제쯤 풀릴까요?", slug: "basic-saju", nm: "" };
const PROMPT_VERSION = "v3-bold"; // 목차/프롬프트 개편 시 올리면 캐시 무효화→재생성

// 같은 입력 재요청 시 만세력/LLM 재호출 방지(비용·한도 보호)
const aCache = new Map<string, SajuAnalysisResponse>();
const lCache = new Map<string, { text: string; provider: string; model: string }>();

type SP = Promise<Record<string, string | undefined>>;

export default async function LiveResultPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const g: "male" | "female" = sp.g === "female" ? "female" : "male";
  const cal: "양력" | "음력" = sp.cal === "음력" ? "음력" : "양력";
  const y = sp.y || DEF.y, m = sp.m || DEF.m, d = sp.d || DEF.d, h = sp.h || DEF.h, min = sp.min || DEF.min;
  const concern = sp.concern ?? DEF.concern;
  const nm = sp.nm ?? DEF.nm;
  const slug = sp.slug || DEF.slug;

  if (!isSajuApiConfigured()) return <Notice msg="SAJU_API_KEY가 .env에 없어요. 키 넣고 서버 재시작하면 실데이터로 떠요." />;

  const birthInfo: BirthInfo = { birthYear: y, birthMonth: m, birthDay: d, birthHour: h, birthMinute: min, calendarType: cal, gender: g };
  const aKey = JSON.stringify(birthInfo);
  let analysis = aCache.get(aKey);
  if (!analysis) {
    try {
      analysis = await fetchSajuAnalysis(birthInfo, [], { source: "demo" });
    } catch (e) {
      return <Notice msg={"만세력 호출 실패: " + (e instanceof Error ? e.message : String(e))} />;
    }
    if (aCache.size > 50) aCache.clear();
    aCache.set(aKey, analysis);
  }

  const myeongsik = ganjiToMyeongsik(analysis) as Myeongsik | null;
  if (!myeongsik) return <Notice msg="명식(ganji)이 안 와서 표시 못 해요." />;

  const birthDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const birthTime = `${h.padStart(2, "0")}:${min.padStart(2, "0")}`;

  const view = buildResultView({
    myeongsik,
    rawAnalysis: analysis,
    name: nm || null,
    birthDate,
    birthTime,
    timeUnknown: false,
    gender: g,
    calendar: cal === "음력" ? "lunar" : "solar",
    concerns: concern ? [concern] : [],
    showScores: true,
    showDaeun: true,
  });

  // LLM 풀이
  let interp = "";
  let llmTag = "";
  const lKey = JSON.stringify({ aKey, slug, concern, nm, v: PROMPT_VERSION });
  const cached = lCache.get(lKey);
  if (cached) {
    interp = cached.text;
    llmTag = `${cached.provider}/${cached.model}`;
  } else {
    try {
      const { title, chapters } = buildChapterPrompts({
        productSlug: slug,
        productName: `미리보기 — ${slug}`,
        name: nm || null,
        myeongsik,
        manseryeokText: formatSajuCompact(analysis, birthInfo),
        birthDate,
        birthTime,
        timeUnknown: false,
        gender: g,
        concerns: concern ? [concern] : [],
        keyFacts: buildKeyFactsBlock(analysis, birthInfo),
      });
      const llm = await generateByChapters(title, chapters);
      interp = llm.text;
      // 빈/실패 결과는 캐시하지 않는다(다음 새로고침에 재시도되도록).
      if (hasRealInterpretation(llm.text) && llm.provider) {
        llmTag = `${llm.provider}/${llm.model}`;
        if (lCache.size > 50) lCache.clear();
        lCache.set(lKey, { text: llm.text, provider: llm.provider, model: llm.model });
      } else {
        interp = "";
        llmTag = "LLM이 일시적으로 비어서 왔어요 — 새로고침하면 다시 생성합니다";
      }
    } catch (e) {
      llmTag = "LLM 오류: " + (e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "radial-gradient(90% 55% at 50% 0%,#16112c,#0b0816 58%,#070410)", padding: "30px 12px 64px", color: "#fff" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <ResultScroll view={view} embedded extraToc={[{ label: "상세 풀이 전문", href: "#sec-detail" }]} />
        <div id="sec-detail" className="mt-5" style={{ scrollMarginTop: 14 }}>
          <div className="mb-3 px-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#c9a8ff" }}>
            상세 풀이 · LLM 생성{llmTag ? ` · ${llmTag}` : ""}
          </div>
          {interp ? (
            <ResultChapters markdown={interp} />
          ) : (
            <div style={{ borderRadius: 18, background: "rgba(9,5,22,.72)", border: "1px solid rgba(180,140,255,.22)", padding: "18px 20px" }}>
              <p style={{ fontSize: 13, color: "#cbb8f0", lineHeight: 1.7 }}>LLM 키가 없거나 오류라 글이 비었어요. {llmTag}</p>
            </div>
          )}
        </div>

        <CrossSell
          products={[{ productId: "preview", slug: "premium-saju", name: "인생 프리미엄 풀이", description: "", price: 16900 }]}
          input={{ name: nm || null, birthDate, birthTime, timeUnknown: false, gender: g, calendar: cal === "음력" ? "lunar" : "solar", concerns: concern ? [concern] : [] }}
        />
      </div>
    </div>
  );
}

function Notice({ msg }: { msg: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#160a36", color: "#cbb8f0", padding: 24, textAlign: "center", fontSize: 14, lineHeight: 1.7 }}>
      {msg}
    </div>
  );
}
