import { StampyMark } from "@/components/stampy";
import { openStampy } from "@/lib/stampyChat";
import { cn } from "@/lib/utils";

/**
 * Stampy peeking up from behind the header's bottom edge, paws on the airmail
 * stripe. He lives inside the header bar, so he is on every page without ever
 * covering page content; the bar's bottom edge hides his chin. Tapping him
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
        <span className="block translate-y-[22%] transition-transform duration-300 ease-out group-focus-visible:translate-y-[10%] [@media(hover:hover)]:group-hover:translate-y-[10%]">
          <StampyMark className="stampy-peek-mark" />
        </span>
      </span>
      {/* Paws gripping the edge either side of his chin, in front of it. */}
      <Paw side="left" />
      <Paw side="right" />
    </button>
  );
}

/** One white paw over the edge, with two toe lines like the illustrations. */
function Paw({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 13"
      data-side={side}
      className="stampy-peek-paw absolute"
    >
      <path
        d="M2 13 V8 A6.5 6.5 0 0 1 8.5 1.5 H13.5 A6.5 6.5 0 0 1 20 8 V13"
        className="fill-white stroke-navy"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 5.5 V9 M13.5 5.5 V9"
        className="stroke-navy"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
