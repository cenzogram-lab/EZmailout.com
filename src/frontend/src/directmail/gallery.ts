/**
 * The mail-type library as gallery entries: each template's facets in the
 * gallery's own terms (style, theme, category, colours, features, price),
 * plus the converted canvas the previews and the studio use. Loaded on
 * demand (`import("@/directmail/gallery")`), so the renderer and the 680
 * designs never weigh on the first page load.
 */
import type { CanvasState } from "@/backend";
import { categoryForVariant } from "@/lib/catalog";
import { getPricingRow, startingPriceCents } from "@/lib/pricing";
import type { Orientation } from "@/lib/printSpec";
import { TEMPLATE_COLORS } from "@/lib/templates";
import type {
  TemplateColor,
  TemplateFeature,
  TemplateStyle,
  TemplateTheme,
} from "@/types";
import { templateSides } from "./MailPiece";
import { CAMPAIGN_LABELS, INDUSTRY_LABELS } from "./labels";
import {
  STUDIO_MAIL_TEMPLATES,
  canvasFromStudioDraft,
  mailTypeLabel,
  orientationFor,
  studioDraft,
  variantOf,
} from "./studio";
import { resolveTheme } from "./theme";
import type { Industry, MailTemplateSpec, Vibe } from "./types";

export interface MailGalleryEntry {
  id: string;
  name: string;
  description: string;
  style: TemplateStyle;
  theme: TemplateTheme;
  category: string;
  colors: TemplateColor[];
  features: TemplateFeature[];
  layoutVariant: string;
  orientation: Orientation;
  /** Width / height of the artboard. */
  aspect: number;
  /** The product it is designed for ("6 × 9 Postcard"). */
  mailType: string;
  /** Whether it has a designed back (letters and some flyers print one side). */
  twoSided: boolean;
  priceCents: number;
  /** Lower-case words the search matches against. */
  search: string;
}

const STYLE_BY_VIBE: Record<Vibe, TemplateStyle> = {
  bold: "Bold",
  elegant: "Elegant",
  playful: "Playful",
  professional: "Corporate",
  organic: "Modern",
  editorial: "Modern",
  retro: "Bold",
  minimal: "Minimalist",
  luxury: "Elegant",
  festive: "Playful",
};

const THEME_BY_INDUSTRY: Partial<Record<Industry, TemplateTheme>> = {
  realestate: "Real Estate",
  mortgage: "Real Estate",
  moving: "Real Estate",
  restaurant: "Restaurants & Cafés",
  pizza: "Restaurants & Cafés",
  cafe: "Restaurants & Cafés",
  bakery: "Restaurants & Cafés",
  coffee: "Restaurants & Cafés",
  foodtruck: "Restaurants & Cafés",
  dental: "Health & Dental",
  medical: "Health & Dental",
  pediatric: "Health & Dental",
  chiropractic: "Health & Dental",
  landscaping: "Home Services",
  construction: "Home Services",
  roofing: "Home Services",
  cleaning: "Home Services",
  hvac: "Home Services",
  plumbing: "Home Services",
  electrical: "Home Services",
  pest: "Home Services",
  solar: "Home Services",
  boutique: "Retail & E-commerce",
  florist: "Retail & E-commerce",
  legal: "Professional Services",
  insurance: "Professional Services",
  agency: "Professional Services",
  coworking: "Professional Services",
  photography: "Professional Services",
  gym: "Fitness & Wellness",
  yoga: "Fitness & Wellness",
  spa: "Fitness & Wellness",
  salon: "Beauty & Salon",
  barber: "Beauty & Salon",
  auto: "Automotive",
  events: "Events & Nonprofit",
  festival: "Events & Nonprofit",
  nonprofit: "Events & Nonprofit",
  church: "Events & Nonprofit",
  arts: "Events & Nonprofit",
  hotel: "Events & Nonprofit",
  education: "Education",
  daycare: "Education",
  workshop: "Education",
  pets: "Pets",
  vet: "Pets",
};

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m
    ? [
        Number.parseInt(m[1], 16),
        Number.parseInt(m[2], 16),
        Number.parseInt(m[3], 16),
      ]
    : null;
}

/** Nearest named swatch of the Color filter. */
function colourName(hex: string): TemplateColor | null {
  const c = rgb(hex);
  if (!c) return null;
  let best: TemplateColor | null = null;
  let dist = Number.POSITIVE_INFINITY;
  for (const s of TEMPLATE_COLORS) {
    const t = rgb(s.hex);
    if (!t) continue;
    // Weighted RGB distance (red-mean), good enough to name a swatch.
    const rm = (c[0] + t[0]) / 2;
    const d =
      (2 + rm / 256) * (c[0] - t[0]) ** 2 +
      4 * (c[1] - t[1]) ** 2 +
      (2 + (255 - rm) / 256) * (c[2] - t[2]) ** 2;
    if (d < dist) {
      dist = d;
      best = s.name;
    }
  }
  return best;
}

function featuresOf(t: MailTemplateSpec): TemplateFeature[] {
  const out = new Set<TemplateFeature>();
  if (t.back?.showQr !== false && t.back) out.add("QR code");
  if (
    t.front.showOffer ||
    t.front.badge ||
    t.back?.layout === "coupon" ||
    t.front.layout === "coupon-grid" ||
    t.front.layout === "offer-hero" ||
    t.campaign === "offer"
  )
    out.add("Coupon or offer");
  if (t.front.showBullets || t.back?.showBullets || t.front.layout === "list")
    out.add("Checklist");
  if (
    t.front.showEvent ||
    t.front.layout === "event-poster" ||
    t.campaign === "event" ||
    t.campaign === "open-house"
  )
    out.add("Event details");
  if (t.front.image === "illustration") out.add("Illustration");
  if (
    t.front.layout.startsWith("letter") ||
    t.front.layout.startsWith("secure")
  )
    out.add("Signature");
  return [...out];
}

function entryOf(t: MailTemplateSpec): MailGalleryEntry {
  const variant = variantOf(t) ?? "6x9";
  const orientation = orientationFor(t);
  const row = getPricingRow(variant);
  const theme = resolveTheme(t.theme);
  const colours = [theme.colors.accent, theme.colors.bg, theme.colors.accent2]
    .map(colourName)
    .filter((c): c is TemplateColor => c !== null);
  const w = row?.widthInches ?? 6;
  const h = row?.heightInches ?? 9;
  const aspect = orientation === "rotated" ? h / w : w / h;
  const category = categoryForVariant(variant)?.name ?? "Postcards";
  const mailType = mailTypeLabel(t);
  const industries = t.industries.map((i) => INDUSTRY_LABELS[i] ?? i);
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    style: STYLE_BY_VIBE[t.vibe] ?? "Modern",
    theme: THEME_BY_INDUSTRY[t.industries[0]] ?? "Professional Services",
    category,
    colors: [...new Set(colours)],
    features: featuresOf(t),
    layoutVariant: variant,
    orientation,
    aspect,
    mailType,
    twoSided: templateSides(t).includes("back"),
    priceCents: row ? startingPriceCents(row.id) : 0,
    search: [
      t.name,
      t.description,
      t.vibe,
      CAMPAIGN_LABELS[t.campaign],
      ...industries,
      ...t.tags,
      category,
      mailType,
    ]
      .join(" ")
      .toLowerCase(),
  };
}

/**
 * Every entry, dealt round-robin across the products they are designed for,
 * so the gallery shows a postcard, a letter, an EDDM® mailer, a brochure…
 * rather than twenty mini postcards in a row.
 */
export const MAIL_GALLERY: readonly MailGalleryEntry[] = (() => {
  const groups = new Map<string, MailGalleryEntry[]>();
  for (const e of STUDIO_MAIL_TEMPLATES.map(entryOf)) {
    const list = groups.get(e.mailType) ?? [];
    list.push(e);
    groups.set(e.mailType, list);
  }
  const out: MailGalleryEntry[] = [];
  const lists = [...groups.values()];
  for (let i = 0; out.length < STUDIO_MAIL_TEMPLATES.length; i++) {
    for (const list of lists) if (list[i]) out.push(list[i]);
  }
  return out;
})();

const BY_ID = new Map(STUDIO_MAIL_TEMPLATES.map((t) => [t.id, t]));
const canvases = new Map<string, Promise<CanvasState>>();

/** Preview canvases kept (the most recently converted). */
const CANVAS_LIMIT = 120;

/** The template as a studio canvas (converted once, then cached). */
export function mailCanvas(id: string): Promise<CanvasState> {
  let hit = canvases.get(id);
  if (!hit) {
    const t = BY_ID.get(id);
    if (!t) return Promise.reject(new Error(`Unknown template ${id}`));
    hit = studioDraft(t).then(canvasFromStudioDraft);
    hit.catch(() => canvases.delete(id));
    canvases.set(id, hit);
    for (const key of canvases.keys()) {
      if (canvases.size <= CANVAS_LIMIT) break;
      if (key !== id) canvases.delete(key);
    }
  }
  return hit;
}

/**
 * A fresh canvas (new element ids) to put on the artboard. The customer is
 * waiting on it, so it goes ahead of any thumbnails still converting.
 */
export async function mailCanvasForStudio(id: string): Promise<CanvasState> {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown template ${id}`);
  return canvasFromStudioDraft(await studioDraft(t, true));
}
