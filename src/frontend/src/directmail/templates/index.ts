import { getFormat } from "../formats";
import { MAIL_TYPES } from "../mailTypes";
import type {
  Campaign,
  FormatId,
  Industry,
  MailCategory,
  MailFamily,
  MailTemplateSpec,
  MailTypeId,
  Vibe,
} from "../types";
import { CATALOG_TEMPLATES } from "./catalog";
import { EDDM_TEMPLATES } from "./eddm";
import { FLYER_TEMPLATES } from "./flyers";
import { DOORHANGER_TEMPLATES, RACKCARD_TEMPLATES } from "./handouts";
import { POSTCARD_TEMPLATES } from "./postcards";

export { define } from "./define";
export type { Shorthand } from "./define";

/** The 100-template starter set (not tied to a mail type). */
export const STARTER_TEMPLATES: readonly MailTemplateSpec[] = Object.freeze([
  ...POSTCARD_TEMPLATES,
  ...EDDM_TEMPLATES,
  ...FLYER_TEMPLATES,
  ...DOORHANGER_TEMPLATES,
  ...RACKCARD_TEMPLATES,
]);

/** Every template: the starter set followed by 20 per EZmailout mail type. */
export const TEMPLATES: readonly MailTemplateSpec[] = Object.freeze([
  ...STARTER_TEMPLATES,
  ...CATALOG_TEMPLATES,
]);

export const MAIL_TEMPLATE_IDS: readonly string[] = Object.freeze(
  TEMPLATES.map((t) => t.id),
);

const BY_ID: ReadonlyMap<string, MailTemplateSpec> = new Map(
  TEMPLATES.map((t) => [t.id, t]),
);

if (BY_ID.size !== TEMPLATES.length) {
  const seen = new Set<string>();
  const dupes = TEMPLATES.map((t) => t.id).filter((id) =>
    seen.has(id) ? true : (seen.add(id), false),
  );
  throw new Error(`Duplicate direct-mail template ids: ${dupes.join(", ")}`);
}

export function getTemplate(id: string): MailTemplateSpec | undefined {
  return BY_ID.get(id);
}

export function isTemplateId(id: string): boolean {
  return BY_ID.has(id);
}

export function templateCategory(t: MailTemplateSpec): MailCategory {
  return getFormat(t.format).category;
}

export interface TemplateFilter {
  category?: MailCategory;
  format?: FormatId;
  /** EZmailout mail type (the 20-template sets) */
  mailType?: MailTypeId;
  family?: MailFamily;
  campaign?: Campaign;
  industry?: Industry;
  vibe?: Vibe;
  sides?: 1 | 2;
  /** free-text match against name, description, tags, campaign and industries */
  query?: string;
}

export function filterTemplates(
  f: TemplateFilter = {},
  source: readonly MailTemplateSpec[] = TEMPLATES,
): MailTemplateSpec[] {
  const q = f.query?.trim().toLowerCase();
  return source.filter((t) => {
    if (f.category && templateCategory(t) !== f.category) return false;
    if (f.format && t.format !== f.format) return false;
    if (f.mailType && t.mailType !== f.mailType) return false;
    if (f.family && (!t.mailType || MAIL_TYPES[t.mailType].family !== f.family))
      return false;
    if (f.campaign && t.campaign !== f.campaign) return false;
    if (f.vibe && t.vibe !== f.vibe) return false;
    if (f.sides && t.sides !== f.sides) return false;
    if (
      f.industry &&
      !t.industries.includes(f.industry) &&
      !t.industries.includes("general")
    )
      return false;
    if (q) {
      const hay = [
        t.id,
        t.name,
        t.description,
        t.campaign,
        t.vibe,
        t.format,
        t.mailType ?? "",
        t.mailType ? MAIL_TYPES[t.mailType].label : "",
        ...t.tags,
        ...t.industries,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct values present in the catalogue, for building filter chips. */
export const CATALOGUE = Object.freeze({
  categories: Object.freeze([
    ...new Set(TEMPLATES.map(templateCategory)),
  ]) as readonly MailCategory[],
  formats: Object.freeze([
    ...new Set(TEMPLATES.map((t) => t.format)),
  ]) as readonly FormatId[],
  campaigns: Object.freeze([
    ...new Set(TEMPLATES.map((t) => t.campaign)),
  ]) as readonly Campaign[],
  industries: Object.freeze(
    [...new Set(TEMPLATES.flatMap((t) => t.industries))].sort(),
  ) as readonly Industry[],
  vibes: Object.freeze([
    ...new Set(TEMPLATES.map((t) => t.vibe)),
  ]) as readonly Vibe[],
});

/** The 20-template set designed for one mail type. */
export function templatesForMailType(id: MailTypeId): MailTemplateSpec[] {
  return TEMPLATES.filter((t) => t.mailType === id);
}

export {
  POSTCARD_TEMPLATES,
  EDDM_TEMPLATES,
  FLYER_TEMPLATES,
  DOORHANGER_TEMPLATES,
  RACKCARD_TEMPLATES,
};
export { CATALOG_TEMPLATES } from "./catalog";
