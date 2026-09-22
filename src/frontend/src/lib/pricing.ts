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
const POSTCARD_LAYOUT = "Double Sided Postcard";

/**
 * Click2Mail catalog (document class = the exact Click2Mail product name):
 * Postcards 3.5×5 · 4.25×6 · 4×9 · 5×8 · 6×9 · 6×11, Letters 8.5×11 · 8.5×14,
 * Flyer 8.5×11 (bifold self-mailer), Brochure 11×8.5 (trifold), Secure Self
 * Mailer 8.5×11, Booklet Self Mailer 8.5×11.
 *
 * Retail prices follow the EZmailout ledger (100–140 % over Click2Mail cost).
 * Rows marked "tier" reuse the ledger tier of the closest priced format.
 */
export const PRICING_LEDGER: PricingRowUi[] = [
  {
    layoutVariant: "3.5x5",
    productType: ProductType.Postcard,
    displayName: "3.5×5 Mini Postcard",
    documentClass: "Postcard 3.5 x 5",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 55, // tier: 4.25×6
    retailPriceCents: 115,
    widthInches: 5,
    heightInches: 3.5,
  },
  {
    layoutVariant: "4.25x6",
    productType: ProductType.Postcard,
    displayName: "4.25×6 Postcard",
    documentClass: "Postcard 4.25 x 6",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 55,
    retailPriceCents: 115,
    widthInches: 6,
    heightInches: 4.25,
  },
  {
    layoutVariant: "4x9",
    productType: ProductType.Postcard,
    displayName: "4×9 Slim Postcard",
    documentClass: "Postcard 4 x 9",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 57, // tier: 6×9
    retailPriceCents: 135,
    widthInches: 9,
    heightInches: 4,
  },
  {
    layoutVariant: "5x8",
    productType: ProductType.Postcard,
    displayName: "5×8 Postcard",
    documentClass: "Postcard 5 x 8",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 57, // tier: 6×9
    retailPriceCents: 135,
    widthInches: 8,
    heightInches: 5,
  },
  {
    layoutVariant: "6x9",
    productType: ProductType.Postcard,
    displayName: "6×9 Postcard",
    documentClass: "Postcard 6 x 9",
    layout: POSTCARD_LAYOUT,
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
    layout: POSTCARD_LAYOUT,
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
    layoutVariant: "letter_legal",
    productType: ProductType.Letter,
    displayName: "8.5×14 Legal Letter",
    documentClass: "Letter 8.5 x 14",
    layout: "Address on Separate Page",
    mailClass: MailClass.FirstClass,
    paperType: "White 24#",
    printOption: BOTH_SIDES,
    envelope: "#10 Double Window",
    baseCostCents: 80, // tier: letter + legal stock
    retailPriceCents: 170,
    widthInches: 8.5,
    heightInches: 14,
  },
  {
    layoutVariant: "8.5x11_flyer",
    productType: ProductType.SelfMailer,
    displayName: "8.5×11 Flyer (bifold self-mailer)",
    documentClass: "Flyer 8.5 x 11",
    layout: "Bifold Self-Mailer",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 95,
    retailPriceCents: 210,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "11x8.5_brochure",
    productType: ProductType.SelfMailer,
    displayName: "11×8.5 Brochure (trifold self-mailer)",
    documentClass: "Brochure 11 x 8.5",
    layout: "Trifold Self-Mailer",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 95,
    retailPriceCents: 210,
    widthInches: 11,
    heightInches: 8.5,
  },
  {
    layoutVariant: "8.5x11_secure",
    productType: ProductType.SnapPack,
    displayName: "8.5×11 Secure Self Mailer",
    documentClass: "Secure Self Mailer 8.5 x 11",
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
    layoutVariant: "8.5x11_booklet",
    productType: ProductType.Booklet,
    displayName: "8.5×11 Booklet Self Mailer",
    documentClass: "Booklet Self Mailer 8.5 x 11",
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

/**
 * Layout variants that shipped before the Click2Mail catalog audit. Campaign
 * records and templates created with these keys resolve to the current row
 * (`src/backend/lib/pricing.mo` keeps the same table).
 */
export const LEGACY_LAYOUT_VARIANTS: Record<string, string> = {
  "4x6": "4.25x6",
  "6x18_bifold": "8.5x11_flyer",
  "11x17_trifold": "11x8.5_brochure",
  "8.5x11_perforated": "8.5x11_secure",
  multi_page: "8.5x11_booklet",
};

/** Canonical layout variant for a (possibly legacy) key. */
export function normalizeLayoutVariant(layoutVariant: string): string {
  return LEGACY_LAYOUT_VARIANTS[layoutVariant] ?? layoutVariant;
}

/** Monthly EZmailout subscription price ($9.00). */
export const SUBSCRIPTION_PRICE_CENTS = 900;

/** Typical local print-shop + postage price per piece, for the savings calculator. */
export const PRINT_SHOP_BENCHMARK_CENTS: Record<string, number> = {
  "3.5x5": 150,
  "4.25x6": 150,
  "4x9": 185,
  "5x8": 185,
  "6x9": 185,
  "6x11": 225,
  letter: 210,
  letter_legal: 240,
  "8.5x11_flyer": 295,
  "11x8.5_brochure": 295,
  "8.5x11_secure": 275,
  "8.5x11_booklet": 495,
};

export const PRODUCTION_TIME = "Next Day";
export const COLOR_FULL = "Full Color";
export const COLOR_BW = "Black and White";

/** Finds the ledger row for a layout variant. */
export function getPricingRow(layoutVariant: string): PricingRowUi | undefined {
  const key = normalizeLayoutVariant(layoutVariant);
  return PRICING_LEDGER.find((row) => row.layoutVariant === key);
}

/** Ledger rows for one product type, in catalog order. */
export function getPricingRowsFor(productType: ProductType): PricingRowUi[] {
  return PRICING_LEDGER.filter((row) => row.productType === productType);
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
    PRINT_SHOP_BENCHMARK_CENTS[normalizeLayoutVariant(layoutVariant)] ??
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
