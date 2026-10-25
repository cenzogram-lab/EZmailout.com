import { MAIL_TYPES } from "../mailTypes";
import { PALETTES, type PaletteId } from "../palettes";
import type {
  BackSpec,
  Campaign,
  FontId,
  FormatId,
  FrontSpec,
  Industry,
  InsideSpec,
  MailColors,
  MailTemplateSpec,
  MailTheme,
  MailTypeId,
  PatternKind,
  PhotoTreatment,
  Vibe,
} from "../types";

export interface Shorthand {
  name: string;
  description: string;
  /** print geometry; defaults to the mail type's format when `mailType` is given */
  format?: FormatId;
  /** EZmailout mail type this template is designed for */
  mailType?: MailTypeId;
  campaign: Campaign;
  industries: Industry[];
  vibe: Vibe;
  tags?: string[];
  sample: string;
  front: FrontSpec;
  /** omit for single-sided pieces; 'details' = flyer back */
  back?: BackSpec;
  /** booklets: inside spread recipe */
  inside?: InsideSpec;
  palette: PaletteId | MailColors;
  fonts: [display: FontId, body: FontId, accent?: FontId];
  display?: MailTheme["display"];
  pattern?: PatternKind | MailTheme["pattern"];
  photo?: PhotoTreatment;
  radius?: number;
  frame?: boolean;
  shadow?: MailTheme["shadow"];
  inkColor?: string;
}

export function define(id: string, s: Shorthand): MailTemplateSpec {
  const colors =
    typeof s.palette === "string" ? PALETTES[s.palette] : s.palette;
  const format =
    s.format ?? (s.mailType ? MAIL_TYPES[s.mailType].format : undefined);
  if (!format) throw new Error(`template ${id}: format or mailType required`);
  const sides: 1 | 2 | 4 = format === "booklet" ? 4 : s.back ? 2 : 1;
  const theme: MailTheme = {
    colors,
    fonts: { display: s.fonts[0], body: s.fonts[1], accent: s.fonts[2] },
    display: s.display,
    pattern: typeof s.pattern === "string" ? { kind: s.pattern } : s.pattern,
    photo: s.photo,
    radius: s.radius,
    frame: s.frame,
    shadow: s.shadow,
    inkColor: s.inkColor,
  };
  return {
    id,
    name: s.name,
    description: s.description,
    format,
    sides,
    mailType: s.mailType,
    campaign: s.campaign,
    industries: s.industries,
    vibe: s.vibe,
    tags: s.tags ?? [],
    front: s.front,
    back: s.back,
    inside: s.inside,
    theme,
    sample: s.sample,
  };
}
