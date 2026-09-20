import { sortedElements } from "@/components/canvas/CanvasEditor";
import { Button } from "@/components/ui/button";
import { getSide } from "@/lib/canvas";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Image as ImageIcon,
  Layers,
  QrCode,
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
  const removeElement = useWizardStore((s) => s.removeElement);
  const side = getSide(canvas, activeSide);
  const layers = useMemo(() => sortedElements(side).reverse(), [side]);

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        <Layers className="size-5" />
        No layers on the {activeSide} side yet. Add text, a logo or a QR code.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" data-ocid="canvas.layers.list">
      {layers.map((el) => {
        const selected = el.id === selectedElementId;
        const Icon =
          el.kind === "text" ? Type : el.kind === "logo" ? ImageIcon : QrCode;
        const label =
          el.kind === "text"
            ? el.data.text.split("\n")[0] || "Text block"
            : el.kind === "logo"
              ? "Logo image"
              : el.data.mode === "DynamicTracking"
                ? "Dynamic tracking QR"
                : "Static QR";
        return (
          <li
            key={el.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm",
              selected && "bg-accent/10",
            )}
            data-ocid={`canvas.layers.item.${el.id}`}
          >
            <button
              type="button"
              onClick={() => setSelectedElementId(el.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              data-ocid={`canvas.layers.select.${el.id}`}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{label}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                z{el.z}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => bringToFront(activeSide, el.id)}
              title="Bring to front"
              data-ocid={`canvas.layers.front.${el.id}`}
            >
              <ArrowUpToLine className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => sendToBack(activeSide, el.id)}
              title="Send to back"
              data-ocid={`canvas.layers.back.${el.id}`}
            >
              <ArrowDownToLine className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive"
              onClick={() => removeElement(activeSide, el.id)}
              title="Delete"
              data-ocid={`canvas.layers.delete.${el.id}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
