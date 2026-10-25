import type { MailTemplateSpec } from "../../types";
import { CATALOG_BOOKLETS } from "./booklets";
import { CATALOG_CARDS } from "./cards";
import { CATALOG_EDDM } from "./eddm";
import { CATALOG_HANDOUTS } from "./handouts";
import { CATALOG_LETTERS } from "./letters";
import { CATALOG_POSTCARDS } from "./postcards";

/** 20 templates for each of the 29 EZmailout mail types (580), grouped by family. */
export const CATALOG_TEMPLATES: readonly MailTemplateSpec[] = Object.freeze([
  ...CATALOG_POSTCARDS,
  ...CATALOG_LETTERS,
  ...CATALOG_EDDM,
  ...CATALOG_HANDOUTS,
  ...CATALOG_CARDS,
  ...CATALOG_BOOKLETS,
]);

export {
  CATALOG_POSTCARDS,
  CATALOG_LETTERS,
  CATALOG_EDDM,
  CATALOG_HANDOUTS,
  CATALOG_CARDS,
  CATALOG_BOOKLETS,
};
export { rows, type Row, type RowExtra } from "./rows";
