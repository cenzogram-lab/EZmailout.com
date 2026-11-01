import { cn } from "@/lib/utils";
import type { ElementType } from "react";

/**
 * A navigation icon as a small app tile: a soft rounded square in the brand
 * indigo (tinted gradient, indigo hairline border) with a bold line glyph,
 * like a home-screen icon. `className` sizes the tile; the glyph is ~56 % of
 * it.
 */
export function NavIconTile({
  icon: Icon,
  active = false,
  className,
}: {
  icon: ElementType;
  /** The current page: an indigo ring lifts it a little. */
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[30%] border border-primary/25 bg-gradient-to-b from-primary/[0.05] to-primary/15 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.75),0_1px_2px_rgb(15_20_36/0.08)] transition-transform dark:border-primary/40 dark:from-primary/25 dark:to-primary/10 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]",
        active &&
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.75),0_0_0_2px_currentColor] dark:shadow-[0_0_0_2px_currentColor]",
        className,
      )}
    >
      <Icon className="size-[56%]" strokeWidth={2.25} />
    </span>
  );
}
