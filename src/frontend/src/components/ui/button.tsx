import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tactile buttons (index.css): `default` is the glossy 3D indigo
 * (.btn-3d-primary), `success` the glossy emerald (.btn-3d-success, dark
 * text), `outline` / `secondary` raised neutral surfaces that read in both
 * themes, `ghost` and `link` flat. Focus rings compose with the 3D shadows.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/80 focus-visible:ring-[3px] aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "btn-3d-primary",
        success: "btn-3d-success",
        destructive:
          "border border-black/10 border-t-white/25 bg-destructive text-destructive-foreground shadow-[inset_0_1px_1px_rgb(255_255_255/0.3),0_8px_20px_-8px_rgb(220_38_38/0.5)] hover:bg-destructive/90 active:translate-y-px focus-visible:ring-destructive/40",
        outline: "btn-3d-neutral hover:text-foreground",
        secondary:
          "border border-hairline bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        navy: "border border-white/10 bg-navy text-primary-foreground shadow-xs hover:bg-navy/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
