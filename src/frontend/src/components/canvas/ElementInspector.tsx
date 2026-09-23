import { QrMode } from "@/backend";
import { findElementKind } from "@/components/canvas/CanvasEditor";
import { SwatchRow } from "@/components/canvas/SwatchRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { STUDIO_FONTS } from "@/lib/brand";
import { getSide } from "@/lib/canvas";
import { normalizeDestinationUrl } from "@/lib/qr";
import {
  isShapeUrl,
  recolorShape,
  shapeFillOf,
  shapeKindOf,
} from "@/lib/shapes";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  MousePointerSquareDashed,
  Trash2,
} from "lucide-react";
import { useRef } from "react";

const FONTS = STUDIO_FONTS;
const WEIGHTS = ["300", "400", "500", "600", "700", "800"];

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  ocid,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  ocid: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        min={min}
        value={Math.round(value)}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="h-8"
        data-ocid={ocid}
      />
    </div>
  );
}

/** Property editor for the selected element on the active side. */
export function ElementInspector() {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const updateTextBlock = useWizardStore((s) => s.updateTextBlock);
  const updateLogo = useWizardStore((s) => s.updateLogo);
  const updateQrCode = useWizardStore((s) => s.updateQrCode);
  const removeElement = useWizardStore((s) => s.removeElement);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const side = getSide(canvas, activeSide);
  const kind = selectedElementId
    ? findElementKind(side, selectedElementId)
    : null;

  if (!selectedElementId || !kind) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <MousePointerSquareDashed className="size-5" />
        Select an element on the canvas to edit its properties.
      </div>
    );
  }

  const header = (title: string) => (
    <div className="flex items-center justify-between">
      <span className="font-display text-sm font-semibold">{title}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-destructive"
        onClick={() => removeElement(activeSide, selectedElementId)}
        data-ocid="canvas.inspector.delete"
      >
        <Trash2 className="size-3.5" /> Delete
      </Button>
    </div>
  );

  if (kind === "text") {
    const block = side.textBlocks.find((t) => t.id === selectedElementId);
    if (!block) return null;
    const patch = (p: Partial<typeof block>) =>
      updateTextBlock(activeSide, block.id, p);
    return (
      <div className="space-y-3" data-ocid="canvas.inspector.text">
        {header("Text block")}
        <Textarea
          value={block.text}
          onChange={(e) => patch({ text: e.target.value })}
          rows={3}
          data-ocid="canvas.inspector.text_value"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Font
            </Label>
            <Select
              value={block.fontFamily}
              onValueChange={(v) => patch({ fontFamily: v })}
            >
              <SelectTrigger className="h-8" data-ocid="canvas.inspector.font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem
                    key={f}
                    value={f}
                    style={{ fontFamily: `"${f}", "Geist", sans-serif` }}
                  >
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Weight
            </Label>
            <Select
              value={String(block.fontWeight)}
              onValueChange={(v) => patch({ fontWeight: BigInt(v) })}
            >
              <SelectTrigger
                className="h-8"
                data-ocid="canvas.inspector.weight"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHTS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Size
            </Label>
            <Input
              type="number"
              min={8}
              max={160}
              value={Math.round(block.fontSize)}
              onChange={(e) =>
                patch({
                  fontSize: Math.min(
                    160,
                    Math.max(8, Number(e.target.value) || 8),
                  ),
                })
              }
              className="h-7 w-20"
              data-ocid="canvas.inspector.size_input"
            />
          </div>
          <Slider
            min={8}
            max={160}
            step={1}
            value={[block.fontSize]}
            onValueChange={([v]) => patch({ fontSize: v })}
            data-ocid="canvas.inspector.size_slider"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Colour
          </Label>
          <SwatchRow
            value={block.color}
            onChange={(color) => patch({ color })}
            ocid="canvas.inspector.swatch"
            label="Text colour"
            size="sm"
          />
          <Input
            value={block.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-8 font-mono"
            data-ocid="canvas.inspector.color_hex"
          />
        </div>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => {
            const Icon =
              a === "left"
                ? AlignLeft
                : a === "center"
                  ? AlignCenter
                  : AlignRight;
            return (
              <Button
                key={a}
                type="button"
                variant={block.align === a ? "default" : "outline"}
                size="icon"
                className="size-8"
                onClick={() => patch({ align: a })}
                data-ocid={`canvas.inspector.align.${a}`}
                aria-label={`Align ${a}`}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <NumberField
            label="X"
            value={block.x}
            onChange={(x) => patch({ x })}
            ocid="canvas.inspector.x"
          />
          <NumberField
            label="Y"
            value={block.y}
            onChange={(y) => patch({ y })}
            ocid="canvas.inspector.y"
          />
          <NumberField
            label="W"
            value={block.width}
            min={24}
            onChange={(width) => patch({ width })}
            ocid="canvas.inspector.w"
          />
          <NumberField
            label="H"
            value={block.height}
            min={24}
            onChange={(height) => patch({ height })}
            ocid="canvas.inspector.h"
          />
        </div>
      </div>
    );
  }

  if (kind === "logo") {
    const logo = side.logos.find((l) => l.id === selectedElementId);
    if (!logo) return null;
    const ratio = logo.width / Math.max(1, logo.height);
    if (isShapeUrl(logo.url)) {
      const patchLogo = (p: Partial<typeof logo>) =>
        updateLogo(activeSide, logo.id, p);
      const shapeKind = shapeKindOf(logo.url) ?? "rect";
      return (
        <div className="space-y-3" data-ocid="canvas.inspector.shape">
          {header(`Shape · ${shapeKind}`)}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Fill
            </Label>
            <SwatchRow
              value={shapeFillOf(logo.url)}
              onChange={(fill) =>
                patchLogo({ url: recolorShape(logo.url, fill) })
              }
              ocid="canvas.inspector.shape_fill"
              label="Shape fill"
              size="sm"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <NumberField
              label="X"
              value={logo.x}
              onChange={(x) => patchLogo({ x })}
              ocid="canvas.inspector.shape_x"
            />
            <NumberField
              label="Y"
              value={logo.y}
              onChange={(y) => patchLogo({ y })}
              ocid="canvas.inspector.shape_y"
            />
            <NumberField
              label="W"
              value={logo.width}
              min={8}
              onChange={(width) => patchLogo({ width })}
              ocid="canvas.inspector.shape_w"
            />
            <NumberField
              label="H"
              value={logo.height}
              min={4}
              onChange={(height) => patchLogo({ height })}
              ocid="canvas.inspector.shape_h"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Shapes resize freely from any handle; drag to move, arrow keys
            nudge.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-3" data-ocid="canvas.inspector.logo">
        {header("Logo")}
        <div className="flex items-center gap-3">
          <img
            src={logo.url}
            alt=""
            className="size-14 rounded border object-contain checkerboard"
          />
          <div className="space-y-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  updateLogo(activeSide, logo.id, {
                    url: URL.createObjectURL(f),
                  });
                e.target.value = "";
              }}
              data-ocid="canvas.inspector.logo_file"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              data-ocid="canvas.inspector.replace_logo"
            >
              Replace image
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Width"
            value={logo.width}
            min={20}
            onChange={(width) =>
              updateLogo(activeSide, logo.id, {
                width,
                height: Math.max(20, width / ratio),
              })
            }
            ocid="canvas.inspector.logo_w"
          />
          <NumberField
            label="Height"
            value={logo.height}
            min={20}
            onChange={(height) =>
              updateLogo(activeSide, logo.id, {
                height,
                width: Math.max(20, height * ratio),
              })
            }
            ocid="canvas.inspector.logo_h"
          />
          <NumberField
            label="X"
            value={logo.x}
            onChange={(x) => updateLogo(activeSide, logo.id, { x })}
            ocid="canvas.inspector.logo_x"
          />
          <NumberField
            label="Y"
            value={logo.y}
            onChange={(y) => updateLogo(activeSide, logo.id, { y })}
            ocid="canvas.inspector.logo_y"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Aspect ratio is locked when resizing.
        </p>
      </div>
    );
  }

  const qr = side.qrCodes.find((q) => q.id === selectedElementId);
  if (!qr) return null;
  const patchQr = (p: Partial<typeof qr>) => updateQrCode(activeSide, qr.id, p);
  return (
    <div className="space-y-3" data-ocid="canvas.inspector.qr">
      {header("QR code")}
      <div className="flex gap-1">
        {[
          { mode: QrMode.DynamicTracking, label: "Dynamic tracking" },
          { mode: QrMode.StaticUrl, label: "Static URL" },
        ].map((opt) => (
          <Button
            key={opt.mode}
            type="button"
            size="sm"
            variant={qr.mode === opt.mode ? "default" : "outline"}
            onClick={() =>
              patchQr({
                mode: opt.mode,
                url:
                  opt.mode === QrMode.DynamicTracking
                    ? "https://ezmailout.com/t/{{recipientId}}"
                    : qr.mode === QrMode.DynamicTracking
                      ? ""
                      : qr.url,
              })
            }
            data-ocid={`canvas.inspector.qr_mode.${opt.mode}`}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {qr.mode === QrMode.StaticUrl ? (
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Static URL
          </Label>
          <Input
            value={qr.url}
            onChange={(e) => patchQr({ url: e.target.value })}
            onBlur={(e) => {
              const n = normalizeDestinationUrl(e.target.value);
              if (n) patchQr({ url: n });
            }}
            placeholder="https://example.com/offer"
            className={cn(
              "h-8",
              qr.url &&
                !normalizeDestinationUrl(qr.url) &&
                "border-destructive",
            )}
            data-ocid="canvas.inspector.qr_url"
          />
        </div>
      ) : (
        <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
          Each printed piece gets its own{" "}
          <span className="font-mono">ezmailout.com/t/&lt;recipient&gt;</span>{" "}
          link that redirects to the campaign destination set in the QR &amp;
          Links tab and logs the scan.
        </p>
      )}
      <div className="space-y-1">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Size
        </Label>
        <Slider
          min={40}
          max={400}
          step={1}
          value={[qr.size]}
          onValueChange={([v]) => patchQr({ size: v })}
          data-ocid="canvas.inspector.qr_size"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Foreground
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={qr.foreground}
              onChange={(e) => patchQr({ foreground: e.target.value })}
              className="size-8 cursor-pointer rounded border bg-transparent"
              aria-label="QR foreground"
              data-ocid="canvas.inspector.qr_fg"
            />
            <span className="font-mono text-xs">{qr.foreground}</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Background
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={qr.background}
              onChange={(e) => patchQr({ background: e.target.value })}
              className="size-8 cursor-pointer rounded border bg-transparent"
              aria-label="QR background"
              data-ocid="canvas.inspector.qr_bg"
            />
            <span className="font-mono text-xs">{qr.background}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Caption (optional)
        </Label>
        <Input
          value={qr.caption ?? ""}
          onChange={(e) => patchQr({ caption: e.target.value || undefined })}
          placeholder="Scan to book"
          className="h-8"
          data-ocid="canvas.inspector.qr_caption"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={qr.x}
          onChange={(x) => patchQr({ x })}
          ocid="canvas.inspector.qr_x"
        />
        <NumberField
          label="Y"
          value={qr.y}
          onChange={(y) => patchQr({ y })}
          ocid="canvas.inspector.qr_y"
        />
      </div>
    </div>
  );
}
