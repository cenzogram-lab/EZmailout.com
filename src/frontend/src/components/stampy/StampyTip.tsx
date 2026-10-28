import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useStampyTips } from "@/store/stampyTips";
import { X } from "lucide-react";
import { type ComponentType, useId } from "react";
import { MascotStage } from "./MascotStage";
import type { StampyProps } from "./stampy";

/**
 * Stampy's callout for a wizard step: the glossy mascot on a glass card, one
 * tip, a × that closes it for this visit, and a "Don't show tips" box that
 * hides every tip for good.
 */
export function StampyTip({
  id,
  mascot: Mascot,
  children,
  compact = false,
  className,
}: {
  /** Stable id, also used for the `data-ocid` hooks (`stampy.tip.<id>`). */
  id: string;
  mascot: ComponentType<StampyProps>;
  children: React.ReactNode;
  /** Smaller mascot and tighter padding, for toolbar rows. */
  compact?: boolean;
  className?: string;
}) {
  const hidden = useStampyTips((s) => s.hidden);
  const dismissed = useStampyTips((s) => s.dismissed[id] === true);
  const setHidden = useStampyTips((s) => s.setHidden);
  const dismiss = useStampyTips((s) => s.dismiss);
  const checkboxId = useId();

  if (hidden || dismissed) return null;

  return (
    <aside
      aria-label="Tip from Stampy"
      className={cn(
        // A glass card: the card colour (solid, so the text's contrast is
        // measured against it), an indigo hairline, a bright top edge and the
        // surface depth; the indigo light behind Stampy is its own layer.
        "relative isolate flex items-center gap-3 overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-surface",
        "before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:content-['']",
        compact ? "rounded-2xl px-3 py-2" : "gap-3 p-4 min-[400px]:gap-4",
        className,
      )}
      data-ocid={`stampy.tip.${id}`}
    >
      {/* Indigo backlight from Stampy's side, fading out before the text. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-48 bg-[radial-gradient(circle_at_20%_50%,var(--spotlight),transparent_70%)]"
      />
      <MascotStage
        mascot={Mascot}
        size="sm"
        float={false}
        enter={false}
        className="shrink-0"
        // Smaller on narrow phones, so the tip's text keeps a readable width.
        mascotClassName={
          compact ? "size-14" : "size-14 min-[400px]:size-20 sm:size-24"
        }
      />
      <div className="min-w-0 flex-1 pr-6">
        <p
          className={cn(
            "font-medium leading-snug text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {children}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            id={checkboxId}
            checked={false}
            onCheckedChange={(checked) => {
              if (checked === true) setHidden(true);
            }}
            data-ocid={`stampy.tip.${id}.hide_all`}
          />
          <label
            htmlFor={checkboxId}
            className="cursor-pointer select-none py-2 pr-2 text-xs text-muted-foreground"
          >
            Don't show tips
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismiss(id)}
        // 28 px to look at, 44 px to tap (the ::after widens the target).
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-smooth after:absolute after:-inset-2 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
        aria-label="Close this tip"
        title="Close this tip"
        data-ocid={`stampy.tip.${id}.dismiss`}
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}
