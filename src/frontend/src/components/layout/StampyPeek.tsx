import pawRender from "@/assets/stampy/stampy-paw.webp";
import { StampyMark } from "@/components/stampy";
import { openStampy } from "@/lib/stampyChat";
import { cn } from "@/lib/utils";

/**
 * Stampy peeking up from behind the header pill's bottom edge, paws on the
 * airmail stripe. He lives inside the floating header pill (a flex item of its
 * row), so he is on every page without ever covering page content; the pill's
 * bottom edge hides his chin. Head and paws are the 3D renders
 * (`scripts/stampy3d`, poses `head` and `paw`). Tapping him
 * opens the Stampy panel. His size is fluid (`--peek-w` in index.css): it
 * follows the viewport from phones to large desktops with no breakpoint
 * jumps, and he rises a little on hover only where a pointer can hover.
 */
export function StampyPeek({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openStampy}
      aria-label="Ask Stampy"
      title="Ask Stampy"
      className={cn(
        "stampy-peek-button group relative shrink-0 self-stretch overflow-hidden rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      data-ocid="nav.stampy_peek"
    >
      <span
        aria-hidden
        className="stampy-peek absolute inset-x-0 bottom-0 flex justify-center"
      >
        <span className="block translate-y-[30%] transition-transform duration-300 ease-out group-focus-visible:translate-y-[18%] [@media(hover:hover)]:group-hover:translate-y-[18%]">
          <StampyMark className="stampy-peek-mark" />
        </span>
      </span>
      {/* Paws gripping the edge either side of his chin, in front of it. */}
      <Paw side="left" />
      <Paw side="right" />
    </button>
  );
}

/** One 3D paw over the edge (the render, mirrored for the right paw). */
function Paw({ side }: { side: "left" | "right" }) {
  return (
    <img
      src={pawRender}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      data-side={side}
      className="stampy-peek-paw pointer-events-none absolute select-none"
    />
  );
}
