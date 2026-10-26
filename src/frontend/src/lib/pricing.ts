import { MailClass, ProductType } from "@/backend";

/**
 * Print catalog mail classes. `StandardMarketing` is the catalog name for
 * USPS Marketing Mail; `catalogMailClassToWire` maps it onto the canister's
 * `MailClass.MarketingMail`.
 */
export type CatalogMailClass =
  | "FirstClass"
  | "StandardMarketing"
  | "Priority"
  | "PriorityExpress";

/** One print document class: its trim size, cost, retail price and print options. */
export interface ProductSpec {
  /** Layout-variant key persisted on campaign records. */
  id: string;
  /** Catalog category id (see `lib/catalog.ts`). */
  category: string;
  name: string;
  /** Exact print product name sent as `documentClass`. */
  documentClass: string;
  widthInches: number;
  heightInches: number;
  /** print wholesale cost per piece, in dollars. */
  cogsBase: number;
  /** List price per piece, in dollars (for tiered formats, under 1,000 pieces; see `VOLUME_TIERS`). */
  retailPrice: number;
  defaultMailClass: CatalogMailClass;
  supportedMailClasses: CatalogMailClass[];
  /**
   * True when the piece carries the USPS address block and IMb on the artwork
   * the customer designs, so the studio reserves the lower-right clear zone.
   * False for envelope-inserted formats, where the print partner generates the
   * address page or envelope instead.
   */
  hasAddressBlock: boolean;
  layout: string;
  paperType: string;
  envelope?: string;
  /** Operational note shown in the catalog and on the invoice. */
  note?: string;
  // ── derived ───────────────────────────────────────────────────────────────
  /** `cogsBase` in whole cents. */
  baseCostCents: number;
  /** `retailPrice` in whole cents. */
  retailPriceCents: number;
  /** Gross margin over cost, as a whole-number percentage. */
  marginPercent: number;
  productType: ProductType;
  mailClass: MailClass;
  printOption: string;
}

const BOTH_SIDES = "Printing both sides";

const PRODUCT_TYPES: Record<string, ProductType> = {
  postcards: ProductType.Postcard,
  letters: ProductType.Letter,
  "certified-mail": ProductType.CertifiedMail,
  eddm: ProductType.Eddm,
  "priority-mail-plus": ProductType.PriorityMail,
  "priority-mail-express": ProductType.PriorityMailExpress,
  flyers: ProductType.Flyer,
  "secure-mailers": ProductType.SnapPack,
  notecards: ProductType.Notecard,
  "rack-cards": ProductType.RackCard,
  brochures: ProductType.Brochure,
  "reply-mail": ProductType.ReplyMail,
  booklets: ProductType.Booklet,
  "card-stock": ProductType.CardStock,
};

/** Catalog mail class → the canister's wire enum. */
export function catalogMailClassToWire(mailClass: CatalogMailClass): MailClass {
  switch (mailClass) {
    case "FirstClass":
      return MailClass.FirstClass;
    case "StandardMarketing":
      return MailClass.MarketingMail;
    case "Priority":
      return MailClass.Priority;
    case "PriorityExpress":
      return MailClass.PriorityExpress;
    default:
      return MailClass.FirstClass;
  }
}

/** The canister's wire enum → catalog mail class. */
export function wireMailClassToCatalog(mailClass: MailClass): CatalogMailClass {
  switch (mailClass) {
    case MailClass.MarketingMail:
      return "StandardMarketing";
    case MailClass.Priority:
      return "Priority";
    case MailClass.PriorityExpress:
      return "PriorityExpress";
    default:
      return "FirstClass";
  }
}

type SpecInput = Omit<
  ProductSpec,
  | "baseCostCents"
  | "retailPriceCents"
  | "marginPercent"
  | "productType"
  | "mailClass"
  | "printOption"
>;

function spec(input: SpecInput): ProductSpec {
  const baseCostCents = Math.round(input.cogsBase * 100);
  const retailPriceCents = Math.round(input.retailPrice * 100);
  return {
    ...input,
    baseCostCents,
    retailPriceCents,
    marginPercent:
      baseCostCents === 0
        ? 0
        : Math.round(
            ((retailPriceCents - baseCostCents) * 100) / baseCostCents,
          ),
    productType: PRODUCT_TYPES[input.category] ?? ProductType.Postcard,
    mailClass: catalogMailClassToWire(input.defaultMailClass),
    printOption: BOTH_SIDES,
  };
}

/**
 * The authoritative print price matrix: 14 product families, 29 document
 * classes. Costs and retail prices are the operator's rates and are final —
 * the spread is deliberate retail positioning (standardised letter pricing,
 * carrier cost absorbed on Priority Express to stay competitive, higher margin
 * on self-mailers), so nothing here derives a price from a target band.
 *
 * Mirrored by `src/backend/lib/pricing.mo` — change both.
 */
export const PRICING_LEDGER: ProductSpec[] = [
  spec({
    id: "3.5x5",
    category: "postcards",
    name: "3.5 × 5 Mini Postcard",
    documentClass: "Postcard 3.5 x 5",
    widthInches: 3.5,
    heightInches: 5,
    cogsBase: 0.53,
    retailPrice: 1.1,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "4.25x6",
    category: "postcards",
    name: "4.25 × 6 Postcard",
    documentClass: "Postcard 4.25 x 6",
    widthInches: 4.25,
    heightInches: 6,
    cogsBase: 0.55,
    retailPrice: 0.79,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "4x9",
    category: "postcards",
    name: "4 × 9 Slim Postcard",
    documentClass: "Postcard 4 x 9",
    widthInches: 4,
    heightInches: 9,
    cogsBase: 0.55,
    retailPrice: 1.2,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "5x8",
    category: "postcards",
    name: "5 × 8 Postcard",
    documentClass: "Postcard 5 x 8",
    widthInches: 5,
    heightInches: 8,
    cogsBase: 0.54,
    retailPrice: 1.25,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "6x9",
    category: "postcards",
    name: "6 × 9 Postcard",
    documentClass: "Postcard 6 x 9",
    widthInches: 6,
    heightInches: 9,
    cogsBase: 0.57,
    retailPrice: 0.98,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing", "FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "6x11",
    category: "postcards",
    name: "6 × 11 Jumbo Postcard",
    documentClass: "Postcard 6 x 11",
    widthInches: 6,
    heightInches: 11,
    cogsBase: 0.73,
    retailPrice: 0.92,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing", "FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "letter",
    category: "letters",
    name: "8.5 × 11 Letter",
    documentClass: "Letter 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.59,
    retailPrice: 0.93,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    envelope: "#10 Double Window",
  }),
  spec({
    id: "letter_legal",
    category: "letters",
    name: "8.5 × 14 Legal Letter",
    documentClass: "Letter 8.5 x 14",
    widthInches: 8.5,
    heightInches: 14,
    cogsBase: 0.61,
    retailPrice: 1.65,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    envelope: "#10 Double Window",
  }),
  spec({
    id: "certified_self_mailer",
    category: "certified-mail",
    name: "Certified Self Mailer 8.5 × 11",
    documentClass: "Certified Self Mailer 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 6.45,
    retailPrice: 12.9,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Certified Self Mailer",
    paperType: "White 24#",
    note: "Includes the USPS Certified Mail fee and tracking.",
  }),
  spec({
    id: "certified_letter",
    category: "certified-mail",
    name: "Certified Letter 8.5 × 11",
    documentClass: "Certified Letter 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 6.66,
    retailPrice: 13.5,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    envelope: "#10 Double Window",
    note: "Includes the USPS Certified Mail fee and tracking.",
  }),
  spec({
    id: "certified_green_card",
    category: "certified-mail",
    name: "Certified Self Mailer with Green Card",
    documentClass: "Certified Self Mailer With Green Card",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 11.04,
    retailPrice: 22.0,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Certified Self Mailer",
    paperType: "White 24#",
    note: "Includes the Certified Mail fee and the signed return receipt (ERR).",
  }),
  spec({
    id: "eddm_6.5x9",
    category: "eddm",
    name: "EDDM® Mailer 6.5 × 9",
    documentClass: "EDDM® Mailer 6.5 x 9",
    widthInches: 6.5,
    heightInches: 9,
    cogsBase: 0.15,
    retailPrice: 0.4,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "EDDM Self Mailer",
    paperType: "White Matte with Gloss UV Finish",
    note: "USPS EDDM® saturation postage ($0.26 a piece)",
  }),
  spec({
    id: "eddm_8.5x11",
    category: "eddm",
    name: "EDDM® Mailer 8.5 × 11",
    documentClass: "EDDM® Mailer 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.16,
    retailPrice: 0.42,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "EDDM Self Mailer",
    paperType: "White Matte with Gloss UV Finish",
    note: "USPS EDDM® saturation postage ($0.26 a piece)",
  }),
  spec({
    id: "eddm_6.25x11",
    category: "eddm",
    name: "EDDM® Mailer 6.25 × 11",
    documentClass: "EDDM® Mailer 6.25 x 11",
    widthInches: 6.25,
    heightInches: 11,
    cogsBase: 0.17,
    retailPrice: 0.45,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "EDDM Self Mailer",
    paperType: "White Matte with Gloss UV Finish",
    note: "USPS EDDM® saturation postage ($0.26 a piece)",
  }),
  spec({
    id: "eddm_8.5x12",
    category: "eddm",
    name: "EDDM® Mailer 8.5 × 12",
    documentClass: "EDDM® Mailer 8.5 x 12",
    widthInches: 8.5,
    heightInches: 12,
    cogsBase: 0.22,
    retailPrice: 0.55,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "EDDM Self Mailer",
    paperType: "White Matte with Gloss UV Finish",
    note: "USPS EDDM® saturation postage ($0.26 a piece)",
  }),
  spec({
    id: "priority_letter",
    category: "priority-mail-plus",
    name: "Priority Letter 8.5 × 11",
    documentClass: "Priority Letter 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 11.66,
    retailPrice: 22.5,
    defaultMailClass: "Priority",
    supportedMailClasses: ["Priority"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    note: "USPS Priority Mail®, 1–3 day delivery with tracking.",
  }),
  spec({
    id: "priority_express_letter",
    category: "priority-mail-express",
    name: "Priority Mail® Express Letter 8.5 × 11",
    documentClass: "Priority Mail® Express Letters 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 32.06,
    retailPrice: 55.0,
    defaultMailClass: "PriorityExpress",
    supportedMailClasses: ["PriorityExpress"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    note: "USPS Priority Mail Express®, overnight to most locations.",
  }),
  spec({
    id: "8.5x11_flyer",
    category: "flyers",
    name: "8.5 × 11 Flyer",
    documentClass: "Flyer 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.57,
    retailPrice: 1.45,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing", "FirstClass"],
    hasAddressBlock: true,
    layout: "Unfolded Flyer",
    paperType: "White Matte with Gloss UV Finish",
    note: "Printed flat (unfolded) and tabbed for mailing.",
  }),
  spec({
    id: "11x8.5_brochure",
    category: "brochures",
    name: "11 × 8.5 Trifold Brochure",
    documentClass: "Brochure 11 x 8.5",
    widthInches: 11,
    heightInches: 8.5,
    cogsBase: 1.07,
    retailPrice: 1.32,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing", "FirstClass"],
    hasAddressBlock: true,
    layout: "Trifold Self-Mailer",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "8.5x11_secure",
    category: "secure-mailers",
    name: "8.5 × 11 Secure Self Mailer",
    documentClass: "Secure Self Mailer 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.58,
    retailPrice: 1.95,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Pressure Seal Snap Pack",
    paperType: "White 28#",
    note: "Perforated, pressure-sealed — no envelope.",
  }),
  spec({
    id: "notecard_4.25x5.5",
    category: "notecards",
    name: "4.25 × 5.5 Notecard",
    documentClass: "Notecard 4.25 x 5.5",
    widthInches: 4.25,
    heightInches: 5.5,
    cogsBase: 0.87,
    retailPrice: 1.85,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Flat Notecard",
    paperType: "White Matte with Gloss UV Finish",
    note: "Flat card mailed in a matching envelope.",
  }),
  spec({
    id: "folded_notecard_4.25x5.5",
    category: "notecards",
    name: "4.25 × 5.5 Folded Notecard",
    documentClass: "Folded Notecard 4.25 x 5.5",
    widthInches: 4.25,
    heightInches: 5.5,
    cogsBase: 1.04,
    retailPrice: 2.25,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Folded Notecard",
    paperType: "White Matte with Gloss UV Finish",
    note: "Folded greeting card mailed in a matching envelope.",
  }),
  spec({
    id: "rack_card_4x9",
    category: "rack-cards",
    name: "4 × 9 Rack Card",
    documentClass: "Rack Card 4 x 9",
    widthInches: 4,
    heightInches: 9,
    cogsBase: 0.55,
    retailPrice: 1.25,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "Heavy Cardstock",
  }),
  spec({
    id: "reply_postcard_4.25x6",
    category: "reply-mail",
    name: "4.25 × 6 Reply Postcard",
    documentClass: "Reply Postcard 4.25 x 6",
    widthInches: 4.25,
    heightInches: 6,
    cogsBase: 0.64,
    retailPrice: 1.5,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: true,
    layout: "Business Reply Postcard",
    paperType: "White Matte with Gloss UV Finish",
    note: "Carries prepaid Business Reply postage for the response.",
  }),
  spec({
    id: "reply_letter",
    category: "reply-mail",
    name: "8.5 × 11 Reply Letter",
    documentClass: "Reply Letter 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.65,
    retailPrice: 1.6,
    defaultMailClass: "FirstClass",
    supportedMailClasses: ["FirstClass"],
    hasAddressBlock: false,
    layout: "Address on Separate Page",
    paperType: "White 24#",
    envelope: "#10 Double Window",
    note: "Double-window return envelope included.",
  }),
  spec({
    id: "8.5x11_booklet",
    category: "booklets",
    name: "8.5 × 11 Booklet Self Mailer",
    documentClass: "Booklet Self Mailer 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 0.74,
    retailPrice: 2.1,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "Saddle Stitched Booklet",
    paperType: "White Matte with Gloss UV Finish",
    note: "Multi-page, tabbed for mailing.",
  }),
  spec({
    id: "booklet_address_front",
    category: "booklets",
    name: "8.5 × 11 Booklet · Address Front Page",
    documentClass: "Booklet Address Front Page 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 1.62,
    retailPrice: 3.6,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "Address on Front Page",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "booklet_address_back",
    category: "booklets",
    name: "8.5 × 11 Booklet · Address Back Page",
    documentClass: "Booklet Address Back Page 8.5 x 11",
    widthInches: 8.5,
    heightInches: 11,
    cogsBase: 1.62,
    retailPrice: 3.6,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "Address on Back Page",
    paperType: "White Matte with Gloss UV Finish",
  }),
  spec({
    id: "card_stock_12x4.5",
    category: "card-stock",
    name: "12 × 4.5 Card Stock",
    documentClass: "Card Stock Paper 12 x 4.5",
    widthInches: 12,
    heightInches: 4.5,
    cogsBase: 0.65,
    retailPrice: 1.65,
    defaultMailClass: "StandardMarketing",
    supportedMailClasses: ["StandardMarketing"],
    hasAddressBlock: true,
    layout: "Double Sided Postcard",
    paperType: "Heavy Cardstock",
  }),
];

/**
 * Internal analytics only: rows whose margin sits outside the 100–140 %
 * reference band. Pricing is intentional, so this must not drive user-facing
 * copy, preflight warnings or any automatic re-pricing.
 */
export function marginOutliers(): ProductSpec[] {
  return PRICING_LEDGER.filter(
    (row) => row.marginPercent < 100 || row.marginPercent > 140,
  );
}

/** Back-compat alias: the ledger row type was previously called `PricingRowUi`. */
export type PricingRowUi = ProductSpec;

// ─── Constants ──────────────────────────────────────────────────────────────

/** Monthly EZmailout subscription price ($9.00). */
export const SUBSCRIPTION_PRICE_CENTS = 900;

export const PRODUCTION_TIME = "Next Day";
export const COLOR_FULL = "Full Color";
export const COLOR_BW = "Black and White";

/**
 * Typical local print-shop + postage quote, used only by the savings
 * calculator. Derived as 1.3× a format's single-piece list price rather
 * than hand-maintained.
 */
export const PRINT_SHOP_MULTIPLIER = 1.3;

/**
 * Layout variants that shipped before the print catalog audit. Campaign
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

/**
 * The print partner renamed these product strings; stored campaign records created
 * before the rename keep the old value in their `printSpec`. Kept for auditing
 * that history only — live selections always send the current
 * `ProductSpec.documentClass`.
 */
export const LEGACY_DOCUMENT_CLASSES: Record<string, string> = {
  "Certified Self Mailer With Green Card Receipt":
    "Certified Self Mailer With Green Card",
  "Booklet 8.5 x 11 - Address Front Page":
    "Booklet Address Front Page 8.5 x 11",
  "Booklet 8.5 x 11 - Address Back Page": "Booklet Address Back Page 8.5 x 11",
};

/** Canonical layout variant for a (possibly legacy) key. */
export function normalizeLayoutVariant(layoutVariant: string): string {
  return LEGACY_LAYOUT_VARIANTS[layoutVariant] ?? layoutVariant;
}

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Finds the ledger row for a layout variant. */
export function getPricingRow(layoutVariant: string): ProductSpec | undefined {
  const key = normalizeLayoutVariant(layoutVariant);
  return PRICING_LEDGER.find((row) => row.id === key);
}

/** Ledger rows for one product type, in catalog order. */
export function getPricingRowsFor(productType: ProductType): ProductSpec[] {
  return PRICING_LEDGER.filter((row) => row.productType === productType);
}

// ─── Volume tiers ───────────────────────────────────────────────────────────

/** Fewest pieces for each tier: under 1,000, from 1,000, 10,000, 50,000. */
export const TIER_MINIMUMS = [0, 1_000, 10_000, 50_000] as const;

/** Members are priced as an order of at least this many pieces. */
export const MEMBER_TIER_QUANTITY = 10_000;

/**
 * The smallest order a card payment can take: the payment processor refuses
 * charges under $0.50. Mirrors `PricingLib.minOrderCents`.
 */
export const MIN_ORDER_CENTS = 50;

/** The fewest pieces of the last (lowest) tier: every order from here on pays it. */
export const TOP_TIER_PIECES = TIER_MINIMUMS[TIER_MINIMUMS.length - 1];

/**
 * Per-piece prices in cents, one per `TIER_MINIMUMS` entry, for the formats
 * competitors sell (the competitor's published price less 1¢). Everything
 * else keeps its flat `retailPriceCents`; the first tier is the row's
 * `retailPriceCents`. Mirrored by `PricingLib.volumeTiers` in
 * `src/backend/lib/pricing.mo` — change both.
 */
export const VOLUME_TIERS: Readonly<Record<string, readonly number[]>> = {
  "4.25x6": [79, 71, 62, 52],
  "6x9": [98, 72, 68, 65],
  "6x11": [92, 83, 74, 70],
  letter: [93, 81, 74, 69],
  "11x8.5_brochure": [132, 98, 82, 78],
};

/** The tier schedule for a (possibly legacy) layout key, if it has one. */
export function volumeTiers(layoutVariant: string): readonly number[] | null {
  return VOLUME_TIERS[normalizeLayoutVariant(layoutVariant)] ?? null;
}

/**
 * Cents per piece for `quantity` pieces, exactly as the canister prices a new
 * campaign (`PricingLib.calculateUnitPrice`): a member is priced as at least
 * `MEMBER_TIER_QUANTITY` pieces, and no tier sells below the print cost (one
 * under it is lifted to cost + 1¢). EDDM® saturation postage is included
 * (`postageCents`), and with `mailClass` its surcharge (`classSurchargeCents`;
 * without it, the row's default class). 0 when the variant is unknown. With the defaults this is
 * the list price for a single piece.
 */
export function getUnitPriceCents(
  layoutVariant: string,
  quantity = 1,
  isMember = false,
  mailClass?: CatalogMailClass,
): number {
  const row = getPricingRow(layoutVariant);
  if (!row) return 0;
  return (
    printUnitCents(row, quantity, isMember) +
    postageCents(row) +
    (mailClass ? classSurchargeCents(row.id, mailClass) : 0)
  );
}

/**
 * Extra postage per piece when a format priced for Marketing Mail is sent
 * First-Class: USPS First-Class presort letters less Marketing Mail letters
 * at mixed sort (prices from 12 July 2026), on the formats whose volume
 * prices cannot absorb it. Mirrors `PricingLib.firstClassSurchargeCents`.
 */
export const FIRST_CLASS_SURCHARGE_CENTS = 24;

const FIRST_CLASS_SURCHARGED = new Set(["6x9", "6x11", "11x8.5_brochure"]);

/**
 * The surcharge `mailClass` adds to a piece of `layoutVariant` (First-Class
 * on a surcharged format priced for Marketing Mail), as
 * `PricingLib.classSurchargeCents` charges it.
 */
export function classSurchargeCents(
  layoutVariant: string,
  mailClass: CatalogMailClass,
): number {
  const row = getPricingRow(layoutVariant);
  return row &&
    mailClass === "FirstClass" &&
    row.defaultMailClass === "StandardMarketing" &&
    FIRST_CLASS_SURCHARGED.has(row.id)
    ? FIRST_CLASS_SURCHARGE_CENTS
    : 0;
}

function printUnitCents(
  row: ProductSpec,
  quantity: number,
  isMember: boolean,
): number {
  const tiers = volumeTiers(row.id);
  if (!tiers) return row.retailPriceCents;
  const effective = isMember
    ? Math.max(quantity, MEMBER_TIER_QUANTITY)
    : quantity;
  let price = tiers[0];
  TIER_MINIMUMS.forEach((min, i) => {
    if (effective >= min) price = tiers[i];
  });
  return price > row.baseCostCents ? price : row.baseCostCents + 1;
}

/**
 * USPS EDDM® Retail saturation postage per piece (the rate from 12 July
 * 2026). An EDDM row's ledger price is print only, so every EDDM piece is
 * charged this on top. Mirrors `PricingLib.eddmPostageCents`.
 */
export const EDDM_POSTAGE_CENTS = 26;

/** Postage charged per piece on top of the ledger price (EDDM® only). */
export function postageCents(row: ProductSpec): number {
  return isEddm(row) ? EDDM_POSTAGE_CENTS : 0;
}

/** `getUnitPriceCents` in dollars, for callers that work in dollars. */
export function getProductTierPrice(
  layoutVariant: string,
  quantity: number,
  isMember = false,
): number {
  return getUnitPriceCents(layoutVariant, quantity, isMember) / 100;
}

/**
 * The lowest per-piece price of a format: its last volume tier (an order of
 * `TOP_TIER_PIECES` or more; campaigns have no size limit), or its flat
 * price. What "from $X" means anywhere in the app.
 */
export function startingPriceCents(layoutVariant: string): number {
  return getUnitPriceCents(layoutVariant, TOP_TIER_PIECES, false);
}

/**
 * Every tier of a volume-priced format, in words ("$0.79 under 1,000 ·
 * $0.71 from 1,000 · $0.62 from 10,000 · $0.56 from 50,000 · members
 * $0.62"), or null for a flat-priced format. A tier the cost floor lifts to
 * the previous tier's price is left out.
 */
export function tierSummary(layoutVariant: string): string | null {
  if (!volumeTiers(layoutVariant)) return null;
  return [
    ...volumeTierSteps(layoutVariant).map(({ minimum, cents }) =>
      minimum === 0
        ? `${formatCents(cents)} under ${TIER_MINIMUMS[1].toLocaleString("en-US")}`
        : `${formatCents(cents)} from ${minimum.toLocaleString("en-US")}`,
    ),
    `members ${formatCents(getUnitPriceCents(layoutVariant, 1, true))}`,
  ].join(" · ");
}

/**
 * The distinct price steps of a volume-priced format: each tier's minimum
 * and price, dropping a tier whose (floored) price equals the one before.
 */
export function volumeTierSteps(
  layoutVariant: string,
): { minimum: number; cents: number }[] {
  if (!volumeTiers(layoutVariant)) return [];
  const steps: { minimum: number; cents: number }[] = [];
  for (const minimum of TIER_MINIMUMS) {
    const cents = getUnitPriceCents(layoutVariant, minimum, false);
    if (steps.at(-1)?.cents !== cents) steps.push({ minimum, cents });
  }
  return steps;
}

/** Retail unit price in dollars for one piece (0 when the variant is unknown). */
export function getPrice(layoutVariant: string): number {
  return getUnitPriceCents(layoutVariant) / 100;
}

/** Print-shop benchmark price in cents for the savings calculator. */
export function getBenchmarkCents(layoutVariant: string): number {
  return Math.round(getUnitPriceCents(layoutVariant) * PRINT_SHOP_MULTIPLIER);
}

/** Gross margin in cents for a ledger row. */
export function marginCents(row: ProductSpec): number {
  return row.retailPriceCents - row.baseCostCents;
}

// ─── Product capabilities ───────────────────────────────────────────────────

/** Letter-style products the print partner prints in black and white on request. */
export function supportsBlackAndWhite(productType: ProductType): boolean {
  return (
    productType === ProductType.Letter ||
    productType === ProductType.CertifiedMail ||
    productType === ProductType.PriorityMail ||
    productType === ProductType.PriorityMailExpress ||
    productType === ProductType.ReplyMail
  );
}

/**
 * True when the studio must reserve the USPS address + IMb clear zone on the
 * artwork (see `ProductSpec.hasAddressBlock`).
 */
export function hasAddressSide(layoutVariant: string): boolean {
  return getPricingRow(layoutVariant)?.hasAddressBlock ?? false;
}

/** EDDM® rows: their ledger price is print only (see `postageCents`). */
export function isEddm(row: ProductSpec): boolean {
  return row.productType === ProductType.Eddm;
}

// ─── Labels ─────────────────────────────────────────────────────────────────

/** Human label for the canister's wire mail class. */
export function mailClassLabel(mailClass: MailClass): string {
  switch (mailClass) {
    case MailClass.FirstClass:
      return "First-Class";
    case MailClass.MarketingMail:
      return "Standard / Marketing Mail";
    case MailClass.Priority:
      return "Priority Mail®";
    case MailClass.PriorityExpress:
      return "Priority Mail® Express";
    default:
      return String(mailClass);
  }
}

/** Human label for a catalog mail class. */
export function catalogMailClassLabel(mailClass: CatalogMailClass): string {
  return mailClassLabel(catalogMailClassToWire(mailClass));
}

/** Short delivery-speed chip copy for a catalog mail class. */
export function mailClassDelivery(mailClass: CatalogMailClass): string {
  switch (mailClass) {
    case "FirstClass":
      return "2–5 days";
    case "StandardMarketing":
      return "5–12 days";
    case "Priority":
      return "1–3 days";
    case "PriorityExpress":
      return "Overnight";
    default:
      return "";
  }
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
