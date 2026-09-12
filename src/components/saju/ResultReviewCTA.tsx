import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   결과지 맨 끝 후기 요청

   왜 지금 다는가: 손님 1~10호가 **평생 유일한 후기 원천**이다. 첫 주에 안 받으면
   그 사람들은 다시 안 온다. 청월당은 마지막 장 99% 지점에 후기 CTA 를 두고,
   강의 노트의 성공 넛지 3개 중 하나도 「후기 → 질문권」이었다.

   ⚠ 후기 페이지(`/mypage/orders/[orderId]/review`)는 **로그인 + 본인 주문**을 요구한다.
   게스트 결제 손님은 계정이 없어 눌러도 막힌다 — 그래서 `canReview` 가 참일 때만 세운다.
   막히는 버튼을 보여주는 건 안 보여주는 것보다 나쁘다.
   ───────────────────────────────────────────────────────────── */

type Tone = "night" | "ink";

const SKIN: Record<Tone, { bg: string; edge: string; accent: string; on: string; sub: string }> = {
  // 직녀 결과지(밤 보라)
  night: {
    bg: "linear-gradient(160deg, rgba(31,26,62,.85) 0%, rgba(21,18,44,.85) 100%)",
    edge: "rgba(199,176,236,.24)",
    accent: "#C7B0EC",
    on: "#17132C",
    sub: "#B9B2CE",
  },
  // 산군 결과지(먹빛 + 금)
  ink: {
    bg: "linear-gradient(160deg, rgba(20,17,12,.9) 0%, rgba(12,11,9,.9) 100%)",
    edge: "rgba(232,201,106,.24)",
    accent: "#E8C96A",
    on: "#0E0C08",
    sub: "rgba(239,230,210,.7)",
  },
};

export function ResultReviewCTA({
  orderId,
  tone = "night",
}: {
  orderId: string;
  tone?: Tone;
}) {
  const s = SKIN[tone];
  return (
    <div
      style={{
        margin: "30px 0 8px",
        padding: "22px 20px",
        borderRadius: 16,
        border: `1px solid ${s.edge}`,
        background: s.bg,
        textAlign: "center",
      }}
    >
      {/* 말투는 결과지를 따라간다 — 산군(ink) 은 반말이다. 여기만 존대면 딴사람이 말을 건다. */}
      <div className="font-myeongjo" style={{ fontSize: 17, fontWeight: 700, color: "#EFE7FA", lineHeight: 1.45 }}>
        {tone === "ink" ? "장부 값을 했느냐" : "읽어 보시니 어떠셨어요?"}
      </div>
      {/* 답례는 **한 줄로만** 말한다. 크게 내걸면 후기가 대가를 노린 말이 되고,
          그 후기를 랜딩에 세우는 순간 우리가 산 후기가 된다(업셀 계획 §2-2 의 경계). */}
      <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.75, color: s.sub }}>
        {tone === "ink" ? (
          <>
            맞은 것도, 빗나간 것도 그대로 적어라.
            <br />
            적고 나면 답례로 하나는 복채 없이 봐주마.
          </>
        ) : (
          <>
            맞은 것도, 빗나간 것도 그대로 알려주세요.
            <br />
            남겨 주시면 답례로 질문 하나를 무료로 드려요.
          </>
        )}
      </p>
      <Link
        href={`/mypage/orders/${orderId}/review`}
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 22px",
          borderRadius: 999,
          background: s.accent,
          color: s.on,
          fontSize: 13.5,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        후기 남기기 ›
      </Link>
    </div>
  );
}
