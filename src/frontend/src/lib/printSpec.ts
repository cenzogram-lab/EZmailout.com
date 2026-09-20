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

/** Guide insets as a fraction of the shorter canvas side. */
export const BLEED_INSET_PCT = 0.04;
export const CUT_INSET_PCT = 0.08;
export const SAFE_INSET_PCT = 0.12;

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
  bleedInsetPct: number;
  cutInsetPct: number;
  safeInsetPct: number;
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
    bleedInsetPct: BLEED_INSET_PCT,
    cutInsetPct: CUT_INSET_PCT,
    safeInsetPct: SAFE_INSET_PCT,
    hasBackSide: true,
  };
  if (row?.productType === ProductType.Postcard) {
    const shorter = Math.min(designWidth, designHeight);
    const safe = shorter * SAFE_INSET_PCT;
    const x = Math.round(designWidth * 0.55);
    dims.addressZone = {
      x,
      y: Math.round(designHeight * 0.38),
      w: Math.round(designWidth - x - safe),
      h: Math.round(designHeight * 0.62 - safe),
    };
  }
  return dims;
}

/** Inset guide rectangle (bleed / cut / safe) in design px for a side. */
export function insetRect(
  dims: LayoutDims,
  pct: number,
): { x: number; y: number; w: number; h: number } {
  const inset = Math.min(dims.designWidth, dims.designHeight) * pct;
  return {
    x: inset,
    y: inset,
    w: dims.designWidth - inset * 2,
    h: dims.designHeight - inset * 2,
  };
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
