// 직녀 그림채 시안 매트릭스 생성 — 스타일 6종 × 컷 2종
//
// 형님 지시(2026-08-17): "이왕 하는 김에 좀 더 많은 샘플".
// 아침에 형님이 375px 축소본을 보고 **스타일 하나**를 찍으면, 그게 직녀 본편 전체의 그림채가 된다.
// 그 선택 전까지는 마스터 컷·웹툰 컷을 뽑지 않는다(스타일이 바뀌면 전부 버려진다).
//
// 공통 불변(LOCK v3): 30대 초반 한국 여성 · 낮게 땋은 머리 · 아이보리 저고리+남색 치마 ·
//                     은사 액센트 · **화면에 빨강 0** · 달빛+촛불 · 텍스트/워터마크 없음
// 스타일만 바꾸고 인물·의상·소품·색은 고정해야 비교가 성립한다.
//
// 실행: npx tsx scripts/jiknyeo-style-samples.ts [--cut close|loom|both]
// 산출: 직녀/시안_그림채_스프레드/<style>-<cut>.png
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* 없으면 다음 것 */ }
}

const OUT = resolve("직녀/시안_그림채_스프레드");
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.IMAGE_MODEL ?? "gpt-image-1";

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

async function gen(prompt: string, file: string): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt, size: "1024x1536", n: 1 }),
  });
  if (!res.ok) {
    console.log(`   ✗ ${res.status} ${(await res.text()).slice(0, 220)}`);
    return false;
  }
  const j = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const d = j.data?.[0];
  if (d?.b64_json) {
    writeFileSync(file, Buffer.from(d.b64_json, "base64"));
  } else if (d?.url) {
    const img = await fetch(d.url);
    writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  } else {
    console.log("   ✗ 응답에 이미지가 없음");
    return false;
  }
  return true;
}

async function main() {
  if (!KEY) { console.log("OPENAI_API_KEY 없음 — 프롬프트만 비교시트에 싣는다."); return; }
  mkdirSync(OUT, { recursive: true });
  const arg = process.argv.find((a) => a.startsWith("--cut="))?.split("=")[1] ?? "both";
  // 우선순위: 6스타일 × 클로즈업(최소 판정선)을 먼저 다 뽑고, 그다음 베틀 컷.
  const cuts = arg === "both" ? ["close", "loom"] : [arg];

  let ok = 0, fail = 0;
  for (const cut of cuts) {
    for (const s of STYLES) {
      const file = resolve(OUT, `${s.id}-${cut}.png`);
      if (existsSync(file)) { console.log(`· ${s.id}-${cut} 있음 — 건너뜀`); ok++; continue; }
      const prompt = `${s.style}\n\nSUBJECT: ${SUBJECT}\n\nCOMPOSITION: ${CUTS[cut]}\n\n${PALETTE}`;
      process.stdout.write(`· ${s.id}-${cut} …`);
      const t0 = Date.now();
      try {
        if (await gen(prompt, file)) { console.log(` OK ${Math.round((Date.now() - t0) / 1000)}s`); ok++; }
        else fail++;
      } catch (e) {
        console.log(`   ✗ ${e instanceof Error ? e.message : e}`);
        fail++;
      }
    }
  }
  console.log(`\n완료 — 성공 ${ok} · 실패 ${fail}\n→ ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
