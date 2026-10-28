import { sortedElements } from "@/components/canvas/CanvasEditor";
import { Button } from "@/components/ui/button";
import { getSide } from "@/lib/canvas";
import { isShapeUrl, shapeKindOf } from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Image as ImageIcon,
  Layers,
  QrCode,
  Shapes,
  Trash2,
  Type,
} from "lucide-react";
import { useMemo } from "react";

/** Layer list for the active side (top layer first) with ordering and delete controls. */
export function LayersPanel() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const setSelectedElementId = useWizardStore((s) => s.setSelectedElementId);
  const bringToFront = useWizardStore((s) => s.bringToFront);
  const sendToBack = useWizardStore((s) => s.sendToBack);
  const bringForward = useWizardStore((s) => s.bringForward);
  const sendBackward = useWizardStore((s) => s.sendBackward);
  const removeElement = useWizardStore((s) => s.removeElement);
  const side = getSide(canvas, activeSide);
  const layers = useMemo(() => sortedElements(side).reverse(), [side]);

  if (layers.length === 0) {
    return (
      <div className="space-y-3" data-ocid="canvas.panel.layers">
        <p className="font-display text-base font-black tracking-tight">
          Layers
        </p>
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-hairline-strong bg-well/60 px-4 py-8 text-center text-sm text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-full border border-hairline bg-card text-foreground shadow-surface">
            <Layers className="size-5" />
          </span>
          No layers on the {activeSide} side yet. Add text, a logo or a QR code.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-ocid="canvas.panel.layers">
      <div>
        <p className="font-display text-base font-black tracking-tight">
          Layers
        </p>
        <p className="text-xs text-muted-foreground">
          Top of the list prints on top. Reorder one step or jump to the front /
          back.
        </p>
      </div>
      <ul
        className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-card-raised"
        data-ocid="canvas.layers.list"
      >
        {layers.map((el) => {
          const selected = el.id === selectedElementId;
          const shape = el.kind === "logo" && isShapeUrl(el.data.url);
          const Icon =
            el.kind === "text"
              ? Type
              : el.kind === "logo"
                ? shape
                  ? Shapes
                  : ImageIcon
                : QrCode;
          const label =
            el.kind === "text"
              ? el.data.text.split("\n")[0] || "Text block"
              : el.kind === "logo"
                ? shape
                  ? `Shape · ${shapeKindOf(el.data.url) ?? "rect"}`
                  : "Logo image"
                : el.data.mode === "DynamicTracking"
                  ? "Dynamic tracking QR"
                  : "Static QR";
          return (
            <li
              key={el.id}
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2.5 py-2 text-sm transition-colors",
                selected
                  ? "bg-primary/10 shadow-[inset_3px_0_0_oklch(var(--primary))]"
                  : "hover:bg-foreground/5",
              )}
              data-ocid={`canvas.layers.item.${el.id}`}
            >
              <button
                type="button"
                onClick={() => setSelectedElementId(el.id)}
                className="flex min-w-0 basis-full items-center gap-2 rounded-lg py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
                data-ocid={`canvas.layers.select.${el.id}`}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-card",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className={cn("truncate", selected && "font-semibold")}>
                  {label}
                </span>
                <span className="ml-auto font-mono text-[10px] tabular-nums tracking-wider text-muted-foreground">
                  z{el.z}
                </span>
              </button>
              <div className="ml-9 flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => bringForward(activeSide, el.id)}
                  title="Bring forward"
                  data-ocid={`canvas.layers.forward.${el.id}`}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => sendBackward(activeSide, el.id)}
                  title="Send backward"
                  data-ocid={`canvas.layers.backward.${el.id}`}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => bringToFront(activeSide, el.id)}
                  title="Bring to front"
                  data-ocid={`canvas.layers.front.${el.id}`}
                >
                  <ArrowUpToLine className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => sendToBack(activeSide, el.id)}
                  title="Send to back"
                  data-ocid={`canvas.layers.back.${el.id}`}
                >
                  <ArrowDownToLine className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeElement(activeSide, el.id)}
                  title="Delete"
                  data-ocid={`canvas.layers.delete.${el.id}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
