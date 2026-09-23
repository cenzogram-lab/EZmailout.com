import { CreditBadge } from "@/components/billing/CreditBadge";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";

/** Stage header: front/back switcher, selection hint and the credit balance. */
export function CanvasToolbar() {
  const activeSide = useWizardStore((s) => s.activeSide);
  const setActiveSide = useWizardStore((s) => s.setActiveSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);

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
