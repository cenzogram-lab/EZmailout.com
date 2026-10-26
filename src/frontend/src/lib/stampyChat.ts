import {
  CATALOG,
  CATALOG_SIZE_COUNT,
  categoryFromCents,
  categoryRows,
} from "@/lib/catalog";
import { AI_COSTS, CREDIT_VALUE_CENTS, MONTHLY_ALLOWANCE } from "@/lib/credits";
import { formatNumber } from "@/lib/format";
import {
  PRICING_LEDGER,
  type ProductSpec,
  SUBSCRIPTION_PRICE_CENTS,
  formatCents,
  getPricingRow,
  getUnitPriceCents,
  isBaseRateOnly,
  startingPriceCents,
  volumeTierSteps,
  volumeTiers,
} from "@/lib/pricing";

/**
 * Stampy's navigation chips. Replies may only point at these — the canister
 * prompt lists the same keys as `[[key]]` markers, and anything else a model
 * writes is dropped, so a reply can never produce an arbitrary link.
 */
export type NavKey =
  | "catalog"
  | "audience"
  | "studio"
  | "tracking"
  | "referrals"
  | "support";

export interface NavChip {
  key: NavKey;
  label: string;
  /** Route, or null for the support drawer. */
  to: string | null;
  /** Wizard step for `/wizard?step=N`. */
  step?: 1 | 2 | 3;
  hash?: string;
}

export const NAV_CHIPS: Record<NavKey, NavChip> = {
  catalog: { key: "catalog", label: "Explore Catalog", to: "/wizard", step: 1 },
  audience: {
    key: "audience",
    label: "Audience Manager",
    to: "/wizard",
    step: 2,
  },
  studio: { key: "studio", label: "Design Studio", to: "/wizard", step: 3 },
  tracking: { key: "tracking", label: "Campaign Tracking", to: "/campaigns" },
  referrals: {
    key: "referrals",
    label: "Referral Rewards",
    to: "/dashboard",
    hash: "referrals",
  },
  support: { key: "support", label: "Contact Support", to: null },
};

const MAX_CHIPS = 3;

function isNavKey(k: string): k is NavKey {
  return Object.hasOwn(NAV_CHIPS, k);
}

/**
 * Splits a reply into display text and its chips. Every `[[…]]` marker is
 * removed from the text; only whitelisted keys become chips.
 */
export function parseReply(raw: string): { text: string; chips: NavKey[] } {
  const chips: NavKey[] = [];
  for (const m of raw.matchAll(/\[\[\s*([a-z]+)\s*\]\]/gi)) {
    const key = m[1].toLowerCase();
    if (isNavKey(key) && !chips.includes(key) && chips.length < MAX_CHIPS) {
      chips.push(key);
    }
  }
  const text = raw
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, chips };
}

// ─── Quick answers ──────────────────────────────────────────────────────────
// Used when the AI relay is unavailable (signed out, key not configured, or a
// failed call). Every number comes from the same modules the wizard charges
// from, so a quick answer can never disagree with checkout.

const usd = (cents: number) => formatCents(cents);
const membership = usd(SUBSCRIPTION_PRICE_CENTS);

function cheapest(): string {
  const postcards = CATALOG.find((c) => c.id === "postcards");
  return postcards ? usd(categoryFromCents(postcards)) : "";
}

interface Intent {
  keywords: RegExp;
  answer: () => string;
  chips: NavKey[];
  /** Catalog and pricing questions, which a size or family price answers better. */
  priceable?: boolean;
}

// Most specific first: when two intents score the same, the earlier wins,
// so a credits question that also says "how much" is not a pricing question.
const CREDITS: Intent = {
  keywords:
    /\b(credit|credits|ai|generate|generator|image\w*|copywrit\w*|headline\w*)\b/i,
  answer: () =>
    `AI Studio lives in the design rail. 1 AI credit = ${usd(CREDIT_VALUE_CENTS)}: copy costs ${AI_COSTS.copy} credit, images ${AI_COSTS.squareImage}, ${AI_COSTS.wideImage} or ${AI_COSTS.hdImage}. Members get ${MONTHLY_ALLOWANCE} free credits every month, and packs are available any time.`,
  chips: ["studio"],
};

const INTENTS: Intent[] = [
  CREDITS,
  {
    keywords: /\b(refer\w*|invite\w*|friend\w*|free month|reward\w*)\b/i,
    answer: () =>
      `Share your referral link from the dashboard. When someone you referred makes their first payment while your membership is active, you earn one free month of membership — a ${membership} value.`,
    chips: ["referrals"],
  },
  {
    keywords:
      /\b(track\w*|deliver\w*|imb|scan\w*|status|where is|arriv\w*|timeline|usps|qr)\b/i,
    answer: () =>
      "Every campaign is tracked with USPS Intelligent Mail barcode scans on a five-stage timeline: created, in production, in transit, sorted at the local hub and delivered. Mail USPS cannot deliver (forwarded mail included) is marked Undeliverable, and mail sent back is marked Returned. Dynamic QR codes on your piece record scans too.",
    chips: ["tracking"],
  },
  {
    keywords:
      /\b(audience|csv|upload|list|address\w*|cass|verif\w*|preset\w*|radius|map|recipient\w*|mailing list)\b/i,
    answer: () =>
      "Upload a CSV or pick a saved preset in Step 2. Every address runs through USPS CASS certification on upload, so no postage is wasted on invalid routes. You can also size a drop with the radius map first.",
    chips: ["audience"],
  },
  {
    keywords:
      /\b(design|studio|canvas|template\w*|logo|bleed|safe|margin\w*|artwork|layout|font\w*)\b/i,
    answer: () =>
      "The design studio is Step 3. Keep essential copy and logos inside the green ¼″ safe line — the red ⅛″ bleed is trimmed off. Start from a template or a layout, and tap AI Studio in the rail for fresh copy or backgrounds.",
    chips: ["studio"],
  },
  {
    // Account questions go to the Dashboard. The Admin page is the founder's
    // alone, so Stampy never mentions or links it.
    keywords: /\b(settings|account|profile)\b/i,
    answer: () =>
      "Your account lives on the Dashboard: your principal, credits, membership and referral link.",
    chips: ["referrals"],
  },
  {
    keywords:
      /\b(size|sizes|product|products|catalog|format|postcard\w*|letter\w*|brochure\w*|flyer\w*|booklet\w*|eddm|certified|priority|notecard\w*|rack card\w*|jumbo|trifold)\b/i,
    priceable: true,
    answer: () =>
      `We print ${CATALOG.length} product families in ${CATALOG_SIZE_COUNT} sizes — postcards from 3.5×5 up to the Jumbo 6×11, letters, Certified Mail, EDDM®, Priority Mail, flyers, brochures, booklets and more. Step 1 of the wizard shows every size with its exact per-piece price.`,
    chips: ["catalog"],
  },
  {
    keywords:
      /\b(price|pricing|cost|costs|how much|membership|member|subscri\w*|minimum|minimums|wholesale|cheap\w*|fee)\b|\$9/i,
    priceable: true,
    answer: () =>
      `There are no batch minimums — mail one piece or thousands. The volume-priced postcards, letters and brochures get cheaper at 1,000, 10,000 and 50,000 pieces, and a ${membership}/month membership gets their 10,000-piece rate from the first piece. Every price includes printing, postage and CASS address verification; postcards go as low as ${cheapest()} each.`,
    chips: ["catalog"],
  },
  {
    keywords:
      /\b(support|human|person|agent|contact|help me|problem|issue|bug|broken|refund|complain\w*|error)\b/i,
    answer: () =>
      "I'll get you to a human. Open Contact Support and our postal team will reply by email.",
    chips: ["support"],
  },
];

const FALLBACK: Intent = {
  keywords: /$^/,
  answer: () =>
    "Woof — I can help with pricing, sizes, audiences, design, tracking, credits and referrals. Ask away, or reach our postal team through Contact Support.",
  chips: ["catalog", "support"],
};

// ─── Size and family prices ─────────────────────────────────────────────────
// "How much is a 6x9 postcard?" should get the 6 × 9 price, not the catalog
// overview. Prices come from PRICING_LEDGER, the table checkout charges from.

const PRICE_WORDS =
  /\b(price\w*|cost\w*|how much|rate|rates|cheap\w*|fee|per piece)\b|\$/i;
const MEMBERSHIP_WORDS = /\b(membership|member|subscri\w*|minimum\w*)\b|\$9\b/i;
const INCLUDED = "printing, postage and CASS address verification included";
const EDDM_INCLUDED =
  "printing included; EDDM® saturation postage is added per carrier route";

/** What the prices of `rows` include, in words (EDDM® prices are print only). */
function includedFor(rows: ProductSpec[]): string {
  const eddm = rows.filter(isBaseRateOnly).length;
  if (eddm === rows.length) return EDDM_INCLUDED;
  return eddm > 0
    ? `${INCLUDED} (EDDM® prices are printing only; saturation postage is added per carrier route)`
    : INCLUDED;
}
/** A shared size lists at most this many formats, cheapest first. */
const MAX_LISTED = 5;

/** Product-family words, most specific first ("reply postcard" is Reply Mail). */
const FAMILY_WORDS: [RegExp, string][] = [
  [/\bcertified\b/i, "certified-mail"],
  [/\beddm\b|\bevery door\b/i, "eddm"],
  [/\bexpress\b/i, "priority-mail-express"],
  [/\bpriority\b/i, "priority-mail-plus"],
  [/\bsecure\b|\bpressure[- ]?seal\b|\bsnap ?pack\b/i, "secure-mailers"],
  [/\breply\b/i, "reply-mail"],
  [/\brack ?cards?\b/i, "rack-cards"],
  [/\bnote ?cards?\b/i, "notecards"],
  [/\bbooklets?\b/i, "booklets"],
  [/\bbrochures?\b|\btri-?fold\b/i, "brochures"],
  [/\bflyers?\b|\bfliers?\b/i, "flyers"],
  [/\bcard ?stock\b/i, "card-stock"],
  [/\bletters?\b/i, "letters"],
  [/\bpost ?cards?\b/i, "postcards"],
];

/** Two dimensions such as 6x9, 6 × 9, 8.5"x11 or 6 by 9, each 3–14 inches. */
const SIZE =
  /(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s*(?:["″”]|in(?:ch(?:es)?)?)?\s*(?:x|×|by)\s*(\d{1,2}(?:\.\d{1,2})?)(?![\d.])/i;

function familyIn(question: string): string | null {
  return FAMILY_WORDS.find(([re]) => re.test(question))?.[1] ?? null;
}

function sizeIn(question: string): [number, number] | null {
  const m = question.match(SIZE);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a >= 3 && a <= 14 && b >= 3 && b <= 14 ? [a, b] : null;
}

const sameSize = (row: ProductSpec, [a, b]: [number, number]) => {
  const near = (x: number, y: number) => Math.abs(x - y) < 0.01;
  return (
    (near(row.widthInches, a) && near(row.heightInches, b)) ||
    (near(row.widthInches, b) && near(row.heightInches, a))
  );
};

/** One format's price in words: its volume tiers, or its flat price. */
function rowPrice(row: ProductSpec): string {
  if (!volumeTiers(row.id)) return `${usd(row.retailPriceCents)} per piece`;
  const steps = volumeTierSteps(row.id).map(({ minimum, cents }) =>
    minimum === 0
      ? `${usd(cents)} per piece under 1,000 pieces`
      : `${usd(cents)} from ${formatNumber(minimum)}`,
  );
  const member = usd(getUnitPriceCents(row.id, 1, true));
  return `${steps.join(", ")}, and members pay no more than ${member} at any volume`;
}

/** "from $0.56" for a volume-priced format, "$1.05" for a flat one. */
const fromPrice = (row: ProductSpec) =>
  `${volumeTiers(row.id) ? "from " : ""}${usd(startingPriceCents(row.id))}`;

function priceAnswer(question: string): string | null {
  const family = familyIn(question);
  const size = sizeIn(question);
  if (size) {
    const exact = PRICING_LEDGER.filter((r) => sameSize(r, size));
    // A legacy size name ("4x6" for the 4.25 × 6 card) finds its row.
    const legacy = getPricingRow(`${size[0]}x${size[1]}`);
    const all = exact.length || !legacy ? exact : [legacy];
    const inFamily = all.filter((r) => r.category === family);
    const rows = inFamily.length ? inFamily : all;
    if (rows.length === 1) {
      return `The ${rows[0].name} is ${rowPrice(rows[0])}, with ${includedFor(rows)}.`;
    }
    if (rows.length > 1) {
      const cheapestFirst = [...rows].sort(
        (a, b) => startingPriceCents(a.id) - startingPriceCents(b.id),
      );
      const list = cheapestFirst
        .slice(0, MAX_LISTED)
        .map((r) => `${r.name} ${fromPrice(r)}`)
        .join(", ");
      const more =
        rows.length > MAX_LISTED
          ? ` and ${rows.length - MAX_LISTED} more in Step 1`
          : "";
      return `${size[0]} × ${size[1]} comes in ${rows.length} formats: ${list}${more}. Each price is per piece, with ${includedFor(cheapestFirst.slice(0, MAX_LISTED))}.`;
    }
    return `We don't print a ${size[0]} × ${size[1]} piece. Step 1 of the wizard lists all ${CATALOG_SIZE_COUNT} sizes with their prices.`;
  }
  if (
    family &&
    PRICE_WORDS.test(question) &&
    !MEMBERSHIP_WORDS.test(question)
  ) {
    const category = CATALOG.find((c) => c.id === family);
    const rows = category ? categoryRows(category) : [];
    if (!category || !rows.length) return null;
    const low = rows.reduce((a, b) =>
      startingPriceCents(b.id) < startingPriceCents(a.id) ? b : a,
    );
    if (rows.length === 1) {
      return `The ${low.name} is ${rowPrice(low)}, with ${includedFor([low])}.`;
    }
    const memberNote = volumeTiers(low.id) ? ", from 50,000 pieces" : "";
    return `Prices for ${category.name} start at ${usd(startingPriceCents(low.id))} per piece (${low.name}${memberNote}), across ${rows.length} sizes. Every price has ${includedFor(rows)}.`;
  }
  return null;
}

const hitsFor = (intent: Intent, question: string) => {
  const flags = intent.keywords.flags.includes("g")
    ? intent.keywords.flags
    : `${intent.keywords.flags}g`;
  return [...question.matchAll(new RegExp(intent.keywords, flags))].length;
};

/**
 * Best quick answer. A question naming a size or a product family with a
 * price word gets that exact price; otherwise the intent with the most
 * keyword hits wins. The price lookup stands aside when another topic
 * (credits, tracking, design…) is what the question is about.
 */
export function quickAnswer(question: string): {
  text: string;
  chips: NavKey[];
} {
  const hits = INTENTS.map((intent) => hitsFor(intent, question));
  const otherTopic = INTENTS.some((intent, i) => !intent.priceable && hits[i]);
  const aboutCredits = hitsFor(CREDITS, question) > 0;
  if (!aboutCredits && (!otherTopic || PRICE_WORDS.test(question))) {
    const text = priceAnswer(question);
    if (text) return { text, chips: ["catalog"] };
  }
  let best = FALLBACK;
  let bestHits = 0;
  INTENTS.forEach((intent, i) => {
    if (hits[i] > bestHits) {
      best = intent;
      bestHits = hits[i];
    }
  });
  return { text: best.answer(), chips: best.chips };
}

export const STAMPY_GREETING =
  "Woof! I'm Stampy, your postal copilot. Ask me about pricing, sizes, audiences, design or tracking — I'll point you to the right place.";

export const STARTER_QUESTIONS = [
  "How does pricing work?",
  "What sizes can I mail?",
  "How do I track a campaign?",
  "How do referrals work?",
];

/** Window event that opens the Stampy panel from anywhere (the header's peeking Stampy). */
export const OPEN_STAMPY_EVENT = "ezmailout:open-stampy";

export function openStampy(): void {
  window.dispatchEvent(new Event(OPEN_STAMPY_EVENT));
}
