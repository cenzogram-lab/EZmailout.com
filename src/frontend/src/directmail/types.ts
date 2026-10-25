/**
 * Direct-mail template system — core types.
 *
 * A template is DATA (MailTemplateSpec): a print format, a front layout, an
 * optional USPS-compliant back layout and theme tokens. One renderer
 * (MailPiece) turns `template + content` into a print-size piece (CSS inches,
 * optional bleed and guides). Users pick a template by id and may override
 * theme tokens without forking it.
 */

/* ------------------------------------------------------------------ */
/* Formats                                                             */
/* ------------------------------------------------------------------ */

export type FormatId =
  | "postcard-3.5x5"
  | "postcard-4x6"
  | "postcard-4x9"
  | "postcard-5x7"
  | "postcard-5x8"
  | "postcard-6x9"
  | "postcard-6x11"
  | "cardstock-12x4.5"
  | "eddm-6.5x9"
  | "eddm-8.5x11"
  | "eddm-6.25x11"
  | "eddm-8.5x12"
  | "flyer-letter"
  | "flyer-half"
  | "doorhanger"
  | "rackcard"
  | "letter"
  | "letter-legal"
  | "selfmailer-letter"
  | "secure-mailer"
  | "trifold"
  | "notecard"
  | "notecard-folded"
  | "reply-postcard"
  | "reply-letter"
  | "booklet";

export type MailCategory =
  | "postcard"
  | "eddm"
  | "flyer"
  | "doorhanger"
  | "rackcard"
  | "letter"
  | "selfmailer"
  | "brochure"
  | "notecard"
  | "reply"
  | "booklet"
  | "cardstock";

/** Which printed surface of a piece is being rendered. Booklets have four pages. */
export type Side = "front" | "back" | "inside-left" | "inside-right";

export interface FormatDef {
  id: FormatId;
  category: MailCategory;
  label: string;
  /** trim size in inches, width × height as the piece is designed (folded pieces: the flat sheet) */
  width: number;
  height: number;
  /** full bleed on each edge, inches */
  bleed: number;
  /** keep text this far inside the trim, inches */
  safe: number;
  /** printed surfaces: 1 = front only, 2 = front + back, 4 = booklet pages */
  sides: 1 | 2 | 4;
  /** USPS: height of the barcode clear zone along the bottom of the address side, inches */
  clearZone?: number;
  /** door hanger: die-cut hole diameter + offset from top, inches */
  hole?: { diameter: number; top: number };
  /** folded formats: fold kind and the axis the folds run across */
  fold?: { kind: "half" | "tri" | "z"; axis: "vertical" | "horizontal" };
  /** pressure-seal mailers: perforated tear strip on each long edge, inches */
  tearStrip?: number;
  /** non-bleed formats (laser-printed letters): nothing is printed closer than this to the edge, inches */
  printMargin?: number;
  /** the address panel is printed on this surface */
  addressSide?: Side;
  notes?: string;
}

/** The 29 EZmailout mail types (type + size only). */
export type MailTypeId =
  | "mini-postcard-3.5x5"
  | "postcard-4.25x6"
  | "slim-postcard-4x9"
  | "postcard-5x8"
  | "postcard-6x9"
  | "jumbo-postcard-6x11"
  | "letter-8.5x11"
  | "legal-letter-8.5x14"
  | "certified-self-mailer-8.5x11"
  | "certified-letter-8.5x11"
  | "certified-self-mailer-green-card"
  | "eddm-6.5x9"
  | "eddm-8.5x11"
  | "eddm-6.25x11"
  | "eddm-8.5x12"
  | "priority-letter-8.5x11"
  | "priority-express-letter-8.5x11"
  | "flyer-8.5x11"
  | "trifold-brochure-11x8.5"
  | "secure-self-mailer-8.5x11"
  | "notecard-4.25x5.5"
  | "folded-notecard-4.25x5.5"
  | "rack-card-4x9"
  | "reply-postcard-4.25x6"
  | "reply-letter-8.5x11"
  | "booklet-self-mailer-8.5x11"
  | "booklet-address-front-8.5x11"
  | "booklet-address-back-8.5x11"
  | "card-stock-12x4.5";

export type MailFamily =
  | "Postcards"
  | "Letters"
  | "Certified Mail"
  | "EDDM"
  | "Priority Mail Plus"
  | "Priority Mail Express"
  | "Flyers"
  | "Brochures"
  | "Secure Mailers"
  | "Notecards"
  | "Rack Cards"
  | "Reply Mail"
  | "Booklets"
  | "Card Stock";

export interface MailTypeDef {
  id: MailTypeId;
  family: MailFamily;
  label: string;
  /** size as the catalogue lists it, e.g. "8.5 × 11" */
  size: string;
  format: FormatId;
  /** template id prefix for this type's set */
  prefix: string;
}

/* ------------------------------------------------------------------ */
/* Catalog metadata                                                    */
/* ------------------------------------------------------------------ */

export type Campaign =
  | "notice"
  | "statement"
  | "survey"
  | "greeting"
  | "catalog"
  | "offer"
  | "grand-opening"
  | "seasonal"
  | "new-neighbor"
  | "just-listed"
  | "just-sold"
  | "open-house"
  | "event"
  | "menu"
  | "reminder"
  | "thank-you"
  | "referral"
  | "fundraiser"
  | "invite"
  | "announcement"
  | "before-after"
  | "schedule"
  | "introduction";

export type Vibe =
  | "bold"
  | "elegant"
  | "playful"
  | "professional"
  | "organic"
  | "editorial"
  | "retro"
  | "minimal"
  | "luxury"
  | "festive";

export type Industry =
  | "landscaping"
  | "construction"
  | "roofing"
  | "cleaning"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "pest"
  | "restaurant"
  | "pizza"
  | "cafe"
  | "bakery"
  | "salon"
  | "barber"
  | "spa"
  | "gym"
  | "yoga"
  | "dental"
  | "medical"
  | "pediatric"
  | "chiropractic"
  | "realestate"
  | "mortgage"
  | "legal"
  | "auto"
  | "florist"
  | "boutique"
  | "photography"
  | "events"
  | "nonprofit"
  | "church"
  | "education"
  | "daycare"
  | "pets"
  | "coworking"
  | "agency"
  | "hotel"
  | "coffee"
  | "festival"
  | "arts"
  | "workshop"
  | "foodtruck"
  | "moving"
  | "solar"
  | "insurance"
  | "vet"
  | "general";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export interface MailColors {
  /** paper / page colour */
  bg: string;
  /** panels and cards */
  surface: string;
  /** body text on bg */
  text: string;
  /** secondary text — ≥ 4.5:1 on bg */
  muted: string;
  /** primary accent: colour blocks, buttons */
  accent: string;
  /** text on accent */
  onAccent: string;
  /** secondary accent: badges, patterns */
  accent2: string;
  /** text on accent2 */
  onAccent2: string;
  border: string;
}

export type FontId = string;

export type PatternKind =
  | "none"
  | "chevron"
  | "stripes"
  | "dots"
  | "halftone"
  | "grid"
  | "memphis"
  | "leaves"
  | "florals"
  | "waves"
  | "rings"
  | "checker"
  | "confetti"
  | "sunburst"
  | "topo"
  | "sparkles"
  | "arches";

export type PhotoTreatment = "color" | "duotone" | "mono" | "warm";

export interface MailTheme {
  colors: MailColors;
  fonts: { display: FontId; body: FontId; accent?: FontId };
  display?: {
    weight?: number;
    transform?: "none" | "uppercase";
    tracking?: number;
    italic?: boolean;
    scale?: number;
  };
  /** background pattern for colour areas */
  pattern?: {
    kind?: PatternKind;
    tint?: string;
    opacity?: number;
    scale?: number;
  };
  /** treatment applied to photos (real or placeholder) */
  photo?: PhotoTreatment;
  /** corner radius for cards/coupons, px at 96dpi */
  radius?: number;
  /** thin inner frame inset from the trim */
  frame?: boolean;
  shadow?: "none" | "hard" | "soft";
  /** hard-shadow / frame colour; defaults to text */
  inkColor?: string;
}

export type MailThemeOverrides = {
  colors?: Partial<MailColors>;
  fonts?: Partial<MailTheme["fonts"]>;
  display?: MailTheme["display"];
  pattern?: MailTheme["pattern"];
  photo?: PhotoTreatment;
  radius?: number;
  frame?: boolean;
  shadow?: MailTheme["shadow"];
  inkColor?: string;
};

/* ------------------------------------------------------------------ */
/* Layouts                                                             */
/* ------------------------------------------------------------------ */

export type FrontLayout =
  /** full-bleed photo, headline in a solid panel */
  | "full-photo"
  /** photo one half, colour block with text the other */
  | "split-h"
  /** photo top, text panel bottom */
  | "split-v"
  /** solid colour, thin inner frame, centered type */
  | "color-frame"
  /** pattern field with a white panel card + accent side strip */
  | "pattern-panel"
  /** memphis / organic shapes behind left-aligned type */
  | "shapes"
  /** photo with a colour card overlapping it */
  | "overlap-card"
  /** cream editorial: framed photo inset, serif headline, meta lines */
  | "editorial"
  /** giant offer number with a starburst badge */
  | "offer-hero"
  /** two photos side by side with labels */
  | "before-after"
  /** headline + grid of coupons */
  | "coupon-grid"
  /** stacked giant words in alternating colours */
  | "typographic"
  /** tilted photo frames on a textured field with a script headline */
  | "polaroid"
  /** diagonal colour split with photo */
  | "diagonal"
  /** botanical frame around centered script + caps */
  | "botanical"
  /** colour header band with logo, photo below, message */
  | "band-top"
  /** event poster: big date block, title, venue lines */
  | "event-poster"
  /** headline + numbered list beside a photo */
  | "list"
  /** tall stack for door hangers / rack cards: logo, photo, headline, coupon, contact */
  | "stack"
  /** rack card / flyer: photo top, three info panels, contact footer */
  | "panels"
  /* ---- letters (8.5×11 / 8.5×14, address on a separate page) ---- */
  /** logo + contact header row, rule, date, salutation, paragraphs, signature */
  | "letterhead"
  /** colour band across the top with logo + headline */
  | "letter-band"
  /** accent stripe down the left with rotated tagline */
  | "letter-sidebar"
  /** formal notice: centered wordmark, reference block, numbered paragraphs */
  | "letter-notice"
  /** marketing letter with an offer box / coupon at the bottom */
  | "letter-offer"
  /** time-sensitive: alert band + deadline box */
  | "letter-urgent"
  /** letter with a perforated reply slip at the bottom */
  | "letter-reply"
  /** wordmark only, generous margins */
  | "letter-minimal"
  /** letter with a stats row under the headline */
  | "letter-stats"
  /** photo strip across the top, then the letter */
  | "letter-photo"
  /* ---- folded / specialty ---- */
  /** trifold outside: inside flap · mailing panel · cover */
  | "trifold"
  /** notecard front: full art (photo / illustration) + greeting */
  | "notecard-art"
  /** notecard front: thin frame, centered greeting */
  | "notecard-frame"
  /** notecard front: giant typographic greeting */
  | "notecard-typo"
  /** notecard front: pattern field with a small panel */
  | "notecard-pattern"
  /** notecard front: photo top half, greeting below */
  | "notecard-split"
  /** reply postcard front: headline, intro, checkbox options, write-in lines */
  | "reply-form"
  /** secure mailer inner page: account-statement table */
  | "secure-statement"
  /** secure mailer inner page: notice letter with a highlighted box */
  | "secure-notice";

export type BackLayout =
  /** message left, address right, hairline divider */
  | "classic"
  /** colour banner top with business + tagline */
  | "banner"
  /** one or two dashed coupons + QR left, address right */
  | "coupon"
  /** map card + hours + contact left, address right */
  | "map"
  /** logo + short message + website, address right */
  | "minimal"
  /** single-sided pieces (flyers): details page with list, offer, contact strip */
  | "details"
  /** reply postcard: Business Reply Mail panel (FIM bars, no-postage box, permit block, addressee) */
  | "brm"
  /** trifold inside: three content panels */
  | "trifold-inside"
  /** folded notecard inside: art / blank left, message with writing lines right */
  | "notecard-message"
  /** flat notecard back: message with lines + small logo */
  | "notecard-back"
  /** letter-size self mailer outside: return address + indicia + recipient, teaser below the fold */
  | "selfmailer-outer"
  /** pressure-seal Z-fold outside: alert header, address window area, tear instructions */
  | "secure-outer"
  /** booklet back cover carrying a full address panel (self mailer) */
  | "booklet-mailer"
  /** booklet back cover: artwork with a reserved address zone */
  | "booklet-address"
  /** booklet back cover: artwork only (address printed on the front cover) */
  | "booklet-back";

export interface FrontSpec {
  layout: FrontLayout;
  /** swap photo/text sides for split layouts */
  flip?: boolean;
  /** what fills the image slot */
  image?: "photo" | "illustration" | "none";
  badge?: "starburst" | "circle" | "ribbon" | "tag" | "none";
  align?: "left" | "center";
  showLogo?: boolean;
  showOffer?: boolean;
  showBullets?: boolean;
  showContact?: boolean;
  showEvent?: boolean;
  showStats?: boolean;
  /** headline rendered in the accent (script) font */
  scriptHeadline?: boolean;
  /** eyebrow line above the headline (content.eyebrow or business.name) */
  showEyebrow?: boolean;
  /** letters: show the date line / reference block / P.S. line */
  showDate?: boolean;
  showReference?: boolean;
  showPs?: boolean;
  /** booklet cover / outside panels: reserve a USPS address zone on this surface */
  addressZone?: boolean;
  /** notecards: default greeting when content.greeting is empty */
  greeting?: string;
}

export interface BackSpec {
  layout: BackLayout;
  showQr?: boolean;
  showMap?: boolean;
  showHours?: boolean;
  showTestimonial?: boolean;
  showBullets?: boolean;
  showSocials?: boolean;
  coupons?: 1 | 2;
  /** reverse message/address panels (address left) */
  flip?: boolean;
  /** trifold inside / booklet pages: which panel recipe to use */
  panels?: "story" | "services" | "menu" | "gallery" | "stats";
}

/** Booklet inside spread (pages 2–3). */
export interface InsideSpec {
  layout: "story" | "services" | "menu" | "gallery" | "stats";
  showTestimonial?: boolean;
  showOffer?: boolean;
}

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */

export interface MailTemplateSpec {
  /** stable id, e.g. "pc-01-bloom" */
  id: string;
  name: string;
  description: string;
  format: FormatId;
  /** 1 = front only (flyers), 2 = front + back, 4 = booklet pages */
  sides: 1 | 2 | 4;
  /** EZmailout mail type this template was designed for (sets without one are the generic starter set) */
  mailType?: MailTypeId;
  campaign: Campaign;
  industries: Industry[];
  vibe: Vibe;
  tags: string[];
  front: FrontSpec;
  back?: BackSpec;
  /** booklets: inside spread */
  inside?: InsideSpec;
  theme: MailTheme;
  /** sample content id for previews */
  sample: string;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export interface BusinessInfo {
  name: string;
  tagline?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  license?: string;
  socialHandle?: string;
}

export interface Offer {
  /** big line, e.g. "20% OFF", "$99", "FREE" */
  headline: string;
  /** what it applies to */
  detail: string;
  code?: string;
  expires?: string;
  fineprint?: string;
}

export interface EventInfo {
  /** "SAT", "Oct 18" split for the date block */
  dayLabel?: string;
  date: string;
  time?: string;
  venue?: string;
  address?: string;
}

export interface Coupon extends Offer {
  title?: string;
}

export interface MailContent {
  business: BusinessInfo;
  /** small line above the headline, e.g. "Spring special" */
  eyebrow?: string;
  headline: string;
  subhead?: string;
  body?: string;
  bullets?: string[];
  offer?: Offer;
  coupons?: Coupon[];
  cta?: { label: string; url?: string };
  /** scannable code; pass a pre-rendered SVG string (e.g. from the `qrcode` package) */
  qr?: { url: string; svg?: string; caption?: string };
  event?: EventInfo;
  images?: {
    hero?: string;
    secondary?: string;
    before?: string;
    after?: string;
    gallery?: string[];
  };
  /** illustration keys (illustrations.tsx) used when images are missing */
  illustrations?: { hero?: string; secondary?: string };
  stats?: { value: string; label: string }[];
  testimonial?: { quote: string; author: string };
  hours?: { days: string; hours: string }[];
  /** numbered / bulleted list for 'list' layouts */
  listTitle?: string;
  list?: string[];
  /** label pair for 'before-after' */
  compareLabels?: [string, string];
  /** back-side mailing panel */
  mailing?: {
    indicia?: { line1: string; line2: string; line3: string };
    returnAddress?: string[];
    /** proof recipient; production merges real addresses */
    recipient?: string[];
  };
  /** back-side message overrides; default to headline/body */
  backHeadline?: string;
  backBody?: string;
  /** letters — anything omitted is composed from headline/body/bullets/offer */
  letter?: {
    date?: string;
    salutation?: string;
    paragraphs?: string[];
    closing?: string;
    signer?: string;
    signerTitle?: string;
    ps?: string;
    /** notice / statement reference block: Account no., Date, Re: … */
    reference?: { label: string; value: string }[];
  };
  /** reply mail: the form the recipient fills in and the Business Reply Mail panel */
  reply?: {
    title?: string;
    intro?: string;
    /** checkbox options */
    options?: string[];
    /** write-in fields, e.g. "Name", "Phone", "Email" */
    fields?: string[];
    brm?: { permitNo: string; city: string; addressee: string[] };
  };
  /** secure mailers: statement rows */
  statement?: { label: string; value: string }[];
  /** notecards: front greeting + inside message */
  greeting?: string;
  message?: string;
  /** trifold / booklet sections (title + body or bullets) */
  sections?: { title: string; body?: string; bullets?: string[] }[];
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

/** What a saved mail piece is made of: a template id, optional theme tweaks and the user's copy. */
export interface MailSelection {
  templateId: string;
  overrides?: MailThemeOverrides;
  /** the user's content; omitted = sample content (gallery previews) */
  content?: MailContent;
}
