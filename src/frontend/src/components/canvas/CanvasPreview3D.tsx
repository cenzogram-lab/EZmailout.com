import type { CanvasSide } from "@/backend";
import {
  AddressZoneOverlay,
  QrImage,
  sortedElements,
  textBlockStyle,
} from "@/components/canvas/CanvasEditor";
import { Button } from "@/components/ui/button";
import { getLayoutDims } from "@/lib/printSpec";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";
import { FlipHorizontal, RotateCcw, RotateCw, ScanEye } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

/** Renders one face of the mail piece from live store state at a fitted scale. */
function Face({
  side,
  sideKey,
  scale,
  layoutVariant,
}: {
  side: CanvasSide;
  sideKey: CanvasSideKey;
  scale: number;
  layoutVariant: string;
}) {
  const dims = getLayoutDims(layoutVariant);
  const elements = useMemo(() => sortedElements(side), [side]);
  return (
    <div
      className="absolute left-0 top-0 origin-top-left overflow-hidden"
      style={{
        width: dims.designWidth,
        height: dims.designHeight,
        transform: `scale(${scale})`,
        backgroundColor: side.backgroundColor,
        backgroundImage: side.backgroundImageUrl
          ? `url(${side.backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      data-ocid={`canvas.preview.face.${sideKey}`}
    >
      {sideKey === "back" && (
        <AddressZoneOverlay
          dims={dims}
          scale={scale}
          subtle
          ocid="canvas.preview.address_zone"
        />
      )}
      {elements.map((el) => {
        if (el.kind === "text") {
          return (
            <div
              key={el.id}
              className="absolute overflow-hidden"
              style={{
                left: el.data.x,
                top: el.data.y,
                width: el.data.width,
                height: el.data.height,
                zIndex: el.z,
                ...textBlockStyle(el.data),
              }}
            >
              {el.data.text}
            </div>
          );
        }
        if (el.kind === "logo") {
          return (
            <img
              key={el.id}
              src={el.data.url}
              alt=""
              draggable={false}
              className="absolute object-contain"
              style={{
                left: el.data.x,
                top: el.data.y,
                width: el.data.width,
                height: el.data.height,
                zIndex: el.z,
              }}
            />
          );
        }
        return (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: el.data.x,
              top: el.data.y,
              width: el.data.size,
              height: el.data.size,
              zIndex: el.z,
            }}
          >
            <QrImage qr={el.data} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Interactive CSS-3D card: both faces render the same store state as the
 * editor, so every drag, resize, text edit or asset drop shows up instantly.
 */
export function CanvasPreview3D({ className }: { className?: string }) {
  const canvas = useWizardStore((s) => s.canvas);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const activeSide = useWizardStore((s) => s.activeSide);
  const layoutVariant = selectedLayout ?? "6x9";
  const dims = getLayoutDims(layoutVariant);

  const [rotationY, setRotationY] = useState(0);
  const [tiltX, setTiltX] = useState(-6);
  const [interacting, setInteracting] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const bump = useCallback(() => {
    setInteracting(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setInteracting(false), 700);
  }, []);

  // Fits inside the 340px studio column (panel padding + card border).
  const previewScale = Math.min(
    280 / dims.designWidth,
    300 / dims.designHeight,
    0.5,
  );
  const previewWidth = Math.round(dims.designWidth * previewScale);
  const previewHeight = Math.round(dims.designHeight * previewScale);

  const flip = () => {
    bump();
    setShowBack((b) => !b);
  };
  const baseY = showBack ? 180 : 0;

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-ocid="canvas.preview.panel"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold">
          <ScanEye className="size-4 text-primary" /> Live 3D proof
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {dims.widthInches}″ × {dims.heightInches}″ · 300 DPI export
        </span>
      </div>
      <div
        ref={panelRef}
        role="presentation"
        className="perspective-3d flex min-h-[380px] items-center justify-center rounded-xl border bg-gradient-to-b from-muted/60 to-muted/20 p-6"
        onMouseMove={(e) => {
          const rect = panelRef.current?.getBoundingClientRect();
          if (!rect) return;
          const pct = (e.clientY - rect.top) / rect.height;
          setTiltX(-6 + (0.5 - pct) * 18);
        }}
        onMouseLeave={() => setTiltX(-6)}
      >
        <div
          className={cn(
            "preserve-3d relative shrink-0",
            !interacting && "animate-card-float",
          )}
          style={{
            width: previewWidth,
            height: previewHeight,
            transform: `rotateY(${baseY + rotationY}deg) rotateX(${tiltX}deg)`,
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="backface-hidden absolute inset-0 overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/10"
            data-ocid="canvas.preview.front"
          >
            <Face
              side={canvas.front}
              sideKey="front"
              scale={previewScale}
              layoutVariant={layoutVariant}
            />
          </div>
          <div
            className="backface-hidden absolute inset-0 overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/10"
            style={{ transform: "rotateY(180deg)" }}
            data-ocid="canvas.preview.back"
          >
            <Face
              side={canvas.back}
              sideKey="back"
              scale={previewScale}
              layoutVariant={layoutVariant}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            bump();
            setRotationY((r) => r - 25);
          }}
          className="gap-1.5"
          data-ocid="canvas.preview_rotate_left"
        >
          <RotateCcw className="size-3.5" /> Rotate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            bump();
            setRotationY((r) => r + 25);
          }}
          className="gap-1.5"
          data-ocid="canvas.preview_rotate_right"
        >
          <RotateCw className="size-3.5" /> Rotate
        </Button>
        <Button
          variant={showBack ? "default" : "outline"}
          size="sm"
          onClick={flip}
          className="gap-1.5"
          data-ocid="canvas.preview_flip"
        >
          <FlipHorizontal className="size-3.5" />{" "}
          {showBack ? "Showing back" : "Flip to back"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            bump();
            setRotationY(0);
            setShowBack(activeSide === "back");
          }}
          data-ocid="canvas.preview_reset"
        >
          Reset
        </Button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Editing the <strong>{activeSide}</strong> side · move your mouse over
        the card to tilt it
      </p>
    </div>
  );
}
