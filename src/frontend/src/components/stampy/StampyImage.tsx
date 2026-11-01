import { cn } from "@/lib/utils";
import type { StampyProps } from "./stampy";

/**
 * One 3D Stampy render (`src/assets/stampy/*.webp`, made by
 * `scripts/stampy3d/render.mjs`). The renders are square with a transparent
 * background; like the SVGs they replaced they are 64 px until a class sizes
 * them, and `object-contain` keeps the whole figure in any box.
 */
export function StampyImage({
  src,
  title,
  className,
  ...props
}: StampyProps & { src: string }) {
  return (
    <img
      src={src}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={64}
      height={64}
      draggable={false}
      decoding="async"
      className={cn("select-none object-contain", className)}
      {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
    />
  );
}
