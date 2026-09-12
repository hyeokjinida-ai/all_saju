// npx tsx scripts/verify-review-slot.ts [--keep] [--reward]
//
// 후기 자리 + 후기 답례 질문권 검증. **운영 Supabase 에 직접 쓴다** — 끝나면 전부 지운다
// (verify-money-path.ts 와 같은 방침. 남아도 눈에 띄게 VERIFY-REVIEW- 접두사를 쓴다).
//
//   기본        승인 후기 3건을 심는다 → 화면을 볼 수 있다 → 지운다
//   --keep      안 지운다(브라우저로 조판을 잴 때)
//   --reward    후기 답례 경로까지 실제로 태운다(LLM 1콜) — 크레딧 → 무료 질문 → 답변 생성
//   --route     dev 서버(3001)의 /api/questions/create 를 직접 때린다 — 정상 1건 + **실패 시 질문권 반환** 1건
//
// ⚠ app 모듈은 import 시점에 env 를 검증한다 → env 를 먼저 깔고 **동적 import** 한다.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), f), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = v;
      }
    } catch {}
  }
}
loadEnv();

const KEEP = process.argv.includes("--keep");
const REWARD = process.argv.includes("--reward");
// --route: dev 서버를 실제로 때린다(기본 3001 = coldopen 워크트리). 서버가 떠 있어야 한다.
const ROUTE = process.argv.includes("--route");
const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://localhost:3001";

const ok = (m: string, d = "") => console.log(`   ✓ ${m}${d ? " — " + d : ""}`);
const bad = (m: string, d = "") => {
  console.log(`   ✗ ${m}${d ? " — " + d : ""}`);
  process.exitCode = 1;
};

// 조판을 재려면 길이가 다른 후기가 섞여 있어야 한다 — 전부 같은 길이면 카드 높이가 안 흔들려
// 「190~210px」 실측이 우연히 맞을 수 있다. 짧은 것(제목만) · 중간 · 긴 것 하나씩.
const SEED = [
  { rating: 5, content: "기다릴 달과 움직일 달을 알았어요." },
  {
    rating: 5,
    content:
      "왜 같은 사람만 만나는지 답을 들었어요. 인연이 끊긴 게 아니라 제 흐름이 거기 머물러 있던 거였더라고요.",
  },
  {
    rating: 4,
    content:
      "이직을 일 년 고민했는데 풀이 보고 두 달 만에 결정했어요. 이유가 명확해지는 느낌이 좋았고, 조심하라던 달도 지나고 보니 맞았습니다. 다만 분량이 많아 한 번에 다 읽기는 벅찼어요.",
  },
];

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const stamp = Date.now();
  const madeOrders: string[] = [];
  const madeReviews: string[] = [];

  console.log("\n── 0. 스키마 점검");
  {
    const { error } = await svc.from("reviews").select("is_approved").limit(1);
    error ? bad("reviews.is_approved 컬럼", error.message) : ok("reviews.is_approved 컬럼", "있음");
  }
  {
    const { error } = await svc.from("extra_questions").select("source").limit(1);
    error ? bad("extra_questions 테이블", error.message) : ok("extra_questions 테이블", "있음");
  }

  const { data: product } = await svc
    .from("products")
    .select("id, slug, name")
    .eq("slug", "sangun-sinjeom")
    .maybeSingle();
  if (!product) return bad("산군 상품", "없음");
  ok("산군 상품", product.name as string);

  // 이름이 붙는지 보려면 profiles 가 있는 회원이어야 한다. 없으면 게스트 후기로 심는다
  // (그 경우 화면의 이름은 "손님"이 된다 — 그것도 확인할 값이다).
  const { data: someProfile } = await svc.from("profiles").select("id, display_name, email").limit(1).maybeSingle();
  const memberId = (someProfile?.id as string | undefined) ?? null;
  console.log(`   · 후기 주인: ${memberId ? `회원 ${String(someProfile?.email).slice(0, 6)}…` : "게스트(이름은 '손님')"}`);

  console.log("\n── 1. 승인 후기 3건 심기");
  for (const [i, s] of SEED.entries()) {
    const orderId = `VERIFY-REVIEW-${stamp}-${i}`;
    const { data: order, error: oErr } = await svc
      .from("orders")
      .insert({
        order_id: orderId,
        product_id: product.id,
        amount: 19900,
        status: "paid",
        paid_at: new Date().toISOString(),
        user_id: memberId,
        guest_email: memberId ? null : `verify+rev${stamp}${i}@example.com`,
      })
      .select("id")
      .single();
    if (oErr || !order) {
      bad(`주문 ${i + 1}`, oErr?.message);
      continue;
    }
    madeOrders.push(order.id);

    const { data: rev, error: rErr } = await svc
      .from("reviews")
      .insert({
        user_id: memberId,
        guest_email: memberId ? null : `verify+rev${stamp}${i}@example.com`,
        order_id: order.id,
        product_id: product.id,
        rating: s.rating,
        content: s.content,
        is_approved: true, // 승인 게이트를 통과시킨 상태로 심는다(화면에 서는 조건)
      })
      .select("id")
      .single();
    if (rErr || !rev) bad(`후기 ${i + 1}`, rErr?.message);
    else {
      madeReviews.push(rev.id);
      ok(`후기 ${i + 1}`, `★${s.rating} · ${s.content.length}자`);
    }
  }

  console.log("\n── 2. 기본값이 정말 숨김인가(0013)");
  {
    // is_approved 를 안 주고 넣어 본다 — default 가 false 여야 한다.
    const orderId = `VERIFY-REVIEW-${stamp}-gate`;
    const { data: order } = await svc
      .from("orders")
      .insert({
        order_id: orderId,
        product_id: product.id,
        amount: 19900,
        status: "paid",
        paid_at: new Date().toISOString(),
        user_id: null,
        guest_email: `verify+gate${stamp}@example.com`,
      })
      .select("id")
      .single();
    if (order) {
      madeOrders.push(order.id);
      const { data: rev } = await svc
        .from("reviews")
        .insert({
          guest_email: `verify+gate${stamp}@example.com`,
          order_id: order.id,
          product_id: product.id,
          rating: 1,
          content: "게이트 확인용 — 이 후기는 화면에 뜨면 안 된다.",
        })
        .select("id, is_approved")
        .single();
      if (rev) {
        madeReviews.push(rev.id);
        rev.is_approved === false
          ? ok("새 후기 기본값", "false(숨김) — 0013 적용됨")
          : bad(
              "새 후기 기본값",
              `${rev.is_approved} — **0013 미적용**. Supabase SQL Editor 에 ` +
                `supabase/migrations/0013_review_gate.sql 붙여넣고 Run 해야 한다`,
            );
      }
    }
  }

  console.log("\n── 3. 화면이 읽는 경로(getProductReviews)");
  {
    // 게이트 확인용 후기를 어드민 토글과 **같은 UPDATE** 로 내려 본다.
    // (0013 이 아직 없는 DB 에서도 코드의 필터 자체는 여기서 증명된다 —
    //  마이그레이션이 하는 일은 「새 행의 기본값」뿐이고 필터는 이미 살아 있다.)
    await svc.from("reviews").update({ is_approved: false }).ilike("content", "게이트 확인용%");
    const { getProductReviews } = await import("../src/lib/home-data");
    const rows = await getProductReviews(product.id as string, 3);
    rows.length === 3 ? ok("승인 후기", `${rows.length}건`) : bad("승인 후기", `${rows.length}건(기대 3)`);
    const leaked = rows.some((r) => r.content.includes("게이트 확인용"));
    leaked ? bad("내린 후기가 화면 경로로 샘") : ok("내린 후기", "화면 경로에서 빠짐");
    for (const r of rows) console.log(`     · ${r.who} ★${r.rating} ${r.content.slice(0, 28)}…`);
  }

  if (REWARD) {
    console.log("\n── 4. 후기 답례 → 무료 질문 → 답변 (LLM 1콜)");
    const parentUuid = madeOrders[0];
    // 답변은 원 결과지의 명식으로 만든다 → 입력·결과지가 있어야 한다.
    await svc.from("saju_inputs").insert({
      order_id: parentUuid,
      name: "지수",
      birth_date: "1993-05-15",
      birth_time: "14:30",
      time_unknown: false,
      gender: "female",
      calendar: "solar",
      concerns: ["올해 이직해도 될까요"],
    });
    const { data: res, error: resErr } = await svc
      .from("saju_results")
      .insert({
        order_id: parentUuid,
        product_slug: "sangun-sinjeom",
        myeongsik: { note: "verify" },
        interpretation_md: "## 산군의 장부\n### 1. 네 그릇부터 보자\n네 그릇은 넓다.",
        llm_provider: "verify",
        llm_model: "verify",
      })
      .select("id")
      .single();
    if (!res) bad("검증용 결과지", resErr?.message ?? "생성 실패");
    else {
      const { data: credit } = await svc
        .from("extra_questions")
        .insert({ parent_order_id: parentUuid, source: "review_reward", status: "credited" })
        .select("id")
        .single();
      credit ? ok("답례 크레딧 발급") : bad("답례 크레딧 발급");

      if (credit) {
        await svc.from("extra_questions").update({ question: "올해 이직해도 되나", status: "pending" }).eq("id", credit.id);
        const { answerExtraQuestionById } = await import("../src/lib/saju/generate-result");
        const t0 = Date.now();
        const outcome = await answerExtraQuestionById(svc as never, credit.id as string);
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        if (outcome.ok) {
          ok("무료 답변 생성", `${secs}초 · 결과지 ${outcome.resultId}`);
          const { data: after } = await svc
            .from("extra_questions")
            .select("status, answer_md")
            .eq("id", credit.id)
            .single();
          after?.status === "answered" ? ok("상태", "answered") : bad("상태", String(after?.status));
          const len = (after?.answer_md as string | null)?.length ?? 0;
          len > 100 ? ok("답변 길이", `${len}자`) : bad("답변 길이", `${len}자`);
        } else {
          bad("무료 답변 생성", `${outcome.reason} ${outcome.detail ?? ""}`);
        }
      }
    }
  }

  if (ROUTE) {
    // 라우트를 **실제로 때린다**(dev 3001). 여기서만 잡히는 것: 크레딧 분기가 유료 분기보다
    // 위에 있는지, 그리고 **답변 생성이 실패했을 때 질문권이 돌아오는지**.
    // 뒤엣것이 중요하다 — 안 돌아오면 손님은 답도 못 받고 권리도 잃는다(강탈).
    console.log(`\n── 5. 라우트 실사격 (${BASE})`);
    const mk = async (withInput: boolean) => {
      const { data: o } = await svc
        .from("orders")
        .insert({
          order_id: `VERIFY-REVIEW-${stamp}-rt${withInput ? "1" : "0"}`,
          product_id: product.id,
          amount: 19900,
          status: "paid",
          paid_at: new Date().toISOString(),
          user_id: null, // 게스트 — 결과지 링크가 곧 권한이라 로그인 없이 라우트를 탈 수 있다
          guest_email: `verify+rt${stamp}${withInput ? 1 : 0}@example.com`,
        })
        .select("id")
        .single();
      if (!o) return null;
      madeOrders.push(o.id);
      if (withInput) {
        await svc.from("saju_inputs").insert({
          order_id: o.id, name: "지수", birth_date: "1993-05-15", birth_time: "14:30",
          time_unknown: false, gender: "female", calendar: "solar", concerns: ["올해 이직해도 될까요"],
        });
      }
      const { data: r } = await svc
        .from("saju_results")
        .insert({
          order_id: o.id, product_slug: "sangun-sinjeom", myeongsik: { note: "verify" },
          interpretation_md: "## 산군의 장부\n### 1. 네 그릇부터 보자\n네 그릇은 넓다.",
          llm_provider: "verify", llm_model: "verify",
        })
        .select("id")
        .single();
      const { data: c } = await svc
        .from("extra_questions")
        .insert({ parent_order_id: o.id, source: "review_reward", status: "credited" })
        .select("id")
        .single();
      return { orderUuid: o.id as string, resultId: r?.id as string, creditId: c?.id as string };
    };

    const post = async (resultId: string, question: string) => {
      const res = await fetch(`${BASE}/api/questions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, question }),
      });
      return { status: res.status, json: (await res.json()) as Record<string, unknown> };
    };

    // (a) 정상 — 결제창을 안 거치고 답이 붙어야 한다
    const good = await mk(true);
    if (!good) bad("라우트 준비(정상)");
    else {
      const { status, json } = await post(good.resultId, "올해 이직해도 되나");
      json.free === true ? ok("답례 질문", `free · 결과지 ${String(json.resultId).slice(0, 8)}…`)
                         : bad("답례 질문", `${status} ${JSON.stringify(json).slice(0, 120)}`);
      json.orderId ? bad("결제 주문이 생겼다", "크레딧이 있는데 유료 분기를 탔다") : ok("결제 주문", "안 만듦");
      const { data: after } = await svc.from("extra_questions").select("status").eq("id", good.creditId).single();
      after?.status === "answered" ? ok("크레딧 소진", "answered") : bad("크레딧 소진", String(after?.status));
    }

    // (b) 실패 — 명식 입력이 없어 답을 못 만든다. 질문권이 **credited 로 돌아와야** 한다.
    const broken = await mk(false);
    if (!broken) bad("라우트 준비(실패 재현)");
    else {
      const { status, json } = await post(broken.resultId, "이건 실패해야 한다");
      status === 503 ? ok("실패 응답", "503") : bad("실패 응답", `${status} ${JSON.stringify(json).slice(0, 120)}`);
      const { data: after } = await svc
        .from("extra_questions")
        .select("status, question")
        .eq("id", broken.creditId)
        .single();
      after?.status === "credited"
        ? ok("질문권 되돌림", "credited — 손님이 다시 쓸 수 있다")
        : bad("질문권 되돌림", `${after?.status} — 답도 못 받고 권리도 잃는다`);
      after?.question ? ok("적은 질문 보존", String(after.question).slice(0, 20)) : bad("적은 질문 보존", "사라짐");
    }
  }

  if (KEEP) {
    console.log(`\n남겨 둠 — 주문 ${madeOrders.length} · 후기 ${madeReviews.length}`);
    console.log("지울 때: npx tsx scripts/verify-review-slot.ts --clean-only");
  } else {
    console.log("\n── 정리");
    await svc.from("extra_questions").delete().in("parent_order_id", madeOrders);
    await svc.from("reviews").delete().in("id", madeReviews);
    await svc.from("saju_results").delete().in("order_id", madeOrders);
    await svc.from("saju_inputs").delete().in("order_id", madeOrders);
    await svc.from("orders").delete().in("id", madeOrders);
    ok("검증 데이터 삭제", `주문 ${madeOrders.length}건`);
  }
}

// --clean-only: 남겨 둔 검증 데이터만 지운다(VERIFY-REVIEW- 접두사)
async function clean() {
  const { createClient } = await import("@supabase/supabase-js");
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data: orders } = await svc.from("orders").select("id").like("order_id", "VERIFY-REVIEW-%");
  const ids = (orders ?? []).map((o) => o.id as string);
  if (!ids.length) return console.log("지울 것 없음");
  await svc.from("extra_questions").delete().in("parent_order_id", ids);
  await svc.from("reviews").delete().in("order_id", ids);
  await svc.from("saju_results").delete().in("order_id", ids);
  await svc.from("saju_inputs").delete().in("order_id", ids);
  await svc.from("orders").delete().in("id", ids);
  console.log(`검증 데이터 ${ids.length}건 삭제`);
}

(process.argv.includes("--clean-only") ? clean() : main()).catch((e) => {
  console.error(e);
  process.exit(1);
});
