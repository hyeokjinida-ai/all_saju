import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Ollama-style inverted CTA strip — the single attention-grabbing surface.
export function CTA() {
  return (
    <section className="container py-20">
      <div className="gold-frame rounded-lg bg-night-2/80 px-8 py-16 text-center relative overflow-hidden">
        <p className="font-brush text-gold-soft/50 text-[28px] tracking-[0.3em] mb-4">始作</p>
        <h2 className="font-myeongjo text-2xl md:text-3xl font-semibold tracking-[0.04em] text-bone glow-bone">
          지금 바로 시작해 보세요
        </h2>
        <p className="mt-4 text-sm text-bone-soft">
          로그인 없이 게스트로도 결제할 수 있어요
        </p>
        <div className="mt-8">
          <Link
            href="/products"
            className={cn(buttonVariants({ size: "lg", variant: "onDark" }))}
          >
            상품 보러 가기
          </Link>
        </div>
      </div>
    </section>
  );
}
