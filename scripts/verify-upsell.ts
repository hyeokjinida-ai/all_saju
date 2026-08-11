// npx tsx scripts/verify-upsell.ts
// 업셀 머니패스 검증 — 패키지(결과지 2장) + 추가질문권(부모 결과지에 답변 붙기).
// 토스는 안 건드리고 'paid' 상태를 흉내 내서 생성 파이프만 실제로 태운다.
// 끝나면 만든 데이터를 전부 지운다(--keep 주면 남긴다).

// ⚠ app 모듈은 import 시점에 env 를 검증한다 — 반드시 env 를 먼저 깔고 **동적 import** 해야 한다
// (verify-money-path.ts 와 같은 방식).
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
    } catch { /* 없으면 다음 것 */ }
  }
}
loadEnv();

const KEEP = process.argv.includes("--keep");
const BUNDLE_SLUG = "bundle-sangun-inyeon";

const ok = (m: string, d = "") => console.log(`   ✓ ${m}${d ? " — " + d : ""}`);
const bad = (m: string, d = "") => { console.log(`   ✗ ${m}${d ? " — " + d : ""}`); process.exitCode = 1; };

// --q-only=N : 패키지 생성을 건너뛰고 **추가질문 답변만 N번** 뽑아 말투 안정성을 본다.
//   말투는 한 번 통과했다고 끝이 아니다 — 실제로 1차 반말 / 2차 존댓말로 갈린 적이 있다.
const Q_ONLY = Number(process.argv.find((a) => a.startsWith("--q-only"))?.split("=")[1] ?? 0) ||
  (process.argv.includes("--q-only") ? 3 : 0);

const JONDAET = /(습니다|합니다|해요|예요|하세요|십시오|드립니다)/;

async function questionOnly() {
  const { createServiceClient } = await import("../src/lib/supabase/server");
  const { generateResultForOrder, hasRealInterpretation } = await import("../src/lib/saju/generate-result");
  const svc = createServiceClient();
  const stamp = `${Date.now()}`;
  const made: string[] = [];

  console.log(`── 추가질문 답변 말투 안정성 (${Q_ONLY}회)`);
  const { data: sangun } = await svc.from("products").select("id").eq("slug", "sangun-sinjeom").maybeSingle();
  const { data: qp } = await svc.from("products").select("id, price").eq("slug", "extra-question").maybeSingle();
  const { data: parent } = await svc
    .from("orders")
    .insert({
      order_id: `QONLY-${stamp}`,
      product_id: sangun!.id,
      amount: 19900,
      status: "paid",
      paid_at: new Date().toISOString(),
      guest_email: `qonly+${stamp}@example.com`,
    })
    .select("id")
    .single();
  made.push(parent!.id);
  await svc.from("saju_inputs").insert({
    order_id: parent!.id,
    name: "검증",
    birth_date: "1993-05-15",
    birth_time: null,
    time_unknown: true,
    gender: "female",
    calendar: "solar",
    concerns: ["돈은 언제 풀리나"],
  });
  // 부모 결과지는 더미 — 여기서 보는 건 '답변 말투'뿐이라 LLM 을 또 태우지 않는다.
  await svc.from("saju_results").insert({
    order_id: parent!.id,
    product_slug: "sangun-sinjeom",
    myeongsik: {} as never,
    interpretation_md: "## 더미\n\n" + "가".repeat(80),
    llm_provider: "verify",
    llm_model: "verify",
  });

  let pass = 0;
  for (let i = 1; i <= Q_ONLY; i++) {
    const { data: qo } = await svc
      .from("orders")
      .insert({
        order_id: `QONLY-${stamp}-${i}`,
        product_id: qp!.id,
        amount: qp!.price,
        status: "paid",
        paid_at: new Date().toISOString(),
        guest_email: `qonly+${stamp}@example.com`,
      })
      .select("id")
      .single();
    made.push(qo!.id);
    await svc.from("extra_questions").insert({
      parent_order_id: parent!.id,
      order_id: qo!.id,
      source: "paid",
      status: "pending",
      question: "지금 다니는 회사를 그만두고 준비하던 일을 시작해도 되나",
    });
    const out = await generateResultForOrder(qo!.id, { service: svc });
    const { data: q } = await svc.from("extra_questions").select("answer_md").eq("order_id", qo!.id).maybeSingle();
    const md = q?.answer_md ?? "";
    const hits = md.match(new RegExp(JONDAET, "g")) ?? [];
    if (out.ok && hasRealInterpretation(md) && hits.length === 0) {
      ok(`${i}회차 반말 유지`, `${md.length}자`);
      pass++;
    } else {
      bad(`${i}회차`, out.ok ? `존댓말 ${hits.length}건: ${[...new Set(hits)].join(", ")}` : String(out.reason));
    }
  }
  console.log(`\n결과: ${pass}/${Q_ONLY} 통과`);

  if (!KEEP) {
    for (const id of made) {
      await svc.from("extra_questions").delete().eq("parent_order_id", id);
      await svc.from("extra_questions").delete().eq("order_id", id);
      await svc.from("saju_results").delete().eq("order_id", id);
      await svc.from("saju_inputs").delete().eq("order_id", id);
      await svc.from("orders").delete().eq("id", id);
    }
    console.log(`정리 완료 — 주문 ${made.length}건 삭제`);
  }
}

async function main() {
  if (Q_ONLY) return questionOnly();

  const { createServiceClient } = await import("../src/lib/supabase/server");
  const { generateResultForOrder, hasRealInterpretation, EXTRA_QUESTION_SLUG } = await import(
    "../src/lib/saju/generate-result"
  );

  const svc = createServiceClient();
  const stamp = `${Date.now()}`;
  const madeOrders: string[] = [];

  // ── 1. 패키지 주문 ────────────────────────────────────
  console.log("── 1. 패키지(산군 + 인연) 결과지 2장");
  const { data: bundle } = await svc
    .from("products")
    .select("id, slug, name, price, compare_at_price, bundle_slugs")
    .eq("slug", BUNDLE_SLUG)
    .maybeSingle();
  if (!bundle) { bad("번들 상품 조회", `${BUNDLE_SLUG} 없음 — seed:products 먼저`); return; }
  ok("번들 상품", `${bundle.price}원 (정가 ${bundle.compare_at_price}) [${(bundle.bundle_slugs ?? []).join(" + ")}]`);

  const { data: order, error: oErr } = await svc
    .from("orders")
    .insert({
      order_id: `UPSELL-${stamp}`,
      product_id: bundle.id,
      amount: bundle.price,
      status: "paid",
      paid_at: new Date().toISOString(),
      guest_email: `upsell+${stamp}@example.com`,
    })
    .select("id")
    .single();
  if (oErr || !order) { bad("주문 생성", oErr?.message); return; }
  madeOrders.push(order.id);

  const { error: iErr } = await svc.from("saju_inputs").insert({
    order_id: order.id,
    name: "검증",
    birth_date: "1993-05-15",
    birth_time: null,
    time_unknown: true,
    gender: "female",
    calendar: "solar",
    concerns: ["돈은 언제 풀리나", "[프로필] 연애상태: 혼자"],
  });
  if (iErr) { bad("사주 입력 저장", iErr.message); return; }

  const t0 = Date.now();
  const outcome = await generateResultForOrder(order.id, { service: svc });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (!outcome.ok) { bad("결과지 생성", `${outcome.reason} ${outcome.detail ?? ""}`); }
  else ok("결과지 생성", `${elapsed}초 · 대표 resultId ${outcome.resultId.slice(0, 8)}…`);

  const { data: results } = await svc
    .from("saju_results")
    .select("id, product_slug, interpretation_md")
    .eq("order_id", order.id);

  const slugs = (results ?? []).map((r) => r.product_slug).sort();
  const want = [...(bundle.bundle_slugs ?? [])].sort();
  if (JSON.stringify(slugs) === JSON.stringify(want)) ok("결과지 2장 · 구성품별", slugs.join(" + "));
  else bad("결과지 구성품", `기대 ${want.join("+")} / 실제 ${slugs.join("+") || "없음"}`);

  for (const r of results ?? []) {
    const len = (r.interpretation_md ?? "").length;
    if (hasRealInterpretation(r.interpretation_md)) ok(`본문 채워짐 [${r.product_slug}]`, `${len.toLocaleString()}자`);
    else bad(`본문 비어 있음 [${r.product_slug}]`, `${len}자`);
  }

  // 병렬 생성 확인 — 순차였다면 두 장의 합계 시간이 되어 폴링 창(64초)을 넘긴다.
  if (Number(elapsed) < 64) ok("폴링 창(64초) 안에 완료", `${elapsed}초`);
  else bad("폴링 창 초과", `${elapsed}초 — 순차 생성 의심`);

  // 멱등 — 다시 불러도 재생성하지 않아야 한다
  const again = await generateResultForOrder(order.id, { service: svc });
  if (again.ok && again.reused) ok("멱등(재호출 시 재사용)");
  else bad("멱등 실패", JSON.stringify(again));

  // ── 2. 추가질문권 ─────────────────────────────────────
  console.log("\n── 2. 추가질문권(원 결과지에 답변 붙이기)");
  const { data: qProduct } = await svc
    .from("products")
    .select("id, price")
    .eq("slug", EXTRA_QUESTION_SLUG)
    .maybeSingle();
  if (!qProduct) { bad("질문권 상품 조회", "extra-question 없음"); }
  else {
    ok("질문권 상품", `${qProduct.price}원`);

    const { data: qOrder, error: qoErr } = await svc
      .from("orders")
      .insert({
        order_id: `UPSELLQ-${stamp}`,
        product_id: qProduct.id,
        amount: qProduct.price,
        status: "paid",
        paid_at: new Date().toISOString(),
        guest_email: `upsell+${stamp}@example.com`,
      })
      .select("id")
      .single();
    if (qoErr || !qOrder) { bad("질문 주문 생성", qoErr?.message); }
    else {
      madeOrders.push(qOrder.id);
      const question = "지금 다니는 회사를 그만두고 준비하던 일을 시작해도 되나";
      const { error: eqErr } = await svc.from("extra_questions").insert({
        parent_order_id: order.id,
        order_id: qOrder.id,
        source: "paid",
        status: "pending",
        question,
      });
      if (eqErr) { bad("질문 저장", eqErr.message); }
      else {
        const qOut = await generateResultForOrder(qOrder.id, { service: svc });
        if (!qOut.ok) bad("답변 생성", `${qOut.reason} ${qOut.detail ?? ""}`);
        else {
          const parentIds = (results ?? []).map((r) => r.id);
          if (parentIds.includes(qOut.resultId)) ok("원 결과지로 되돌려보냄", `resultId ${qOut.resultId.slice(0, 8)}…`);
          else bad("반환된 resultId 가 원 결과지가 아님", qOut.resultId);

          const { data: answered } = await svc
            .from("extra_questions")
            .select("status, answer_md")
            .eq("order_id", qOrder.id)
            .maybeSingle();
          if (answered?.status === "answered" && hasRealInterpretation(answered.answer_md)) {
            ok("답변 저장됨", `${(answered.answer_md ?? "").length}자 · status=answered`);
            const banmal = /(다\.|라\.|군\.|마\.)\s*$/m.test(answered.answer_md ?? "");
            const jondaet = /(습니다|해요|예요|세요)/.test(answered.answer_md ?? "");
            if (!jondaet) ok("말투 = 산군 반말(존댓말 0건)");
            else bad("존댓말 섞임", "부모 상품(산군) 말투를 안 따랐다");
            if (banmal) ok("반말 종결 확인");
            console.log("\n   ── 답변 미리보기 ──");
            console.log("   " + (answered.answer_md ?? "").split("\n").filter(Boolean).slice(0, 6).join("\n   "));
          } else {
            bad("답변 저장 실패", JSON.stringify(answered));
          }
        }
      }
    }
  }

  // ── 3. 손님이 실제로 누르는 경로 — /api/questions/create ──
  // (LLM 을 또 태우지 않으려고 결과지 행은 더미로 만든다. 여기서 보는 건 라우트·소유증명·주문생성이다.)
  console.log("\n── 3. 결과지의 '하나 더 묻기' API (dev 서버 필요)");
  const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";
  const { data: sangun } = await svc.from("products").select("id").eq("slug", "sangun-sinjeom").maybeSingle();
  const { data: dummyOrder } = await svc
    .from("orders")
    .insert({
      order_id: `UPSELLAPI-${stamp}`,
      product_id: sangun!.id,
      amount: 19900,
      status: "paid",
      paid_at: new Date().toISOString(),
      guest_email: `upsell+${stamp}@example.com`,
    })
    .select("id")
    .single();
  if (!dummyOrder) bad("API 테스트용 주문 생성");
  else {
    madeOrders.push(dummyOrder.id);
    const { data: dummyResult } = await svc
      .from("saju_results")
      .insert({
        order_id: dummyOrder.id,
        product_slug: "sangun-sinjeom",
        myeongsik: {} as never,
        interpretation_md: "## 더미\n\n" + "가".repeat(80),
        llm_provider: "verify",
        llm_model: "verify",
      })
      .select("id")
      .single();

    try {
      const res = await fetch(`${SITE}/api/questions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: dummyResult!.id, question: "이 일을 계속 밀고 가도 되나" }),
      });
      const json = await res.json();
      if (res.ok && json.orderId && json.amount === 5000) {
        ok("질문 접수 → 결제 주문 생성", `${json.orderId} · ${json.amount}원`);
        const { data: created } = await svc
          .from("orders")
          .select("id")
          .eq("order_id", json.orderId)
          .maybeSingle();
        if (created) madeOrders.push(created.id);
        const { data: q } = await svc
          .from("extra_questions")
          .select("status, source, question")
          .eq("parent_order_id", dummyOrder.id)
          .maybeSingle();
        if (q?.status === "pending" && q.source === "paid") ok("질문 행 저장", `status=${q.status} · "${q.question}"`);
        else bad("질문 행 상태", JSON.stringify(q));
      } else {
        bad("질문 접수 실패", `${res.status} ${JSON.stringify(json)}`);
      }

      // 남의 결과지에 질문 못 넣는지 — 없는 resultId 는 404 여야 한다
      const res404 = await fetch(`${SITE}/api/questions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: "00000000-0000-0000-0000-000000000000", question: "없는 결과지에 질문" }),
      });
      if (res404.status === 404) ok("없는 결과지 차단(404)");
      else bad("없는 결과지가 통과됨", String(res404.status));
    } catch (e) {
      bad("API 호출 실패", `dev 서버가 떠 있어야 한다 — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 정리 ──────────────────────────────────────────────
  if (KEEP) {
    console.log(`\n남겨 둠(--keep): 주문 ${madeOrders.length}건`);
    return;
  }
  for (const id of madeOrders) {
    await svc.from("extra_questions").delete().eq("parent_order_id", id);
    await svc.from("extra_questions").delete().eq("order_id", id);
    await svc.from("saju_results").delete().eq("order_id", id);
    await svc.from("saju_inputs").delete().eq("order_id", id);
    await svc.from("orders").delete().eq("id", id);
  }
  console.log(`\n정리 완료 — 검증용 주문 ${madeOrders.length}건 삭제`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
