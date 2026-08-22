// 홈 푸터 — 청월당 조판(로고 가운데 → 정보 10px → 링크 → 저작권), 색은 타이트(#141414).
//
// ⚠ 사업자정보는 **홈에 그대로 노출한다** — PG(카드사) 심사 요구사항이다.
//    기존 자수정 홈에도 같은 이유로 붙어 있었다. 지우지 말 것.
import Link from "next/link";
import { businessInfo, siteConfig } from "@/config/site";

const Sep = () => (
  <span className="mx-2 inline-block h-3 w-px align-middle" style={{ background: "rgba(255,255,255,0.14)" }} />
);

export function HomeFooter() {
  return (
    <footer
      className="w-full px-4 py-10 pb-28"
      style={{ background: "#141414", borderTop: "1px solid rgba(255,255,255,0.10)" }}
    >
      <div className="mb-7 flex flex-col items-center gap-1">
        <span
          className="font-myeongjo text-[17px] font-bold tracking-[0.12em]"
          style={{ color: "#E8E8EA" }}
        >
          {siteConfig.name}
        </span>
        <span className="font-brush text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {siteConfig.nameHanja}
        </span>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-3 text-[10px] leading-none"
        style={{ color: "#9CA3AF" }}
      >
        <div className="flex items-center">
          <span>
            <b className="font-semibold">상호</b> {businessInfo.companyName}
          </span>
          <Sep />
          <span>
            <b className="font-semibold">대표</b> {businessInfo.representative}
          </span>
        </div>
        <div className="px-4 text-center leading-relaxed">{businessInfo.address}</div>
        <div className="flex flex-col items-center gap-2">
          <span>
            <b className="font-semibold">통신판매업 신고</b> {businessInfo.mailOrderNumber}
          </span>
          <span>
            <b className="font-semibold">사업자등록번호</b> {businessInfo.businessNumber}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span>
            <b className="font-semibold">고객센터</b> {businessInfo.email}
          </span>
          {businessInfo.phone && (
            <span>
              <b className="font-semibold">대표번호</b> {businessInfo.phone}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-3 text-xs font-semibold leading-none" style={{ color: "#9CA3AF" }}>
          <Link href="/legal/terms">이용약관</Link>
          <Link href="/legal/privacy">개인정보처리방침</Link>
          <Link href="/legal/refund-policy">환불정책</Link>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "#6B7280" }}>
          서체: 가평한석봉(가평군) · 김중철손글씨(정림건축) · Pretendard
        </p>
        <p className="text-xs leading-none" style={{ color: "#6B7280" }}>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
