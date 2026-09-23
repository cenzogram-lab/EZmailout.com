import { Button } from "@/components/ui/button";
import { getLayoutDims, safeRect } from "@/lib/printSpec";
import { useWizardStore } from "@/store/wizard";
import { Heading1, Heading2, PenLine, Pilcrow } from "lucide-react";

const PRESETS = [
  {
    id: "heading",
    label: "Add a heading",
    icon: Heading1,
    text: "Your headline here",
    fontSize: 36,
    fontWeight: 700n,
    height: 56,
    className: "text-xl font-bold",
  },
  {
    id: "subheading",
    label: "Add a subheading",
    icon: Heading2,
    text: "A short supporting line",
    fontSize: 22,
    fontWeight: 600n,
    height: 40,
    className: "text-base font-semibold",
  },
  {
    id: "body",
    label: "Add body text",
    icon: Pilcrow,
    text: "Tell your neighbours what you offer, when, and how to reach you.",
    fontSize: 15,
    fontWeight: 400n,
    height: 64,
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
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const canvas = useWizardStore((s) => s.canvas);
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const side = activeSide === "front" ? canvas.front : canvas.back;

  function add(preset: (typeof PRESETS)[number]) {
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    const safe = safeRect(dims);
    const count = side.textBlocks.length;
    addTextBlock(activeSide, {
      text: preset.text,
      x: safe.x + 12,
      y: Math.min(safe.y + 12 + count * 56, safe.y + safe.h - preset.height),
      width: Math.round(safe.w * 0.62),
      height: preset.height,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
    });
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
