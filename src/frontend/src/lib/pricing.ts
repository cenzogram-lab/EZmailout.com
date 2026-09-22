import { MailClass, ProductType } from "@/backend";

/**
 * Click2Mail catalog mail classes. `StandardMarketing` is the catalog name for
 * USPS Marketing Mail; `catalogMailClassToWire` maps it onto the canister's
 * `MailClass.MarketingMail`.
 */
export type CatalogMailClass =
  | "FirstClass"
  | "StandardMarketing"
  | "Priority"
  | "PriorityExpress";

/** One Click2Mail document class: its trim size, cost, retail price and print options. */
export interface ProductSpec {
  /** Layout-variant key persisted on campaign records. */
  id: string;
  /** Catalog category id (see `lib/catalog.ts`). */
  category: string;
  name: string;
  /** Exact Click2Mail product name sent as `documentClass`. */
  documentClass: string;
  widthInches: number;
  heightInches: number;
  /** Click2Mail wholesale cost per piece, in dollars. */
  cogsBase: number;
  /** EZmailout member price per piece, in dollars. */
  retailPrice: number;
  defaultMailClass: CatalogMailClass;
  supportedMailClasses: CatalogMailClass[];
  /**
   * True when the piece carries the USPS address block and IMb on the artwork
   * the customer designs, so the studio reserves the lower-right clear zone.
   * False for envelope-inserted formats, where Click2Mail generates the
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
 * The authoritative Click2Mail price matrix: 14 product families, 29 document
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
    retailPrice: 1.15,
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
    retailPrice: 1.35,
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
    retailPrice: 1.65,
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
    retailPrice: 1.5,
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
    note: "Print base rate — EDDM® saturation postage is added per carrier route.",
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
    note: "Print base rate — EDDM® saturation postage is added per carrier route.",
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
    note: "Print base rate — EDDM® saturation postage is added per carrier route.",
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
    note: "Print base rate — EDDM® saturation postage is added per carrier route.",
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
    retailPrice: 2.25,
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
 * calculator. Derived as 1.3× the member rate rather than hand-maintained.
 */
export const PRINT_SHOP_MULTIPLIER = 1.3;

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

/**
 * Click2Mail renamed these product strings; stored campaign records created
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

/** Retail unit price in cents (0 when the variant is unknown). */
export function getUnitPriceCents(layoutVariant: string): number {
  return getPricingRow(layoutVariant)?.retailPriceCents ?? 0;
}

/** Retail unit price in dollars (0 when the variant is unknown). */
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

/** Letter-style products Click2Mail prints in black and white on request. */
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

/** EDDM® rows price print only; saturation postage is added per carrier route. */
export function isBaseRateOnly(row: ProductSpec): boolean {
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
