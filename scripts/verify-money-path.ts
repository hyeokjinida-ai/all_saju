// 돈 경로 전 구간 검증 — 주문(paid) → 명식 → LLM → 저장 → 라이브 렌더까지 끝까지 간다.
//
// 왜 필요한가: 지금까지 실결제 후 결과지까지 완주한 주문이 0건이다. 광고 트는 날 이 경로가
// 어디선가 끊기면 돈 낸 첫 고객이 빈 화면을 받는다. 그 전에 여기서 터뜨려 본다.
//
//   npx tsx scripts/verify-money-path.ts
//   npx tsx scripts/verify-money-path.ts --keep     결과 행을 안 지운다(눈으로 볼 때)
//   npx tsx scripts/verify-money-path.ts --no-render  라이브 렌더 확인 건너뜀
//
// 주의: 운영 Supabase 에 직접 쓴다. 기본은 검증 후 **전부 지운다**(매출 통계 오염 방지).
// order_id 는 VERIFY- 접두사라 남아도 눈에 띈다.
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
const NO_RENDER = process.argv.includes("--no-render");
// --only=A 처럼 한 케이스만 — 캐시된 생일(A)만 돌리면 사주 API 소모가 0 이다
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "").toUpperCase();

type Persona = {
  label: string;
  slug: string;
  name: string | null;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  concerns: string[];
  guest: boolean;
  note: string;
};

// 실제 고객이 낼 법한 경우의 수를 덮는다 — 캐시 히트 1건 + 신규 생일 2건(진짜 첫 고객의 조건) +
// 시각 모름 · 음력 · 이름 없음 같은 '입력이 빠진' 경로까지.
const PERSONAS: Persona[] = [
  {
    label: "A. 캐시된 생일 · 시각 있음 · 비회원",
    slug: "sangun-sinjeom", name: "지수",
    birth_date: "1993-05-15", birth_time: "14:30", time_unknown: false,
    gender: "female", calendar: "solar",
    concerns: ["올해 이직해도 될까요", "partner:여자", "rel:없다", "job:직장인"],
    guest: true, note: "캐시 히트 기대 — API 0콜",
  },
  {
    // 회원 주문 — orders 에 user_or_guest 체크 제약이 있어 user_id 가 반드시 있어야 한다.
    // 기존 계정이 하나도 없으면 비회원으로 내려앉고 그 사실을 보고한다.
    label: "B. 회원 주문 · 신규 생일 · 시각 모름",
    slug: "sangun-sinjeom", name: "민지",
    birth_date: "1988-11-03", birth_time: null, time_unknown: true,
    gender: "female", calendar: "solar",
    concerns: ["돈이 언제 들어올지", "partner:남자", "rel:있다", "job:자영업"],
    guest: false, note: "時 없이도 9챕터 나오는지 + 회원 경로",
  },
  {
    label: "C. 신규 생일 · 음력 · 이름 없음 · 추가질문 없음",
    slug: "sangun-sinjeom", name: null,
    birth_date: "1979-02-28", birth_time: "07:10", time_unknown: false,
    gender: "male", calendar: "lunar",
    concerns: [],
    guest: true, note: "이름·질문 비어도 안 깨지는지",
  },
];

// 렌더 확인은 **배포본**을 찌른다 — 로컬 .env 의 SITE_URL 은 localhost 라 못 쓴다.
// (그 사실 자체가 아래 0번 점검에서 걸린다)
const SITE = "https://all-sajub.vercel.app";

type Row = {
  persona: string;
  단계: string;
  결과: string;
  상세: string;
};

async function main() {
  const { createServiceClient } = await import("../src/lib/supabase/server");
  const { generateResultForOrder } = await import("../src/lib/saju/generate-result");
  const { getTotalUsage } = await import("../src/lib/saju/usage");
  const { splitChapters } = await import("../src/components/saju/ResultChapters");

  const svc = createServiceClient();
  const rows: Row[] = [];
  const created: { orderUuid: string; orderId: string; resultId?: string }[] = [];

  const before = await getTotalUsage();
  console.log(`\n사주 API 사용량(시작): ${before?.used ?? "?"} / ${before?.limit ?? "?"}`);
  console.log(`LLM: ${process.env.LLM_PROVIDER}/${process.env.LLM_MODEL}\n`);

  // ── 0) 배포된 환경변수 건강검진 ────────────────────────────────
  // 코드가 멀쩡해도 env 하나가 비면 고객이 결과지를 못 받는다. 배포본을 밖에서 찔러 확인한다.
  // /admin/logout 은 NEXT_PUBLIC_SITE_URL 로 리다이렉트하므로, Location 헤더에 그 값이 그대로 드러난다.
  console.log("── 0. 배포 환경변수 점검");
  try {
    const res = await fetch(`${SITE}/admin/logout`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const bad = !loc || /localhost|127\.0\.0\.1/.test(loc);
    rows.push({
      persona: "배포", 단계: "NEXT_PUBLIC_SITE_URL", 결과: bad ? "FAIL" : "OK",
      상세: bad
        ? `'${loc}' — 회원가입·비번재설정 메일 링크와 결과지 메일 링크가 전부 죽는다`
        : loc,
    });
    console.log(`   ${bad ? "✗" : "✓"} NEXT_PUBLIC_SITE_URL — ${loc || "(없음)"}`);
  } catch (e) {
    rows.push({ persona: "배포", 단계: "NEXT_PUBLIC_SITE_URL", 결과: "FAIL", 상세: String(e) });
  }
  const hasResend = !!process.env.RESEND_API_KEY;
  rows.push({
    persona: "배포", 단계: "RESEND_API_KEY(결과지 메일)", 결과: hasResend ? "OK" : "FAIL",
    상세: hasResend ? "설정됨" : "없음 — 비회원이 탭을 닫으면 결과지로 돌아올 길이 사라진다",
  });
  console.log(`   ${hasResend ? "✓" : "✗"} RESEND_API_KEY — ${hasResend ? "설정됨" : "없음(비회원 결과 메일 미발송)"}\n`);

  const { data: product } = await svc
    .from("products")
    .select("id, slug, name, price")
    .eq("slug", "sangun-sinjeom")
    .maybeSingle();
  if (!product) {
    console.error("상품(sangun-sinjeom)을 못 찾았다 — seed:products 부터 돌려야 한다");
    process.exit(1);
  }
  console.log(`상품: ${product.name} · ${product.price}원\n`);

  // 회원 주문 페르소나용 — 아무 기존 계정 하나. 없으면 해당 케이스는 비회원으로 내려앉는다.
  let memberId: string | null = null;
  try {
    const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1 });
    memberId = data?.users?.[0]?.id ?? null;
  } catch {
    /* 계정 조회 실패 — 비회원으로 진행 */
  }
  console.log(memberId ? `회원 경로 테스트 계정: ${memberId.slice(0, 8)}…\n` : "기존 계정 없음 — 회원 경로는 비회원으로 대체\n");

  for (const p of PERSONAS) {
    if (ONLY && !p.label.toUpperCase().startsWith(ONLY)) continue;
    console.log(`── ${p.label}`);
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const orderId = `VERIFY-${stamp}`;
    const push = (단계: string, 결과: string, 상세 = "") => {
      rows.push({ persona: p.label, 단계, 결과, 상세 });
      console.log(`   ${결과 === "OK" ? "✓" : "✗"} ${단계}${상세 ? " — " + 상세 : ""}`);
    };

    // 1) 주문 생성 (결제 승인된 상태를 흉내 — 토스는 안 건드린다)
    // orders 엔 user_or_guest 체크 제약이 있다 — 둘 중 하나는 반드시 채워야 한다.
    const asMember = !p.guest && !!memberId;
    const { data: order, error: oErr } = await svc
      .from("orders")
      .insert({
        order_id: orderId,
        product_id: product.id,
        amount: product.price,
        status: "paid",
        paid_at: new Date().toISOString(),
        user_id: asMember ? memberId : null,
        guest_email: asMember ? null : `verify+${stamp}@example.com`,
      })
      .select("id")
      .single();
    if (oErr || !order) { push("주문 생성", "FAIL", oErr?.message ?? "no row"); continue; }
    created.push({ orderUuid: order.id, orderId });
    push("주문 생성", "OK", `${orderId} · ${asMember ? "회원" : "비회원"}`);

    const { error: iErr } = await svc.from("saju_inputs").insert({
      order_id: order.id,
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time,
      time_unknown: p.time_unknown,
      gender: p.gender,
      calendar: p.calendar,
      concerns: p.concerns,
    });
    if (iErr) { push("입력 저장", "FAIL", iErr.message); continue; }
    push("입력 저장", "OK", `${p.birth_date} ${p.birth_time ?? "시각모름"} ${p.calendar}`);

    // 2) 실제 생성 — confirm/크론/웹훅이 전부 부르는 바로 그 함수
    const t0 = Date.now();
    const outcome = await generateResultForOrder(order.id, { service: svc });
    const ms = Date.now() - t0;
    if (!outcome.ok) {
      push("결과 생성", "FAIL", `${outcome.reason}${outcome.detail ? " / " + outcome.detail : ""} (${ms}ms)`);
      continue;
    }
    created[created.length - 1].resultId = outcome.resultId;
    push("결과 생성", "OK", `${(ms / 1000).toFixed(1)}초${outcome.reused ? " (재사용)" : ""}`);

    // 3) 저장된 내용 검사 — 결과지가 '실제로 팔 수 있는 물건'인지
    const { data: saved } = await svc
      .from("saju_results")
      .select("id, interpretation_md, llm_provider, llm_model, myeongsik, raw_analysis")
      .eq("id", outcome.resultId)
      .single();
    if (!saved) { push("저장 확인", "FAIL", "행 없음"); continue; }

    const md = saved.interpretation_md ?? "";
    const { chapters } = splitChapters(md);
    push("저장 확인", "OK", `${md.length}자 · ${saved.llm_provider}/${saved.llm_model}`);
    push("챕터 수", chapters.length === 9 ? "OK" : "FAIL", `${chapters.length}/9 — 9가 아니면 결과지 간지(4章)가 폴백된다`);
    push("명식 저장", saved.myeongsik ? "OK" : "FAIL", saved.myeongsik ? "있음" : "없음 — 표지·원국 카드가 빈다");
    push("raw_analysis", saved.raw_analysis ? "OK" : "FAIL", saved.raw_analysis ? "있음" : "없음 — 달력 표가 통째로 사라진다");

    // 형광펜(==) 은 챕터당 1개가 프롬프트 규칙
    const marks = (md.match(/==[^=]+==/g) ?? []).length;
    push("형광펜", marks >= chapters.length * 0.6 ? "OK" : "WARN", `${marks}개 / ${chapters.length}챕터`);

    // 4) 라이브 렌더 — 배포된 사이트가 이 결과를 실제로 그리는가
    if (!NO_RENDER && SITE) {
      const url = `${SITE}/results/${outcome.resultId}`;
      try {
        const res = await fetch(url, { headers: { "user-agent": "verify-money-path" } });
        const html = await res.text();
        const okStatus = res.status === 200;
        const hasCover = html.includes("산군이 읽은 운명 장부");
        // React SSR 은 인접한 텍스트 사이에 <!-- --> 를 끼워 넣는다 — 一<!-- -->章 도 통과시킨다
        const hasJang = /[一二三四](<!-- -->)?章/.test(html);
        const hasBody = html.length > 20000;
        push(
          "라이브 렌더",
          okStatus && hasCover && hasJang && hasBody ? "OK" : "FAIL",
          `${res.status} · 표지=${hasCover} · 章간지=${hasJang} · ${Math.round(html.length / 1024)}KB`,
        );
        if (okStatus) console.log(`     ${url}`);
      } catch (e) {
        push("라이브 렌더", "FAIL", e instanceof Error ? e.message : String(e));
      }
    }
    console.log("");
  }

  // 5) 멱등성 — 같은 주문을 다시 부르면 재생성 없이 같은 결과를 돌려주나
  const first = created.find((c) => c.resultId);
  if (first) {
    const again = await generateResultForOrder(first.orderUuid, { service: svc });
    const ok = again.ok && again.resultId === first.resultId && again.reused;
    rows.push({
      persona: "공통", 단계: "멱등성(중복 호출)", 결과: ok ? "OK" : "FAIL",
      상세: again.ok ? `resultId ${again.resultId === first.resultId ? "동일" : "다름!"} · reused=${again.reused}` : `실패 ${again.reason}`,
    });
    console.log(`── 공통\n   ${ok ? "✓" : "✗"} 멱등성 — 중복 호출해도 재생성 안 함\n`);
  }

  // 6) 정리
  if (KEEP) {
    console.log("--keep — 검증 주문을 남겨 둔다:");
    created.forEach((c) => console.log(`   ${c.orderId} → ${c.resultId ? SITE + "/results/" + c.resultId : "(결과 없음)"}`));
  } else {
    for (const c of created) {
      await svc.from("saju_results").delete().eq("order_id", c.orderUuid);
      await svc.from("saju_inputs").delete().eq("order_id", c.orderUuid);
      await svc.from("orders").delete().eq("id", c.orderUuid);
    }
    console.log(`검증 주문 ${created.length}건 삭제 완료(매출 통계 오염 없음)`);
  }

  const after = await getTotalUsage();
  console.log(`\n사주 API 사용량(끝): ${after?.used ?? "?"} / ${after?.limit ?? "?"}  (이번에 ${(after?.used ?? 0) - (before?.used ?? 0)}콜 소모)`);

  const fails = rows.filter((r) => r.결과 === "FAIL");
  const warns = rows.filter((r) => r.결과 === "WARN");
  console.log(`\n===== 결과: ${rows.length - fails.length - warns.length} OK · ${warns.length} WARN · ${fails.length} FAIL =====`);
  if (fails.length) {
    console.log("\n실패한 것:");
    fails.forEach((f) => console.log(`  · [${f.persona}] ${f.단계} — ${f.상세}`));
  }
  if (warns.length) {
    console.log("\n경고:");
    warns.forEach((f) => console.log(`  · [${f.persona}] ${f.단계} — ${f.상세}`));
  }
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
