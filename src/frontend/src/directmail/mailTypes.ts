import type { MailFamily, MailTypeDef, MailTypeId } from "./types";

/**
 * The 29 EZmailout mail types in 14 product families — type and size only.
 * Pricing, mail class and stock live in pricing.ts / pricing.mo, not here.
 * `format` is the print geometry the templates are designed on; `prefix` is the
 * template id prefix of that type's 20-template set.
 */
export const MAIL_TYPES: Record<MailTypeId, MailTypeDef> = {
  "mini-postcard-3.5x5": {
    id: "mini-postcard-3.5x5",
    family: "Postcards",
    label: "3.5 × 5 Mini Postcard",
    size: "3.5 × 5",
    format: "postcard-3.5x5",
    prefix: "mini",
  },
  "postcard-4.25x6": {
    id: "postcard-4.25x6",
    family: "Postcards",
    label: "4.25 × 6 Postcard",
    size: "4.25 × 6",
    format: "postcard-4x6",
    prefix: "pc46",
  },
  "slim-postcard-4x9": {
    id: "slim-postcard-4x9",
    family: "Postcards",
    label: "4 × 9 Slim Postcard",
    size: "4 × 9",
    format: "postcard-4x9",
    prefix: "slim",
  },
  "postcard-5x8": {
    id: "postcard-5x8",
    family: "Postcards",
    label: "5 × 8 Postcard",
    size: "5 × 8",
    format: "postcard-5x8",
    prefix: "pc58",
  },
  "postcard-6x9": {
    id: "postcard-6x9",
    family: "Postcards",
    label: "6 × 9 Postcard",
    size: "6 × 9",
    format: "postcard-6x9",
    prefix: "pc69",
  },
  "jumbo-postcard-6x11": {
    id: "jumbo-postcard-6x11",
    family: "Postcards",
    label: "6 × 11 Jumbo Postcard",
    size: "6 × 11",
    format: "postcard-6x11",
    prefix: "jumbo",
  },
  "letter-8.5x11": {
    id: "letter-8.5x11",
    family: "Letters",
    label: "8.5 × 11 Letter",
    size: "8.5 × 11",
    format: "letter",
    prefix: "ltr",
  },
  "legal-letter-8.5x14": {
    id: "legal-letter-8.5x14",
    family: "Letters",
    label: "8.5 × 14 Legal Letter",
    size: "8.5 × 14",
    format: "letter-legal",
    prefix: "lgl",
  },
  "certified-self-mailer-8.5x11": {
    id: "certified-self-mailer-8.5x11",
    family: "Certified Mail",
    label: "Certified Self Mailer 8.5 × 11",
    size: "8.5 × 11",
    format: "selfmailer-letter",
    prefix: "csm",
  },
  "certified-letter-8.5x11": {
    id: "certified-letter-8.5x11",
    family: "Certified Mail",
    label: "Certified Letter 8.5 × 11",
    size: "8.5 × 11",
    format: "letter",
    prefix: "cltr",
  },
  "certified-self-mailer-green-card": {
    id: "certified-self-mailer-green-card",
    family: "Certified Mail",
    label: "Certified Self Mailer with Green Card",
    size: "8.5 × 11",
    format: "selfmailer-letter",
    prefix: "cgc",
  },
  "eddm-6.5x9": {
    id: "eddm-6.5x9",
    family: "EDDM",
    label: "EDDM® Mailer 6.5 × 9",
    size: "6.5 × 9",
    format: "eddm-6.5x9",
    prefix: "ed69",
  },
  "eddm-8.5x11": {
    id: "eddm-8.5x11",
    family: "EDDM",
    label: "EDDM® Mailer 8.5 × 11",
    size: "8.5 × 11",
    format: "eddm-8.5x11",
    prefix: "ed811",
  },
  "eddm-6.25x11": {
    id: "eddm-6.25x11",
    family: "EDDM",
    label: "EDDM® Mailer 6.25 × 11",
    size: "6.25 × 11",
    format: "eddm-6.25x11",
    prefix: "ed611",
  },
  "eddm-8.5x12": {
    id: "eddm-8.5x12",
    family: "EDDM",
    label: "EDDM® Mailer 8.5 × 12",
    size: "8.5 × 12",
    format: "eddm-8.5x12",
    prefix: "ed812",
  },
  "priority-letter-8.5x11": {
    id: "priority-letter-8.5x11",
    family: "Priority Mail Plus",
    label: "Priority Letter 8.5 × 11",
    size: "8.5 × 11",
    format: "letter",
    prefix: "pri",
  },
  "priority-express-letter-8.5x11": {
    id: "priority-express-letter-8.5x11",
    family: "Priority Mail Express",
    label: "Priority Mail® Express Letter 8.5 × 11",
    size: "8.5 × 11",
    format: "letter",
    prefix: "prx",
  },
  "flyer-8.5x11": {
    id: "flyer-8.5x11",
    family: "Flyers",
    label: "8.5 × 11 Flyer",
    size: "8.5 × 11",
    format: "flyer-letter",
    prefix: "fly",
  },
  "trifold-brochure-11x8.5": {
    id: "trifold-brochure-11x8.5",
    family: "Brochures",
    label: "11 × 8.5 Trifold Brochure",
    size: "11 × 8.5",
    format: "trifold",
    prefix: "tri",
  },
  "secure-self-mailer-8.5x11": {
    id: "secure-self-mailer-8.5x11",
    family: "Secure Mailers",
    label: "8.5 × 11 Secure Self Mailer",
    size: "8.5 × 11",
    format: "secure-mailer",
    prefix: "sec",
  },
  "notecard-4.25x5.5": {
    id: "notecard-4.25x5.5",
    family: "Notecards",
    label: "4.25 × 5.5 Notecard",
    size: "4.25 × 5.5",
    format: "notecard",
    prefix: "note",
  },
  "folded-notecard-4.25x5.5": {
    id: "folded-notecard-4.25x5.5",
    family: "Notecards",
    label: "4.25 × 5.5 Folded Notecard",
    size: "4.25 × 5.5",
    format: "notecard-folded",
    prefix: "fnote",
  },
  "rack-card-4x9": {
    id: "rack-card-4x9",
    family: "Rack Cards",
    label: "4 × 9 Rack Card",
    size: "4 × 9",
    format: "rackcard",
    prefix: "rack",
  },
  "reply-postcard-4.25x6": {
    id: "reply-postcard-4.25x6",
    family: "Reply Mail",
    label: "4.25 × 6 Reply Postcard",
    size: "4.25 × 6",
    format: "reply-postcard",
    prefix: "rpc",
  },
  "reply-letter-8.5x11": {
    id: "reply-letter-8.5x11",
    family: "Reply Mail",
    label: "8.5 × 11 Reply Letter",
    size: "8.5 × 11",
    format: "reply-letter",
    prefix: "rltr",
  },
  "booklet-self-mailer-8.5x11": {
    id: "booklet-self-mailer-8.5x11",
    family: "Booklets",
    label: "8.5 × 11 Booklet Self Mailer",
    size: "8.5 × 11",
    format: "booklet",
    prefix: "bksm",
  },
  "booklet-address-front-8.5x11": {
    id: "booklet-address-front-8.5x11",
    family: "Booklets",
    label: "8.5 × 11 Booklet, Address Front Page",
    size: "8.5 × 11",
    format: "booklet",
    prefix: "bkf",
  },
  "booklet-address-back-8.5x11": {
    id: "booklet-address-back-8.5x11",
    family: "Booklets",
    label: "8.5 × 11 Booklet, Address Back Page",
    size: "8.5 × 11",
    format: "booklet",
    prefix: "bkb",
  },
  "card-stock-12x4.5": {
    id: "card-stock-12x4.5",
    family: "Card Stock",
    label: "12 × 4.5 Card Stock",
    size: "12 × 4.5",
    format: "cardstock-12x4.5",
    prefix: "cs",
  },
};

export const MAIL_TYPE_IDS = Object.keys(MAIL_TYPES) as MailTypeId[];

export const MAIL_FAMILIES: MailFamily[] = [
  ...new Set(MAIL_TYPE_IDS.map((id) => MAIL_TYPES[id].family)),
];

export function getMailType(id: MailTypeId): MailTypeDef {
  return MAIL_TYPES[id];
}

export function mailTypesInFamily(family: MailFamily): MailTypeDef[] {
  return MAIL_TYPE_IDS.map((id) => MAIL_TYPES[id]).filter(
    (t) => t.family === family,
  );
}
