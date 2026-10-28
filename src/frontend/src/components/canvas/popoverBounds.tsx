import { cn } from "@/lib/utils";
import {
  type ComponentProps,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type CollisionPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Clearance kept between a popover and the bars or the screen edge. */
const GAP = 8;
const SIDE = 12;

/** Before the bars are measured (and outside a browser): the edges only. */
export const EDGE_PADDING: CollisionPadding = {
  top: SIDE,
  right: SIDE,
  bottom: SIDE,
  left: SIDE,
};

/** Resolves a CSS length (custom properties, `env()`, `calc()`) to pixels. */
function cssPixels(length: string): number {
  if (typeof document === "undefined" || !document.body) return 0;
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${length}`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return Number.isFinite(px) ? px : 0;
}

/**
 * Collision padding that keeps a popover between the sticky header pill and
 * the phone dock (`--header-h` + 4 px + the notch inset at the top,
 * `--bottom-nav-h` at the bottom, the same footprints index.css defines), so
 * a popover that flips upward never lands on the header's nav or Launch
 * button. Measured when the popover opens: both bars scale with the viewport.
 */
export function barCollisionPadding(): CollisionPadding {
  return {
    top:
      Math.ceil(
        cssPixels(
          "calc(var(--header-h, 0px) + 4px + env(safe-area-inset-top, 0px))",
        ),
      ) + GAP,
    right: SIDE,
    bottom: Math.max(
      SIDE,
      Math.ceil(cssPixels("var(--bottom-nav-h, 0px)")) + GAP,
    ),
    left: SIDE,
  };
}

/**
 * A scrolling box whose bottom edge fades out while more content is below
 * it, so a popover cut short by the viewport shows that it scrolls. The fade
 * goes away at the end of the content.
 */
export function FadingScroll({
  className,
  style,
  children,
  onScroll,
  ...props
}: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);
  const fade =
    "linear-gradient(to bottom, #000 calc(100% - 2rem), transparent)";
  return (
    <div
      ref={ref}
      onScroll={(e) => {
        measure();
        onScroll?.(e);
      }}
      className={cn("overflow-y-auto overscroll-contain", className)}
      style={
        more ? { ...style, maskImage: fade, WebkitMaskImage: fade } : style
      }
      {...props}
    >
      {children}
    </div>
  );
}
