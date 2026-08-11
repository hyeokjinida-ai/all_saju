import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 죽은 링크로 들어온 방문자를 잃지 않게 — 브랜드 화면 + 무료 명식 퍼널로 복귀 유도
export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="font-brush text-gold-soft/60 text-2xl tracking-[0.3em] mb-3">命</p>
      <h1 className="font-myeongjo text-2xl font-semibold tracking-[0.04em] text-bone">
        길을 잃으셨네요
      </h1>
      <p className="mt-3 text-sm text-bone-soft leading-relaxed">
        찾으시는 페이지가 없어요.
        <br />
        대신, 내 사주 흐름부터 무료로 확인해보시겠어요?
      </p>
      <div className="gold-diamond mx-auto mt-6" />
      <div className="mt-7 flex flex-col items-center gap-3">
        {/* 2상품 오픈(2026-08-11): 이 링크가 life-saju 였는데 그 상품을 내리면서 **404가
            또 404로 보내는** 동선이 됐다. 대표 상품(광고 유입구)인 산군으로 돌린다.
            ⚠ 라인업을 바꾸면 이 링크도 같이 본다 — 하드코딩이라 is_active 를 안 탄다. */}
        <Link href="/products/sangun-sinjeom" className={cn(buttonVariants(), "tracking-[0.08em]")}>
          내 사주 풀이 보기
        </Link>
        <Link
          href="/products"
          className="text-xs text-bone-soft underline underline-offset-4 hover:text-gold"
        >
          상품 둘러보기
        </Link>
      </div>
    </div>
  );
}
