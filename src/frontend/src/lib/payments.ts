import { PaymentPurpose, PaymentState, type PaymentView } from "@/backend";
import { getCreditPack } from "@/lib/credits";

/** What a payment was for, in words ("Campaign: Spring sale", …). */
export function paymentLabel(p: PaymentView): string {
  if (p.purpose === PaymentPurpose.CampaignOrder) {
    return p.campaignName
      ? `Campaign: ${p.campaignName}`
      : `Campaign ${p.campaignId ?? ""}`.trim();
  }
  if (p.purpose === PaymentPurpose.CreditPack) {
    const pack = p.creditPack ? getCreditPack(p.creditPack) : undefined;
    return pack ? `AI credits: ${pack.name}` : "AI credits";
  }
  return p.state === PaymentState.Waived && p.amountCents === 0n
    ? "30-day membership (free month)"
    : "30-day membership";
}

/** The amount still refundable on a payment, in cents. */
export function refundableCents(p: PaymentView): bigint {
  if (p.state !== PaymentState.Succeeded || p.testMode) return 0n;
  return p.amountCents > p.refundedCents ? p.amountCents - p.refundedCents : 0n;
}
