import { findElementKind } from "@/components/canvas/CanvasEditor";
import { SwatchRow } from "@/components/canvas/SwatchRow";
import { STUDIO_FONTS, STUDIO_SWATCHES } from "@/lib/brand";
import { getSide } from "@/lib/canvas";
import { useWizardStore } from "@/store/wizard";

/** Brand tool: paper colour, brand palette and the typefaces available in the inspector. */
export function BrandPanel() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const setBackgroundColor = useWizardStore((s) => s.setBackgroundColor);
  const updateTextBlock = useWizardStore((s) => s.updateTextBlock);
  const updateQrCode = useWizardStore((s) => s.updateQrCode);
  const side = getSide(canvas, activeSide);
  const kind = selectedElementId
    ? findElementKind(side, selectedElementId)
    : null;
  const selectedColor =
    kind === "text"
      ? (side.textBlocks.find((t) => t.id === selectedElementId)?.color ?? "")
      : kind === "qr"
        ? (side.qrCodes.find((q) => q.id === selectedElementId)?.foreground ??
          "")
        : "";

  function applyToSelection(hex: string) {
    if (!selectedElementId) return;
    if (kind === "text")
      updateTextBlock(activeSide, selectedElementId, { color: hex });
    if (kind === "qr")
      updateQrCode(activeSide, selectedElementId, { foreground: hex });
  }

  return (
    <div className="space-y-4" data-ocid="canvas.panel.brand">
      <div>
        <p className="font-display text-sm font-semibold">Brand kit</p>
        <p className="text-xs text-muted-foreground">
          EZmailout palette and typefaces. Pick a paper colour for the{" "}
          {activeSide} side or recolour the selected element.
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Paper colour · {activeSide}
        </p>
        <SwatchRow
          value={side.backgroundColor}
          onChange={(hex) => setBackgroundColor(activeSide, hex)}
          ocid="canvas.brand.paper"
          label="Paper colour"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {kind === "text"
            ? "Selected text colour"
            : kind === "qr"
              ? "Selected QR colour"
              : "Element colour (select text or a QR code)"}
        </p>
        <div className={kind === "text" || kind === "qr" ? "" : "opacity-50"}>
          <SwatchRow
            value={selectedColor}
            onChange={applyToSelection}
            ocid="canvas.brand.element"
            label="Element colour"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Palette
        </p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          {STUDIO_SWATCHES.map((s) => (
            <li key={s.hex} className="flex items-center gap-1.5">
              <span
                className="size-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: s.hex }}
              />
              <span className="truncate">{s.name}</span>
              <span className="ml-auto font-mono text-muted-foreground">
                {s.hex}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Typefaces
        </p>
        <ul className="space-y-1">
          {STUDIO_FONTS.map((font) => (
            <li
              key={font}
              className="rounded-lg border bg-card px-2.5 py-1.5 text-sm"
              style={{ fontFamily: `"${font}", "Geist", sans-serif` }}
            >
              {font}
              {font === "Geist" && (
                <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 font-body text-[10px] font-medium text-primary">
                  brand
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
