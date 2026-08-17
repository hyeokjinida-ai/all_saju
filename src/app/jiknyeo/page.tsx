import type { Metadata } from "next";
import { JiknyeoLanding } from "@/components/products/JiknyeoLanding";
import { readJiknyeoAssets } from "@/lib/jiknyeo-assets";

// 직녀 — **광고 전용 비공개 랜딩**(R6).
// 사이트 어디에서도 링크하지 않고, 검색에도 안 잡히게 막는다. 메타 광고 착지로만 쓴다.
// 이렇게 두면 가격·포지션을 본 사이트와 따로 실험할 수 있다(타이트가 재집행 1·4·5위 상품을
// 사이트맵 밖에서 광고로만 굴리는 것과 같은 구조).
export const metadata: Metadata = {
  title: "직녀 연애사주",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// 에셋 슬롯을 매 요청마다 디스크에서 다시 읽는다 — 형님이 파일을 넣고 새로고침하면 바로 뜬다.
// (빌드 타임에 고정하면 재배포해야 보이므로 의도적으로 동적이다)
export const dynamic = "force-dynamic";

export default function JiknyeoPage() {
  return <JiknyeoLanding assets={readJiknyeoAssets()} />;
}
