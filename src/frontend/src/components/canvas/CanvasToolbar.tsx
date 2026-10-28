import { CreditBadge } from "@/components/billing/CreditBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { orientationName } from "@/lib/printSpec";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";
import { RotateCw } from "lucide-react";

/**
 * Stage header: front/back switcher, the orientation toggle, the selection
 * hint and the credit balance.
 */
export function CanvasToolbar() {
  const activeSide = useWizardStore((s) => s.activeSide);
  const setActiveSide = useWizardStore((s) => s.setActiveSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const rotateCanvas = useWizardStore((s) => s.rotateCanvas);
  const dims = useCanvasDims();
  const square = dims.widthInches === dims.heightInches;

  return (
    <div
      // Raised a step off the wizard card it sits on.
      className="flex flex-wrap items-center gap-2 rounded-3xl border border-hairline-strong bg-card-raised p-2 shadow-surface"
      data-ocid="canvas.toolbar"
    >
      <div
        className="segmented gap-0.5 p-1"
        role="tablist"
        aria-label="Card side"
      >
        {(["front", "back"] as CanvasSideKey[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={activeSide === s}
            onClick={() => setActiveSide(s)}
            // The active side is the raised pill (aria-selected).
            // 44 px touch targets on phones, the compact pill from sm.
            className="segmented-item min-h-11 px-4 text-xs capitalize sm:min-h-8 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
            data-ocid={`canvas.side.${s}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={rotateCanvas}
            disabled={square}
            aria-label="Rotate Canvas (Swap W ↔ H)"
            aria-pressed={dims.rotated}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full sm:min-h-9 px-3.5 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 disabled:opacity-50",
              dims.rotated
                ? "border border-primary/40 bg-primary/10 text-primary-ink"
                : "btn-3d-neutral",
            )}
            data-ocid="canvas.rotate"
            data-orientation={dims.rotated ? "rotated" : "native"}
          >
            <RotateCw
              className={cn(
                "size-3.5 transition-transform duration-300",
                dims.rotated && "rotate-90",
              )}
              aria-hidden
            />
            <span>{orientationName(dims)}</span>
            {/* Geist with tabular figures, not mono: mono tracking floated
                the inch marks off their digits ("9 ″ × 6 ″"). */}
            <span className="font-normal tabular-nums">
              {dims.widthInches}″ × {dims.heightInches}″
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" data-ocid="canvas.rotate.tooltip">
          Switch between Landscape and Portrait orientation
        </TooltipContent>
      </Tooltip>
      {/* Credits share the first row (pushed right); the hint is the
          full-width last line, so the card is two rows instead of leaving
          the credits alone on a third. */}
      <div className="ml-auto">
        <CreditBadge compact />
      </div>
      <span className="basis-full px-1 text-xs text-muted-foreground">
        {selectedElementId
          ? "Use the toolbar above the selection to align, reorder, duplicate or delete."
          : "Click an element to select it · double-click text to edit · arrow keys nudge."}
      </span>
    </div>
  );
}
