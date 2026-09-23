import { CATALOG, CATALOG_SIZE_COUNT, categoryFromCents } from "@/lib/catalog";
import { AI_COSTS, CREDIT_VALUE_CENTS, MONTHLY_ALLOWANCE } from "@/lib/credits";
import { SUBSCRIPTION_PRICE_CENTS, formatCents } from "@/lib/pricing";

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
  | "admin"
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
  admin: { key: "admin", label: "Admin Settings", to: "/admin" },
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
}

// Most specific first: when two intents score the same, the earlier wins,
// so a credits question that also says "how much" is not a pricing question.
const INTENTS: Intent[] = [
  {
    keywords:
      /\b(credit|credits|ai|generate|generator|image\w*|copywrit\w*|headline\w*)\b/i,
    answer: () =>
      `AI Studio lives in the design rail. 1 AI credit = ${usd(CREDIT_VALUE_CENTS)}: copy costs ${AI_COSTS.copy} credit, images ${AI_COSTS.squareImage}, ${AI_COSTS.wideImage} or ${AI_COSTS.hdImage}. Members get ${MONTHLY_ALLOWANCE} free credits every month, and packs are available any time.`,
    chips: ["studio"],
  },
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
      "Every campaign is tracked with USPS Intelligent Mail barcode scans on a five-stage timeline: created, in production, in transit, sorted at the local hub and delivered. Dynamic QR codes on your piece record scans too.",
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
    keywords:
      /\b(admin|api key\w*|keys|stripe|resend|openai|click2mail credential\w*|webhook\w*|settings)\b/i,
    answer: () =>
      "Admins set the Click2Mail, Stripe, Resend and OpenAI keys in Admin settings. Secrets are stored in the canister and only ever shown masked.",
    chips: ["admin"],
  },
  {
    keywords:
      /\b(size|sizes|product|products|catalog|format|postcard\w*|letter\w*|brochure\w*|flyer\w*|booklet\w*|eddm|certified|priority|notecard\w*|rack card\w*|jumbo|trifold)\b/i,
    answer: () =>
      `We print ${CATALOG.length} product families in ${CATALOG_SIZE_COUNT} sizes — postcards from 3.5×5 up to the Jumbo 6×11, letters, Certified Mail, EDDM®, Priority Mail, flyers, brochures, booklets and more. Step 1 of the wizard shows every size with its exact per-piece price.`,
    chips: ["catalog"],
  },
  {
    keywords:
      /\b(price|pricing|cost|costs|how much|membership|member|subscri\w*|minimum|minimums|wholesale|cheap\w*|fee)\b|\$9/i,
    answer: () =>
      `A ${membership}/month membership unlocks Click2Mail wholesale print and USPS postage with no batch minimums — mail one piece or thousands. Every price includes printing, postage and CASS address verification; postcards start at ${cheapest()} each.`,
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

/** Best-matching quick answer: the intent with the most keyword hits wins. */
export function quickAnswer(question: string): {
  text: string;
  chips: NavKey[];
} {
  let best = FALLBACK;
  let bestHits = 0;
  for (const intent of INTENTS) {
    const flags = intent.keywords.flags.includes("g")
      ? intent.keywords.flags
      : `${intent.keywords.flags}g`;
    const hits = [...question.matchAll(new RegExp(intent.keywords, flags))]
      .length;
    if (hits > bestHits) {
      best = intent;
      bestHits = hits;
    }
  }
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
