import type { PrintSpec } from "@/backend";
import { ProductType } from "@/backend";
import {
  COLOR_BW,
  COLOR_FULL,
  PRODUCTION_TIME,
  getPricingRow,
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
}

const FALLBACK_VARIANT = "6x9";

/** Canvas dimensions and print guides for a layout variant. */
export function getLayoutDims(layoutVariant: string): LayoutDims {
  const row = getPricingRow(layoutVariant) ?? getPricingRow(FALLBACK_VARIANT);
  const widthInches = row?.widthInches ?? 9;
  const heightInches = row?.heightInches ?? 6;
  const designWidth = Math.round(widthInches * DESIGN_PPI);
  const designHeight = Math.round(heightInches * DESIGN_PPI);
  const dims: LayoutDims = {
    layoutVariant: row?.layoutVariant ?? layoutVariant,
    widthInches,
    heightInches,
    designWidth,
    designHeight,
    cutInsetInches: CUT_INSET_INCHES,
    bleedInsetInches: BLEED_INSET_INCHES,
    safeInsetInches: SAFE_INSET_INCHES,
    hasBackSide: true,
  };
  if (row?.productType === ProductType.Postcard) {
    // USPS reserves the lower-right area of the address side for the
    // delivery address, postage indicia and IMb barcode.
    const x = Math.round(designWidth / 2);
    const y = Math.round(designHeight * ADDRESS_ZONE_TOP_PCT);
    dims.addressZone = {
      x,
      y,
      w: designWidth - x,
      h: designHeight - y,
    };
  }
  return dims;
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
  const isLetter = row.productType === ProductType.Letter;
  const spec: PrintSpec = {
    documentClass: row.documentClass,
    layout: row.layout,
    mailClass: row.mailClass,
    paperType: row.paperType,
    productionTime: PRODUCTION_TIME,
    color: isLetter && colorOption === "bw" ? COLOR_BW : COLOR_FULL,
    printOption: row.printOption,
  };
  if (row.envelope) {
    spec.envelope = row.envelope;
  }
  return spec;
}
