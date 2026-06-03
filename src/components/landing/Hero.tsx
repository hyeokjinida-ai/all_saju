import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// Ollama-style hero: paper-white canvas, 36px centered headline,
// single black pill CTA, monospace inline tag as "command pill".
export function Hero() {
  return (
    <section className="scene-cosmos vignette relative overflow-hidden">
      <div className="container py-28 md:py-40 text-center relative z-10">
        {/* 상단 한자 라벨 + 골드 다이아 */}
        <p className="font-brush text-gold-soft/70 text-[22px] mb-3 tracking-[0.3em]">
          {siteConfig.nameHanja}
        </p>
        <div className="gold-diamond mx-auto mb-8" />

        <h1 className="font-myeongjo text-[36px] md:text-[52px] font-semibold tracking-[0.04em] leading-[1.15] text-bone glow-bone">
          {siteConfig.tagline}
        </h1>
        <p className="mt-6 text-[15px] md:text-[16px] text-bone-soft max-w-lg mx-auto leading-relaxed">
          {siteConfig.description}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/products" className={cn(buttonVariants({ size: "lg" }))}>
            사주 보러 가기
          </Link>
          <Link
            href="#how-it-works"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            작동 방식
          </Link>
        </div>
      </div>
    </section>
  );
}
