import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pill badges. `default` is solid indigo (white text 4.97:1 in both themes);
 * `success` / `warning` / `info` / `neutral` are the tinted status pills
 * (index.css .status-pill-emerald / -amber / -indigo / -neutral: ink that
 * passes AA on its tint in both themes).
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-ring/80 focus-visible:ring-[3px] aria-invalid:ring-destructive/30 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] [a&]:hover:bg-primary/90",
        secondary:
          "border-hairline bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/40",
        outline:
          "border-hairline-strong text-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground",
        success: "status-pill-emerald",
        warning: "status-pill-amber",
        info: "status-pill-indigo",
        neutral: "status-pill-neutral",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
