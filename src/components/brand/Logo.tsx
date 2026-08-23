// 명운록 로고 — 한 곳에서만 그린다.
//
// 확정안(2026-08-23): 붓글씨 「명운록」(해서) + 命 원(ensō) + 주사 낙관.
// 원본은 ChatGPT 웹 생성 → `design/brand/build_assets.py` 가 투명 PNG 로 굽는다.
// 붓 질감(갈필·번짐)이 정체성이라 **벡터가 아니라 래스터**다 — 다시 구우려면 그 스크립트를 돌린다.
//
// 색: 세계관마다 바탕이 달라 두 벌만 둔다.
//   · ivory(#F3EAD6) = 검정·자수정 등 **어두운 바탕** (헤더·푸터·엔드카드)
//   · ink(#141414)   = 상아·흰 **밝은 바탕** (결과지 머리·인쇄물)
// 산군(금)·직녀(은) 액센트는 로고를 바꾸지 않는다 — 로고는 세계관 위에 서는 우산이다.

type Tone = "ivory" | "ink";

/** 헤더·푸터에 쓰는 가로 워드마크. 높이만 정하면 폭은 비율대로 따라온다. */
export function Logo({
  tone = "ivory",
  height = 24,
  className,
  priority = false,
}: {
  tone?: Tone;
  /** CSS px. 헤더 24 · 푸터 20 · 결과지 머리 40 */
  height?: number;
  className?: string;
  /** 첫 화면(헤더)이면 true — 지연 로딩을 끈다 */
  priority?: boolean;
}) {
  // 원본 543×240 → 종횡비 고정(레이아웃 시프트 방지)
  const width = Math.round((543 / 240) * height);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 브랜드 자산. next/image 의 최적화 파이프라인을 태울 이유가 없고, 헤더에서 즉시 그려져야 한다.
    <img
      src={`/brand/wordmark-${tone}.png`}
      alt="명운록"
      width={width}
      height={height}
      className={className}
      style={{ height, width: "auto" }}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
    />
  );
}

/** 命 원 심볼 단독 — 앱아이콘·워터마크·대기 화면용. */
export function LogoSymbol({
  tone = "ivory",
  size = 40,
  className,
}: {
  tone?: Tone;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 위와 같은 이유
    <img
      src={`/brand/symbol-${tone}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto" }}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

/** 주사 낙관 — 결과지 말미 「기록 완료」 도장, 광고 소재 스팅. */
export function LogoSeal({ size = 48, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 위와 같은 이유
    <img
      src="/brand/seal.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto" }}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
