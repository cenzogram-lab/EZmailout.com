import type { PrintSpec } from "@/backend";
import {
  COLOR_BW,
  COLOR_FULL,
  PRODUCTION_TIME,
  getPricingRow,
  supportsBlackAndWhite,
} from "@/lib/pricing";

/** Design-canvas resolution: canvas coordinates are stored at 100 px per inch. */
export const DESIGN_PPI = 100;

/** Print-ready raster resolution used when exporting the PDF for Click2Mail. */
export const RASTER_DPI = 300;

/**
 * Click2Mail print guides. The canvas is the finished document size, so:
 *  - cut line   = the canvas edge (0″) — where the press trims;
 *  - bleed zone = the outer 1/8″ — backgrounds must run through it to the
 *    edge, anything else inside it may be trimmed off;
 *  - safe zone  = 1/4″ inside the edge — keep text, logos and QR codes here.
 */
export const CUT_INSET_INCHES = 0;
export const BLEED_INSET_INCHES = 0.125;
export const SAFE_INSET_INCHES = 0.25;

/** USPS address block + Intelligent Mail barcode clear zone on postcard backs. */
export const ADDRESS_ZONE_TOP_PCT = 0.38;

export interface AddressZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutDims {
  layoutVariant: string;
  widthInches: number;
  heightInches: number;
  /** Canvas width in design pixels (`widthInches * DESIGN_PPI`). */
  designWidth: number;
  /** Canvas height in design pixels (`heightInches * DESIGN_PPI`). */
  designHeight: number;
  /** Guide insets from the canvas edge, in inches. */
  cutInsetInches: number;
  bleedInsetInches: number;
  safeInsetInches: number;
  hasBackSide: boolean;
  /** Reserved USPS address / indicia area on postcard backs (design px). */
  addressZone?: AddressZone;
  /** True when the design is turned 90° from the product's own orientation. */
  rotated: boolean;
  /** The printed piece as Click2Mail produces it, whatever the design's orientation. */
  nativeWidthInches: number;
  nativeHeightInches: number;
}

/**
 * How the design sits on the piece. `native` follows the product (its
 * width × height in the Click2Mail name order); `rotated` turns the view of
 * the whole sheet a quarter turn counter-clockwise, so width and height swap.
 * The printed piece never changes: the export turns rotated pages back onto
 * the native page (see `toNativePage` in `lib/rasterize.ts`).
 */
export type Orientation = "native" | "rotated";

const FALLBACK_VARIANT = "6x9";

/**
 * Maps a rectangle on the native sheet into the rotated view. The view is the
 * sheet turned a quarter turn counter-clockwise: the native top edge becomes
 * the left edge and the native right edge becomes the top.
 * `sheetWidth` is the native width, in the rectangle's units.
 */
export function rotateRect(
  r: { x: number; y: number; w: number; h: number },
  sheetWidth: number,
): { x: number; y: number; w: number; h: number } {
  return { x: r.y, y: sheetWidth - r.x - r.w, w: r.h, h: r.w };
}

/** Canvas dimensions and print guides for a layout variant. */
export function getLayoutDims(
  layoutVariant: string,
  orientation: Orientation = "native",
): LayoutDims {
  const row = getPricingRow(layoutVariant) ?? getPricingRow(FALLBACK_VARIANT);
  const nativeWidthInches = row?.widthInches ?? 9;
  const nativeHeightInches = row?.heightInches ?? 6;
  const rotated =
    orientation === "rotated" && nativeWidthInches !== nativeHeightInches;
  const widthInches = rotated ? nativeHeightInches : nativeWidthInches;
  const heightInches = rotated ? nativeWidthInches : nativeHeightInches;
  const designWidth = Math.round(widthInches * DESIGN_PPI);
  const designHeight = Math.round(heightInches * DESIGN_PPI);
  const dims: LayoutDims = {
    layoutVariant: row?.id ?? layoutVariant,
    widthInches,
    heightInches,
    designWidth,
    designHeight,
    cutInsetInches: CUT_INSET_INCHES,
    bleedInsetInches: BLEED_INSET_INCHES,
    safeInsetInches: SAFE_INSET_INCHES,
    hasBackSide: true,
    rotated,
    nativeWidthInches,
    nativeHeightInches,
  };
  if (row?.hasAddressBlock) {
    // USPS reserves the lower-right area of the native address side for the
    // delivery address, postage indicia and IMb barcode. Click2Mail prints
    // there whatever the design's orientation, so a rotated view shows the
    // same patch of the sheet in its turned position.
    const nativeW = Math.round(nativeWidthInches * DESIGN_PPI);
    const nativeH = Math.round(nativeHeightInches * DESIGN_PPI);
    const x = Math.round(nativeW / 2);
    const y = Math.round(nativeH * ADDRESS_ZONE_TOP_PCT);
    const zone = { x, y, w: nativeW - x, h: nativeH - y };
    dims.addressZone = rotated ? rotateRect(zone, nativeW) : zone;
  }
  return dims;
}

/** Whether a canvas is laid out turned from its product's own orientation. */
export function orientationOf(
  canvas: { widthInches: number; heightInches: number },
  layoutVariant: string,
): Orientation {
  const native = getLayoutDims(layoutVariant);
  const near = (a: number, b: number) => Math.abs(a - b) < 0.001;
  return native.widthInches !== native.heightInches &&
    near(canvas.widthInches, native.heightInches) &&
    near(canvas.heightInches, native.widthInches)
    ? "rotated"
    : "native";
}

/** Dimensions of a canvas as laid out, orientation included. */
export function canvasDims(
  canvas: { widthInches: number; heightInches: number },
  layoutVariant: string,
): LayoutDims {
  return getLayoutDims(layoutVariant, orientationOf(canvas, layoutVariant));
}

/** "Portrait", "Landscape" or "Square" for the design as laid out. */
export function orientationName(dims: LayoutDims): string {
  if (dims.widthInches === dims.heightInches) return "Square";
  return dims.widthInches > dims.heightInches ? "Landscape" : "Portrait";
}

/** Rectangle inset from every canvas edge by `inches`, in design px. */
export function insetRect(
  dims: LayoutDims,
  inches: number,
): { x: number; y: number; w: number; h: number } {
  const inset = inches * DESIGN_PPI;
  return {
    x: inset,
    y: inset,
    w: dims.designWidth - inset * 2,
    h: dims.designHeight - inset * 2,
  };
}

/** Safe-zone rectangle (design px) — every element should sit inside it. */
export function safeRect(dims: LayoutDims): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return insetRect(dims, dims.safeInsetInches);
}

/**
 * Click2Mail print specification for a layout variant, mirroring what the
 * backend derives in `createCampaign`. `colorOption === "bw"` switches letters
 * to black and white.
 */
export function getPrintSpec(
  layoutVariant: string,
  colorOption?: string | null,
): PrintSpec {
  const row = getPricingRow(layoutVariant) ?? getPricingRow(FALLBACK_VARIANT);
  if (!row) {
    throw new Error(`Unknown layout variant: ${layoutVariant}`);
  }
  const bw = supportsBlackAndWhite(row.productType) && colorOption === "bw";
  const spec: PrintSpec = {
    documentClass: row.documentClass,
    layout: row.layout,
    mailClass: row.mailClass,
    paperType: row.paperType,
    productionTime: PRODUCTION_TIME,
    color: bw ? COLOR_BW : COLOR_FULL,
    printOption: row.printOption,
  };
  if (row.envelope) {
    spec.envelope = row.envelope;
  }
  return spec;
}
