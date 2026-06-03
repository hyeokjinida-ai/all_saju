import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Ollama: flat tag pill, no shadow, hairline border for outline.
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gold text-wine-deep",
        secondary: "bg-wine-2 text-bone",
        outline: "border border-hairline text-bone-soft",
        success: "bg-[#1c3a2a] text-[#86efac] border border-[#2f5a40]",
        warning: "bg-[#3a2e12] text-[#fcd34d] border border-[#5a4a1f]",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
