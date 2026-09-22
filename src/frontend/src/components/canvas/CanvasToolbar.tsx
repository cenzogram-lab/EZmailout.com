import { CreditBadge } from "@/components/billing/CreditBadge";
import { findElementKind } from "@/components/canvas/CanvasEditor";
import { Button } from "@/components/ui/button";
import { getSide } from "@/lib/canvas";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasAlignment, CanvasSideKey } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Trash2,
} from "lucide-react";

const ALIGNMENTS: { id: CanvasAlignment; label: string; icon: LucideIcon }[] = [
  { id: "left", label: "Align left", icon: AlignStartVertical },
  { id: "center", label: "Align centre", icon: AlignCenterVertical },
  { id: "right", label: "Align right", icon: AlignEndVertical },
  { id: "top", label: "Align top", icon: AlignStartHorizontal },
  { id: "middle", label: "Align middle", icon: AlignCenterHorizontal },
  { id: "bottom", label: "Align bottom", icon: AlignEndHorizontal },
];

function IconAction({
  label,
  icon: Icon,
  onClick,
  ocid,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  ocid: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8 rounded-lg", className)}
      onClick={onClick}
      title={label}
      aria-label={label}
      data-ocid={ocid}
    >
      <Icon className="size-4" />
    </Button>
  );
}

/**
 * Contextual bar above the canvas (Canva-style): side switcher, then — when
 * an element is selected — align-to-canvas, layer order, duplicate, delete.
 */
export function CanvasToolbar() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const setActiveSide = useWizardStore((s) => s.setActiveSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const alignElement = useWizardStore((s) => s.alignElement);
  const bringForward = useWizardStore((s) => s.bringForward);
  const sendBackward = useWizardStore((s) => s.sendBackward);
  const bringToFront = useWizardStore((s) => s.bringToFront);
  const sendToBack = useWizardStore((s) => s.sendToBack);
  const duplicateElement = useWizardStore((s) => s.duplicateElement);
  const removeElement = useWizardStore((s) => s.removeElement);
  const side = getSide(canvas, activeSide);
  const kind = selectedElementId
    ? findElementKind(side, selectedElementId)
    : null;
  const id = kind ? selectedElementId : null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-2 py-1.5 shadow-xs"
      data-ocid="canvas.toolbar"
    >
      <div
        className="inline-flex rounded-full border bg-secondary p-0.5"
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
                : "text-muted-foreground hover:text-foreground",
            )}
            data-ocid={`canvas.side.${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      {id ? (
        <>
          <span className="hidden text-xs font-medium capitalize text-muted-foreground sm:inline">
            {kind === "qr" ? "QR code" : kind}
          </span>
          <div
            className="flex items-center gap-0.5 rounded-xl border bg-secondary/60 p-0.5"
            aria-label="Position"
            data-ocid="canvas.align.group"
          >
            {ALIGNMENTS.map((a) => (
              <IconAction
                key={a.id}
                label={a.label}
                icon={a.icon}
                onClick={() => alignElement(activeSide, id, a.id)}
                ocid={`canvas.align.${a.id}`}
              />
            ))}
          </div>
          <div
            className="flex items-center gap-0.5 rounded-xl border bg-secondary/60 p-0.5"
            aria-label="Layer order"
            data-ocid="canvas.order.group"
          >
            <IconAction
              label="Bring forward"
              icon={ArrowUp}
              onClick={() => bringForward(activeSide, id)}
              ocid="canvas.order.forward"
            />
            <IconAction
              label="Send backward"
              icon={ArrowDown}
              onClick={() => sendBackward(activeSide, id)}
              ocid="canvas.order.backward"
            />
            <IconAction
              label="Bring to front"
              icon={ArrowUpToLine}
              onClick={() => bringToFront(activeSide, id)}
              ocid="canvas.order.front"
            />
            <IconAction
              label="Send to back"
              icon={ArrowDownToLine}
              onClick={() => sendToBack(activeSide, id)}
              ocid="canvas.order.back"
            />
          </div>
          <IconAction
            label="Duplicate"
            icon={Copy}
            onClick={() => duplicateElement(activeSide, id)}
            ocid="canvas.duplicate"
          />
          <IconAction
            label="Delete"
            icon={Trash2}
            onClick={() => removeElement(activeSide, id)}
            ocid="canvas.delete"
            className="text-destructive hover:text-destructive"
          />
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          Select an element to align, reorder or duplicate it.
        </span>
      )}
      <div className="ml-auto">
        <CreditBadge compact />
      </div>
    </div>
  );
}
