import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout/ContactFields";
import { TrustStrip } from "@/components/saju/TrustStrip";
import { LoginNudge } from "@/components/checkout/LoginNudge";
import { formatKRW } from "@/lib/utils";
import { MEMBER_DISCOUNT, MIN_CHARGE, chargeFor } from "@/lib/pricing";

export const metadata = { title: "결제" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ claim?: string }>;
}) {
  const { orderId } = await params;
  const { claim } = await searchParams;
  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id, order_id, amount, status, user_id, guest_email, product_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) notFound();
  if (order.status === "paid") {
    // 패키지 주문은 결과지가 여러 장이라 maybeSingle() 이 터진다 — 먼저 만들어진 것으로 보낸다.
    const { data: results } = await service
      .from("saju_results")
      .select("id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (results?.[0]) redirect(`/results/${results[0].id}`);
  }

  // ── 로그인하고 돌아온 손님: 게스트 주문을 회원 주문으로 이관 ──────────────
  // 결제 직전 미끼(LoginNudge)로 로그인 → `?claim=1` 로 여기 떨어진다.
  // 같은 order_id 를 유지한 채 주인과 금액만 바꾸고, 쿼리를 떼서 다시 들어온다
  // (새로고침·뒤로가기로 이관이 두 번 돌지 않게).
  if (claim && order.status === "pending" && !order.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await service.from("products").select("price").eq("id", order.product_id).maybeSingle();
      const next = p ? chargeFor(p.price as number, true) : 0;
      if (next >= MIN_CHARGE) {
        await service.from("orders").update({ user_id: user.id, amount: next }).eq("id", order.id).eq("status", "pending");
      }
    }
    redirect(`/checkout/${orderId}`);
  }

  // slug: 결제 후 success 대기 화면 테마(산군 등) 판별용 — TossWidget 이 sessionStorage 에 심는다.
  const { data: product } = await service
    .from("products")
    .select("name, slug")
    .eq("id", order.product_id)
    .single();

  const customerKey = order.user_id ?? `guest_${order.id}`;
  const email = order.guest_email;


  // ── 결제 화면은 영수증이다 (2026-08-23, 레퍼런스 4곳 실측) ─────────────────
  // 청월당·타이트·음양관 결제 화면에 **캐릭터 대사·가격 앵커·환불 문장이 하나도 없다.**
  // 설득은 티저에서 끝나고, 여기는 상품명 · 정가 취소선 · 할인 · 결제금액 · 결제수단 · 버튼뿐이다.
  // 전엔 산군이 「이제 복채 얘기를 하자 / 신당에 몸소 들면 5만~20만」 같은 문장을 달고 있었고
  // 직녀도 그걸 따라 붙였는데, 형님 「말할 필요 없는 말」「다른 데만큼만 해」로 걷어냈다.
  // 세계관은 **색으로만** 이어간다(.world-* 스킨) — 글은 다른 데만큼.
  const slug = product?.slug ?? "";
  const world = slug.includes("sangun") ? "world-sangun" : slug === "inyeon-saju" || slug === "marriage-saju" ? "world-jiknyeo" : "";
  const bg = world === "world-sangun" ? "#0a0908" : world === "world-jiknyeo" ? "#0b0f1a" : "#000000";

  // ── 영수증 산수 ────────────────────────────────────────────────
  // ⚠ 판매가를 상품 테이블에서 다시 읽어 계산하지 않는다. 주문을 만든 뒤 가격을 바꾸면
  //    영수증과 실제 청구액이 갈라지기 때문이다. **order.amount(실제 청구액)에서 거꾸로** 세운다.
  //      회원할인 전 금액 = order.amount + (회원이면 1,900)
  //      상시할인       = 정가 − 회원할인 전 금액
  //    정가(compare_at_price)는 0010 컬럼이라 따로 읽고, 없으면 할인 줄이 조용히 빠진다.
  let compareAt: number | null = null;
  try {
    const { data: up } = await service.from("products").select("compare_at_price").eq("id", order.product_id).maybeSingle();
    compareAt = (up as { compare_at_price?: number | null } | null)?.compare_at_price ?? null;
  } catch {
    /* 0010 미적용 */
  }
  const isMember = !!order.user_id;
  // 회원이면 프로필에 저장된 휴대폰을 미리 채운다(두 번 적게 하지 않는다)
  let memberPhone: string | null = null;
  if (isMember) {
    const { data: prof } = await service.from("profiles").select("phone").eq("id", order.user_id!).maybeSingle();
    memberPhone = (prof?.phone as string | null) ?? null;
  }
  const memberOff = isMember ? MEMBER_DISCOUNT : 0;
  const baseCharge = order.amount + memberOff; // 회원할인 전 = 그 시점의 판매가
  const listPrice = compareAt != null && compareAt > baseCharge ? compareAt : baseCharge;
  const saleOff = listPrice - baseCharge; // 상시할인
  const salePct = saleOff > 0 ? Math.round((saleOff / listPrice) * 100) : 0;
  const totalOff = listPrice - order.amount; // 배너에 쓸 총 할인

  // 이름은 줄표 앞까지(운영 DB 이름에 설명이 붙어 있다: "직녀 연애사주 — 만나는 달")
  const name = (product?.name ?? "사주 상품").split(/\s—\s|\s-\s/)[0].trim();
  // 한 줄 설명 — 티저·랜딩이 쓰는 분량 표기와 같은 말. 없는 상품은 비운다.
  const desc: Record<string, string> = {
    "sangun-sinjeom": "장부 열한 장 · 앞으로 12개월",
    "inyeon-saju": "열두 달 예보 · 여덟 장",
    "marriage-saju": "결혼하는 해와 달 · 여덟 장",
  };

  const Row = ({ k, v, sub, strong }: { k: React.ReactNode; v: React.ReactNode; sub?: string; strong?: boolean }) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className={`text-[15px] ${strong ? "font-bold text-bone" : "text-bone-soft"}`}>{k}</p>
        {sub && <p className="mt-0.5 text-[12px] text-bone-faint">{sub}</p>}
      </div>
      <p className={`shrink-0 text-[15px] tabular-nums ${strong ? "font-bold text-bone" : "text-bone-soft"}`}>{v}</p>
    </div>
  );

  return (
    <div className={`${world} min-h-screen`} style={{ background: bg }}>
      <div className="mx-auto max-w-md px-5 py-10">
        <h1 className="font-myeongjo text-center text-[17px] font-bold text-bone">{name} 결제 안내</h1>

        {/* 총 할인 배너 — 타이트 결제 모달의 「총 13,200원 할인받았어요!」 자리 */}
        {totalOff > 0 && (
          <p
            className="mx-auto mt-4 w-fit rounded-full px-4 py-1.5 text-[13px] font-bold"
            style={{ background: "var(--gold-pale)", color: "var(--gold-bright)" }}
          >
            총 {formatKRW(totalOff)} 할인받았어요
          </p>
        )}

        <div className="mt-6 divide-y divide-hairline border-y border-hairline">
          <Row k={name} sub={desc[slug]} v={formatKRW(listPrice)} />
          {saleOff > 0 && (
            <Row
              k={
                <>
                  지금 결제 시 할인 <span className="ml-1 text-[12px] text-bone-faint">-{salePct}%</span>
                </>
              }
              v={`-${formatKRW(saleOff)}`}
            />
          )}
          {memberOff > 0 && <Row k="회원 할인" v={`-${formatKRW(memberOff)}`} />}
          <Row k="결제금액" v={formatKRW(order.amount)} strong />
        </div>

        <div className="mt-7">
          <CheckoutForm
            orderId={order.order_id}
            amount={order.amount}
            customerKey={customerKey}
            productName={product?.name ?? "사주 상품"}
            productSlug={product?.slug ?? null}
            customerEmail={email}
            defaultPhone={memberPhone}
            ctaLabel={`${formatKRW(order.amount)} 결제하기`}
          />
        </div>

        {/* 게스트에게만 — 회원이면 이미 할인을 받았으므로 뜨지 않는다 */}
        {!isMember && <LoginNudge orderId={order.order_id} discount={MEMBER_DISCOUNT} />}

        <TrustStrip className="mt-5" />
      </div>
    </div>
  );
}
