/**
 * Direct-mail template library — public surface.
 *
 *   import { MailGallery, MailPiece, MailPrintSheet, TEMPLATES } from '@/directmail';
 */
export * from "./types";
export {
  FORMATS,
  SIDES_OF,
  getFormat,
  pieceSize,
  pageCss,
  inToPx,
  DPI,
} from "./formats";
export {
  MAIL_TYPES,
  MAIL_TYPE_IDS,
  MAIL_FAMILIES,
  getMailType,
  mailTypesInFamily,
} from "./mailTypes";
export { PALETTES, type PaletteId } from "./palettes";
export { FONT_LIBRARY, fontStack, loadFonts, useTemplateFonts } from "./fonts";
export { resolveTheme, mergeTheme, type ResolvedTheme } from "./theme";
export {
  MailPiece,
  MailPrintSheet,
  pieceDimensions,
  templateSides,
  renderFront,
  renderBack,
  type MailPieceProps,
} from "./MailPiece";
export { fitRuntime } from "./fit";
export { composeLetter, type ComposedLetter, type LetterTone } from "./letters";
export { paperTheme, onAccent, onInk } from "./theme";
export {
  TEMPLATES,
  STARTER_TEMPLATES,
  CATALOG_TEMPLATES,
  MAIL_TEMPLATE_IDS,
  CATALOGUE,
  getTemplate,
  isTemplateId,
  filterTemplates,
  templateCategory,
  templatesForMailType,
  define,
  type TemplateFilter,
  type Shorthand,
} from "./templates";
export { rows, type Row, type RowExtra } from "./templates/catalog";
export {
  POSTCARD_TEMPLATES,
  EDDM_TEMPLATES,
  FLYER_TEMPLATES,
  DOORHANGER_TEMPLATES,
  RACKCARD_TEMPLATES,
} from "./templates";
export { SAMPLE_CONTENT, SAMPLE_IDS, getSampleContent } from "./sample/content";
export { CATEGORY_LABELS, CAMPAIGN_LABELS, INDUSTRY_LABELS } from "./labels";
export {
  ILLUSTRATION_NAMES,
  hasIllustration,
  Illustration,
} from "./illustrations";
