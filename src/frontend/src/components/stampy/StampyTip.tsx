import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useStampyTips } from "@/store/stampyTips";
import { X } from "lucide-react";
import { type ComponentType, useId } from "react";
import type { StampyProps } from "./stampy";

/**
 * Stampy's callout for a wizard step: mascot, one tip, a × that closes it for
 * this visit, and a "Don't show tips" box that hides every tip for good.
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
        "relative flex items-center gap-3 rounded-2xl border border-primary/20 bg-accent/60 shadow-xs",
        compact ? "px-3 py-2" : "gap-4 p-4",
        className,
      )}
      data-ocid={`stampy.tip.${id}`}
    >
      <Mascot
        className={cn("shrink-0", compact ? "size-14" : "size-20 sm:size-24")}
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
            className="cursor-pointer select-none text-xs text-muted-foreground"
          >
            Don't show tips
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismiss(id)}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-[#575859] transition-smooth hover:bg-card hover:text-foreground"
        aria-label="Close this tip"
        title="Close this tip"
        data-ocid={`stampy.tip.${id}.dismiss`}
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}
