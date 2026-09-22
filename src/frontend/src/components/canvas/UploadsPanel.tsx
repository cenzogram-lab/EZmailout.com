import { Button } from "@/components/ui/button";
import { getLayoutDims, safeRect } from "@/lib/printSpec";
import { useWizardStore } from "@/store/wizard";
import { ImagePlus, Upload, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

/** Uploads tool: full-bleed background and transparent logo layers. */
export function UploadsPanel() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const setBackgroundImage = useWizardStore((s) => s.setBackgroundImage);
  const addLogo = useWizardStore((s) => s.addLogo);
  const bgInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const side = activeSide === "front" ? canvas.front : canvas.back;
  const dims = getLayoutDims(selectedLayout ?? "6x9");

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
    const safe = safeRect(dims);
    addLogo(activeSide, URL.createObjectURL(file), {
      x: safe.x + 12,
      y: safe.y + 12,
      width: 140,
      height: 140,
    });
    e.target.value = "";
  }

  return (
    <div className="space-y-3" data-ocid="canvas.panel.uploads">
      <div>
        <p className="font-display text-sm font-semibold">Uploads</p>
        <p className="text-xs text-muted-foreground">
          Backgrounds fill the whole {activeSide} side; logos become movable
          layers.
        </p>
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
        className="w-full justify-start gap-2"
        onClick={() => bgInput.current?.click()}
        data-ocid="canvas.upload_button"
      >
        <Upload className="size-4" /> Upload background image
      </Button>
      {side.backgroundImageUrl && (
        <div className="flex items-center gap-2 rounded-xl border p-2">
          <img
            src={side.backgroundImageUrl}
            alt=""
            className="size-12 rounded-lg object-cover"
          />
          <span className="flex-1 text-xs text-muted-foreground">
            Background on the {activeSide} side
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBackgroundImage(activeSide, null)}
            className="gap-1 text-muted-foreground"
            data-ocid="canvas.remove_background"
          >
            <X className="size-3.5" /> Remove
          </Button>
        </div>
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
        className="w-full justify-start gap-2"
        onClick={() => logoInput.current?.click()}
        data-ocid="canvas.logo_upload_button"
      >
        <ImagePlus className="size-4" /> Upload logo (PNG / SVG)
      </Button>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        <li>
          Recommended background: ≥ {Math.round(dims.widthInches * 150)}×
          {Math.round(dims.heightInches * 150)} px, ideally{" "}
          {Math.round(dims.widthInches * 300)}×
          {Math.round(dims.heightInches * 300)} px for 300 DPI.
        </li>
        <li>
          Backgrounds must run through the red ⅛″ bleed band to the edge; keep
          logos and text inside the emerald ¼″ safe zone.
        </li>
        <li>
          Postcard backs keep the USPS address &amp; IMb zone clear
          automatically.
        </li>
      </ul>
    </div>
  );
}
