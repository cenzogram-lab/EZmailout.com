/**
 * Bridges the mail-type template library into the studio.
 *
 * Each template is rendered off screen at true size, walked into layers by
 * `toStudio.ts` and mapped onto the artboard of its EZmailout product: the
 * mail type picks the catalogue row (`MAIL_TYPE_VARIANT`), the template's
 * format picks the orientation, and the background / layer split keeps
 * everything that runs to the trim in the side's background image while the
 * copy, photos, badges and boxed elements stay movable layers.
 */
import type { CanvasSide, CanvasState, TextBlockState } from "@/backend";
import { ProductType } from "@/backend";
import {
  emptyCanvasSide,
  emptyCanvasState,
  makeLogo,
  makeQrCode,
  makeTextBlock,
} from "@/lib/canvas";
import { FONT_CATALOG } from "@/lib/fonts";
import { physicalTraitsFor } from "@/lib/physical";
import { getPricingRow } from "@/lib/pricing";
import { type Orientation, getLayoutDims, safeRect } from "@/lib/printSpec";
import type { SceneKind } from "@/lib/templateArt";
import {
  contrastRatio,
  layoutTemplateSide,
  readable,
} from "@/lib/templateLayout";
import { countLines, measuredHeight, textWidth } from "@/lib/textFit";
import {
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
  type TextExtras,
  textInkRect,
  textLinesOverlap,
  textLinesRect,
} from "@/lib/textStyle";
import type { DesignTemplate } from "@/types";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MailPiece, templateSides } from "./MailPiece";
import { fitRuntime } from "./fit";
import { FONT_LIBRARY, loadFonts } from "./fonts";
import { getFormat } from "./formats";
import { MAIL_TYPES } from "./mailTypes";
import { getSampleContent } from "./sample/content";
import { TEMPLATES } from "./templates";
import { resolveTheme } from "./theme";
import {
  type Box,
  type PaintItem,
  type StudioItem,
  type TextItem,
  cssColorToHex,
  svgDocument,
  walkPiece,
} from "./toStudio";
import type {
  FormatId,
  MailContent,
  MailTemplateSpec,
  MailTypeId,
  Side,
} from "./types";

/** The studio's catalogue row (layout variant) for each mail type. */
export const MAIL_TYPE_VARIANT: Record<MailTypeId, string> = {
  "mini-postcard-3.5x5": "3.5x5",
  "postcard-4.25x6": "4.25x6",
  "slim-postcard-4x9": "4x9",
  "postcard-5x8": "5x8",
  "postcard-6x9": "6x9",
  "jumbo-postcard-6x11": "6x11",
  "letter-8.5x11": "letter",
  "legal-letter-8.5x14": "letter_legal",
  "certified-self-mailer-8.5x11": "certified_self_mailer",
  "certified-letter-8.5x11": "certified_letter",
  "certified-self-mailer-green-card": "certified_green_card",
  "eddm-6.5x9": "eddm_6.5x9",
  "eddm-8.5x11": "eddm_8.5x11",
  "eddm-6.25x11": "eddm_6.25x11",
  "eddm-8.5x12": "eddm_8.5x12",
  "priority-letter-8.5x11": "priority_letter",
  "priority-express-letter-8.5x11": "priority_express_letter",
  "flyer-8.5x11": "8.5x11_flyer",
  "trifold-brochure-11x8.5": "11x8.5_brochure",
  "secure-self-mailer-8.5x11": "8.5x11_secure",
  "notecard-4.25x5.5": "notecard_4.25x5.5",
  "folded-notecard-4.25x5.5": "folded_notecard_4.25x5.5",
  "rack-card-4x9": "rack_card_4x9",
  "reply-postcard-4.25x6": "reply_postcard_4.25x6",
  "reply-letter-8.5x11": "reply_letter",
  "booklet-self-mailer-8.5x11": "8.5x11_booklet",
  "booklet-address-front-8.5x11": "booklet_address_front",
  "booklet-address-back-8.5x11": "booklet_address_back",
  "card-stock-12x4.5": "card_stock_12x4.5",
};

/**
 * The starter set has no mail type; its formats that match a product map to
 * that product. 5 × 7 postcards, half-sheet flyers and door hangers are not
 * EZmailout products, so those templates are not offered.
 */
const STARTER_VARIANT: Partial<Record<FormatId, string>> = {
  "postcard-4x6": "4.25x6",
  "postcard-6x9": "6x9",
  "postcard-6x11": "6x11",
  "eddm-6.5x9": "eddm_6.5x9",
  "eddm-8.5x11": "eddm_8.5x11",
  "flyer-letter": "8.5x11_flyer",
  rackcard: "rack_card_4x9",
};

/** Studio layout variant a template prints as, or null when none fits. */
export function variantOf(t: MailTemplateSpec): string | null {
  if (t.mailType) return MAIL_TYPE_VARIANT[t.mailType] ?? null;
  return STARTER_VARIANT[t.format] ?? null;
}

/** Mail-type label for a template's product. */
export function mailTypeLabel(t: MailTemplateSpec): string {
  if (t.mailType) return MAIL_TYPES[t.mailType].label;
  return getPricingRow(variantOf(t) ?? "")?.name ?? getFormat(t.format).label;
}

/** Every library template that maps onto an EZmailout product. */
export const STUDIO_MAIL_TEMPLATES: readonly MailTemplateSpec[] =
  TEMPLATES.filter((t) => variantOf(t) !== null);

/** Folded notecards are designed flat; the studio artboard is the finished face. */
function isFlatSpread(t: MailTemplateSpec): boolean {
  return t.format === "notecard-folded";
}

/** Orientation of the studio artboard that matches the template's format. */
export function orientationFor(t: MailTemplateSpec): Orientation {
  const variant = variantOf(t);
  const row = variant ? getPricingRow(variant) : undefined;
  if (!row) return "native";
  const fmt = getFormat(t.format);
  const fw = isFlatSpread(t) ? fmt.width / 2 : fmt.width;
  const fh = fmt.height;
  const sameAsNative =
    Math.abs(fw - row.widthInches) < 0.01 &&
    Math.abs(fh - row.heightInches) < 0.01;
  if (sameAsNative) return "native";
  const turned =
    Math.abs(fw - row.heightInches) < 0.01 &&
    Math.abs(fh - row.widthInches) < 0.01;
  return turned ? "rotated" : "native";
}

/* ------------------------------------------------------------------ draft */

export type DraftElement =
  | {
      kind: "text";
      block: Omit<TextBlockState, "id" | "zIndex"> & TextExtras;
    }
  | {
      kind: "logo";
      logo: {
        url: string;
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }
  | { kind: "qr"; qr: { x: number; y: number; size: number } };

export interface StudioSideDraft {
  backgroundColor: string;
  backgroundImageUrl?: string;
  elements: DraftElement[];
}

export interface StudioTemplateDraft {
  templateId: string;
  layoutVariant: string;
  orientation: Orientation;
  widthInches: number;
  heightInches: number;
  front: StudioSideDraft;
  back: StudioSideDraft;
}

interface SidePlan {
  theirs: Side;
  /** Window of their piece (piece px) that becomes the artboard. */
  crop?: (W: number, H: number) => Box;
}

function sidePlans(t: MailTemplateSpec): { front: SidePlan; back?: SidePlan } {
  const sides = templateSides(t);
  if (isFlatSpread(t)) {
    // Outside spread is back cover | front cover; inside is art | message.
    // The finished face shows the front cover, its back the message panel.
    const right = (W: number, H: number): Box => ({
      x: W / 2,
      y: 0,
      w: W / 2,
      h: H,
    });
    return {
      front: { theirs: "front", crop: right },
      back: sides.includes("back")
        ? { theirs: "back", crop: right }
        : undefined,
    };
  }
  return {
    front: { theirs: "front" },
    back: sides.includes("back") ? { theirs: "back" } : undefined,
  };
}

const SVG_PREFIX = "data:image/svg+xml;utf8,";
const svgUrl = (svg: string) => `${SVG_PREFIX}${encodeURIComponent(svg)}`;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else setTimeout(resolve, 16);
  });
}

/** Renders one surface off screen and walks it into items. */
async function renderSurface(
  t: MailTemplateSpec,
  content: MailContent,
  side: Side,
  keepOut?: Box,
): Promise<{ items: StudioItem[]; W: number; H: number; bg: string }> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-30000px;top:0;pointer-events:none;contain:none;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        createElement(MailPiece, { template: t, content, side, keepOut }),
      );
    });
    const piece = host.firstElementChild as HTMLElement;
    fitRuntime(piece);
    await nextFrame();
    fitRuntime(piece);
    const rect = piece.getBoundingClientRect();
    const items = walkPiece(piece);
    const bg =
      cssColorToHex(getComputedStyle(piece).backgroundColor)?.slice(0, 7) ??
      "#ffffff";
    return { items, W: rect.width, H: rect.height, bg };
  } finally {
    root.unmount();
    host.remove();
  }
}

const area = (b: Box) => b.w * b.h;

function within(b: Box, outer: Box, tol = 0.75): boolean {
  return (
    b.x >= outer.x - tol &&
    b.y >= outer.y - tol &&
    b.x + b.w <= outer.x + outer.w + tol &&
    b.y + b.h <= outer.y + outer.h + tol
  );
}

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const btm = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: btm - y };
}

function clipTo(b: Box, view: Box): Box | null {
  const x = Math.max(b.x, view.x);
  const y = Math.max(b.y, view.y);
  const r = Math.min(b.x + b.w, view.x + view.w);
  const btm = Math.min(b.y + b.h, view.y + view.h);
  return r - x > 0.5 && btm - y > 0.5 ? { x, y, w: r - x, h: btm - y } : null;
}

const CATALOG_FAMILIES = new Set(FONT_CATALOG.map((f) => f.family));

/**
 * Fine print is raised to 8 design px (≈ 5.8 pt); where that would run into
 * a neighbour it keeps the design's size, but never below 6 px (≈ 4.3 pt).
 */
const MIN_TEXT_PX = 8;
const MIN_TEXT_FALLBACK_PX = 6;

/** Fits a converted text block to the studio's own text measurement. */
function fitText(
  item: TextItem,
  s: number,
  view: Box,
  safe: Box,
  floor = MIN_TEXT_PX,
): DraftElement {
  const box = {
    x: (item.box.x - view.x) * s,
    y: (item.box.y - view.y) * s,
    w: item.box.w * s,
    h: item.box.h * s,
  };
  const letterSpacing = Math.max(
    LETTER_SPACING_RANGE.min,
    Math.min(LETTER_SPACING_RANGE.max, item.letterSpacing),
  );
  const lineHeight = Math.max(
    LINE_HEIGHT_RANGE.min,
    Math.min(LINE_HEIGHT_RANGE.max, item.lineHeight),
  );
  const fontFamily = CATALOG_FAMILIES.has(item.fontFamily)
    ? item.fontFamily
    : "Geist";
  const spec = (fontSize: number) => ({
    fontSize,
    fontWeight: item.fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    italic: item.italic,
  });
  let fontSize = Math.round(item.fontSize * s * 10) / 10;
  let width = Math.max(8, box.w);
  if (fontSize < floor) {
    // Fine print the design set smaller than prints legibly: bring it up to
    // the floor; a one-line run widens with it, anchored as it is aligned.
    const grow = floor / fontSize;
    fontSize = floor;
    if (item.lines <= 1) {
      const wider = width * grow;
      if (item.align === "center") box.x -= (wider - width) / 2;
      else if (item.align === "right") box.x -= wider - width;
      width = wider;
    }
  }
  const content = width - 4;
  // Never break inside a word: shrink until the longest word fits a line,
  // but not below the floor; past it the box widens instead.
  const longest = item.text
    .split(/\s+/)
    .reduce(
      (a, b) =>
        textWidth(b, spec(fontSize)) > textWidth(a, spec(fontSize)) ? b : a,
      "",
    );
  let guard = 0;
  while (
    longest &&
    textWidth(longest, spec(fontSize)) > content &&
    fontSize > Math.min(floor, item.fontSize * s) &&
    guard++ < 60
  ) {
    fontSize = Math.max(
      Math.min(floor, item.fontSize * s),
      Math.round(fontSize * 0.97 * 10) / 10,
    );
  }
  // Keep the line count the design was laid out with.
  guard = 0;
  const minSize = Math.max(Math.min(floor, item.fontSize * s), fontSize * 0.75);
  while (
    countLines(item.text, { ...spec(fontSize), width }) > item.lines &&
    fontSize > minSize &&
    guard++ < 30
  ) {
    fontSize = Math.max(minSize, Math.round(fontSize * 0.97 * 10) / 10);
  }
  const need = longest ? textWidth(longest, spec(fontSize)) + 5 : 0;
  if (need > width) {
    if (item.align === "center") box.x -= (need - width) / 2;
    else if (item.align === "right") box.x -= need - width;
    width = need;
  }
  // A run wider than the safe area only by its slack or its container's
  // padding: trim it to the safe width, as long as the lines stay the same.
  if (!item.rotation && width > safe.w) {
    const trimmed = safe.w;
    const before = countLines(item.text, { ...spec(fontSize), width });
    if (
      countLines(item.text, { ...spec(fontSize), width: trimmed }) <= before
    ) {
      box.x =
        item.align === "center"
          ? box.x + (width - trimmed) / 2
          : item.align === "right"
            ? box.x + width - trimmed
            : box.x;
      width = trimmed;
    }
  }
  const height = Math.max(
    box.h,
    Math.ceil(measuredHeight(item.text, { ...spec(fontSize), width })),
  );
  // Padding and slack can put the ink a few px past the safe margin: nudge
  // it inward by at most 6 px. Larger moves would pull a run away from the
  // rest of its group (a name from its tagline); layouts keep to the safe
  // inset instead (see `formats.ts`).
  const probe = {
    text: item.text,
    x: box.x,
    y: box.y,
    width,
    height,
    fontSize,
    fontFamily,
    fontWeight: BigInt(item.fontWeight),
    color: item.color,
    align: item.align,
    letterSpacing,
    lineHeight,
    italic: item.italic,
    rotation: item.rotation,
  } as unknown as TextBlockState;
  const ink = textInkRect(probe);
  const nudge = (lo: number, size: number, min: number, max: number) => {
    if (lo < min && lo + size + (min - lo) <= max) return min - lo;
    if (lo + size > max && lo - (lo + size - max) >= min)
      return max - (lo + size);
    return 0;
  };
  const dx = nudge(ink.x, ink.w, safe.x, safe.x + safe.w);
  const dy = nudge(ink.y, ink.h, safe.y, safe.y + safe.h);
  if (Math.abs(dx) <= 6) box.x += dx;
  if (Math.abs(dy) <= 6) box.y += dy;
  return {
    kind: "text",
    block: {
      text: item.text,
      x: Math.round(box.x * 10) / 10,
      y: Math.round(box.y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      fontSize,
      fontFamily,
      fontWeight: BigInt(
        Math.min(900, Math.max(100, Math.round(item.fontWeight / 100) * 100)),
      ),
      color: item.color,
      align: item.align,
      ...(letterSpacing ? { letterSpacing } : {}),
      ...(Math.abs(lineHeight - 1.2) > 0.001 ? { lineHeight } : {}),
      ...(item.italic ? { italic: true } : {}),
      ...(item.rotation
        ? { rotation: Math.round(item.rotation * 100) / 100 }
        : {}),
    },
  };
}

/** Paint items drawn as one SVG image layer covering `bbox` (piece px). */
function paintLayer(
  group: PaintItem[],
  bbox: Box,
  s: number,
  view: Box,
  bleed: boolean,
  marker = "",
): DraftElement {
  const w = bbox.w * s;
  const h = bbox.h * s;
  // Declared at 3x the layer's design size, like the template backgrounds,
  // so the 300 DPI export draws the vector at print resolution.
  const svg = svgDocument(
    group,
    bbox,
    w * 3,
    h * 3,
    `${bleed ? ' data-ez-bleed=""' : ""}${marker}`,
  );
  return {
    kind: "logo",
    logo: {
      url: svgUrl(svg),
      x: Math.round((bbox.x - view.x) * s * 10) / 10,
      y: Math.round((bbox.y - view.y) * s * 10) / 10,
      width: Math.round(w * 10) / 10,
      height: Math.round(h * 10) / 10,
    },
  };
}

/** Design-px rectangle of `b` (piece px) on the artboard. */
function toDesign(b: Box, s: number, view: Box): Box {
  return {
    x: (b.x - view.x) * s,
    y: (b.y - view.y) * s,
    w: b.w * s,
    h: b.h * s,
  };
}

/**
 * Splits a surface's items into the side's background image and layers.
 * Everything painted before the first movable object (and anything that
 * reaches past the safe margin, which a layer may not) goes into the
 * background; photos, artwork and boxed elements inside the safe area stay
 * movable; text and QR codes are always their own layers.
 */
function assembleSide(
  items: StudioItem[],
  bg: string,
  view: Box,
  dims: ReturnType<typeof getLayoutDims>,
  panel?: PaintItem,
  panelAt: "background" | "top" = "background",
): StudioSideDraft {
  const s = dims.designWidth / view.w;
  const safe = safeRect(dims);
  const sideArea = view.w * view.h;
  const inView = items.filter((i) => {
    const b = i.kind === "paint" ? i.bbox : i.box;
    return clipTo(b, view) !== null;
  });
  const insideSafe = (b: Box) => within(toDesign(b, s, view), safe, 0.4);
  const isObject = (i: PaintItem) => {
    if (i.role === "photo") return true;
    const b = clipTo(i.bbox, view);
    if (!b || !insideSafe(b)) return false;
    const share = area(b) / sideArea;
    return i.role === "art" ? share < 0.5 : share < 0.2;
  };
  /** Text runs the floor may have raised, by element index. */
  const raisedFrom = new Map<number, TextItem>();
  // Background: the paint run before the first object, text or QR code.
  const background: PaintItem[] = [];
  let idx = 0;
  for (; idx < inView.length; idx++) {
    const it = inView[idx];
    if (it.kind !== "paint" || isObject(it)) break;
    background.push(it);
  }
  if (panel && panelAt === "background") background.push(panel);
  // Large decoration painted later (a frame over the whole side) belongs in
  // the background too when nothing movable sits under it.
  const elements: DraftElement[] = [];
  let pending: PaintItem[] = [];
  const flush = () => {
    if (!pending.length) return;
    const bbox = clipTo(union(pending.map((p) => p.bbox)), view);
    if (bbox) {
      elements.push(paintLayer(pending, bbox, s, view, !insideSafe(bbox)));
    }
    pending = [];
  };
  for (; idx < inView.length; idx++) {
    const it = inView[idx];
    if (it.kind === "paint") {
      if (isObject(it)) {
        flush();
        const bbox = clipTo(it.bbox, view);
        if (bbox)
          elements.push(paintLayer([it], bbox, s, view, !insideSafe(bbox)));
      } else {
        pending.push(it);
      }
      continue;
    }
    flush();
    if (it.kind === "text") {
      raisedFrom.set(elements.length, it);
      elements.push(fitText(it, s, view, safe));
    } else {
      const size = Math.min(it.box.w, it.box.h) * s;
      elements.push({
        kind: "qr",
        qr: {
          x: Math.round((it.box.x - view.x) * s),
          y: Math.round((it.box.y - view.y) * s),
          size: Math.round(size),
        },
      });
    }
  }
  flush();
  if (panel && panelAt === "top")
    elements.push(
      paintLayer([panel], panel.bbox, s, view, false, ' data-ez-zone=""'),
    );
  // Fine print raised to the floor that now runs into a neighbour (a
  // tagline tucked under a name on a mini card) keeps the size the design
  // gave it instead, down to the fallback floor.
  for (const [i, item] of raisedFrom) {
    if (item.fontSize * s >= MIN_TEXT_PX) continue;
    const el = elements[i];
    if (el.kind !== "text") continue;
    const block = el.block as TextBlockState;
    const hits = elements.some(
      (o, j) =>
        j !== i &&
        o.kind === "text" &&
        textLinesOverlap(block, o.block as TextBlockState),
    );
    if (hits) elements[i] = fitText(item, s, view, safe, MIN_TEXT_FALLBACK_PX);
  }
  const backgroundImageUrl = background.length
    ? svgUrl(
        svgDocument(
          background,
          view,
          dims.designWidth * 3,
          dims.designHeight * 3,
        ),
      )
    : undefined;
  return { backgroundColor: bg, backgroundImageUrl, elements };
}

const cache = new Map<string, Promise<StudioTemplateDraft>>();
/** Converted drafts kept; scrolling the whole library would otherwise hold all 657. */
const CACHE_LIMIT = 120;
/** Conversions waiting to run, in order; `urgent` ones go to the front. */
const waiting: { id: string; run: () => Promise<void> }[] = [];
let converting = false;

async function pump(): Promise<void> {
  if (converting) return;
  converting = true;
  try {
    for (let next = waiting.shift(); next; next = waiting.shift()) {
      await next.run();
    }
  } finally {
    converting = false;
  }
}

function remember(id: string, job: Promise<StudioTemplateDraft>): void {
  cache.set(id, job);
  job.catch(() => cache.delete(id));
  // Oldest first (a Map keeps insertion order); a dropped entry is simply
  // converted again if it is asked for later.
  for (const key of cache.keys()) {
    if (cache.size <= CACHE_LIMIT) break;
    if (key !== id) cache.delete(key);
  }
}

/** Sample copy a template is previewed with. */
export function sampleContentFor(t: MailTemplateSpec): MailContent {
  return getSampleContent(t.sample);
}

/**
 * The template as studio layers, front and back, for its product. Converted
 * once per template (the most recent results are memoised); conversions run
 * one at a time so a gallery scroll never mounts dozens of off-screen pieces
 * at once. `urgent` (the customer is applying it) jumps the queue of
 * thumbnails, including when the same template was already waiting there.
 */
export function studioDraft(
  t: MailTemplateSpec,
  urgent = false,
): Promise<StudioTemplateDraft> {
  const hit = cache.get(t.id);
  if (hit) {
    if (urgent) {
      const at = waiting.findIndex((w) => w.id === t.id);
      if (at > 0) waiting.unshift(...waiting.splice(at, 1));
    }
    return hit;
  }
  const job = new Promise<StudioTemplateDraft>((resolve, reject) => {
    const entry = {
      id: t.id,
      run: () => convert(t).then(resolve, reject),
    };
    if (urgent) waiting.unshift(entry);
    else waiting.push(entry);
  });
  remember(t.id, job);
  void pump();
  return job;
}

async function convert(t: MailTemplateSpec): Promise<StudioTemplateDraft> {
  const variant = variantOf(t);
  if (!variant) throw new Error(`No EZmailout product for ${t.id}`);
  const orientation = orientationFor(t);
  const dims = getLayoutDims(variant, orientation);
  const content = sampleContentFor(t);
  await loadFonts(resolveTheme(t.theme).fontIds);
  const plans = sidePlans(t);
  const fmt = getFormat(t.format);
  const pieceW = Math.round(fmt.width * 96);
  const pieceH = Math.round(fmt.height * 96);
  const build = async (
    plan: SidePlan | undefined,
    zone?: Box,
  ): Promise<StudioSideDraft> => {
    if (!plan) return { backgroundColor: "#ffffff", elements: [] };
    const view = plan.crop
      ? plan.crop(pieceW, pieceH)
      : { x: 0, y: 0, w: pieceW, h: pieceH };
    const s = dims.designWidth / view.w;
    // The studio's address zone, in the piece's own px, for the layout to
    // leave clear.
    const keepOut = zone
      ? {
          x: view.x + zone.x / s,
          y: view.y + zone.y / s,
          w: zone.w / s,
          h: zone.h / s,
        }
      : undefined;
    const { items, bg } = await renderSurface(t, content, plan.theirs, keepOut);
    const side = assembleSide(items, bg, view, dims);
    // Only the part of the zone inside the safe area takes print: an edge
    // band in the trim margin is fine.
    const safe = safeRect(dims);
    const printable = zone ? clipTo(zone, safe) : null;
    const dark = (d: StudioSideDraft) =>
      printable
        ? groundIsDark(d, printable, dims.designWidth, dims.designHeight)
        : Promise.resolve(false);
    if (!printable || !(await dark(side))) return side;
    // The address panel the design drew here was left out with its mock
    // address; the print partner prints the address, postage and IMb
    // barcode on this patch, which needs a light ground as the panel had.
    const p = ADDRESS_PANEL_PAD;
    const d = clipTo(
      {
        x: printable.x - p,
        y: printable.y - p,
        w: printable.w + p * 2,
        h: printable.h + p * 2,
      },
      safe,
    );
    if (!d) return side;
    const box = {
      x: view.x + d.x / s,
      y: view.y + d.y / s,
      w: d.w / s,
      h: d.h / s,
    };
    const panel: PaintItem = {
      kind: "paint",
      role: "box",
      bbox: box,
      svg: `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${6 / s}" fill="#ffffff"/>`,
    };
    // In the background, where nothing painted later covers it; otherwise
    // over the artwork (text and QR codes never reach into the zone).
    const under = assembleSide(items, bg, view, dims, panel, "background");
    return (await dark(under))
      ? assembleSide(items, bg, view, dims, panel, "top")
      : under;
  };
  const front = await build(plans.front);
  let back = await build(plans.back, dims.addressZone);
  if (dims.addressZone && intrudesZone(back, dims.addressZone)) {
    // This layout cannot leave the zone clear: the back is laid out by the
    // studio's own engine in the design's palette, typeface and copy.
    back = engineBack(t, content, variant, orientation);
  }
  await fixContrast(front, dims.designWidth, dims.designHeight);
  await fixContrast(back, dims.designWidth, dims.designHeight);
  return {
    templateId: t.id,
    layoutVariant: variant,
    orientation,
    widthInches: dims.widthInches,
    heightInches: dims.heightInches,
    front,
    back,
  };
}

/**
 * A studio canvas from a converted template: fresh element ids, z-order in
 * paint order, sized for the template's product and orientation.
 */
export function canvasFromStudioDraft(draft: StudioTemplateDraft): CanvasState {
  const base = emptyCanvasState(draft.layoutVariant, draft.orientation);
  const build = (d: StudioSideDraft): CanvasSide => {
    const side: CanvasSide = {
      ...emptyCanvasSide(d.backgroundColor),
      backgroundImageUrl: d.backgroundImageUrl,
    };
    let z = 0n;
    for (const el of d.elements) {
      z += 1n;
      if (el.kind === "text") {
        side.textBlocks.push(makeTextBlock(side, { ...el.block, zIndex: z }));
      } else if (el.kind === "logo") {
        side.logos.push(makeLogo(side, el.logo.url, { ...el.logo, zIndex: z }));
      } else {
        side.qrCodes.push(makeQrCode(side, { ...el.qr, zIndex: z }));
      }
    }
    return side;
  };
  return { ...base, front: build(draft.front), back: build(draft.back) };
}

/* ------------------------------------------------- address-zone fallback */

function overlapsBy(a: Box, b: Box, m: number): boolean {
  return (
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > m &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > m
  );
}

/** True when anything but full-bleed decoration sits in the address zone. */
function intrudesZone(side: StudioSideDraft, zone: Box): boolean {
  return side.elements.some((el) => {
    if (el.kind === "text") {
      const b = el.block;
      return overlapsBy({ x: b.x, y: b.y, w: b.width, h: b.height }, zone, 0.5);
    }
    if (el.kind === "qr") {
      const q = el.qr;
      return overlapsBy({ x: q.x, y: q.y, w: q.size, h: q.size }, zone, 0.5);
    }
    // Full-bleed decoration, and the light address panel itself.
    if (/data-ez-(bleed|zone)/.test(el.logo.url)) return false;
    const l = el.logo;
    return overlapsBy({ x: l.x, y: l.y, w: l.width, h: l.height }, zone, 4);
  });
}

const SCENE_BY_INDUSTRY: Partial<Record<string, SceneKind>> = {
  realestate: "house",
  mortgage: "house",
  hotel: "house",
  moving: "house",
  construction: "tools",
  roofing: "tools",
  hvac: "thermo",
  plumbing: "tools",
  electrical: "tools",
  cleaning: "tools",
  pest: "tools",
  solar: "thermo",
  landscaping: "plant",
  florist: "plant",
  restaurant: "food",
  pizza: "food",
  bakery: "food",
  foodtruck: "food",
  cafe: "coffee",
  coffee: "coffee",
  dental: "tooth",
  medical: "health",
  pediatric: "health",
  chiropractic: "health",
  gym: "fitness",
  yoga: "fitness",
  salon: "salon",
  barber: "salon",
  spa: "salon",
  auto: "car",
  boutique: "bag",
  pets: "paw",
  vet: "paw",
  education: "cap",
  daycare: "cap",
  workshop: "cap",
  events: "calendar",
  festival: "calendar",
  arts: "calendar",
  photography: "calendar",
  insurance: "shield",
  legal: "shield",
  agency: "chart",
  coworking: "chart",
  church: "heart",
  nonprofit: "heart",
};

const hex6 = (c: string, fallback: string) =>
  (cssColorToHex(c) ?? (/^#[0-9a-f]{6}/i.test(c) ? c : fallback))
    .slice(0, 7)
    .toLowerCase();

/**
 * The template's back laid out by the studio's own engine (the gallery
 * templates' composition): the design's palette, display face and copy,
 * with the USPS zone, folds and windows of the product kept clear.
 */
function engineBack(
  t: MailTemplateSpec,
  c: MailContent,
  variant: string,
  orientation: Orientation,
): StudioSideDraft {
  const theme = resolveTheme(t.theme);
  const col = theme.colors;
  const head = FONT_LIBRARY[t.theme.fonts.display]?.family ?? "Geist";
  const weight = Number(theme.displayCss.fontWeight) || 700;
  const design: DesignTemplate = {
    id: t.id,
    name: t.name,
    description: t.description,
    productType: ProductType.Postcard,
    layoutVariant: variant,
    orientation,
    archetype: "classic",
    palette: {
      bg: hex6(col.bg, "#ffffff"),
      surface: hex6(col.surface, "#ffffff"),
      ink: hex6(col.text, "#111111"),
      muted: hex6(col.muted, "#555555"),
      accent: hex6(col.accent, "#5c5ee8"),
      accent2: hex6(col.accent2, "#f59e0b"),
      onAccent: hex6(col.onAccent, "#ffffff"),
    },
    fonts: {
      head: CATALOG_FAMILIES.has(head) ? head : "Geist",
      headWeight: weight,
    },
    scene: SCENE_BY_INDUSTRY[t.industries[0] ?? ""] ?? "pin",
    copy: {
      brand: c.business.name,
      eyebrow: c.eyebrow ?? "",
      headline: c.headline,
      subhead: c.subhead ?? "",
      listTitle: c.listTitle ?? "",
      bullets: c.bullets ?? [],
      offer: c.offer
        ? {
            big: c.offer.headline,
            small: c.offer.detail,
            code: c.offer.code,
            expires: c.offer.expires,
          }
        : undefined,
      cta: c.cta?.label ?? "Learn more",
      contact: {
        phone: c.business.phone ?? "(555) 555-0100",
        web: c.business.website ?? "yourwebsite.com",
        address: c.business.address
          ? `${c.business.address}, ${c.business.city ?? ""}`.replace(/, $/, "")
          : undefined,
      },
      qrLabel: c.qr?.caption ?? "Scan to learn more",
      back: {
        headline: c.backHeadline ?? c.headline,
        body: c.backBody ?? c.body ?? c.subhead ?? "",
      },
    },
    hasQrCode: Boolean(c.qr),
    style: "Modern",
    theme: "Professional Services",
    colors: [],
    features: [],
  };
  const dims = getLayoutDims(variant, orientation);
  const laid = layoutTemplateSide(
    design,
    dims,
    physicalTraitsFor(variant, orientation),
    "back",
  );
  return {
    backgroundColor: laid.backgroundColor,
    backgroundImageUrl: laid.backgroundImageUrl,
    elements: laid.elements.map(
      (el): DraftElement =>
        el.kind === "text"
          ? { kind: "text", block: el.block }
          : el.kind === "logo"
            ? { kind: "logo", logo: el.logo }
            : { kind: "qr", qr: el.qr },
    ),
  };
}

/* ----------------------------------------------------------------- contrast */

/** Design px the light address panel extends past the USPS zone. */
const ADDRESS_PANEL_PAD = 4;

/**
 * Whether the ground under `zone` (background plus any layer reaching into
 * it) is too dark to print an address and barcode on: more than 2% of it
 * below a relative luminance of 0.45.
 */
async function groundIsDark(
  side: StudioSideDraft,
  zone: Box,
  w: number,
  h: number,
): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(zone.w));
  canvas.height = Math.max(1, Math.round(zone.h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.translate(-zone.x, -zone.y);
  ctx.fillStyle = side.backgroundColor;
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  if (side.backgroundImageUrl) {
    const img = await loadImage(side.backgroundImageUrl);
    if (img) ctx.drawImage(img, 0, 0, w, h);
  }
  for (const el of side.elements) {
    if (el.kind !== "logo") continue;
    const l = el.logo;
    if (!overlapsBy({ x: l.x, y: l.y, w: l.width, h: l.height }, zone, 0.5))
      continue;
    const img = await loadImage(l.url);
    if (img) ctx.drawImage(img, l.x, l.y, l.width, l.height);
  }
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return false;
  }
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (relativeLuminance(data[i], data[i + 1], data[i + 2]) < 0.45) dark++;
  }
  return dark / (data.length / 4) > 0.02;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(url: string): Promise<HTMLImageElement | null> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    if (imageCache.size > 200) imageCache.clear();
    imageCache.set(url, p);
  }
  return p;
}

/**
 * Re-colours any text that does not reach WCAG AA against what is drawn
 * under it (background, then every layer below it in paint order): a
 * template's colours were chosen for its own renderer, and a few sit on art
 * that is lighter or darker than the palette pair they were checked with.
 */
async function fixContrast(
  side: StudioSideDraft,
  w: number,
  h: number,
): Promise<void> {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.fillStyle = side.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (side.backgroundImageUrl) {
    const img = await loadImage(side.backgroundImageUrl);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  for (const el of side.elements) {
    if (el.kind === "logo") {
      const img = await loadImage(el.logo.url);
      if (img)
        ctx.drawImage(img, el.logo.x, el.logo.y, el.logo.width, el.logo.height);
      continue;
    }
    if (el.kind !== "text") continue;
    const b = el.block;
    const r = textLinesRect(b as TextBlockState);
    const x = Math.max(0, Math.round(r.x));
    const y = Math.max(0, Math.round(r.y));
    const bw = Math.max(1, Math.min(canvas.width - x, Math.round(r.w)));
    const bh = Math.max(1, Math.min(canvas.height - y, Math.round(r.h)));
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(x, y, bw, bh).data;
    } catch {
      return;
    }
    const lums: { l: number; i: number }[] = [];
    for (let i = 0; i < data.length; i += 4 * 5) {
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      lums.push({ l, i });
    }
    if (!lums.length) continue;
    lums.sort((a, z) => a.l - z.l);
    const mid = lums[Math.floor(lums.length / 2)].i;
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    const under = `#${hex(data[mid])}${hex(data[mid + 1])}${hex(data[mid + 2])}`;
    const large =
      b.fontSize >= 24 || (b.fontSize >= 18.66 && Number(b.fontWeight) >= 700);
    const rgb = b.color.slice(0, 7);
    const alpha = b.color.slice(7);
    // A little above the AA ratio, so rounding never leaves it just under.
    const need = (large ? 3 : 4.5) + 0.15;
    let fixed = readable(rgb, under, need);
    if (contrastRatio(fixed, under) < need) {
      // Tinting one way could not get there (white on a mid tone): take
      // whichever of black and white reads better.
      fixed =
        contrastRatio("#000000", under) >= contrastRatio("#ffffff", under)
          ? "#000000"
          : "#ffffff";
    }
    if (fixed !== rgb) b.color = `${fixed}${alpha}`;
  }
}
