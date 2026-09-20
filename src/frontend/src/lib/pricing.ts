import { MailClass, ProductType } from "@/backend";

/**
 * Retail pricing ledger for EZmailout products. Mirrors the authoritative
 * copy in `src/backend/lib/pricing.mo` — keep the two in sync.
 */
export interface PricingRowUi {
  layoutVariant: string;
  productType: ProductType;
  displayName: string;
  documentClass: string;
  layout: string;
  mailClass: MailClass;
  paperType: string;
  printOption: string;
  envelope: string | null;
  baseCostCents: number;
  retailPriceCents: number;
  widthInches: number;
  heightInches: number;
}

const GLOSS = "White Matte with Gloss UV Finish";
const BOTH_SIDES = "Printing both sides";

export const PRICING_LEDGER: PricingRowUi[] = [
  {
    layoutVariant: "4x6",
    productType: ProductType.Postcard,
    displayName: "4×6 Postcard",
    documentClass: "Postcard 4 x 6",
    layout: "Double Sided Postcard",
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 55,
    retailPriceCents: 115,
    widthInches: 6,
    heightInches: 4,
  },
  {
    layoutVariant: "6x9",
    productType: ProductType.Postcard,
    displayName: "6×9 Postcard",
    documentClass: "Postcard 6 x 9",
    layout: "Double Sided Postcard",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 57,
    retailPriceCents: 135,
    widthInches: 9,
    heightInches: 6,
  },
  {
    layoutVariant: "6x11",
    productType: ProductType.Postcard,
    displayName: "6×11 Jumbo Postcard",
    documentClass: "Postcard 6 x 11",
    layout: "Double Sided Postcard",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 73,
    retailPriceCents: 165,
    widthInches: 11,
    heightInches: 6,
  },
  {
    layoutVariant: "letter",
    productType: ProductType.Letter,
    displayName: "8.5×11 Letter",
    documentClass: "Letter 8.5 x 11",
    layout: "Address on Separate Page",
    mailClass: MailClass.FirstClass,
    paperType: "White 24#",
    printOption: BOTH_SIDES,
    envelope: "#10 Double Window",
    baseCostCents: 70,
    retailPriceCents: 150,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "6x18_bifold",
    productType: ProductType.SelfMailer,
    displayName: "6×18 Bifold Self-Mailer",
    documentClass: "Self-Mailer 6 x 18",
    layout: "Bifold Self-Mailer",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 95,
    retailPriceCents: 210,
    widthInches: 18,
    heightInches: 6,
  },
  {
    layoutVariant: "11x17_trifold",
    productType: ProductType.SelfMailer,
    displayName: "11×17 Trifold Self-Mailer",
    documentClass: "Self-Mailer 11 x 17",
    layout: "Trifold Self-Mailer",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 95,
    retailPriceCents: 210,
    widthInches: 17,
    heightInches: 11,
  },
  {
    layoutVariant: "8.5x11_perforated",
    productType: ProductType.SnapPack,
    displayName: "Snap Pack Security Mailer",
    documentClass: "Secure Mailer 8.5 x 11",
    layout: "Pressure Seal Snap Pack",
    mailClass: MailClass.FirstClass,
    paperType: "White 28#",
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 85,
    retailPriceCents: 195,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "multi_page",
    productType: ProductType.Booklet,
    displayName: "Booklet",
    documentClass: "Booklet",
    layout: "Saddle Stitched Booklet",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 160,
    retailPriceCents: 360,
    widthInches: 8.5,
    heightInches: 11,
  },
];

/** Monthly EZmailout subscription price ($9.00). */
export const SUBSCRIPTION_PRICE_CENTS = 900;

/** Typical local print-shop + postage price per piece, for the savings calculator. */
export const PRINT_SHOP_BENCHMARK_CENTS: Record<string, number> = {
  "4x6": 150,
  "6x9": 185,
  "6x11": 225,
  letter: 210,
  "6x18_bifold": 295,
  "11x17_trifold": 295,
  "8.5x11_perforated": 275,
  multi_page: 495,
};

export const PRODUCTION_TIME = "Next Day";
export const COLOR_FULL = "Full Color";
export const COLOR_BW = "Black and White";

/** Finds the ledger row for a layout variant. */
export function getPricingRow(layoutVariant: string): PricingRowUi | undefined {
  return PRICING_LEDGER.find((row) => row.layoutVariant === layoutVariant);
}

/** Retail unit price in cents (0 when the variant is unknown). */
export function getUnitPriceCents(layoutVariant: string): number {
  return getPricingRow(layoutVariant)?.retailPriceCents ?? 0;
}

/** Retail unit price in dollars (0 when the variant is unknown). */
export function getPrice(layoutVariant: string): number {
  return getUnitPriceCents(layoutVariant) / 100;
}

/** Print-shop benchmark price in cents (falls back to the retail price). */
export function getBenchmarkCents(layoutVariant: string): number {
  return (
    PRINT_SHOP_BENCHMARK_CENTS[layoutVariant] ??
    getUnitPriceCents(layoutVariant)
  );
}

/** Gross margin in cents for a ledger row. */
export function marginCents(row: PricingRowUi): number {
  return row.retailPriceCents - row.baseCostCents;
}

/** Gross margin as a whole-number percentage of base cost (matches `lib/pricing.mo`). */
export function marginPercent(row: PricingRowUi): number {
  if (row.baseCostCents === 0) return 0;
  return Math.floor((marginCents(row) * 100) / row.baseCostCents);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** Formats a dollar amount (e.g. 1.15) as "$1.15". */
export function formatPrice(dollars: number): string {
  return usd.format(dollars);
}

/** Formats a cent amount (number or bigint from the backend) as "$1.15". */
export function formatCents(cents: number | bigint): string {
  return usd.format(Number(cents) / 100);
}
