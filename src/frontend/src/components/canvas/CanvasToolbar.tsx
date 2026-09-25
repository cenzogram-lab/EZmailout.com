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
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-card px-2 py-1.5 shadow-xs"
      data-ocid="canvas.toolbar"
    >
      <div
        className="inline-flex rounded-full border border-[#e5e7eb] bg-[#f6f7f9] p-0.5"
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
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-smooth",
              activeSide === s
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-[#575859] hover:text-foreground",
            )}
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
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-smooth disabled:opacity-50",
              dims.rotated
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-[#e5e7eb] text-[#575859] hover:text-foreground",
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
            <span className="font-mono font-normal tabular-nums">
              {dims.widthInches}″ × {dims.heightInches}″
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" data-ocid="canvas.rotate.tooltip">
          Switch between Landscape and Portrait orientation
        </TooltipContent>
      </Tooltip>
      <span className="text-xs text-muted-foreground">
        {selectedElementId
          ? "Use the toolbar above the selection to align, reorder, duplicate or delete."
          : "Click an element to select it · double-click text to edit · arrow keys nudge."}
      </span>
      <div className="ml-auto">
        <CreditBadge compact />
      </div>
    </div>
  );
}
