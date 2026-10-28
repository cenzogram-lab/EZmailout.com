import type { CanvasSide } from "@/backend";
import {
  AddressZoneOverlay,
  QrImage,
  sortedElements,
  textBlockStyle,
} from "@/components/canvas/CanvasEditor";
import { PhysicalOverlay } from "@/components/canvas/PhysicalOverlay";
import { Button } from "@/components/ui/button";
import { useCanvasDims } from "@/hooks/use-canvas-dims";
import { type PhysicalTraits, physicalTraitsFor } from "@/lib/physical";
import type { LayoutDims } from "@/lib/printSpec";
import { isShapeUrl } from "@/lib/shapes";
import { shownText } from "@/lib/textFit";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasSideKey } from "@/types";
import { FlipHorizontal, RotateCcw, RotateCw, ScanEye } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

/** Renders one face of the mail piece from live store state at a fitted scale. */
function Face({
  side,
  sideKey,
  scale,
  dims,
  traits,
}: {
  side: CanvasSide;
  sideKey: CanvasSideKey;
  scale: number;
  /** The canvas as laid out, orientation included, so the face never stretches. */
  dims: LayoutDims;
  traits: PhysicalTraits;
}) {
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
      <PhysicalOverlay dims={dims} traits={traits} scale={scale} subtle />
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
              className="absolute overflow-visible"
              style={{
                left: el.data.x,
                top: el.data.y,
                width: el.data.width,
                height: el.data.height,
                zIndex: el.z,
                ...textBlockStyle(el.data),
              }}
            >
              {shownText(el.data.text)}
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
              className={cn(
                "absolute",
                isShapeUrl(el.data.url) ? "object-fill" : "object-contain",
              )}
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
  const activeSide = useWizardStore((s) => s.activeSide);
  const dims = useCanvasDims();

  const [rotationY, setRotationY] = useState(0);
  const [tiltX, setTiltX] = useState(-6);
  const [interacting, setInteracting] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  // The stage's inner width (padding included), measured so the card always
  // fits it: a fixed 280 px ran past the stage on a 360 px phone and left a
  // 636 px stage mostly empty at 768 px.
  const [stageWidth, setStageWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const read = () => setStageWidth(el.clientWidth);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bump = useCallback(() => {
    setInteracting(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setInteracting(false), 700);
  }, []);

  const traits = useMemo(
    () =>
      physicalTraitsFor(
        dims.layoutVariant,
        dims.rotated ? "rotated" : "native",
      ),
    [dims],
  );
  // Heavy stock stands proud of the table; text weight sits almost flat.
  // On the obsidian stage a dark edge and drop vanish, so in the dark theme
  // the stock's edge catches the light (a pale band) and the drop is deeper.
  const { isDark } = useTheme();
  const edgeShadow =
    traits.stock === "card"
      ? isDark
        ? "0 3px 0 0 rgb(150 156 178 / 0.55), 0 24px 40px -14px rgb(0 0 0 / 0.8)"
        : "0 3px 0 0 rgba(1, 8, 10, 0.16), 0 18px 30px -12px rgba(1, 8, 10, 0.38)"
      : isDark
        ? "0 1px 0 0 rgb(150 156 178 / 0.45), 0 18px 32px -14px rgb(0 0 0 / 0.75)"
        : "0 1px 0 0 rgba(1, 8, 10, 0.1), 0 14px 26px -14px rgba(1, 8, 10, 0.3)";

  // Fits the measured stage less ~14 px a side (its padding plus room for the
  // tilt), never taller than 300 px. One scale for both axes, so a rotated
  // artboard re-aspects instead of stretching.
  const maxCardWidth = Math.max(120, (stageWidth ?? 308) - 28);
  const previewScale = Math.min(
    maxCardWidth / dims.designWidth,
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
      className={cn(
        // Raised a step off the wizard card it sits on.
        "flex flex-col gap-3 rounded-3xl border border-hairline-strong bg-card-raised p-3 shadow-surface sm:p-4",
        className,
      )}
      data-ocid="canvas.preview.panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-display text-sm font-bold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanEye className="size-4" />
          </span>
          Live 3D proof
        </span>
        {/* The size in Geist with tabular figures: mono tracking floated the
            inch marks off their digits ("9 ″ × 6 ″"). */}
        <span className="rounded-full border border-hairline bg-well px-2 py-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium tabular-nums">
            {dims.widthInches}″ × {dims.heightInches}″
          </span>{" "}
          <span className="font-mono text-[10px] tracking-wider">
            · 300 DPI export
          </span>
        </span>
      </div>
      <div
        ref={panelRef}
        role="presentation"
        // A sunken stage with a soft indigo spotlight and a floor shadow; the
        // card on it is the design (print colours).
        className="perspective-3d relative isolate flex min-h-[380px] items-center justify-center rounded-2xl border border-hairline bg-well p-2 shadow-[var(--segmented-inset)] sm:p-3"
        onMouseMove={(e) => {
          const rect = panelRef.current?.getBoundingClientRect();
          if (!rect) return;
          const pct = (e.clientY - rect.top) / rect.height;
          setTiltX(-6 + (0.5 - pct) * 18);
        }}
        onMouseLeave={() => setTiltX(-6)}
      >
        <div aria-hidden className="ambient-glow-backdrop" />
        {/* Dark theme only: a pale indigo pool of light on the floor, so the
            card's shadow (next) has something to fall on. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[8%] bottom-3 -z-10 hidden h-20 rounded-full bg-[radial-gradient(closest-side,rgb(129_140_248/0.26),rgb(129_140_248/0.1)_60%,transparent)] dark:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[18%] bottom-8 -z-10 h-8 rounded-full bg-[radial-gradient(closest-side,var(--stage-floor),transparent)]"
        />
        {/* The float lives on a wrapper: an animation's transform overrides
            the inline one, so on the card itself it undid every flip and turn
            0.7 s after the click. Still under reduced motion. */}
        <div
          className={cn(
            "preserve-3d relative shrink-0",
            !interacting && "motion-safe:animate-card-float",
          )}
        >
          <div
            className="preserve-3d relative"
            style={{
              width: previewWidth,
              height: previewHeight,
              transform: `rotateY(${baseY + rotationY}deg) rotateX(${tiltX}deg)`,
              transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            data-ocid="canvas.preview.card"
            data-width-inches={dims.widthInches}
            data-height-inches={dims.heightInches}
            data-orientation={dims.rotated ? "rotated" : "native"}
            data-stock={traits.stock}
          >
            <div
              className="backface-hidden absolute inset-0 overflow-hidden rounded-md bg-white ring-1 ring-black/10 dark:ring-white/10"
              style={{ boxShadow: edgeShadow }}
              data-ocid="canvas.preview.front"
            >
              <Face
                side={canvas.front}
                sideKey="front"
                scale={previewScale}
                dims={dims}
                traits={traits}
              />
            </div>
            <div
              className="backface-hidden absolute inset-0 overflow-hidden rounded-md bg-white ring-1 ring-black/10 dark:ring-white/10"
              style={{ transform: "rotateY(180deg)", boxShadow: edgeShadow }}
              data-ocid="canvas.preview.back"
            >
              <Face
                side={canvas.back}
                sideKey="back"
                scale={previewScale}
                dims={dims}
                traits={traits}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Rotate pair | Flip + Reset, with 44 px targets below sm. A phone row
          too narrow for all four in their wider state ("Showing back") stacks
          the two groups, so the layout neither strands Reset on a line of
          its own nor jumps when the card is flipped. */}
      <div className="@container">
        <div className="flex flex-col items-center justify-center gap-2 @[18rem]:flex-row @[18rem]:gap-1 sm:flex-row sm:flex-wrap sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                bump();
                setRotationY((r) => r - 25);
              }}
              className="size-11 sm:size-9"
              aria-label="Rotate left"
              title="Rotate left"
              data-ocid="canvas.preview_rotate_left"
            >
              <RotateCcw className="size-4 sm:size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                bump();
                setRotationY((r) => r + 25);
              }}
              className="size-11 sm:size-9"
              aria-label="Rotate right"
              title="Rotate right"
              data-ocid="canvas.preview_rotate_right"
            >
              <RotateCw className="size-4 sm:size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={showBack ? "default" : "outline"}
              size="sm"
              onClick={flip}
              className="h-11 gap-1.5 sm:h-8"
              data-ocid="canvas.preview_flip"
            >
              {/* The label says it all; the icon returns where there is room. */}
              <FlipHorizontal className="hidden size-3.5 sm:block" />{" "}
              {showBack ? "Showing back" : "Flip to back"}
            </Button>
            {/* The same raised pill as Flip and the rotate buttons beside it. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                bump();
                setRotationY(0);
                setShowBack(activeSide === "back");
              }}
              className="h-11 px-3 sm:h-8"
              data-ocid="canvas.preview_reset"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
      <p
        className="text-center font-mono text-[11px] tracking-wider text-muted-foreground"
        data-ocid="canvas.preview.physical_label"
      >
        {traits.label}
      </p>
      <p className="text-balance text-center text-[11px] text-muted-foreground">
        Editing the <strong>{activeSide}</strong> side · move your mouse over
        the card to tilt it
      </p>
    </div>
  );
}
