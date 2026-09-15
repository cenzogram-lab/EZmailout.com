/** Live retail margin pricing ledger for MailCommand products. */
export const PRODUCT_PRICES: Record<string, number> = {
  "4x6": 0.95,
  "6x9": 1.35,
  "6x11": 1.75,
  letter: 1.5,
  "6x18_bifold": 2.1,
  "11x17_trifold": 2.1,
};

/**
 * Returns the per-address price for the given layout variant.
 * Returns 0 if the variant is not in the pricing ledger.
 */
export function getPrice(layoutVariant: string): number {
  return PRODUCT_PRICES[layoutVariant] ?? 0;
}

/**
 * Formats a dollar amount (e.g. 1.95) as a USD currency string (e.g. "$1.95").
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
