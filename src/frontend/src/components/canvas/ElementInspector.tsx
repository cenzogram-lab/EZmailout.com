import { QrMode } from "@/backend";
import { findElementKind } from "@/components/canvas/CanvasEditor";
import { ColorPicker } from "@/components/canvas/ColorPicker";
import { FontPicker } from "@/components/canvas/FontPicker";
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
import { getSide } from "@/lib/canvas";
import { toDataUrl } from "@/lib/download";
import { normalizeDestinationUrl } from "@/lib/qr";
import {
  isShapeUrl,
  recolorShape,
  shapeFillOf,
  shapeKindOf,
} from "@/lib/shapes";
import {
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
  textExtras,
} from "@/lib/textStyle";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Italic,
  MousePointerSquareDashed,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";

const WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

/** Small-caps field label used across the inspector. */
const FIELD_LABEL =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
/** Live value readout beside a slider. */
const READOUT =
  "font-mono text-[11px] tabular-nums tracking-wider text-muted-foreground";

/**
 * A number box that lets the customer finish typing: what they type is kept
 * as typed and applied as soon as it is in range, and clamped only when they
 * leave the box or press Enter. (Clamping every keystroke turned "36" into
 * "86": the "3" became the minimum 8 before the "6" arrived.)
 */
function NumberInput({
  value,
  onChange,
  min,
  max = Number.POSITIVE_INFINITY,
  className,
  ocid,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max?: number;
  className?: string;
  ocid: string;
}) {
  const shown = String(Math.round(value));
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) {
      const clamped = Math.min(max, Math.max(min, n));
      if (clamped !== value) onChange(clamped);
    }
    setDraft(null);
  };
  return (
    <Input
      type="number"
      min={min}
      max={Number.isFinite(max) ? max : undefined}
      value={draft ?? shown}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const n = Number(text);
        if (text.trim() !== "" && Number.isFinite(n) && n >= min && n <= max)
          onChange(n);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className={className}
      data-ocid={ocid}
    />
  );
}

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
      <Label className={FIELD_LABEL}>{label}</Label>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        // Narrow side padding leaves room for four digits in a phone's
        // column; the 16 px type stays (smaller text makes iOS zoom).
        className="h-8 px-2"
        ocid={ocid}
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
      <div className="flex h-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-hairline-strong bg-well/60 p-6 text-center text-sm text-muted-foreground">
        <span className="flex size-10 items-center justify-center rounded-full border border-hairline bg-card text-foreground shadow-surface">
          <MousePointerSquareDashed className="size-5" />
        </span>
        Select an element on the canvas to edit its properties.
      </div>
    );
  }

  const header = (title: string) => (
    <div className="flex items-center justify-between">
      <span className="font-display text-sm font-bold tracking-tight">
        {title}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
    const patch = (p: Parameters<typeof updateTextBlock>[2]) =>
      updateTextBlock(activeSide, block.id, p);
    const extras = textExtras(block);
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
            <Label className={FIELD_LABEL}>Font</Label>
            <FontPicker
              value={block.fontFamily}
              onChange={(v) => patch({ fontFamily: v })}
              ocid="canvas.inspector.font"
            />
          </div>
          <div className="space-y-1">
            <Label className={FIELD_LABEL}>Weight</Label>
            <Select
              value={String(block.fontWeight)}
              onValueChange={(v) => patch({ fontWeight: BigInt(v) })}
            >
              <SelectTrigger
                className="h-8 w-full data-[size=default]:h-8"
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
            <Label className={FIELD_LABEL}>Size</Label>
            <NumberInput
              min={8}
              max={160}
              value={block.fontSize}
              onChange={(fontSize) => patch({ fontSize })}
              className="h-7 w-20"
              ocid="canvas.inspector.size_input"
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
          <Label className={FIELD_LABEL}>Colour</Label>
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
        <div className="flex items-center gap-2">
          <div className="segmented gap-0.5 p-1">
            {(["left", "center", "right"] as const).map((a) => {
              const Icon =
                a === "left"
                  ? AlignLeft
                  : a === "center"
                    ? AlignCenter
                    : AlignRight;
              return (
                <button
                  key={a}
                  type="button"
                  className="segmented-item size-8 min-h-0 px-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                  onClick={() => patch({ align: a })}
                  aria-pressed={block.align === a}
                  data-ocid={`canvas.inspector.align.${a}`}
                  aria-label={`Align ${a}`}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant={extras.italic ? "default" : "outline"}
            size="icon"
            className="ml-auto size-9"
            onClick={() => patch({ italic: !extras.italic })}
            aria-pressed={extras.italic}
            aria-label="Italic"
            data-ocid="canvas.inspector.italic"
          >
            <Italic className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={FIELD_LABEL}>Spacing</Label>
              <span className={READOUT}>
                {Math.round(extras.letterSpacing * 100)}
              </span>
            </div>
            <Slider
              min={LETTER_SPACING_RANGE.min}
              max={LETTER_SPACING_RANGE.max}
              step={0.01}
              value={[extras.letterSpacing]}
              onValueChange={([v]) => patch({ letterSpacing: v })}
              aria-label="Letter spacing"
              data-ocid="canvas.inspector.letter_spacing"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className={FIELD_LABEL}>Line height</Label>
              <span className={READOUT}>{extras.lineHeight.toFixed(2)}</span>
            </div>
            <Slider
              min={LINE_HEIGHT_RANGE.min}
              max={LINE_HEIGHT_RANGE.max}
              step={0.05}
              value={[extras.lineHeight]}
              onValueChange={([v]) => patch({ lineHeight: v })}
              aria-label="Line height"
              data-ocid="canvas.inspector.line_height"
            />
          </div>
        </div>
        {/* X Y W over H Turn° until the inspector (a container, see
            Step3DesignCanvas) is 24rem wide: five boxes across a phone's
            260 px column left 20 px for the digits and cut "507" to "50". */}
        <div className="grid grid-cols-3 gap-2 @sm:grid-cols-5">
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
          <NumberField
            label="Turn°"
            value={extras.rotation}
            min={-180}
            onChange={(rotation) =>
              patch({ rotation: Math.max(-180, Math.min(180, rotation)) })
            }
            ocid="canvas.inspector.rotation"
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
            <Label className={FIELD_LABEL}>Fill</Label>
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
          <div className="grid grid-cols-2 gap-2 @[16rem]:grid-cols-4">
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
            className="checkerboard size-14 rounded-xl border border-hairline-strong object-contain"
          />
          <div className="space-y-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f)
                  updateLogo(activeSide, logo.id, {
                    url: await toDataUrl(f),
                  });
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
      <div className="segmented flex w-full gap-0.5 p-1">
        {[
          { mode: QrMode.DynamicTracking, label: "Dynamic tracking" },
          { mode: QrMode.StaticUrl, label: "Static URL" },
        ].map((opt) => (
          <button
            key={opt.mode}
            type="button"
            className="segmented-item min-h-8 min-w-0 flex-1 whitespace-normal px-2 text-center text-xs leading-tight focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
            aria-pressed={qr.mode === opt.mode}
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
          </button>
        ))}
      </div>
      {qr.mode === QrMode.StaticUrl ? (
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>Static URL</Label>
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
        <p className="rounded-2xl border border-hairline bg-well/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Each printed piece gets its own{" "}
          <span className="font-mono">ezmailout.com/t/&lt;recipient&gt;</span>{" "}
          link that redirects to the campaign destination set in the QR &amp;
          Links tab and logs the scan.
        </p>
      )}
      <div className="space-y-1">
        <Label className={FIELD_LABEL}>Size</Label>
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
          <Label className={FIELD_LABEL}>Foreground</Label>
          <ColorPicker
            value={qr.foreground}
            onChange={(hex) => patchQr({ foreground: hex })}
            label="QR foreground"
            ocid="canvas.inspector.qr_fg"
          />
        </div>
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>Background</Label>
          <ColorPicker
            value={qr.background}
            onChange={(hex) => patchQr({ background: hex })}
            label="QR background"
            ocid="canvas.inspector.qr_bg"
          />
        </div>
      </div>
      {/* A caption ("Scan to book") is a text layer placed under the code:
          the code layer itself draws only the code. */}
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
