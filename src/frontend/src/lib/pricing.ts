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
const BOND = "White 24#";
const WINDOW_10 = "#10 Double Window";
const BOTH_SIDES = "Printing both sides";
const POSTCARD_LAYOUT = "Double Sided Postcard";
const LETTER_LAYOUT = "Address on Separate Page";
const EDDM_LAYOUT = "EDDM Self Mailer";

/**
 * Click2Mail catalog — one row per size on the Click2Mail product sheet, with
 * `documentClass` equal to the exact Click2Mail product name. Retail prices
 * keep the EZmailout 100–140 % spread over Click2Mail cost; rows marked
 * "tier" reuse the ledger tier of the closest priced format until the rate
 * card confirms them.
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
    layout: LETTER_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: WINDOW_10,
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
    layout: LETTER_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: WINDOW_10,
    baseCostCents: 80, // tier: letter + legal stock
    retailPriceCents: 170,
    widthInches: 8.5,
    heightInches: 14,
  },
  {
    layoutVariant: "certified_self_mailer",
    productType: ProductType.CertifiedMail,
    displayName: "Certified Self Mailer 8.5×11",
    documentClass: "Certified Self Mailer 8.5 x 11",
    layout: "Certified Self Mailer",
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 895, // tier: certified postage
    retailPriceCents: 1795,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "certified_green_card",
    productType: ProductType.CertifiedMail,
    displayName: "Certified Self Mailer with Green Card",
    documentClass: "Certified Self Mailer With Green Card",
    layout: "Certified Self Mailer",
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 1295, // tier: certified + return receipt
    retailPriceCents: 2595,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "certified_letter",
    productType: ProductType.CertifiedMail,
    displayName: "Certified Letter 8.5×11",
    documentClass: "Certified Letter 8.5 x 11",
    layout: LETTER_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: WINDOW_10,
    baseCostCents: 925, // tier: certified postage
    retailPriceCents: 1850,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "eddm_6.25x11",
    productType: ProductType.Eddm,
    displayName: "EDDM® Mailer 6.25×11",
    documentClass: "EDDM® Mailer 6.25 x 11",
    layout: EDDM_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 45, // tier: EDDM saturation postage
    retailPriceCents: 95,
    widthInches: 11,
    heightInches: 6.25,
  },
  {
    layoutVariant: "eddm_6.5x9",
    productType: ProductType.Eddm,
    displayName: "EDDM® Mailer 6.5×9",
    documentClass: "EDDM® Mailer 6.5 x 9",
    layout: EDDM_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 43, // tier: EDDM saturation postage
    retailPriceCents: 90,
    widthInches: 9,
    heightInches: 6.5,
  },
  {
    layoutVariant: "eddm_8.5x11",
    productType: ProductType.Eddm,
    displayName: "EDDM® Mailer 8.5×11",
    documentClass: "EDDM® Mailer 8.5 x 11",
    layout: EDDM_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 48, // tier: EDDM saturation postage
    retailPriceCents: 99,
    widthInches: 11,
    heightInches: 8.5,
  },
  {
    layoutVariant: "eddm_8.5x12",
    productType: ProductType.Eddm,
    displayName: "EDDM® Mailer 8.5×12",
    documentClass: "EDDM® Mailer 8.5 x 12",
    layout: EDDM_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 52, // tier: EDDM saturation postage
    retailPriceCents: 109,
    widthInches: 12,
    heightInches: 8.5,
  },
  {
    layoutVariant: "priority_letter",
    productType: ProductType.PriorityMail,
    displayName: "Priority Letter 8.5×11",
    documentClass: "Priority Letter 8.5 x 11",
    layout: LETTER_LAYOUT,
    mailClass: MailClass.Priority,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 995, // tier: Priority Mail postage
    retailPriceCents: 1995,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "priority_express_letter",
    productType: ProductType.PriorityMailExpress,
    displayName: "Priority Mail® Express Letter 8.5×11",
    documentClass: "Priority Mail® Express Letters 8.5 x 11",
    layout: LETTER_LAYOUT,
    mailClass: MailClass.PriorityExpress,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 2995, // tier: Priority Mail Express postage
    retailPriceCents: 5995,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "8.5x11_flyer",
    productType: ProductType.Flyer,
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
    layoutVariant: "11x8.5_brochure",
    productType: ProductType.Brochure,
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
    layoutVariant: "notecard_4.25x5.5",
    productType: ProductType.Notecard,
    displayName: "4.25×5.5 Notecard",
    documentClass: "Notecard 4.25 x 5.5",
    layout: "Flat Notecard",
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 62, // tier: postcard + envelope
    retailPriceCents: 130,
    widthInches: 5.5,
    heightInches: 4.25,
  },
  {
    layoutVariant: "folded_notecard_4.25x5.5",
    productType: ProductType.Notecard,
    displayName: "4.25×5.5 Folded Notecard",
    documentClass: "Folded Notecard 4.25 x 5.5",
    layout: "Folded Notecard",
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 85, // tier: folded card + envelope
    retailPriceCents: 180,
    widthInches: 5.5,
    heightInches: 4.25,
  },
  {
    layoutVariant: "rack_card_4x9",
    productType: ProductType.RackCard,
    displayName: "4×9 Rack Card",
    documentClass: "Rack Card 4 x 9",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 57, // tier: 4×9 postcard
    retailPriceCents: 135,
    widthInches: 4,
    heightInches: 9,
  },
  {
    layoutVariant: "reply_postcard_4.25x6",
    productType: ProductType.ReplyMail,
    displayName: "4.25×6 Reply Postcard",
    documentClass: "Reply Postcard 4.25 x 6",
    layout: "Business Reply Postcard",
    mailClass: MailClass.FirstClass,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 75, // tier: postcard + reply postage
    retailPriceCents: 160,
    widthInches: 6,
    heightInches: 4.25,
  },
  {
    layoutVariant: "reply_letter",
    productType: ProductType.ReplyMail,
    displayName: "8.5×11 Reply Letter",
    documentClass: "Reply Letter 8.5 x 11",
    layout: LETTER_LAYOUT,
    mailClass: MailClass.FirstClass,
    paperType: BOND,
    printOption: BOTH_SIDES,
    envelope: WINDOW_10,
    baseCostCents: 95, // tier: letter + reply envelope
    retailPriceCents: 200,
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
  {
    layoutVariant: "booklet_address_back",
    productType: ProductType.Booklet,
    displayName: "8.5×11 Booklet · Address Back Page",
    documentClass: "Booklet Address Back Page 8.5 x 11",
    layout: "Address on Back Page",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 175, // tier: booklet + cover page
    retailPriceCents: 385,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "booklet_address_front",
    productType: ProductType.Booklet,
    displayName: "8.5×11 Booklet · Address Front Page",
    documentClass: "Booklet Address Front Page 8.5 x 11",
    layout: "Address on Front Page",
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 175, // tier: booklet + cover page
    retailPriceCents: 385,
    widthInches: 8.5,
    heightInches: 11,
  },
  {
    layoutVariant: "card_stock_12x4.5",
    productType: ProductType.CardStock,
    displayName: "12×4.5 Card Stock",
    documentClass: "Card Stock Paper 12 x 4.5",
    layout: POSTCARD_LAYOUT,
    mailClass: MailClass.MarketingMail,
    paperType: GLOSS,
    printOption: BOTH_SIDES,
    envelope: null,
    baseCostCents: 60, // tier: 6×9 postcard
    retailPriceCents: 130,
    widthInches: 12,
    heightInches: 4.5,
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
  certified_self_mailer: 2450,
  certified_green_card: 3350,
  certified_letter: 2495,
  "eddm_6.25x11": 135,
  "eddm_6.5x9": 125,
  "eddm_8.5x11": 145,
  "eddm_8.5x12": 155,
  priority_letter: 2650,
  priority_express_letter: 7900,
  "8.5x11_flyer": 295,
  "8.5x11_secure": 275,
  "11x8.5_brochure": 295,
  "notecard_4.25x5.5": 195,
  "folded_notecard_4.25x5.5": 265,
  rack_card_4x9: 185,
  "reply_postcard_4.25x6": 225,
  reply_letter: 275,
  "8.5x11_booklet": 495,
  booklet_address_back: 525,
  booklet_address_front: 525,
  "card_stock_12x4.5": 195,
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

/** Letter-style products Click2Mail prints in black and white on request (mirrors `PricingLib.supportsBlackAndWhite`). */
export function supportsBlackAndWhite(productType: ProductType): boolean {
  return (
    productType === ProductType.Letter ||
    productType === ProductType.CertifiedMail ||
    productType === ProductType.PriorityMail ||
    productType === ProductType.PriorityMailExpress ||
    productType === ProductType.ReplyMail
  );
}

/** Products whose address side carries the USPS address block and IMb barcode. */
export function hasAddressSide(productType: ProductType): boolean {
  return (
    productType === ProductType.Postcard ||
    productType === ProductType.Eddm ||
    productType === ProductType.RackCard ||
    productType === ProductType.ReplyMail ||
    productType === ProductType.CardStock
  );
}

/** Human label for a USPS mail class. */
export function mailClassLabel(mailClass: MailClass): string {
  switch (mailClass) {
    case MailClass.FirstClass:
      return "First-Class";
    case MailClass.MarketingMail:
      return "Marketing Mail";
    case MailClass.Priority:
      return "Priority Mail";
    case MailClass.PriorityExpress:
      return "Priority Mail Express";
    default:
      return String(mailClass);
  }
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
