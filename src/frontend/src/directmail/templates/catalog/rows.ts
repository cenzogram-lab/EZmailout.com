import { MAIL_TYPES } from "../../mailTypes";
import type { PaletteId } from "../../palettes";
import type {
  BackSpec,
  Campaign,
  FontId,
  FrontSpec,
  Industry,
  InsideSpec,
  MailTemplateSpec,
  MailTheme,
  MailTypeId,
  PatternKind,
  PhotoTreatment,
  Vibe,
} from "../../types";
import { define } from "../define";

/** Theme extras shared by the compact row format. */
export interface RowExtra {
  pattern?: PatternKind | MailTheme["pattern"];
  photo?: PhotoTreatment;
  radius?: number;
  frame?: boolean;
  shadow?: MailTheme["shadow"];
  display?: MailTheme["display"];
  tags?: string[];
  inside?: InsideSpec;
}

/**
 * One template per row:
 * [slug, name, description, campaign, sample, industries, vibe, front, back, palette, fonts, extra?]
 */
export type Row = [
  slug: string,
  name: string,
  description: string,
  campaign: Campaign,
  sample: string,
  industries: Industry[],
  vibe: Vibe,
  front: FrontSpec,
  back: BackSpec | undefined,
  palette: PaletteId,
  fonts: [FontId, FontId] | [FontId, FontId, FontId],
  extra?: RowExtra,
];

/** Builds a mail type's set; ids are `<prefix>-<nn>-<slug>`. */
export function rows(mailType: MailTypeId, list: Row[]): MailTemplateSpec[] {
  const { prefix } = MAIL_TYPES[mailType];
  return list.map(
    (
      [
        slug,
        name,
        description,
        campaign,
        sample,
        industries,
        vibe,
        front,
        back,
        palette,
        fonts,
        extra,
      ],
      i,
    ) =>
      define(`${prefix}-${String(i + 1).padStart(2, "0")}-${slug}`, {
        name,
        description,
        mailType,
        campaign,
        sample,
        industries,
        vibe,
        tags: extra?.tags,
        front,
        back,
        inside: extra?.inside,
        palette,
        fonts,
        pattern: extra?.pattern,
        photo: extra?.photo,
        radius: extra?.radius,
        frame: extra?.frame,
        shadow: extra?.shadow,
        display: extra?.display,
      }),
  );
}
