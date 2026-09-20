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
