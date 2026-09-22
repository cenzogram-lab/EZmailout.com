import { ProductType } from "@/backend";
import { PRICING_LEDGER, type PricingRowUi } from "@/lib/pricing";

/** Line-art icon ids drawn by `components/catalog/CatalogIcon.tsx`. */
export type CatalogIconId =
  | "postcard"
  | "letter"
  | "certified"
  | "eddm"
  | "priority"
  | "priority-express"
  | "flyer"
  | "secure"
  | "notecard"
  | "rack-card"
  | "brochure"
  | "reply-mail"
  | "booklet"
  | "card-stock";

export interface CatalogCategory {
  id: string;
  productType: ProductType;
  name: string;
  /** One-line description shown on the category card. */
  blurb: string;
  icon: CatalogIconId;
  /** Ledger variants in Click2Mail sheet order. */
  variants: string[];
  /** Operational note surfaced in the size dropdown. */
  note?: string;
}

/**
 * The 14 Click2Mail product families, in the order of the Click2Mail
 * product sheet, with every size the sheet lists.
 */
export const CATALOG: CatalogCategory[] = [
  {
    id: "postcards",
    productType: ProductType.Postcard,
    name: "Postcards",
    blurb:
      "Six sizes from 3.5×5 to 6×11, full colour both sides on gloss UV stock.",
    icon: "postcard",
    variants: ["3.5x5", "4.25x6", "4x9", "5x8", "6x9", "6x11"],
  },
  {
    id: "letters",
    productType: ProductType.Letter,
    name: "Letters",
    blurb:
      "8.5×11 and 8.5×14 pages on 24# white, folded into a #10 double-window envelope.",
    icon: "letter",
    variants: ["letter", "letter_legal"],
  },
  {
    id: "certified-mail",
    productType: ProductType.CertifiedMail,
    name: "Certified Mail™",
    blurb:
      "USPS Certified delivery with proof of mailing; add a green card for a signed return receipt.",
    icon: "certified",
    variants: [
      "certified_self_mailer",
      "certified_green_card",
      "certified_letter",
    ],
    note: "Certified postage and tracking are included in the per-piece price.",
  },
  {
    id: "eddm",
    productType: ProductType.Eddm,
    name: "Every Door Direct Mail (EDDM®)",
    blurb:
      "Saturation flats delivered to every address on the carrier routes you pick.",
    icon: "eddm",
    variants: ["eddm_6.25x11", "eddm_6.5x9", "eddm_8.5x11", "eddm_8.5x12"],
    note: "EDDM® drops are priced per household on the routes you choose in the audience step.",
  },
  {
    id: "priority-mail-plus",
    productType: ProductType.PriorityMail,
    name: "Priority Mail® Plus",
    blurb:
      "Letters sent USPS Priority Mail with tracking, typically delivered in 1–3 days.",
    icon: "priority",
    variants: ["priority_letter"],
  },
  {
    id: "priority-mail-express",
    productType: ProductType.PriorityMailExpress,
    name: "Priority Mail® Express",
    blurb:
      "Overnight-to-most-locations letters with a money-back delivery guarantee.",
    icon: "priority-express",
    variants: ["priority_express_letter"],
  },
  {
    id: "flyers",
    productType: ProductType.Flyer,
    name: "Flyers",
    blurb: "8.5×11 flyers folded in half and tabbed shut — no envelope needed.",
    icon: "flyer",
    variants: ["8.5x11_flyer"],
  },
  {
    id: "secure-mailers",
    productType: ProductType.SnapPack,
    name: "Secure Mailers",
    blurb:
      "Pressure-sealed, perforated self mailers for statements, notices and checks.",
    icon: "secure",
    variants: ["8.5x11_secure"],
  },
  {
    id: "notecards",
    productType: ProductType.Notecard,
    name: "Notecards",
    blurb: "Flat or folded 4.25×5.5 cards mailed in matching envelopes.",
    icon: "notecard",
    variants: ["notecard_4.25x5.5", "folded_notecard_4.25x5.5"],
  },
  {
    id: "rack-cards",
    productType: ProductType.RackCard,
    name: "Rack Cards",
    blurb: "Tall 4×9 cards for menus, service lists and event line-ups.",
    icon: "rack-card",
    variants: ["rack_card_4x9"],
  },
  {
    id: "brochures",
    productType: ProductType.Brochure,
    name: "Brochures",
    blurb: "11×8.5 trifold brochures with six panels for catalogs and offers.",
    icon: "brochure",
    variants: ["11x8.5_brochure"],
  },
  {
    id: "reply-mail",
    productType: ProductType.ReplyMail,
    name: "Reply Mail",
    blurb:
      "Postcards and letters that carry prepaid business reply mail for the response.",
    icon: "reply-mail",
    variants: ["reply_postcard_4.25x6", "reply_letter"],
  },
  {
    id: "booklets",
    productType: ProductType.Booklet,
    name: "Booklets",
    blurb:
      "Saddle-stitched 8.5×11 booklets, self-mailed or addressed on a cover page.",
    icon: "booklet",
    variants: [
      "8.5x11_booklet",
      "booklet_address_back",
      "booklet_address_front",
    ],
  },
  {
    id: "card-stock",
    productType: ProductType.CardStock,
    name: "Card Stock",
    blurb: "12×4.5 heavy card stock pieces for oversized, high-impact mailers.",
    icon: "card-stock",
    variants: ["card_stock_12x4.5"],
  },
];

/** Category that owns a layout variant (legacy keys included). */
export function categoryForVariant(
  layoutVariant: string,
): CatalogCategory | undefined {
  const row = PRICING_LEDGER.find((r) => r.layoutVariant === layoutVariant);
  return CATALOG.find(
    (c) =>
      c.variants.includes(layoutVariant) ||
      (row !== undefined && c.productType === row.productType),
  );
}

/** Category for a product type (legacy `SelfMailer` maps to Flyers). */
export function categoryForProductType(
  productType: ProductType,
): CatalogCategory {
  const direct = CATALOG.find((c) => c.productType === productType);
  if (direct) return direct;
  return CATALOG.find((c) => c.id === "flyers") ?? CATALOG[0];
}

/** Ledger rows of a category in sheet order. */
export function categoryRows(category: CatalogCategory): PricingRowUi[] {
  return category.variants
    .map((v) => PRICING_LEDGER.find((r) => r.layoutVariant === v))
    .filter((r): r is PricingRowUi => r !== undefined);
}

/** Lowest retail price of a category, in cents. */
export function categoryFromCents(category: CatalogCategory): number {
  const rows = categoryRows(category);
  return rows.length ? Math.min(...rows.map((r) => r.retailPriceCents)) : 0;
}

/** Total number of sizes across the catalog. */
export const CATALOG_SIZE_COUNT = CATALOG.reduce(
  (n, c) => n + c.variants.length,
  0,
);
