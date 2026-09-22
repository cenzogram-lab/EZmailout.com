import type {
  CanvasSide,
  LogoState,
  QrCodeState,
  TextBlockState,
} from "@/backend";
import { QrMode } from "@/backend";
import {
  type ElementBox,
  type ResizeCorner,
  type ResizeResult,
  useCanvasInteractions,
} from "@/components/canvas/useCanvasInteractions";
import { BRAND } from "@/lib/brand";
import { getSide } from "@/lib/canvas";
import { type LayoutDims, getLayoutDims, insetRect } from "@/lib/printSpec";
import { qrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import type { CanvasElementKind, CanvasSideKey } from "@/types";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ─── Shared rendering helpers (also used by the 3D preview) ─────────────────

export type CanvasElement =
  | { kind: "text"; id: string; z: number; data: TextBlockState }
  | { kind: "logo"; id: string; z: number; data: LogoState }
  | { kind: "qr"; id: string; z: number; data: QrCodeState };

/** All elements of a side, sorted by z-index ascending (paint order). */
export function sortedElements(side: CanvasSide): CanvasElement[] {
  const list: CanvasElement[] = [
    ...side.textBlocks.map(
      (data): CanvasElement => ({
        kind: "text",
        id: data.id,
        z: Number(data.zIndex),
        data,
      }),
    ),
    ...side.logos.map(
      (data): CanvasElement => ({
        kind: "logo",
        id: data.id,
        z: Number(data.zIndex),
        data,
      }),
    ),
    ...side.qrCodes.map(
      (data): CanvasElement => ({
        kind: "qr",
        id: data.id,
        z: Number(data.zIndex),
        data,
      }),
    ),
  ];
  return list.sort((a, b) => a.z - b.z);
}

export function findElementKind(
  side: CanvasSide,
  id: string,
): CanvasElementKind | null {
  if (side.textBlocks.some((t) => t.id === id)) return "text";
  if (side.logos.some((l) => l.id === id)) return "logo";
  if (side.qrCodes.some((q) => q.id === id)) return "qr";
  return null;
}

/** URL a QR encodes at preview time (dynamic codes show a sample recipient). */
export function qrPreviewTarget(url: string, mode: QrMode): string {
  const target =
    mode === QrMode.DynamicTracking
      ? url.replace("{{recipientId}}", "preview")
      : url;
  return target || BRAND.domain;
}

/** Inline style mirroring what the rasterizer draws for a text block. */
export function textBlockStyle(block: TextBlockState): CSSProperties {
  const align =
    block.align === "center" || block.align === "right" ? block.align : "left";
  return {
    fontSize: block.fontSize,
    fontFamily: `"${block.fontFamily}", "Geist", sans-serif`,
    fontWeight: Number(block.fontWeight),
    color: block.color,
    textAlign: align,
    lineHeight: 1.2,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: 2,
  };
}

/** Raster QR data URL that regenerates when url / mode / colors / size change. */
export function useQrDataUrl(
  qr: Pick<QrCodeState, "url" | "mode" | "size" | "foreground" | "background">,
): string | null {
  const target = qrPreviewTarget(qr.url, qr.mode);
  // Bucket the size so a resize drag doesn't regenerate on every pixel.
  const renderSize = Math.max(128, Math.ceil(qr.size / 64) * 128);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    qrDataUrl(target, {
      size: renderSize,
      foreground: qr.foreground,
      background: qr.background,
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [target, renderSize, qr.foreground, qr.background]);
  return src;
}

export function QrImage({
  qr,
  className,
}: {
  qr: QrCodeState;
  className?: string;
}) {
  const src = useQrDataUrl(qr);
  if (!src) {
    return (
      <div
        className={cn("size-full", className)}
        style={{ backgroundColor: qr.background }}
      />
    );
  }
  return (
    <img
      src={src}
      alt="QR code"
      draggable={false}
      className={cn("size-full select-none", className)}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

/** Hatched, non-editable USPS address / IMb barcode zone for postcard backs. */
export function AddressZoneOverlay({
  dims,
  scale,
  subtle = false,
}: {
  dims: LayoutDims;
  scale: number;
  subtle?: boolean;
}) {
  const zone = dims.addressZone;
  if (!zone) return null;
  return (
    <div
      className="pointer-events-none absolute flex items-center justify-center"
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.w,
        height: zone.h,
        zIndex: 9000,
        border: `${1 / scale}px dashed rgba(51, 65, 85, ${subtle ? 0.35 : 0.6})`,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(51,65,85,${subtle ? 0.05 : 0.09}) 0 ${6 / scale}px, transparent ${6 / scale}px ${12 / scale}px)`,
      }}
      data-ocid="canvas.editor.address_zone"
    >
      <span
        className="rounded bg-white/85 px-2 py-1 text-center font-mono uppercase tracking-wide text-slate-600"
        style={{ fontSize: 11 / scale, lineHeight: 1.3 }}
      >
        USPS address &amp; IMb barcode zone
        <br />
        <span className="normal-case tracking-normal">
          Reserved — kept clear of artwork
        </span>
      </span>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

/**
 * Click2Mail guides, outermost first: cut line at the trim edge, 1/8″ bleed
 * band, 1/4″ safe zone (see `lib/printSpec.ts`).
 */
const GUIDES = [
  {
    key: "cut",
    inset: "cutInsetInches",
    color: "#f97316",
    label: "Cut 0″",
    dashed: false,
    labelClass: "bottom-0 right-0 rounded-tl",
  },
  {
    key: "bleed",
    inset: "bleedInsetInches",
    color: "#ef4444",
    label: "Bleed ⅛″",
    dashed: true,
    labelClass: "right-0 top-0 rounded-bl",
  },
  {
    key: "safe",
    inset: "safeInsetInches",
    color: "#10b981",
    label: "Safe ¼″",
    dashed: true,
    labelClass: "left-0 top-0 rounded-br",
  },
] as const;

const CORNERS: ResizeCorner[] = ["nw", "ne", "sw", "se"];

/** Dotted workspace margin around the sheet (screen px). */
const WORKSPACE_PADDING = 24;

const CORNER_CURSOR: Record<ResizeCorner, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
};

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function elementBox(el: CanvasElement): ElementBox {
  if (el.kind === "qr") {
    return {
      id: el.id,
      x: el.data.x,
      y: el.data.y,
      width: el.data.size,
      height: el.data.size,
      keepAspect: true,
      minSize: 40,
    };
  }
  if (el.kind === "logo") {
    return {
      id: el.id,
      x: el.data.x,
      y: el.data.y,
      width: el.data.width,
      height: el.data.height,
      keepAspect: true,
      minSize: 20,
    };
  }
  return {
    id: el.id,
    x: el.data.x,
    y: el.data.y,
    width: el.data.width,
    height: el.data.height,
    keepAspect: false,
    minSize: 24,
  };
}

function ResizeHandles({
  box,
  scale,
  onStart,
}: {
  box: ElementBox;
  scale: number;
  onStart: (event: React.PointerEvent, corner: ResizeCorner) => void;
}) {
  const size = 12 / scale;
  const offset = -size / 2;
  const positions: Record<ResizeCorner, CSSProperties> = {
    nw: { left: offset, top: offset },
    ne: { right: offset, top: offset },
    sw: { left: offset, bottom: offset },
    se: { right: offset, bottom: offset },
  };
  return (
    <>
      {CORNERS.map((corner) => (
        <div
          key={corner}
          role="presentation"
          className="absolute touch-none rounded-full bg-white"
          style={{
            ...positions[corner],
            width: size,
            height: size,
            border: `${1.5 / scale}px solid oklch(var(--primary))`,
            boxShadow: `0 ${1 / scale}px ${3 / scale}px rgba(15, 23, 42, 0.25)`,
            cursor: CORNER_CURSOR[corner],
            zIndex: 2,
          }}
          onPointerDown={(e) => onStart(e, corner)}
          data-ocid={`canvas.editor.resize_handle.${box.id}.${corner}`}
        />
      ))}
    </>
  );
}

export interface CanvasEditorProps {
  className?: string;
  /** Upper bound for the rendered canvas height (screen px). */
  maxHeight?: number;
}

export function CanvasEditor({
  className,
  maxHeight = 640,
}: CanvasEditorProps) {
  const canvas = useWizardStore((s) => s.canvas);
  const activeSide = useWizardStore((s) => s.activeSide);
  const selectedElementId = useWizardStore((s) => s.selectedElementId);
  const selectedLayout = useWizardStore((s) => s.selectedLayout);
  const setSelectedElementId = useWizardStore((s) => s.setSelectedElementId);
  const updateTextBlock = useWizardStore((s) => s.updateTextBlock);

  const dims = useMemo(
    () => getLayoutDims(selectedLayout ?? "6x9"),
    [selectedLayout],
  );
  const side = getSide(canvas, activeSide);
  const elements = useMemo(() => sortedElements(side), [side]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fit the design-size canvas into the container width (and a max height).
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const fit = (width: number) => {
      if (width <= 0) return;
      const next = Math.min(
        (width - WORKSPACE_PADDING * 2) / dims.designWidth,
        maxHeight / dims.designHeight,
      );
      setScale(Math.max(0.05, next));
    };
    fit(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) fit(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [dims.designWidth, dims.designHeight, maxHeight]);

  // Leave text-edit mode when the selection or side changes.
  useEffect(() => {
    if (editingId && editingId !== selectedElementId) setEditingId(null);
  }, [editingId, selectedElementId]);

  const onMove = useCallback(
    (sideKey: CanvasSideKey, id: string, x: number, y: number) => {
      const store = useWizardStore.getState();
      const kind = findElementKind(getSide(store.canvas, sideKey), id);
      if (kind === "text") store.updateTextBlock(sideKey, id, { x, y });
      else if (kind === "logo") store.updateLogo(sideKey, id, { x, y });
      else if (kind === "qr") store.updateQrCode(sideKey, id, { x, y });
    },
    [],
  );

  const onResize = useCallback(
    (sideKey: CanvasSideKey, id: string, box: ResizeResult) => {
      const store = useWizardStore.getState();
      const kind = findElementKind(getSide(store.canvas, sideKey), id);
      if (kind === "text") store.updateTextBlock(sideKey, id, box);
      else if (kind === "logo") store.updateLogo(sideKey, id, box);
      else if (kind === "qr")
        store.updateQrCode(sideKey, id, {
          x: box.x,
          y: box.y,
          size: box.width,
        });
    },
    [],
  );

  const onInteractionStart = useCallback(
    (id: string) => {
      if (useWizardStore.getState().selectedElementId !== id) {
        setSelectedElementId(id);
      }
    },
    [setSelectedElementId],
  );

  const { startDrag, startResize, isDragging, isResizing } =
    useCanvasInteractions({
      scale,
      side: activeSide,
      dims,
      onMove,
      onResize,
      onInteractionStart,
    });

  // Keyboard: delete / escape / nudge for the selected element.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (editingId || isTypingTarget(event.target)) return;
      const store = useWizardStore.getState();
      const id = store.selectedElementId;
      if (!id) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        store.removeElement(store.activeSide, id);
        return;
      }
      if (event.key === "Escape") {
        store.setSelectedElementId(null);
        return;
      }
      const delta = ARROW_DELTAS[event.key];
      if (!delta) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const current = getSide(store.canvas, store.activeSide);
      const el = sortedElements(current).find((e) => e.id === id);
      if (!el) return;
      const box = elementBox(el);
      const d = getLayoutDims(store.selectedLayout ?? "6x9");
      const nx = Math.min(
        Math.max(0, box.x + delta[0] * step),
        Math.max(0, d.designWidth - box.width),
      );
      const ny = Math.min(
        Math.max(0, box.y + delta[1] * step),
        Math.max(0, d.designHeight - box.height),
      );
      onMove(store.activeSide, id, Math.round(nx), Math.round(ny));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingId, onMove]);

  const focusEditor = () => {
    containerRef.current?.focus({ preventScroll: true });
  };

  const handleCanvasPointerDown = (event: React.PointerEvent) => {
    if (event.target !== event.currentTarget) return;
    setSelectedElementId(null);
    setEditingId(null);
    focusEditor();
  };

  const handleElementPointerDown = (
    event: React.PointerEvent,
    el: CanvasElement,
  ) => {
    if (editingId === el.id) {
      event.stopPropagation();
      return;
    }
    focusEditor();
    startDrag(event, elementBox(el));
  };

  const displayWidth = dims.designWidth * scale;
  const displayHeight = dims.designHeight * scale;
  const outline = 2 / scale;

  return (
    <div
      ref={containerRef}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the canvas must take keyboard focus for arrow-key nudging and Delete
      tabIndex={0}
      aria-label={`Design canvas, ${activeSide} side`}
      className={cn(
        "studio-dotgrid relative w-full select-none rounded-2xl border outline-none",
        "flex justify-center",
        className,
      )}
      style={{ height: displayHeight + WORKSPACE_PADDING * 2 }}
      data-ocid="canvas.editor.container"
    >
      <div
        className="absolute shadow-lg ring-1 ring-border"
        style={{
          top: WORKSPACE_PADDING,
          left: "50%",
          marginLeft: -displayWidth / 2,
          width: displayWidth,
          height: displayHeight,
        }}
        data-ocid="canvas.editor.sheet"
        data-width-inches={dims.widthInches}
        data-height-inches={dims.heightInches}
      >
        <div
          role="presentation"
          className={cn(
            "relative origin-top-left overflow-hidden",
            isDragging && "cursor-grabbing",
            isResizing && "cursor-crosshair",
          )}
          style={{
            width: dims.designWidth,
            height: dims.designHeight,
            transform: `scale(${scale})`,
            backgroundColor: side.backgroundColor || "#ffffff",
          }}
          onPointerDown={handleCanvasPointerDown}
          data-ocid={`canvas.editor.surface.${activeSide}`}
        >
          {side.backgroundImageUrl && (
            <img
              src={side.backgroundImageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
          )}

          {/* Print guides */}
          {GUIDES.map((guide) => {
            const rect = insetRect(dims, dims[guide.inset]);
            const stroke = (guide.dashed ? 1 : 2) / scale;
            return (
              <div
                key={guide.key}
                className="pointer-events-none absolute"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.w,
                  height: rect.h,
                  boxSizing: "border-box",
                  border: `${stroke}px ${guide.dashed ? "dashed" : "solid"} ${guide.color}`,
                  zIndex: 8000,
                }}
                data-ocid={`canvas.editor.guide.${guide.key}`}
              >
                <span
                  className={cn(
                    "absolute px-1 font-mono uppercase tracking-wide text-white",
                    guide.labelClass,
                  )}
                  style={{
                    fontSize: 9 / scale,
                    lineHeight: 1.4,
                    backgroundColor: guide.color,
                    opacity: 0.85,
                  }}
                >
                  {guide.label}
                </span>
              </div>
            );
          })}

          {activeSide === "back" && (
            <AddressZoneOverlay dims={dims} scale={scale} />
          )}

          {/* Elements in paint order */}
          {elements.map((el) => {
            const box = elementBox(el);
            const selected = el.id === selectedElementId;
            const editing = editingId === el.id;
            return (
              <div
                key={el.id}
                role="presentation"
                className={cn(
                  "absolute touch-none",
                  editing ? "cursor-text" : "cursor-move",
                )}
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                  zIndex: el.z + 1,
                  outline: selected
                    ? `${outline}px solid oklch(var(--primary))`
                    : undefined,
                  outlineOffset: selected ? outline : undefined,
                }}
                onPointerDown={(e) => handleElementPointerDown(e, el)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (el.kind === "text") {
                    setSelectedElementId(el.id);
                    setEditingId(el.id);
                  }
                }}
                data-ocid={`canvas.editor.element.${el.id}`}
              >
                {el.kind === "text" &&
                  (editing ? (
                    <textarea
                      // biome-ignore lint/a11y/noAutofocus: the inline editor opens on double-click, so focusing it is the expected result
                      autoFocus
                      value={el.data.text}
                      onChange={(e) =>
                        updateTextBlock(activeSide, el.id, {
                          text: e.target.value,
                        })
                      }
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingId(null);
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="size-full resize-none border-0 bg-transparent outline-none"
                      style={{ ...textBlockStyle(el.data), overflow: "hidden" }}
                      spellCheck={false}
                      data-ocid={`canvas.editor.text_input.${el.id}`}
                    />
                  ) : (
                    <div
                      className="size-full overflow-visible"
                      style={textBlockStyle(el.data)}
                    >
                      {el.data.text || " "}
                    </div>
                  ))}
                {el.kind === "logo" && (
                  <img
                    src={el.data.url}
                    alt="Logo"
                    draggable={false}
                    className="pointer-events-none size-full object-contain"
                  />
                )}
                {el.kind === "qr" && (
                  <div className="pointer-events-none size-full">
                    <QrImage qr={el.data} />
                  </div>
                )}
                {selected && !editing && (
                  <ResizeHandles
                    box={box}
                    scale={scale}
                    onStart={(e, corner) => startResize(e, box, corner)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
