import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type {
  CanvasAlignment,
  CanvasElementKind,
  CanvasSideKey,
} from "@/types";
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

/** Approximate rendered width, used to keep the bar inside the stage. */
export const SELECTION_TOOLBAR_WIDTH = 392;
export const SELECTION_TOOLBAR_HEIGHT = 40;

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
      className={cn("size-7 rounded-lg", className)}
      onClick={onClick}
      title={label}
      aria-label={label}
      data-ocid={ocid}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}

/**
 * Canva-style contextual toolbar floating above the selected element:
 * align to canvas, depth order, duplicate and delete.
 */
export function SelectionToolbar({
  side,
  id,
  kind,
  label,
  left,
  top,
}: {
  side: CanvasSideKey;
  id: string;
  kind: CanvasElementKind;
  /** Display name for the selection (defaults to the element kind). */
  label?: string;
  left: number;
  top: number;
}) {
  const alignElement = useWizardStore((s) => s.alignElement);
  const bringForward = useWizardStore((s) => s.bringForward);
  const sendBackward = useWizardStore((s) => s.sendBackward);
  const bringToFront = useWizardStore((s) => s.bringToFront);
  const sendToBack = useWizardStore((s) => s.sendToBack);
  const duplicateElement = useWizardStore((s) => s.duplicateElement);
  const removeElement = useWizardStore((s) => s.removeElement);

  return (
    <div
      role="toolbar"
      aria-label="Selected element"
      className="absolute z-[9500] flex items-center gap-0.5 rounded-xl border border-[#e5e7eb] bg-card px-1 py-0.5 shadow-lg"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      data-ocid="canvas.selection_toolbar"
    >
      <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label ?? (kind === "qr" ? "QR" : kind)}
      </span>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <div className="flex items-center" data-ocid="canvas.align.group">
        {ALIGNMENTS.map((a) => (
          <IconAction
            key={a.id}
            label={a.label}
            icon={a.icon}
            onClick={() => alignElement(side, id, a.id)}
            ocid={`canvas.align.${a.id}`}
          />
        ))}
      </div>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <div className="flex items-center" data-ocid="canvas.order.group">
        <IconAction
          label="Bring forward"
          icon={ArrowUp}
          onClick={() => bringForward(side, id)}
          ocid="canvas.order.forward"
        />
        <IconAction
          label="Send backward"
          icon={ArrowDown}
          onClick={() => sendBackward(side, id)}
          ocid="canvas.order.backward"
        />
        <IconAction
          label="Bring to front"
          icon={ArrowUpToLine}
          onClick={() => bringToFront(side, id)}
          ocid="canvas.order.front"
        />
        <IconAction
          label="Send to back"
          icon={ArrowDownToLine}
          onClick={() => sendToBack(side, id)}
          ocid="canvas.order.back"
        />
      </div>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <IconAction
        label="Duplicate"
        icon={Copy}
        onClick={() => duplicateElement(side, id)}
        ocid="canvas.duplicate"
      />
      <IconAction
        label="Delete"
        icon={Trash2}
        onClick={() => removeElement(side, id)}
        ocid="canvas.delete"
        className="text-destructive hover:text-destructive"
      />
    </div>
  );
}
