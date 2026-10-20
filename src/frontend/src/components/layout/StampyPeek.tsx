import { StampyMark } from "@/components/stampy";
import { openStampy } from "@/lib/stampyChat";
import { cn } from "@/lib/utils";

/**
 * Stampy peeking up from behind the header's bottom edge, paws on the airmail
 * stripe. He lives inside the header bar, so he is on every page without ever
 * covering page content; the bar's bottom edge hides his chin. Tapping him
 * opens the Stampy panel.
 */
export function StampyPeek({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openStampy}
      aria-label="Ask Stampy"
      title="Ask Stampy"
      className={cn(
        "group relative w-16 shrink-0 self-stretch overflow-hidden rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-[76px]",
        className,
      )}
      data-ocid="nav.stampy_peek"
    >
      <span
        aria-hidden
        className="stampy-peek absolute inset-x-0 bottom-0 flex justify-center"
      >
        <span className="block translate-y-[22%] transition-transform duration-300 ease-out group-hover:translate-y-[8%] group-focus-visible:translate-y-[8%]">
          <StampyMark className="h-[50px] w-14 sm:h-[58px] sm:w-[66px]" />
        </span>
      </span>
      {/* Paws gripping the edge either side of his chin, in front of it. */}
      <Paw className="left-0.5 sm:left-1" />
      <Paw className="right-0.5 sm:right-1" />
    </button>
  );
}

/** One white paw over the edge, with two toe lines like the illustrations. */
function Paw({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 13"
      className={cn("absolute bottom-0 h-[13px] w-[22px]", className)}
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
