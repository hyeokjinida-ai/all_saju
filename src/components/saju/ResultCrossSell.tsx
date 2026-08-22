import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   결과지 안 크로스셀 배너

   청월당 유료 결과지 실측(2026-08-22): 7장 중 5장에 다른 상품 배너가 박혀 있고
   위치가 전부 **46~88%** 였다. 장 끝(100%)이 아니다 — 끝에 두면 이미 스크롤을
   놓은 뒤라서, 읽는 도중 몰입이 최고조일 때 끼워 넣는다.

   저쪽 배너 공식: [수묵 산 배경] 좌= 작은 줄 + 큰 줄 + 알약 버튼 / 우= 캐릭터 반신.
   우리는 캐릭터 정지화면이 없다(산군은 영상뿐). 그래서 우측을 **달·능선 SVG** 로
   바꿨다 — 재생성이 필요 없고, 밤 계열인 우리 톤과 한 몸이다.
   ───────────────────────────────────────────────────────────── */

type Target = "sangun" | "inyeon";

/* 배너는 **얹히는 결과지의 톤을 입는다.** 청월당도 홍연(연애)=빨강 / 청월(정통)=파랑으로
   상품마다 색을 갈아 끼웠다. 우리 두 결과지는 바탕색부터 다르다 —
   직녀는 밤 보라(#16 0A 36 계열), 산군은 먹빛(rgb(10,9,8)).
   한 가지 색으로 통일하면 둘 중 하나에서 반드시 "붙여 넣은 광고"로 뜬다. */
type Skin = { ink: string; edge: string; ridge: string; ridgeBack: string; glow: string };

const SKIN: Record<Target, Skin> = {
  // 직녀 결과지(밤 보라) 위에 앉는 산군 배너
  sangun: {
    ink: "linear-gradient(105deg, #14122B 0%, #191634 55%, #120F26 100%)",
    edge: "rgba(180,150,240,.22)",
    ridge: "#1B1739",
    ridgeBack: "#241F45",
    glow: "rgba(90,70,150,.42)",
  },
  // 산군 결과지(먹빛) 위에 앉는 직녀 배너 — 숯 + 금
  inyeon: {
    ink: "linear-gradient(105deg, #0C0B09 0%, #14110C 55%, #0A0908 100%)",
    edge: "rgba(232,201,106,.26)",
    ridge: "#191510",
    ridgeBack: "#221C13",
    glow: "rgba(232,201,106,.16)",
  },
};

const COPY: Record<Target, { slug: string; small: string; big: string; cta: string; hue: string }> = {
  // 직녀(연애) 를 읽는 손님에게 → 장부 전체를 본다
  sangun: {
    slug: "sangun-sinjeom",
    small: "얼굴 없는 박수무당",
    big: "연애 말고, 네 장부 전체는?",
    cta: "박수무당 사주 보기",
    hue: "#C7B0EC",
  },
  // 산군(전체) 을 읽는 손님에게 → 만나는 달로
  inyeon: {
    slug: "inyeon-saju",
    small: "직녀의 연애예보",
    big: "그래서, 몇 월에 만나나?",
    cta: "만나는 달 보기",
    hue: "#E8C96A",
  },
};

export function ResultCrossSell({ to }: { to: Target }) {
  const c = COPY[to];
  const sk = SKIN[to];
  return (
    <Link
      href={`/products/${c.slug}`}
      style={{
        position: "relative",
        display: "block",
        overflow: "hidden",
        margin: "26px 0",
        borderRadius: 16,
        border: `1px solid ${sk.edge}`,
        background:
          `radial-gradient(ellipse 70% 120% at 84% 30%, ${sk.glow} 0%, transparent 62%),` + sk.ink,
        boxShadow: "0 10px 28px rgba(8,6,20,.5)",
        textDecoration: "none",
      }}
    >
      {/* 능선 + 달 — 청월당의 '수묵 산' 자리 */}
      <svg
        viewBox="0 0 380 150"
        preserveAspectRatio="none"
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}
      >
        <circle cx="316" cy="44" r="21" fill={c.hue} opacity="0.5" />
        <circle cx="322" cy="40" r="21" fill={sk.ridge} />
        <path d="M232 150 L292 84 L330 122 L362 96 L380 112 L380 150 Z" fill={sk.ridgeBack} opacity=".85" />
        <path d="M196 150 L262 100 L300 132 L340 108 L380 138 L380 150 Z" fill={sk.ridge} />
      </svg>

      <div style={{ position: "relative", padding: "20px 20px 19px" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.06em", color: c.hue, fontWeight: 600 }}>
          {c.small}
        </div>
        <div
          className="font-myeongjo"
          style={{ marginTop: 7, fontSize: 19, fontWeight: 700, color: "#EFE7FA", lineHeight: 1.35 }}
        >
          {c.big}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 15,
            padding: "9px 18px",
            borderRadius: 999,
            background: c.hue,
            color: to === "inyeon" ? "#0E0C08" : "#17132C",
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          {c.cta}
          <span style={{ fontSize: 15, lineHeight: 1 }}>›</span>
        </span>
      </div>
    </Link>
  );
}
