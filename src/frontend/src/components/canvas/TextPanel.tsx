import { Button } from "@/components/ui/button";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { DEFAULT_FONT_FAMILY } from "@/lib/canvas";
import { freeSafeRect } from "@/lib/printSpec";
import { measuredHeight } from "@/lib/textFit";
import { useWizardStore } from "@/store/wizard";
import { Heading1, Heading2, PenLine, Pilcrow } from "lucide-react";
import { useRef } from "react";

const PRESETS = [
  {
    id: "heading",
    label: "Add a heading",
    icon: Heading1,
    text: "Your headline here",
    fontSize: 36,
    fontWeight: 700n,
    className: "text-xl font-bold",
  },
  {
    id: "subheading",
    label: "Add a subheading",
    icon: Heading2,
    text: "A short supporting line",
    fontSize: 22,
    fontWeight: 600n,
    className: "text-base font-semibold",
  },
  {
    id: "body",
    label: "Add body text",
    icon: Pilcrow,
    text: "Tell your neighbours what you offer, when, and how to reach you.",
    fontSize: 15,
    fontWeight: 400n,
    className: "text-sm",
  },
] as const;

/** Text tool: Canva-style heading / subheading / body presets + AI copywriter. */
export function TextPanel({
  onOpenCopywriter,
}: {
  onOpenCopywriter: () => void;
}) {
  const activeSide = useWizardStore((s) => s.activeSide);
  const dims = useCanvasDims();
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const stackFor = useRef("");
  const nextY = useRef<number | null>(null);

  /**
   * Adds the preset beside the USPS zone on an address side, sized to its
   * text (`measuredHeight`, as the studio hugs every box: a heading in a
   * narrow strip wraps to several lines) and below the last block this panel
   * added on the same side and sheet, starting again at the top rather than
   * running past the safe area.
   */
  function add(preset: (typeof PRESETS)[number]) {
    const safe = freeSafeRect(dims, activeSide);
    const stackKey = `${activeSide}:${dims.designWidth}x${dims.designHeight}`;
    if (stackFor.current !== stackKey) {
      stackFor.current = stackKey;
      nextY.current = null;
    }
    const width = Math.max(
      80,
      Math.min(Math.round(safe.w * 0.62), safe.w - 24),
    );
    const height = measuredHeight(preset.text, {
      width,
      fontSize: preset.fontSize,
      fontWeight: Number(preset.fontWeight),
      fontFamily: DEFAULT_FONT_FAMILY,
    });
    let y = nextY.current ?? safe.y + 12;
    if (y + height > safe.y + safe.h) y = safe.y + 12;
    y = Math.max(safe.y, Math.min(y, safe.y + safe.h - height));
    addTextBlock(activeSide, {
      text: preset.text,
      x: safe.x + 12,
      y,
      width,
      height,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
    });
    nextY.current = y + height + 12;
  }

  return (
    <div className="space-y-3" data-ocid="canvas.panel.text">
      <div>
        <p className="font-display text-sm font-semibold">Text</p>
        <p className="text-xs text-muted-foreground">
          Click to add a block, then double-click it on the canvas to type.
        </p>
      </div>
      <div className="grid gap-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => add(preset)}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-smooth hover:border-primary/40 hover:bg-primary/5"
              data-ocid={`canvas.text.add_${preset.id}`}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className={preset.className}>{preset.label}</span>
            </button>
          );
        })}
      </div>
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={onOpenCopywriter}
        data-ocid="canvas.copywriter_button"
      >
        <PenLine className="size-4 text-primary" /> AI Copywriter · 1 credit
      </Button>
    </div>
  );
}
