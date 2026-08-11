/**
 * 티저 웹툰(webtoon_pages) 조판·문장 손보기 — 어드민 편집기로 저장된 값을 코드에서 고친다.
 *
 *   npx tsx scripts/tune-webtoon.ts            # 지금 값만 보기(안 고침)
 *   npx tsx scripts/tune-webtoon.ts --apply    # 실제로 저장
 *
 * 편집기에 저장된 값은 코드의 TEXT_CUT_DEFAULTS 를 덮어쓰므로, 기본값만 고쳐서는 화면이 안 바뀐다.
 * 저장 전 직전 판을 webtoon_page_versions 에 넣어 두므로 어드민에서 되돌리기가 가능하다.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// .env 수동 로드 — 이 저장소 스크립트 공통 관례(seed-products.ts 와 같은 방식)
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 가 없습니다");

const SLUG = "sangun-sinjeom";
const APPLY = process.argv.includes("--apply");

type Bubble = { text?: string; size?: number; font?: string; [k: string]: unknown };
type Cut = {
  id: string;
  alt?: string;
  type?: string;
  bubbles?: Bubble[];
  textCut?: { text?: string; size?: number; font?: string; padY?: number; lineHeight?: number; color?: string; bg?: string };
  [k: string]: unknown;
};

/** 글 컷 새 원고 — 키는 현재 본문의 앞부분으로 찾는다(id 는 편집기가 새로 뽑을 수 있어 못 믿는다) */
const TEXT_CUT_REWRITE: { match: string; text: string; note: string }[] = [
  {
    match: "네게는 {신살}",
    note: "정보 전달 → 손님이 자기 얘기로 받는 문장. 마지막 줄만 남기고 앞은 산군이 짚어 주는 투로.",
    // {신살풀이} 는 신살 6종 공통 서술("~하는 살")이라, 뒤에 붙는 문장은 어느 살에도 맞아야 한다.
    // "남들은 이걸 성격이라 하더군" = 손님이 평생 성격으로 듣던 말에 다른 이름을 붙여 주는 자리.
    text: "네 글자에 {신살}이 박혀 있다.\n{신살풀이}.\n\n남들은 이걸 네 성격이라 하더군.\n아니다. 타고난 거다.",
  },
  {
    match: "나는 두루뭉술하게",
    note: "'나는 ~하지 않는다'는 자기소개다. 손님이 겪은 일로 열어 대비를 만든다.",
    text: "지금까지 어디서 뭘 들었든.\n좋은 말만 골라 들었을 거다.\n\n나는 그렇게 안 한다.\n해야 할 것과 하면 안 되는 것을\n날짜까지 적어 뒀다.",
  },
];

/** 글 컷 조판 — 4.4cqw(=15.4px) 는 대사와 같은 크기라 '쉬어가는 칸'이 안 됐다.
 *  글씨체도 명조(말풍선과 같음) → 송명조: 나레이션이 대사와 같은 옷을 입고 있었다. */
const TEXT_CUT_STYLE = { size: 5.4, font: "songmyung", padY: 20, lineHeight: 1.85 };

/** 말풍선 — 저장값 4.35cqw(=15.2px)라 코드 기본값(4.6→5.2)이 안 먹는다. DB 값을 직접 올린다.
 *  4.9cqw = 실측 350px 컷에서 17.2px — 스토리·티저의 산군 대사(17px)와 같은 목소리 크기.
 *  5.2 로 올렸더니 18.2px 이 되어 글컷(18.9)과 0.7px 차 — 위계가 사라졌다(0.5px 차는 안 보인다).
 *  최종: 본문 15 < 대사 17 < 나레이션 19. */
const BUBBLE_SIZE = 4.9;

async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });

  const { data: product, error: pe } = await db.from("products").select("id").eq("slug", SLUG).single();
  if (pe || !product) throw new Error(`상품을 못 찾음: ${pe?.message}`);

  const { data: page, error: ge } = await db
    .from("webtoon_pages")
    .select("id, cuts, is_published")
    .eq("product_id", product.id)
    .eq("kind", "teaser")
    .single();
  if (ge || !page) throw new Error(`웹툰 페이지를 못 찾음: ${ge?.message}`);

  const cuts = page.cuts as Cut[];
  console.log(`\n현재 컷 ${cuts.length}개 (노출중=${page.is_published})\n`);

  let bubbleChanged = 0;
  let textChanged = 0;

  const next: Cut[] = cuts.map((cut) => {
    const c: Cut = { ...cut };

    if (Array.isArray(c.bubbles) && c.bubbles.length) {
      c.bubbles = c.bubbles.map((b) => {
        console.log(
          `  [말풍선] ${String(b.text ?? "").slice(0, 22).replace(/\n/g, " / ")} — 크기 ${b.size ?? "기본값"} → ${BUBBLE_SIZE}`,
        );
        bubbleChanged++;
        return { ...b, size: BUBBLE_SIZE };
      });
    }

    if (c.textCut) {
      const cur = String(c.textCut.text ?? "");
      const rule = TEXT_CUT_REWRITE.find((r) => cur.startsWith(r.match));
      console.log(`  [글컷] "${cur.slice(0, 20).replace(/\n/g, " / ")}…"`);
      console.log(`         크기 ${c.textCut.size} → ${TEXT_CUT_STYLE.size} · 글씨체 ${c.textCut.font} → ${TEXT_CUT_STYLE.font}`);
      if (rule) {
        console.log(`         원고 교체 (${rule.note})`);
        console.log(`         ↓\n${rule.text.split("\n").map((l) => "           " + l).join("\n")}`);
        textChanged++;
      } else {
        console.log(`         ⚠ 원고 규칙 없음 — 조판만 바꿈`);
      }
      c.textCut = { ...c.textCut, ...TEXT_CUT_STYLE, ...(rule ? { text: rule.text } : {}) };
    }
    return c;
  });

  console.log(`\n글컷 원고 ${textChanged}개 교체`);

  if (!APPLY) {
    console.log("\n--apply 를 붙이면 저장합니다(직전 판은 자동 보관).\n");
    return;
  }

  // 되돌리기용 직전 판 보관 — 어드민 편집기가 쓰는 것과 같은 테이블
  const { error: ve } = await db.from("webtoon_page_versions").insert({ page_id: page.id, cuts: page.cuts });
  if (ve) console.warn(`⚠ 직전 판 보관 실패(계속 진행): ${ve.message}`);

  const { error: ue } = await db.from("webtoon_pages").update({ cuts: next }).eq("id", page.id);
  if (ue) throw new Error(`저장 실패: ${ue.message}`);
  console.log("\n저장 완료.\n");
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
