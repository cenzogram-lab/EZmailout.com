import { CreditBadge } from "@/components/billing/CreditBadge";
import { Button } from "@/components/ui/button";
import { getLayoutDims, insetRect } from "@/lib/printSpec";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";
import { ImagePlus, PenLine, Type, Upload, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

/** Top toolbar: side switcher, uploads, quick add text, background colour, credits. */
export function CanvasToolbar({
  onOpenCopywriter,
}: { onOpenCopywriter: () => void }) {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const setActiveSide = useWizardStore((s) => s.setActiveSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const setBackgroundImage = useWizardStore((s) => s.setBackgroundImage);
  const setBackgroundColor = useWizardStore((s) => s.setBackgroundColor);
  const addLogo = useWizardStore((s) => s.addLogo);
  const addTextBlock = useWizardStore((s) => s.addTextBlock);
  const bgInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const side = activeSide === "front" ? canvas.front : canvas.back;

  function onBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setBackgroundImage(activeSide, URL.createObjectURL(file));
    e.target.value = "";
  }

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a PNG, WebP or SVG logo");
      return;
    }
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    const safe = insetRect(dims, dims.safeInsetPct);
    addLogo(activeSide, URL.createObjectURL(file), {
      x: safe.x + 12,
      y: safe.y + 12,
      width: 140,
      height: 140,
    });
    e.target.value = "";
  }

  function onAddText() {
    const dims = getLayoutDims(selectedLayout ?? "6x9");
    const safe = insetRect(dims, dims.safeInsetPct);
    const count = side.textBlocks.length;
    addTextBlock(activeSide, {
      x: safe.x + 12,
      y: safe.y + 12 + count * 48,
      width: Math.round(safe.w * 0.6),
      height: 48,
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-2"
      data-ocid="canvas.toolbar"
    >
      <div
        className="inline-flex rounded-lg border bg-card p-0.5"
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
              "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-smooth",
              activeSide === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            data-ocid={`canvas.side.${s}`}
          >
            {s}
          </button>
        ))}
      </div>
      <input
        ref={bgInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onBackgroundFile}
        data-ocid="canvas.upload_input"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => bgInput.current?.click()}
        className="gap-1.5"
        data-ocid="canvas.upload_button"
      >
        <Upload className="size-4" /> Background
      </Button>
      {side.backgroundImageUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBackgroundImage(activeSide, null)}
          className="gap-1 text-muted-foreground"
          data-ocid="canvas.remove_background"
        >
          <X className="size-3.5" /> Remove
        </Button>
      )}
      <input
        ref={logoInput}
        type="file"
        accept="image/png,image/webp,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={onLogoFile}
        data-ocid="canvas.logo_upload_input"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => logoInput.current?.click()}
        className="gap-1.5"
        data-ocid="canvas.logo_upload_button"
      >
        <ImagePlus className="size-4" /> Logo
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onAddText}
        className="gap-1.5"
        data-ocid="canvas.add_text_button"
      >
        <Type className="size-4" /> Text
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenCopywriter}
        className="gap-1.5"
        data-ocid="canvas.copywriter_button"
      >
        <PenLine className="size-4 text-accent" /> AI Copywriter
      </Button>
      <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        Paper
        <input
          type="color"
          value={side.backgroundColor}
          onChange={(e) => setBackgroundColor(activeSide, e.target.value)}
          className="size-7 cursor-pointer rounded border bg-transparent"
          aria-label="Background colour"
          data-ocid="canvas.background_color"
        />
      </label>
      <div className="ml-auto">
        <CreditBadge compact />
      </div>
    </div>
  );
}
