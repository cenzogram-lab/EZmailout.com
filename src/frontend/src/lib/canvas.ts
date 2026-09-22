import type {
  CanvasSide,
  CanvasState,
  LogoState,
  QrCodeState,
  TextBlockState,
} from "@/backend";
import { QrMode } from "@/backend";
import { DYNAMIC_QR_PLACEHOLDER } from "@/lib/brand";
import { DESIGN_PPI, getLayoutDims } from "@/lib/printSpec";
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
export function emptyCanvasState(layoutVariant: string): CanvasState {
  const dims = getLayoutDims(layoutVariant);
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
): CanvasState {
  const base = emptyCanvasState(layoutVariant);
  const dims = getLayoutDims(layoutVariant);
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

/** Counts every placed element across both sides. */
export function elementCount(canvas: CanvasState): number {
  const count = (s: CanvasSide) =>
    s.textBlocks.length + s.logos.length + s.qrCodes.length;
  return count(canvas.front) + count(canvas.back);
}
