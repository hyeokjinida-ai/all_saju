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

const SUBJECT = `A Korean woman who is 32 years old — young and fresh-faced but composed and dignified.
IMPORTANT: she must NOT read as middle-aged. No nasolabial lines, no sagging, no tired eyes.
Smooth youthful skin, but an adult's calm expression — think early-thirties, not late-forties.
Serene, quietly warm. Face clearly visible: soft oval face, calm steady eyes (BOTH EYES THE SAME COLOR —
their color is specified under ALLURE below and must be followed exactly),
a subtle gentle smile, natural adult proportions — never childlike, never sexualized.
Long black hair in a single loose low braid over one shoulder, a few loose strands.
She wears a Korean hanbok: moon-pale ivory jeogori (top) with a DEEP INDIGO chima (skirt),
a PALE SILVER-GREY goreum ribbon, and subtle silver-thread star embroidery near the cuffs. Modest neckline, always properly closed at the chest.`;

// 매력 블록 — 형님 지시(2026-08-17): 「누가봐도 이쁘고 매력적이게 / 매력적인 포인트가 있으면 좋겠어」
// 1차 웹 시안이 단아하기만 하고 눈에 걸리는 게 없었다. 여기서 두 가지를 동시에 노린다:
//  ① 미모 자체를 올린다(눈매·속눈썹·입술 혈색·목선)
//  ② **우리만의 시그니처**를 박는다 — 눈동자의 은하수, 목에 감기는 은사, 눈가 점.
//     남이 따라 해도 우리 세계관(베틀·은사)이 없으면 성립하지 않는 포인트여야 한다.
// 선: 타깃이 3040 여성이다. 성적 대상화가 아니라 '아름다움과 분위기'로 간다.
// 매력 블록 — 2026-08-17 2차 개정. 형님 지시: 「얼굴 스타일도 훔치고 싶어 / 여자들이 좋아하는
// 포인트가 있을 거란 말이지? 눈동자색이라던지 머리스타일이라던지」
//
// ★ 컬러 앵커 — 4사 실측으로 확증된 공식이다: **무채색 바탕(검은 머리 + 창백한 피부)에 눈동자만 색.**
//   ① 고죠 사토루 = 흰머리+창백한 피부에 하늘색 눈
//   ② 홍연아씨(청월당 재회비책, 재구매 105회) = 흰 피부+검은 속눈썹에 적갈색 눈
//      실물: 경쟁사레퍼런스/청월당/랜딩/재회비책/09.png. 앞머리 없이 한쪽으로 흘린 머리. 위저드 단계마다 포즈가 바뀜.
//   ③ 유혹사주(29금) = 검은머리+창백한 피부에 진홍 눈 · 목 장신구가 매력의 절반
//   ④ 솔로지옥 연애사주 = 검은머리+창백한 피부에 밝은 회청색 눈 · 극단적 크롭으로 눈이 화면을 지배
// → 폰 375px에서 얼굴이 뭉개져도 눈 색은 남는다. 그게 캐릭터 식별자다.
//   직녀는 원래 검정/짙은갈색이라 앵커가 없었다 — 그걸 고치는 게 이 개정의 핵심.
// → 앵커의 절반은 **피부**가 만든다(창백할수록 눈이 튄다). 그래서 §1에 porcelain-pale 을 박았다.
// → ②③④ 마감이 전부 **매끈한 광택**이다. 거친 마감은 이 시장에 하나도 없다 → H축 확정, G는 리스크.
// → ③④에서 추가로 가져온 것: 얼굴 감싸는 긴 머리 두 가닥(§2) · 은사를 초커처럼(§4) · 입술 광택(§6) ·
//    극단적 크롭(CUTS.close). 가져오지 않은 것: 29금 노출 축 — 유혹사주는 손님이 **되고 싶은 모습**을 팔고
//    직녀는 손님이 **믿는 상대**다. 직녀가 유혹하면 상담자가 아니게 된다.
//
// ⚠ 사양서 §5-1 변경점: 「눈동자는 검정 또는 짙은 갈색」 → **밤하늘 남보라(deep indigo-violet)**.
//    붉은 눈 금지(홍연아씨 회피) 조항은 그대로 지켜지고, 남색은 이미 우리 팔레트 안에 있는 색이다.
//    형님 컨펌 나면 `직녀_사양서.md` §5-1·§5-2 고정블록도 같이 갈아끼운다.
// ⚠ 눈가리개는 못 쓴다(직녀는 얼굴 공개가 콘셉트) → 「한쪽 눈만 그늘」로 낙차를 옮겼다.
//
// ⚠ 노출 금지 (2026-08-17 형님 확정: 「가슴골은 보여주지말고」). 1차 매력판에서 저고리가
//    예상보다 벌어졌다. 타깃이 3040 **여성**이라 직녀는 손님과 같은 성별이고, 파는 감정은
//    이성적 끌림이 아니라 **동일시**("저 언니 매력 있다, 내 편이다")다. 노출이 생기는 순간
//    '남자 보라고 만든 그림'으로 읽혀 오히려 거리가 생긴다.
//    (타이트가 상반신 노출을 쓰는 건 여성 고객에게 **남성** 캐릭터를 팔기 때문 — 구조가 반대다)
//    덤으로 메타 심사 리스크도 얻는 것 없이 진다. 매력은 §1~6(눈동자·점·은사·미소)이 나른다.
const ALLURE = `ALLURE — this is the point of the image. She must be a face a viewer stops scrolling for.

1. COLOR ANCHOR — HER EYES ARE THE ONLY COLOR IN HER FACE.
   The irises are DEEP INDIGO-VIOLET, the color of a night sky — NOT brown, NOT black —
   with fine SILVER star-glints scattered inside them, as if a band of the Milky Way were
   caught in her gaze. Everything else in her face is ink, ivory and shadow. Even shrunk
   to a thumbnail, that eye color is what identifies her.
   Her SKIN IS PORCELAIN-PALE and luminous against her black hair, so that the eye color
   is the single point of hue in an otherwise colorless face. This contrast is what makes
   the anchor work — pale skin, black hair, one color in the eyes.
   Eye shape: large and clear, outer corners very slightly lowered, long lashes over a
   clean dark lash line. She is looking directly at the viewer.

2. ASYMMETRY & FACE-FRAMING HAIR — never a symmetrical doll face. Her forehead is bare
   (no blunt fringe). The single loose braid falls forward over ONE shoulder only; the
   opposite side of her neck and that ear stay bare.
   TWO long loose strands fall free in front of her ears and frame her face past the jaw —
   they must be clearly present; they are what shapes the face. A few finer strands have
   escaped at the temple.

3. HALF-VEILED EYE — one eye is partly shadowed by a fall of hair and the curl of the
   silver thread; the other is fully lit and perfectly clear. Withheld, never hidden.

4. SIGNATURE MARKS — a SMALL BEAUTY MARK just below the outer corner of her left eye.
   ONE luminous SILVER THREAD escaped from the loom WRAPS HER THROAT LIKE A FINE CHOKER
   and runs on through a lock of hair, and a loose end of it trails from the tip of her
   braid — it is the brightest thing in frame and it leads the viewer's eye to her face.
   A slim silver binyeo and one slender silver drop earring catch the moonlight.
   These are her only ornaments; nothing else jewel-like appears.

5. SILHOUETTE TEST — she must be recognizable in pure outline: the forward-falling braid
   with a loose silver thread trailing off its tip.

6. EXPRESSION — a faint knowing smile, lips slightly parted and full, carrying a soft wet
   SHEEN so they catch the light. Their tone is a muted natural rose — alive, but NEVER a
   saturated red. She has already read something about you that you have not told her.
   Confident and quietly alluring — not coy, not cute, not smug.

7. NECKLINE — the jeogori is properly CLOSED at the chest. Only her slender neck and the very
   top line of the collarbone show above the collar. NO open chest, NO cleavage, NO bare
   shoulders. Elegance comes from the long neck and her posture, never from exposed skin.`;

// 마감 블록 — 형님 지시(2026-08-17): 고죠 사토루 작화를 레퍼런스로 쓰고 싶다.
// 이미지는 붙이지 않는다(일본 애니 얼굴이 딸려 들어와 32세가 20살로 내려앉고 먹빛 세계관이 깨진다).
// 대신 그 작화가 **폰 크기에서 얼굴을 살리는 기술 세 가지**만 문장으로 옮긴다:
//   ① 눈이 화면에서 가장 고밀도 — 다른 데가 다 헐거워도 눈만은 선명
//   ② 림라이트로 인물을 어두운 배경에서 뜯어냄 (A-수묵이 뭉개져 보였던 문제의 해법)
//   ③ 밀도 낙차 — 얼굴에 몰고 배경은 비운다
// ⚠ 설계 제약: 이 블록이 STYLE을 이기면 6종이 전부 같아 보여 비교가 죽는다.
//    그래서 "스타일 안에서 적용하라"고 못박고, 각 화풍이 제 어법으로 풀게 둔다.
// ⚠ PALETTE와 충돌 금지: 림라이트는 창문 달빛이지 새 광원이 아니다. 최고 휘도는 여전히 은사.
const FINISH = `FINISH — apply this WITHIN the chosen style above; it must NOT override the style:
- THUMBNAIL TEST: this image will be viewed shrunk to 375px wide on a phone.
  The face must still read clearly at that size. Render accordingly.
- THE EYES CARRY THE HIGHEST DETAIL DENSITY IN THE FRAME: a defined lash line and
  eyelid crease, individual upper lashes, and one crisp specular catchlight in each
  iris. Even where the rest of the image is loose, washed or painterly, the eyes
  stay sharp and precisely drawn.
- SEPARATION LIGHT: the cool moonlight falls as a RIM along her silhouette — the top
  of the hair, the jawline, one shoulder — lifting her cleanly off the dark
  background. Her face holds both the lightest and the darkest values in the frame;
  the background stays middle-dark and uncluttered. (The escaped silver thread is
  still the single brightest element; this rim sits just below it.)
- DETAIL FALLOFF: detail concentrates on the face, then the collar and shoulders,
  then drops away fast. The background is atmospheric, never busy.

GUARD — the finish above must not drag the image toward Japanese anime:
- ADULT KOREAN facial proportions. Realistic eye size — NOT enlarged anime eyes.
  A visible nose bridge, a soft rounded jaw, never a sharp pointed chin.
- The added rendering detail must NOT lower her apparent age. She still reads as a
  composed 32-year-old woman, never a teenager, never a schoolgirl.
- Do not raise saturation and do not add colored light. The rim is cool silver-white
  moonlight only, and the ban on red stays absolute.`;

const PALETTE = `Palette strictly limited to ink-black, deep indigo, and moon-pale ivory,
plus ONE cool SILVER accent (silver thread / Milky Way sheen) as the only luminous element.
Her indigo-violet irises belong to this palette — they are the deep indigo of it, concentrated.
Do NOT desaturate them to grey or black; they must stay clearly readable as a color.
NO RED, CRIMSON OR SCARLET ANYWHERE IN THE FRAME — no red thread, no red ribbon, no red
embroidery, no red lantern, no red lips. Nothing she wears, holds or stands near is red.
ONE NARROW EXCEPTION, HER SKIN ONLY: keep a faint natural warmth in her face — a soft flush
across the nose and cheekbones, a little colour at the inner eye corners, and the muted rose
of her lips. She must look alive and warm-blooded, never grey, never corpse-pale.
This warmth lives in her skin and nowhere else in the frame.
Lighting: cool moonlight and starlight, with at most a trace of low warm candlelight. Low exposure, deep shadows, quiet mood.
No text, no lettering, no watermarks, no signature.`;

const CUTS: Record<string, string> = {
  // ① 피드 3초 판정용 — 폰에서 축소했을 때 얼굴이 사는지가 이 컷의 전부다.
  //
  // 2026-08-17 전면 개정. 형님이 2차 레퍼런스(고죠, 어깨너머 돌아보며 손이 얼굴에 닿은 팬아트)를 주시며
  // 「그림이 이상해졌어 / 이런 매력적인거」. 판독해 보니 그 그림 매력의 절반은 화풍이 아니라 **포즈와 배경**이었다:
  //   ① 어깨너머 돌아보기(가려다 돌아본 순간) ② 손이 얼굴에 닿음 ③ **배경이 텅 빔**(그라데이션+비네팅)
  // 특히 ③ — 기존 close 는 배경에 「어둑한 목조 신당 방」을 그리게 해서 얼굴과 시선을 나눠 먹었다.
  // 세계관 판정은 loom 컷이 지고 있으므로, **광고·카드용인 close 는 배경을 비우는 게 맞다.**
  // 손에는 은사 끝을 쥐게 해서 매력 포즈와 세계관을 한 컷에 묶었다(빈손이면 그냥 예쁜 그림이 된다).
  close: `Head-and-shoulders CLOSE-UP. She is turned THREE-QUARTERS AWAY from the viewer and
LOOKS BACK OVER HER SHOULDER — caught in the act of turning back, as if she has just been called.
Head slightly tilted. ONE HAND is raised close to her face, fingertips resting near her jaw,
and between two fingertips she holds the loose end of the SILVER THREAD. The braid falls forward
across the near shoulder.
CROP IN TIGHT: her face fills MOST of the frame and the top of her head is cut off by the
upper edge. Her eyes sit near the centre of the image and dominate it.
THE BACKGROUND IS ALMOST EMPTY: a smooth deep-indigo gradient, darker toward the corners,
with only the faintest suggestion of distant starlight. NO room, NO furniture, NO window,
NO props. Nothing in the frame competes with her face.`,
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
  // ⚠ 1차에서 C와 D가 거의 같아 보였다 — C를 '그림'쪽으로 확실히 민다(선이 보이게).
  { id: "C-semireal", label: "고채도 세미리얼 웹툰(시장 1위 마감)",
    style: `STYLE: High-detail Korean webtoon ILLUSTRATION — clearly hand-drawn, not a photograph.
Visible clean line art on the eyes, nose and hanbok edges, with polished painterly shading over it.
Rich texture, sharp cinematic lighting, strong contrast — like a premium mobile-game character portrait.
It must be immediately recognizable as drawn artwork. NOT photorealistic. NOT 3D.` },
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
  // ⛔ 2026-08-17 형님 확정: **「먹물버전으로 가지말아줘」** — 먹 계열 전부 폐기.
  //    폐기 대상: A(수묵담채) · B(하이브리드) · G 전 변주(기본/G1 거칠게/G2 은사폭발) ·
  //               계획했던 G3(물번짐)·G4(서예 획).
  //    실측 근거: 폰 375px 비교에서 먹 계열은 전부 얼굴이 어두워지거나 배경 붓자국에 묻혔다.
  //    → 남는 축은 **H(매끈 광택)** 하나. 아래 정의들은 이력으로만 남긴다(다시 쓰지 않는다).
  //
  // G — 2026-08-17 형님이 주술회전 OST 커버(고죠, 懐玉·玉折/渋谷事変)를 레퍼런스로 주셨다. 그 화풍 해부:
  //   ①선화 없음(색면+붓자국으로 형태) ②갈필 머리카락(가닥 아닌 넓적붓 자국, 끝이 갈라짐)
  //   ③먹 스플래터가 화면 위에 얹혀 얼굴을 일부 덮음 ④눈만 고해상 ⑤3색 제한 ⑥거친 자국 안 지움
  // B와 뭐가 다른가: B는 「배경만 수묵, 인물은 정밀」이라 그림과 인물이 분리돼 있다.
  //   G는 **인물 자체에 붓질과 먹이 올라탄다.** 진짜 싸움은 이 한 축(먹을 인물에 얼마나 올리나)이라
  //   형님 비교는 A(전부 먹) / B(배경만 먹) / G(인물에 먹) 셋이면 끝난다.
  // 원본의 3색은 하늘색/먹/진홍인데 진홍 자리는 **비운다** — 우리 팔레트는 빨강 0.
  //   유일한 순색 슬롯은 남보라 눈동자(ALLURE §1 컬러 앵커)가 가져간다.
  // ✗✗ G 는 2026-08-17 형님 판정으로 **탈락**했다. 실물 2장을 뽑아 보시고 「먹물느낌이 별로 좋지않아보여」.
  //    되살리지 말 것. 인물에 먹을 올리는 축은 여기서 닫혔다.
  //    (같은 판정에서 정해진 것: 먹은 **배경에만** 남긴다 → I 로 이관. 인물에는 먹 0.)
  // H — 2026-08-17 형님 2차 레퍼런스(고죠 팬아트: 어깨너머 돌아보기 + 매끈한 광택 마감).
  //   「그림이 이상해졌어 / 이런 매력적인거」 → G의 「거칠게·미완성처럼」 조항이 매력을 죽인 것으로 본다.
  //   H는 G의 정확한 반대다: 붓자국 0, 새틴 광택, 흠 없는 마감. **현재 매력 축 최유력.**
  //   ⚠ 위험: 마감이 매끄러울수록 C(세미리얼)·F(셀채색)와 가까워지고 먹빛 차별화가 옅어진다.
  //      그래서 배경만은 먹빛 남색 그라데이션으로 묶어 둔다(팔레트로 버틴다).
  { id: "H-glossy", label: "매끈 광택 페인팅(매력 축) ← 신규",
    style: `STYLE: Glossy, high-polish digital illustration with an immaculate, luminous finish.
Skin is soft and flawless with NO visible brush texture. Fabric carries a SATIN SHEEN —
crisp cool highlights running along every fold, so the dark hanbok reads as rich and expensive.
Hair is rendered in fine soft strands with a silky light-catch along the top.
A cool rim light traces her silhouette and the background falls away into a smooth gradient
with a soft vignette. Beautiful, elegant, quietly magnetic — premium romance-webtoon cover
quality. NOT rough, NOT sketchy, NOT textured, NOT photorealistic, NOT 3D.` },
  // I — 2026-08-17 형님이 「도깨비 재회사주」 상품 카드(경쟁사 신상, 직녀 재회의 정면 경쟁자)를 주시며
  //   「저런 스타일의 그림을 뽑고싶은데?」. H와의 차이는 딱 둘: **반실사에 더 가깝고, 젖어 있다.**
  //   비는 우리 세계관이 아니지만 **물은 맞다** — 은하수(銀河)가 은빛 강이고 원안 사양서에도
  //   「물에 비친 별」이 있었다. 그래서 비 대신 **밤안개·이슬**로 옮겼다.
  //   ⚠ H와 가깝다(I = H + 젖은 질감 + 반실사). 둘 다 뽑으면 낭비다 — I 가 매끈 축의 대표다.
  //
  // ★ 2026-08-17 형님 확정 — **먹은 배경에만.** G 탈락 후 「먹물을 어디까지 빼냐」에 대한 답이다.
  //   인물(얼굴·피부·머리카락·옷)에는 먹 0 — 스플래터도 붓자국도 없다.
  //   대신 **흐려진 뒷배경에만** 옅은 수묵 번짐을 깔아 먹빛 세계관을 지킨다.
  //   근거: 먹빛이 5사 대비 우리 유일한 시각 차별화였는데(광고 소재 판독 §8), 인물에 올리면 형님 취향에
  //   안 맞고 얼굴도 죽는다. 배경은 어차피 얕은 심도로 흐려지니 **지저분해질 위험 없이 색만 남는다.**
  //   ⚠ 「never reaches her」를 반드시 유지할 것 — 이 한 줄이 빠지면 먹이 다시 머리로 기어올라온다.
  { id: "I-dewy", label: "젖은 반실사 고광택 + 배경 먹번짐 (본선) ★",
    style: `STYLE: Ultra-polished SEMI-REALISTIC Korean illustration with a WET, DEWY finish —
the look of a premium mobile-game or webtoon key visual. Her skin is luminous and almost
photoreal in its softness, yet the image is unmistakably PAINTED, never a photograph.
NIGHT MIST beads finely on her skin, on individual strands of hair and along her lashes,
catching the light. A few damp strands are stuck against her cheek and temple. The whole
frame gleams faintly, as if the air itself were wet.
Extremely high detail on the face. SHALLOW DEPTH OF FIELD — the face is razor sharp and
everything behind her dissolves into soft blur.
THE FIGURE HERSELF CARRIES NO INK TEXTURE AT ALL. Her face, skin, hair and clothing are
rendered cleanly and smoothly — no splatter, no spray, no dripping ink, no visible brush
marks anywhere on her body or hair.
BEHIND HER ONLY, the out-of-focus background carries a faint SUMUK INK-WASH BLOOM — soft
dark ink bleeding into the deep indigo like wet pigment spreading on paper. It stays blurred
and formless, it NEVER REACHES HER, it never touches her hair or crosses her silhouette,
and it never resolves into an object.
Cool, diffuse cinematic light with no harsh source.
NOT rough, NOT sketchy, NOT cel-shaded, NOT 3D, NOT photography.` },
];

function buildPrompt(styleId: string, cut: string): string {
  const s = STYLES.find((x) => x.id === styleId)!;
  return `${s.style}\n\nSUBJECT: ${SUBJECT}\n\n${ALLURE}\n\n${FINISH}\n\nCOMPOSITION: ${CUTS[cut]}\n\n${PALETTE}`;
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
      `> 인물·의상·소품·색은 ${STYLES.length}개가 전부 같습니다 — **스타일만 달라야 비교가 성립합니다.**`,
      "> **★ `I-dewy` 한 장만 뽑으시면 됩니다 (본선).** 인물은 매끈한 고광택, 먹은 흐린 배경에만 — 2026-08-17 형님 확정.",
      "> G(인물에 먹)는 실물 2장 뽑아 보고 **탈락**했습니다(「먹물느낌이 별로 좋지않아보여」). 되살리지 마세요.",
      "> H 는 I 에서 배경 먹번짐만 뺀 것 — I 가 지저분하면 그때 대안으로 쓰십시오. A·B·C·D·E·F 는 참고용입니다.",
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
