import { ProductType } from "@/backend";
import { getPricingRow } from "@/lib/pricing";

/** Formats a canister timestamp (nanoseconds since epoch, bigint) as a date-time string. */
export function formatTimestamp(ns: bigint | number, withTime = true): string {
  const ms = Number(BigInt(ns) / 1_000_000n);
  if (!ms) return "—";
  const d = new Date(ms);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

export function formatNumber(n: number | bigint): string {
  return Number(n).toLocaleString("en-US");
}

/** Short product-family label (e.g. "Postcard", "EDDM® Mailer"). */
export function productTypeLabel(productType: ProductType): string {
  switch (productType) {
    case ProductType.Postcard:
      return "Postcard";
    case ProductType.Letter:
      return "Letter";
    case ProductType.SelfMailer:
      return "Self-Mailer";
    case ProductType.SnapPack:
      return "Secure Mailer";
    case ProductType.Booklet:
      return "Booklet";
    case ProductType.CertifiedMail:
      return "Certified Mail™";
    case ProductType.Eddm:
      return "EDDM® Mailer";
    case ProductType.PriorityMail:
      return "Priority Mail® Plus";
    case ProductType.PriorityMailExpress:
      return "Priority Mail® Express";
    case ProductType.Flyer:
      return "Flyer";
    case ProductType.Notecard:
      return "Notecard";
    case ProductType.RackCard:
      return "Rack Card";
    case ProductType.Brochure:
      return "Brochure";
    case ProductType.ReplyMail:
      return "Reply Mail";
    case ProductType.CardStock:
      return "Card Stock";
    default:
      return String(productType);
  }
}

/** Human label for a layout variant (legacy keys resolve to the current row). */
export function layoutLabel(variant: string): string {
  const row = getPricingRow(variant);
  if (!row) return variant;
  const inches = `${row.widthInches}″ × ${row.heightInches}″`;
  switch (row.layoutVariant) {
    case "8.5x11_flyer":
      return `${inches} Flyer (bifold)`;
    case "11x8.5_brochure":
      return `${inches} Brochure (trifold)`;
    case "folded_notecard_4.25x5.5":
      return `${inches} Folded Notecard`;
    case "certified_green_card":
      return `${inches} Certified Self Mailer + Green Card`;
    case "booklet_address_back":
      return `${inches} Booklet (address back page)`;
    case "booklet_address_front":
      return `${inches} Booklet (address front page)`;
    default:
      return `${inches} ${productTypeLabel(row.productType)}`;
  }
}

/** Trim size such as `6″ × 4.25″` for a layout variant. */
export function sizeLabel(variant: string): string {
  const row = getPricingRow(variant);
  return row ? `${row.widthInches}″ × ${row.heightInches}″` : "";
}
