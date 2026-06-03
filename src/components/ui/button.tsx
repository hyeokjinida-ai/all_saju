import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Ollama-style: full-pill geometry, single-color CTA system.
// primary = pure black on canvas; secondary = canvas-on-canvas with hairline.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // 명운록: 금빛 필 버튼 (어두운 와인 글자) — 화면의 주 강조점
        default: "bg-gold text-wine-deep font-semibold hover:bg-gold-bright shadow-gold-glow",
        outline:
          "border border-hairline-strong bg-transparent text-bone hover:bg-wine-2 hover:border-gold",
        ghost: "text-bone hover:bg-wine-2",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        link: "text-gold underline-offset-4 hover:underline px-0 h-auto",
        onDark: "bg-gold text-wine-deep font-semibold hover:bg-gold-bright",
      },
      size: {
        default: "h-9 px-5",
        sm: "h-8 px-4 text-xs",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
