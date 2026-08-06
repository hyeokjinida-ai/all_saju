// 몰입형 웹툰 랜딩 전용 미니 푸터 — 사이트 크롬을 숨기는 대신 법정 표기(사업자·약관)를 먹빛 톤으로 유지
import Link from "next/link";
import { siteConfig, businessInfo } from "@/config/site";

export function StoryFooter() {
  const businessLine = [
    businessInfo.companyName,
    `사업자등록번호: ${businessInfo.businessNumber}`,
    `통신판매업 신고번호: ${businessInfo.mailOrderNumber}`,
    `대표: ${businessInfo.representative}`,
    `주소: ${businessInfo.address}`,
  ].join(" | ");

  const contactLine = [
    `고객센터: ${businessInfo.email}`,
    businessInfo.phone
      ? `핸드폰${businessInfo.phoneNote ? `(${businessInfo.phoneNote})` : ""}: ${businessInfo.phone}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <footer className="px-6 pb-10 pt-7 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px]" style={{ color: "#9aa3b8" }}>
        <Link href="/legal/terms">이용약관</Link>
        <Link href="/legal/privacy">개인정보처리방침</Link>
        <Link href="/legal/refund-policy">환불정책</Link>
      </div>
      <p className="mx-auto mt-4 max-w-[420px] text-[11px] leading-[1.75]" style={{ color: "#5b6274" }}>
        {businessLine}
      </p>
      <p className="mt-1.5 text-[11px]" style={{ color: "#5b6274" }}>
        {contactLine}
      </p>
      <p className="mt-3 text-[11px]" style={{ color: "#5b6274" }}>
        © {new Date().getFullYear()} {siteConfig.name}
      </p>
    </footer>
  );
}
