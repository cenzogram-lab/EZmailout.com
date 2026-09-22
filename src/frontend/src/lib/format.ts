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

/** Human label for a layout variant (legacy keys resolve to the current row). */
export function layoutLabel(variant: string): string {
  const row = getPricingRow(variant);
  if (!row) return variant;
  const inches = `${row.widthInches}″ × ${row.heightInches}″`;
  switch (row.productType) {
    case ProductType.Postcard:
      return `${inches} Postcard`;
    case ProductType.Letter:
      return `${inches} Letter`;
    case ProductType.SelfMailer:
      return row.layoutVariant === "8.5x11_flyer"
        ? `${inches} Flyer (bifold)`
        : `${inches} Brochure (trifold)`;
    case ProductType.SnapPack:
      return `${inches} Secure Mailer`;
    case ProductType.Booklet:
      return `${inches} Booklet`;
    default:
      return row.displayName;
  }
}

/** Trim size such as `6″ × 4.25″` for a layout variant. */
export function sizeLabel(variant: string): string {
  const row = getPricingRow(variant);
  return row ? `${row.widthInches}″ × ${row.heightInches}″` : "";
}
