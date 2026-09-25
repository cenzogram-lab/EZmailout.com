import type {
  CanvasSide,
  CanvasState,
  LogoState,
  QrCodeState,
  TextBlockState,
} from "@/backend";
import { QrMode } from "@/backend";
import { DYNAMIC_QR_PLACEHOLDER } from "@/lib/brand";
import {
  DESIGN_PPI,
  type LayoutDims,
  type Orientation,
  getLayoutDims,
  safeRect,
} from "@/lib/printSpec";
import { bandHeight, countLines } from "@/lib/textFit";
import type { CanvasSideKey, DesignTemplate } from "@/types";

let idCounter = 0;

/** Unique element id with a readable prefix (`tb_12_k3x9`). */
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_FONT_FAMILY = "Geist";
export const DEFAULT_TEXT_COLOR = "#0f172a";
export const DEFAULT_FRONT_BG = "#ffffff";
export const DEFAULT_BACK_BG = "#ffffff";

export function emptyCanvasSide(
  backgroundColor = DEFAULT_FRONT_BG,
): CanvasSide {
  return {
    backgroundColor,
    backgroundImageUrl: undefined,
    textBlocks: [],
    logos: [],
    qrCodes: [],
  };
}

/** Fresh canvas for a layout variant, sized in design pixels (100 ppi). */
export function emptyCanvasState(
  layoutVariant: string,
  orientation: Orientation = "native",
): CanvasState {
  const dims = getLayoutDims(layoutVariant, orientation);
  return {
    front: emptyCanvasSide(DEFAULT_FRONT_BG),
    back: emptyCanvasSide(DEFAULT_BACK_BG),
    designPpi: BigInt(DESIGN_PPI),
    widthInches: dims.widthInches,
    heightInches: dims.heightInches,
  };
}

/** Highest z-index on a side plus one. */
export function nextZIndex(side: CanvasSide): bigint {
  let max = 0n;
  for (const t of side.textBlocks) if (t.zIndex > max) max = t.zIndex;
  for (const l of side.logos) if (l.zIndex > max) max = l.zIndex;
  for (const q of side.qrCodes) if (q.zIndex > max) max = q.zIndex;
  return max + 1n;
}

export function makeTextBlock(
  side: CanvasSide,
  partial: Partial<TextBlockState> = {},
): TextBlockState {
  return {
    id: newId("tb"),
    text: "Your headline here",
    x: 40,
    y: 40,
    width: 260,
    height: 48,
    fontSize: 24,
    color: DEFAULT_TEXT_COLOR,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 700n,
    align: "left",
    zIndex: nextZIndex(side),
    ...partial,
  };
}

export function makeLogo(
  side: CanvasSide,
  url: string,
  partial: Partial<LogoState> = {},
): LogoState {
  return {
    id: newId("logo"),
    url,
    x: 40,
    y: 40,
    width: 120,
    height: 120,
    zIndex: nextZIndex(side),
    ...partial,
  };
}

export function makeQrCode(
  side: CanvasSide,
  partial: Partial<QrCodeState> = {},
): QrCodeState {
  return {
    id: newId("qr"),
    x: 40,
    y: 40,
    size: 110,
    url: DYNAMIC_QR_PLACEHOLDER,
    mode: QrMode.DynamicTracking,
    foreground: "#0f172a",
    background: "#ffffff",
    caption: undefined,
    zIndex: nextZIndex(side),
    ...partial,
  };
}

/** Keeps an element's origin inside the canvas bounds. */
export function clampToCanvas(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, canvasW - w)),
    y: Math.min(Math.max(0, y), Math.max(0, canvasH - h)),
  };
}

/** Builds a canvas from a gallery template (front side only). */
export function canvasFromTemplate(
  template: DesignTemplate,
  layoutVariant: string,
  orientation: Orientation = "native",
): CanvasState {
  const base = emptyCanvasState(layoutVariant, orientation);
  const dims = getLayoutDims(layoutVariant, orientation);
  const front: CanvasSide = {
    ...base.front,
    backgroundColor: template.backgroundColor,
  };
  const textBlocks = template.textBlocks.map((tb, i) =>
    makeTextBlock(front, {
      text: tb.text,
      x: Math.max(24, (tb.x / 100) * dims.designWidth),
      y: Math.max(24, (tb.y / 100) * dims.designHeight),
      width: Math.round(dims.designWidth * 0.6),
      height: Math.round(tb.fontSize * 2.2),
      fontSize: tb.fontSize * 1.4,
      color: tb.color,
      fontWeight: i === 0 ? 800n : 600n,
      zIndex: BigInt(i + 1),
    }),
  );
  const qrCodes = template.hasQrCode
    ? [
        makeQrCode(front, {
          x: dims.designWidth - 150,
          y: dims.designHeight - 150,
          size: 110,
          zIndex: BigInt(textBlocks.length + 1),
        }),
      ]
    : [];
  return { ...base, front: { ...front, textBlocks, qrCodes } };
}

export function getSide(canvas: CanvasState, key: CanvasSideKey): CanvasSide {
  return key === "front" ? canvas.front : canvas.back;
}

export function withSide(
  canvas: CanvasState,
  key: CanvasSideKey,
  side: CanvasSide,
): CanvasState {
  return key === "front"
    ? { ...canvas, front: side }
    : { ...canvas, back: side };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of every element on a side, or null for an empty side. */
function contentBox(side: CanvasSide): Box | null {
  const boxes: Box[] = [
    ...side.textBlocks.map((t) => ({
      x: t.x,
      y: t.y,
      w: t.width,
      h: t.height,
    })),
    ...side.logos.map((l) => ({ x: l.x, y: l.y, w: l.width, h: l.height })),
    ...side.qrCodes.map((q) => ({ x: q.x, y: q.y, w: q.size, h: q.size })),
  ];
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * Where a span of `size` (was `oldSize` at `pos`) starts in the new frame: it
 * keeps its share of the free travel inside the reference box, so content
 * resting on a guide stays on it and centred content stays centred.
 */
function placeSpan(
  pos: number,
  oldSize: number,
  size: number,
  from: { start: number; len: number },
  to: { start: number; len: number },
): number {
  const travel = from.len - oldSize;
  const share = Math.abs(travel) < 1e-9 ? 0.5 : (pos - from.start) / travel;
  return to.start + share * (to.len - size);
}

/**
 * Type size for a text block whose box is scaled down by `scale`. Scaling
 * the type by the same factor is not enough: the block's padding does not
 * scale, and presets fit headlines tight to their line count, so the text
 * would re-wrap and spill. Takes the largest size at or below the scaled one
 * that keeps the block's line count and fits its scaled band.
 */
function scaledFontSize(
  block: TextBlockState,
  width: number,
  height: number,
  scale: number,
): number {
  const spec = {
    fontWeight: Number(block.fontWeight),
    fontFamily: block.fontFamily,
  };
  const lines = countLines(block.text, {
    ...spec,
    width: block.width,
    fontSize: block.fontSize,
  });
  // Only hold the band to its height if the text fitted it to begin with.
  const fitted =
    bandHeight(lines, { ...spec, fontSize: block.fontSize }) <= block.height;
  const fits = (size: number) =>
    countLines(block.text, { ...spec, width, fontSize: size }) <= lines &&
    (!fitted || bandHeight(lines, { ...spec, fontSize: size }) <= height);
  let size = Math.round(block.fontSize * scale * 10) / 10;
  while (size > 1 && !fits(size)) {
    size = Math.max(1, Math.round(size * 0.97 * 10) / 10);
  }
  return size;
}

/**
 * Re-lays one side for a turned artboard. The side's elements move as one
 * group, so their sizes, spacing and stacking never change relative to each
 * other and no two blocks can collide. The group keeps its place relative
 * to the safe area (or to the trim, when it already reached into the bleed)
 * and is scaled down uniformly, type size included, only when it no longer
 * fits there.
 */
function relayoutSide(
  side: CanvasSide,
  from: LayoutDims,
  to: LayoutDims,
): CanvasSide {
  const group = contentBox(side);
  if (!group) return side;
  const fromSafe = safeRect(from);
  const inSafe =
    group.x >= fromSafe.x - 0.5 &&
    group.y >= fromSafe.y - 0.5 &&
    group.x + group.w <= fromSafe.x + fromSafe.w + 0.5 &&
    group.y + group.h <= fromSafe.y + fromSafe.h + 0.5;
  const trim = (d: LayoutDims): Box => ({
    x: 0,
    y: 0,
    w: d.designWidth,
    h: d.designHeight,
  });
  const ref = inSafe ? fromSafe : trim(from);
  const target = inSafe ? safeRect(to) : trim(to);
  const scale = Math.min(1, target.w / group.w, target.h / group.h);
  const gx = placeSpan(
    group.x,
    group.w,
    group.w * scale,
    { start: ref.x, len: ref.w },
    { start: target.x, len: target.w },
  );
  const gy = placeSpan(
    group.y,
    group.h,
    group.h * scale,
    { start: ref.y, len: ref.h },
    { start: target.y, len: target.h },
  );
  const mapX = (x: number) => gx + (x - group.x) * scale;
  const mapY = (y: number) => gy + (y - group.y) * scale;
  return {
    ...side,
    textBlocks: side.textBlocks.map((t) => ({
      ...t,
      x: mapX(t.x),
      y: mapY(t.y),
      width: t.width * scale,
      height: t.height * scale,
      fontSize:
        scale < 1
          ? scaledFontSize(t, t.width * scale, t.height * scale, scale)
          : t.fontSize,
    })),
    logos: side.logos.map((l) => ({
      ...l,
      x: mapX(l.x),
      y: mapY(l.y),
      width: l.width * scale,
      height: l.height * scale,
    })),
    qrCodes: side.qrCodes.map((q) => ({
      ...q,
      x: mapX(q.x),
      y: mapY(q.y),
      size: q.size * scale,
    })),
  };
}

/**
 * Turns the artboard between the product's own orientation and the rotated
 * one: width and height swap and both sides are re-laid for the new frame
 * (see `relayoutSide`). Backgrounds cover the artboard, so they need no
 * change. The store keeps the canvas from before the turn, so turning back
 * without editing in between restores it exactly.
 */
export function rotateCanvasState(
  canvas: CanvasState,
  from: LayoutDims,
  to: LayoutDims,
): CanvasState {
  return {
    ...canvas,
    widthInches: to.widthInches,
    heightInches: to.heightInches,
    front: relayoutSide(canvas.front, from, to),
    back: relayoutSide(canvas.back, from, to),
  };
}

/** Counts every placed element across both sides. */
export function elementCount(canvas: CanvasState): number {
  const count = (s: CanvasSide) =>
    s.textBlocks.length + s.logos.length + s.qrCodes.length;
  return count(canvas.front) + count(canvas.back);
}
