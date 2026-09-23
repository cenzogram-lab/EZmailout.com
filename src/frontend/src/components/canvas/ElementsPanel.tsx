import { SwatchRow } from "@/components/canvas/SwatchRow";
import { getLayoutDims, safeRect } from "@/lib/printSpec";
import {
  DEFAULT_SHAPE_FILL,
  SHAPES,
  type ShapeDef,
  shapeUrl,
} from "@/lib/shapes";
import { useWizardStore } from "@/store/wizard";
import { useState } from "react";

/** Elements & shapes tool: vector shapes inserted as recolourable layers. */
export function ElementsPanel() {
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const addLogo = useWizardStore((s) => s.addLogo);
  const [fill, setFill] = useState(DEFAULT_SHAPE_FILL);

  function add(shape: ShapeDef) {
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    const safe = safeRect(dims);
    const width = Math.min(shape.width, Math.round(safe.w * 0.6));
    const height =
      shape.kind === "line"
        ? shape.height
        : Math.round((width / shape.width) * shape.height);
    addLogo(activeSide, shapeUrl(shape.kind, fill), {
      x: safe.x + Math.round((safe.w - width) / 2),
      y: safe.y + Math.round((safe.h - height) / 2),
      width,
      height,
    });
  }

  return (
    <div className="space-y-4" data-ocid="canvas.panel.elements">
      <div>
        <p className="font-display text-sm font-semibold">Elements</p>
        <p className="text-xs text-muted-foreground">
          Shapes, dividers and badges. Pick a colour, then click to add.
        </p>
      </div>
      <SwatchRow
        value={fill}
        onChange={setFill}
        ocid="canvas.elements.fill"
        label="Shape colour"
        size="sm"
      />
      <div className="grid grid-cols-4 gap-2">
        {SHAPES.map((shape) => (
          <button
            key={shape.kind}
            type="button"
            onClick={() => add(shape)}
            title={shape.label}
            aria-label={`Add ${shape.label}`}
            className="flex aspect-square items-center justify-center rounded-xl border bg-card p-2 transition-smooth hover:border-primary/50 hover:bg-primary/5"
            data-ocid={`canvas.elements.add_${shape.kind}`}
          >
            <img
              src={shapeUrl(shape.kind, fill)}
              alt=""
              className="max-h-full max-w-full"
              style={{
                width: shape.kind === "line" ? 40 : 36,
                height:
                  shape.kind === "line" ? 4 : shape.kind === "badge" ? 16 : 36,
              }}
            />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Shapes resize freely; recolour a placed shape from the inspector.
      </p>
    </div>
  );
}
