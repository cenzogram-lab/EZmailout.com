import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { StampyProps } from "./stampy";

/**
 * The round chat avatar around a 3D Stampy bust: a pale disc with the indigo
 * ring, the render filling it, and an optional badge (the unread dot or the
 * typing bubble) over the top-right edge. Sized by the caller's class, like
 * the SVG avatars it replaced (64 px by default). The disc keeps its own
 * light colours in both themes: it is the mascot's artwork.
 */
export function StampyAvatar({
  src,
  stampy,
  title,
  className,
  style,
  badge,
  ...props
}: StampyProps & { src: string; stampy: string; badge?: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-stampy={stampy}
      className={cn("relative inline-block size-16 shrink-0", className)}
      style={style}
      {...props}
    >
      <span className="absolute inset-[1.5%] overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_28%,#ffffff,#e9eaf7_70%)]">
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className="size-full select-none object-cover"
        />
      </span>
      <span className="pointer-events-none absolute inset-[1.5%] rounded-full shadow-[inset_0_0_0_max(1.5px,3.1%)_#6366f1]" />
      {badge}
    </span>
  );
}
