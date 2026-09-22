/** Brand constants and URL builders for EZmailout. */
export const BRAND = {
  name: "EZmailout",
  site: "EZmailout.com",
  domain: "https://ezmailout.com",
  trackingBase: "https://ezmailout.com/t/",
  trackingLongBase: "https://ezmailout.com/track/",
  referralBase: "https://ezmailout.com/ref/",
  supportEmail: "hello@ezmailout.com",
} as const;

/**
 * Placeholder embedded in dynamic QR codes at design time. The rasterizer
 * substitutes `{{recipientId}}` with the real `<campaignId>_<index>` id.
 */
export const DYNAMIC_QR_PLACEHOLDER = "https://ezmailout.com/t/{{recipientId}}";

/** Short tracking URL for a recipient id such as `cmp_12_7`. */
export function trackingUrlFor(recipientId: string): string {
  return `${BRAND.trackingBase}${recipientId}`;
}

/** Long-form tracking URL (`/track/{recipientId}`). */
export function trackingLongUrlFor(recipientId: string): string {
  return `${BRAND.trackingLongBase}${recipientId}`;
}

/** Referral landing URL for a referral code such as `EZ7K2P9Q`. */
export function referralUrlFor(code: string): string {
  return `${BRAND.referralBase}${code}`;
}

/** Builds the recipient id used in tracking URLs and CSV exports. */
export function recipientIdFor(campaignId: string, index: number): string {
  return `${campaignId}_${index}`;
}

/** A named colour in the studio swatch palette. */
export interface BrandSwatch {
  name: string;
  hex: string;
}

/**
 * Brand palette exposed by the design studio colour pickers (master spec:
 * BG/300, indigo primary, Geist ink + ice, studio reference navy / sky / lime).
 */
export const STUDIO_SWATCHES: BrandSwatch[] = [
  { name: "White", hex: "#ffffff" },
  { name: "BG/300", hex: "#f4f4f4" },
  { name: "Cloud", hex: "#f0f1f5" },
  { name: "Ice", hex: "#cff3fd" },
  { name: "Sky", hex: "#b5d8fc" },
  { name: "Lime", hex: "#dbefad" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Navy", hex: "#0e2b4f" },
  { name: "Ink", hex: "#01080a" },
];

/** Typefaces offered by the text inspector (Geist is the brand face). */
export const STUDIO_FONTS = [
  "Geist",
  "Geist Mono",
  "Georgia",
  "Times New Roman",
  "Arial",
] as const;
