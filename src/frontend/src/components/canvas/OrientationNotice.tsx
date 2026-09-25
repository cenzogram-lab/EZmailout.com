import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { physicalTraitsFor } from "@/lib/physical";
import { orientationName } from "@/lib/printSpec";
import { useWizardStore } from "@/store/wizard";
import { AlertTriangle, RotateCcw } from "lucide-react";

type NoticeKind = "window" | "address" | "envelope";

/** What a turned artboard means for the format, most specific first. */
function noticeKind(hasWindows: boolean, hasAddressZone: boolean): NoticeKind {
  if (hasWindows) return "window";
  if (hasAddressZone) return "address";
  // Every format without an address block is inserted into an envelope.
  return "envelope";
}

/**
 * Warning shown above the artboard while the design is rotated from the
 * product's own orientation. The printed piece keeps its size, so the export
 * turns every page back onto it — the banner says what that means for the
 * USPS address zone, the #10 windows or the envelope the piece travels in.
 */
export function OrientationNotice() {
  const dims = useCanvasDims();
  const rotateCanvas = useWizardStore((s) => s.rotateCanvas);
  if (!dims.rotated) return null;

  const traits = physicalTraitsFor(dims.layoutVariant, "rotated");
  const kind = noticeKind(traits.windows.length > 0, Boolean(dims.addressZone));
  const piece = `${dims.nativeWidthInches}″ × ${dims.nativeHeightInches}″`;
  const turned = orientationName(dims).toLowerCase();

  const copy: Record<NoticeKind, { title: string; body: string }> = {
    window: {
      title: `Rotated to ${turned} — pages sit sideways in the #10 window envelope`,
      body: `The folds and window cuts turned with the page: keep artwork out of the outlined windows. Click2Mail prints the recipient's address on its own page, so delivery is unaffected, but your pages read sideways when the letter is unfolded. Each page exports turned back onto the ${piece} sheet.`,
    },
    address: {
      title: `Rotated to ${turned} — keep the USPS address zone clear`,
      body: `Click2Mail prints the delivery address, postage and IMb barcode on the same patch of the back whatever your design's orientation, so the reserved zone turned with the artboard. Both sides export turned back onto the ${piece} piece.`,
    },
    envelope: {
      title: `Rotated to ${turned} — the piece goes into its envelope upright`,
      body: `This format is inserted into an envelope in its own orientation, so your design reads sideways when it is opened. Each page exports turned back onto the ${piece} sheet.`,
    },
  };

  return (
    <output
      className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900 sm:flex-row sm:items-start"
      data-ocid={`canvas.orientation.notice.${kind}`}
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{copy[kind].title}</p>
        <p className="text-xs leading-relaxed text-amber-900/80">
          {copy[kind].body}
        </p>
      </div>
      <button
        type="button"
        onClick={rotateCanvas}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition-smooth hover:bg-amber-100"
        data-ocid="canvas.orientation.rotate_back"
      >
        <RotateCcw className="size-3.5" aria-hidden /> Rotate back
      </button>
    </output>
  );
}
