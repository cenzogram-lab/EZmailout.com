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
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

const ALIGNMENTS: { id: CanvasAlignment; label: string; icon: LucideIcon }[] = [
  { id: "left", label: "Align left", icon: AlignStartVertical },
  { id: "center", label: "Align centre", icon: AlignCenterVertical },
  { id: "right", label: "Align right", icon: AlignEndVertical },
  { id: "top", label: "Align top", icon: AlignStartHorizontal },
  { id: "middle", label: "Align middle", icon: AlignCenterHorizontal },
  { id: "bottom", label: "Align bottom", icon: AlignEndHorizontal },
];

/**
 * First guess at the one-row bar's size, used until it has measured itself
 * (the label changes its width, so the real size always comes from layout).
 */
export const SELECTION_TOOLBAR_WIDTH = 412;
export const SELECTION_TOOLBAR_HEIGHT = 34;

/** Gap between the bar and the selection, and the bar's margin in the stage. */
const GAP = 8;
const EDGE = 2;

/** Where the selection sits in the stage, in stage pixels. */
export interface SelectionAnchor {
  left: number;
  top: number;
  bottom: number;
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  ocid,
  compact,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  ocid: string;
  /** Two-row phone layout: larger targets for touch. */
  compact: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(compact ? "size-8" : "size-7", "rounded-lg", className)}
      onClick={onClick}
      title={label}
      aria-label={label}
      data-ocid={ocid}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

/**
 * Canva-style contextual toolbar floating above the selected element:
 * align to canvas, depth order, duplicate and delete.
 *
 * The bar measures itself and stays inside the stage's width (`bounds`):
 * above the selection when there is room, otherwise below it. When one row is wider
 * than the stage — a phone — it folds into two rows with larger targets, so
 * every action stays on screen instead of widening the page.
 */
export function SelectionToolbar({
  side,
  id,
  kind,
  label,
  anchor,
  bounds,
}: {
  side: CanvasSideKey;
  id: string;
  kind: CanvasElementKind;
  /** Display name for the selection (defaults to the element kind). */
  label?: string;
  anchor: SelectionAnchor;
  /** Size of the stage the bar is positioned in. */
  bounds: { width: number; height: number };
}) {
  const alignElement = useWizardStore((s) => s.alignElement);
  const bringForward = useWizardStore((s) => s.bringForward);
  const sendBackward = useWizardStore((s) => s.sendBackward);
  const bringToFront = useWizardStore((s) => s.bringToFront);
  const sendToBack = useWizardStore((s) => s.sendToBack);
  const duplicateElement = useWizardStore((s) => s.duplicateElement);
  const removeElement = useWizardStore((s) => s.removeElement);

  const ref = useRef<HTMLDivElement>(null);
  const room = bounds.width - EDGE * 2;
  // One-row width as last measured; the bar unfolds only once that fits.
  const rowWidth = useRef(SELECTION_TOOLBAR_WIDTH);
  const [compact, setCompact] = useState(() => room < SELECTION_TOOLBAR_WIDTH);
  const [size, setSize] = useState({
    w: SELECTION_TOOLBAR_WIDTH,
    h: SELECTION_TOOLBAR_HEIGHT,
  });

  // Runs after every render, before paint: each branch changes state only
  // when the measurement disagrees, so it settles in at most two passes.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (!compact) rowWidth.current = w;
    if (!compact && w > room) setCompact(true);
    else if (compact && rowWidth.current <= room) setCompact(false);
    else if (w !== size.w || h !== size.h) setSize({ w, h });
  });

  // Above the selection, else below it. On a very short stage (a wide
  // format on a phone) neither fits, so the bar takes the roomier side and
  // overhangs the stage rather than covering the selection; it floats, so
  // only its horizontal position has to stay inside.
  const above = anchor.top - size.h - GAP;
  const below = anchor.bottom + GAP;
  const top =
    above >= EDGE
      ? above
      : below + size.h <= bounds.height - EDGE
        ? below
        : anchor.top >= bounds.height - anchor.bottom
          ? above
          : below;
  const left = Math.min(
    Math.max(EDGE, anchor.left),
    Math.max(EDGE, bounds.width - size.w - EDGE),
  );

  const name = (
    <span className="shrink-0 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label ?? (kind === "qr" ? "QR" : kind)}
    </span>
  );
  const align = (
    <div className="flex items-center" data-ocid="canvas.align.group">
      {ALIGNMENTS.map((a) => (
        <IconAction
          key={a.id}
          label={a.label}
          icon={a.icon}
          onClick={() => alignElement(side, id, a.id)}
          ocid={`canvas.align.${a.id}`}
          compact={compact}
        />
      ))}
    </div>
  );
  const order = (
    <div className="flex items-center" data-ocid="canvas.order.group">
      <IconAction
        label="Bring forward"
        icon={ArrowUp}
        onClick={() => bringForward(side, id)}
        ocid="canvas.order.forward"
        compact={compact}
      />
      <IconAction
        label="Send backward"
        icon={ArrowDown}
        onClick={() => sendBackward(side, id)}
        ocid="canvas.order.backward"
        compact={compact}
      />
      <IconAction
        label="Bring to front"
        icon={ArrowUpToLine}
        onClick={() => bringToFront(side, id)}
        ocid="canvas.order.front"
        compact={compact}
      />
      <IconAction
        label="Send to back"
        icon={ArrowDownToLine}
        onClick={() => sendToBack(side, id)}
        ocid="canvas.order.back"
        compact={compact}
      />
    </div>
  );
  const edit = (
    <div className="flex items-center" data-ocid="canvas.edit.group">
      <IconAction
        label="Duplicate"
        icon={Copy}
        onClick={() => duplicateElement(side, id)}
        ocid="canvas.duplicate"
        compact={compact}
      />
      <IconAction
        label="Delete"
        icon={Trash2}
        onClick={() => removeElement(side, id)}
        ocid="canvas.delete"
        compact={compact}
        className="text-destructive hover:text-destructive"
      />
    </div>
  );
  const row = (children: ReactNode) => (
    <div className="flex items-center gap-0.5">{children}</div>
  );

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selected element"
      className={cn(
        "absolute z-[9500] flex w-max rounded-xl border border-[#e5e7eb] bg-card px-1 py-0.5 shadow-lg",
        compact ? "flex-col gap-0.5 py-1" : "items-center gap-0.5",
      )}
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      data-ocid="canvas.selection_toolbar"
      data-layout={compact ? "compact" : "row"}
    >
      {compact ? (
        <>
          {row(
            <>
              {name}
              <Divider />
              {align}
            </>,
          )}
          {row(
            <>
              {order}
              <Divider />
              {edit}
            </>,
          )}
        </>
      ) : (
        <>
          {name}
          <Divider />
          {align}
          <Divider />
          {order}
          <Divider />
          {edit}
        </>
      )}
    </div>
  );
}
