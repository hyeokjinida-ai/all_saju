// 직녀 그림채 프롬프트 생성기 — 스타일 6종 × 컷 2종
//
// ⚠⚠ **이 스크립트는 이미지를 생성하지 않는다. 프롬프트만 파일로 뽑는다.**
//    2026-08-17 형님 지시: 「api는 퀄이 매우 안좋아 / gpt api로 이미지 뽑지마」
//    OpenAI 이미지 API(gpt-image-1) 결과물이 ChatGPT 웹보다 눈에 띄게 나쁘다 — 형님이 실물로 판정했다.
//    비용이 아니라 **품질** 문제고, 낮은 품질 시안은 스타일 판정 자체를 왜곡한다.
//    → 여기서는 프롬프트만 만들고, 생성은 **ChatGPT 웹**(산군 자산 전부가 나온 경로)에서 한다.
//    (기존 산군 일러·운명의 상대 10장도 전부 ChatGPT 웹으로 나왔다)
//
// 형님이 375px 축소본을 보고 **스타일 하나**를 찍으면, 그게 직녀 본편 전체의 그림채가 된다.
// 그 선택 전까지는 마스터 컷·웹툰 컷을 뽑지 않는다(스타일이 바뀌면 전부 버려진다).
//
// 공통 불변(LOCK v3): 30대 초반 한국 여성 · 낮게 땋은 머리 · 아이보리 저고리+남색 치마 ·
//                     은사 액센트 · **화면에 빨강 0** · 달빛+촛불 · 텍스트/워터마크 없음
// 스타일만 바꾸고 인물·의상·소품·색은 고정해야 비교가 성립한다.
//
// 실행: npx tsx scripts/jiknyeo-style-samples.ts [--cut close|loom|both]
// 산출: 직녀/시안_그림채_스프레드/_프롬프트_<cut>.md  (붙여넣기용)
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("직녀/시안_그림채_스프레드");

const SUBJECT = `A Korean woman in her early 30s — serene, dignified, quietly warm.
Face clearly visible: soft oval face, calm dark-brown eyes (both eyes the same color), a subtle gentle smile,
natural adult proportions for a 30-40 year old female audience — never childlike, never sexualized.
Long black hair in a single loose low braid over one shoulder, a few loose strands.
She wears a Korean hanbok: moon-pale ivory jeogori (top) with a DEEP INDIGO chima (skirt),
a PALE SILVER-GREY goreum ribbon, and subtle silver-thread star embroidery near the cuffs. Modest neckline.`;

const PALETTE = `Palette strictly limited to ink-black, deep indigo, and moon-pale ivory,
plus ONE cool SILVER accent (silver thread / Milky Way sheen) as the only luminous element.
ABSOLUTELY NO RED, CRIMSON, SCARLET OR WARM PINK ANYWHERE IN THE FRAME — no red thread, no red ribbon, no red lips.
Lighting: cool moonlight from a window combined with low warm candlelight. Low exposure, deep shadows, quiet mood.
No text, no lettering, no watermarks, no signature.`;

const CUTS: Record<string, string> = {
  // ① 피드 3초 판정용 — 폰에서 축소했을 때 얼굴이 사는지가 이 컷의 전부다.
  close: `Head-and-shoulders CLOSE-UP portrait. The face fills much of the frame, turned slightly toward the viewer.
Background is a dim wooden Korean shrine room, softly out of focus, with one faint window of moonlight.`,
  // ② 세계관 판정용 — 베틀·은사·까치가 다 들어간 시그니처 컷.
  loom: `HALF-BODY shot: she is seated at a wooden Korean loom (beteul) with a HALF-WOVEN CLOTH stretched on it.
The vertical warp threads are taut and pale; a single luminous SILVER weft thread crosses them horizontally,
leaving a faint star-like pattern woven into the cloth. She holds a wooden shuttle (buk) in one hand.
Behind her, one tall window shows moonlight and the Milky Way; a magpie perches on the sill outside.
Aged wood, candlelight, a Korean shrine room adjoining.`,
};

const STYLES: { id: string; label: string; style: string }[] = [
  { id: "A-sumuk", label: "순수 수묵담채(LOCK 원안)",
    style: `STYLE: Traditional Korean ink-wash painting (sumuk damchae) on hanji paper.
Visible brush strokes, soft ink bleed and washes, minimal delicate linework, large areas of empty paper.
Painterly and atmospheric rather than detailed. NOT photorealistic, NOT 3D.` },
  { id: "B-hybrid", label: "하이브리드(담채 배경 + 고밀도 인물) ← 추천",
    style: `STYLE: Korean webtoon illustration. The BACKGROUND is loose ink-wash (sumuk) texture on hanji paper,
but the FIGURE is rendered in refined high detail — crisp clean facial features, carefully drawn hanbok fabric folds
and silver embroidery. Cinematic, elegant, dark. NOT photorealistic, NOT 3D.` },
  { id: "C-semireal", label: "고채도 세미리얼 웹툰(시장 1위 마감)",
    style: `STYLE: High-detail semi-realistic Korean webtoon illustration, polished rendering with rich texture,
sharp cinematic lighting and strong contrast, like a premium mobile-game character portrait.
Detailed skin, hair strands and fabric. Still limited to the palette above. NOT 3D.` },
  { id: "D-photo", label: "실사풍(산군 세계관 통일축)",
    style: `STYLE: Photorealistic cinematic portrait photography. 85mm lens, shallow depth of field, natural skin texture,
subtle film grain, moody low-key lighting. Looks like a real photograph of a real person.` },
  { id: "E-miindo", label: "전통 미인도·공필 세밀화",
    style: `STYLE: Traditional Korean court beauty painting (miindo) in the manner of Shin Yun-bok,
with meticulous fine-line gongbi brushwork, flat elegant color fields, exquisite detail in the fabric patterns
and hair. Refined, antique, museum-quality. NOT photorealistic, NOT 3D.` },
  { id: "F-cel", label: "셀채색 웹툰(청월당축 · 비교군)",
    style: `STYLE: Clean cel-shaded Korean romance-webtoon illustration. Crisp line art, flat color with soft gradient
shading, bright and smooth. Modern webtoon app look. NOT photorealistic, NOT 3D.` },
];

function buildPrompt(styleId: string, cut: string): string {
  const s = STYLES.find((x) => x.id === styleId)!;
  return `${s.style}\n\nSUBJECT: ${SUBJECT}\n\nCOMPOSITION: ${CUTS[cut]}\n\n${PALETTE}`;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const arg = process.argv.find((a) => a.startsWith("--cut="))?.split("=")[1] ?? "both";
  const cuts = arg === "both" ? ["close", "loom"] : [arg];

  for (const cut of cuts) {
    const label = cut === "close" ? "얼굴 클로즈업 (폰에서 3초 판정용)" : "베틀 반신 (세계관 판정용)";
    const lines: string[] = [
      `# 직녀 그림채 프롬프트 — ${label}`,
      "",
      "> **ChatGPT 웹에 하나씩 붙여넣으세요.** (GPT 이미지 API 금지 — 퀄리티 문제, 2026-08-17 형님 지시)",
      "> 세로 비율(2:3, 예: 1024×1536)로 요청하시면 됩니다.",
      "> 인물·의상·소품·색은 6개가 전부 같습니다 — **스타일만 달라야 비교가 성립합니다.**",
      "",
    ];
    for (const s of STYLES) {
      lines.push(`## ${s.id} — ${s.label}`, "", "```", buildPrompt(s.id, cut), "```", "");
    }
    const file = resolve(OUT, `_프롬프트_${cut}.md`);
    writeFileSync(file, lines.join("\n"), "utf8");
    console.log(`· ${file}  (${STYLES.length}개 프롬프트)`);
  }
  console.log("\n생성은 ChatGPT 웹에서. 받은 이미지는 이 폴더에 <스타일>-<컷>.png 로 두면");
  console.log("scripts 없이도 비교판을 다시 만들 수 있습니다.");
}

main();
