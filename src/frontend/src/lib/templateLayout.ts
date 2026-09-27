import type { LogoState, QrCodeState, TextBlockState } from "@/backend";
import { PERFORATION_INSET_INCHES, type PhysicalTraits } from "@/lib/physical";
import { DESIGN_PPI, type LayoutDims, safeRect } from "@/lib/printSpec";
import { shapeUrl } from "@/lib/shapes";
import {
  TEXT_PADDING,
  bandHeight,
  countLines,
  fitFontSize,
  textWidth,
} from "@/lib/textFit";
import type { DesignTemplate } from "@/types";

/**
 * How a gallery template is laid out on an artboard of a given shape.
 *
 * The rules depend only on the artboard as laid out and the piece's physical
 * traits in that orientation, so the same template builds natively either
 * way. Folds split the safe area into panels (kept ¼″ clear of each crease),
 * tear strips and #10 windows are kept clear, and the copy goes in the first
 * panel: a tall panel stacks everything in one column, a wide one puts the
 * copy in a left column. Every text band is measured with `lib/textFit.ts`
 * and everything sits inside the ¼″ safe area, so a template never overflows
 * and never trips the safe-zone checks.
 */

export type TemplateLayoutKind = "portrait" | "landscape";

/** Wider than this (width / height) and a template uses two columns. */
export const LANDSCAPE_RATIO = 1.15;

/** Headline type never shrinks below this, whatever the format (design px). */
export const MIN_TEMPLATE_HEADLINE = 14;
const MIN_COPY = 10;
const MIN_BADGE = 9;

const HEADLINE_WEIGHT = 800;
const COPY_WEIGHT = 600;
const BADGE_WEIGHT = 800;

type TextSpec = Omit<TextBlockState, "id" | "zIndex">;
type ShapeSpec = Omit<LogoState, "id" | "zIndex">;
type QrSpec = Pick<QrCodeState, "x" | "y" | "size">;

/** One element of a laid-out template, in paint order. */
export type TemplateElement =
  | { kind: "text"; role: "badge" | "headline" | "copy"; block: TextSpec }
  | { kind: "shape"; role: "rule" | "disc" | "pill"; logo: ShapeSpec }
  | { kind: "qr"; role: "qr"; qr: QrSpec };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Portrait (one column) or landscape (two columns) for a zone of this shape. */
function kindOf(w: number, h: number): TemplateLayoutKind {
  return w > h * LANDSCAPE_RATIO ? "landscape" : "portrait";
}

/** Layout kind for a whole artboard with no folds. */
export function templateLayoutKind(dims: LayoutDims): TemplateLayoutKind {
  return kindOf(dims.designWidth, dims.designHeight);
}

/** Clearance kept on each side of a crease, like the safe margin (design px). */
export const FOLD_CLEARANCE = 0.25 * DESIGN_PPI;
/** Clearance kept inside a tear line, beyond the strip itself (design px). */
const TEAR_CLEARANCE = 0.125 * DESIGN_PPI;

const NO_TRAITS: Pick<PhysicalTraits, "creases" | "perforations" | "windows"> =
  { creases: [], perforations: [], windows: [] };

/**
 * Where a template may put things on this piece: the safe area less any tear
 * strip, cut into panels by the creases (each kept `FOLD_CLEARANCE` clear of
 * a fold). Panels come top-left first, so the first holds the copy and the
 * last the QR code.
 */
export function templatePanels(
  dims: LayoutDims,
  traits: Pick<PhysicalTraits, "creases" | "perforations" | "windows">,
): Rect[] {
  const safe = safeRect(dims);
  const tear = PERFORATION_INSET_INCHES * DESIGN_PPI + TEAR_CLEARANCE;
  let left = safe.x;
  let top = safe.y;
  let right = safe.x + safe.w;
  let bottom = safe.y + safe.h;
  for (const edge of traits.perforations) {
    if (edge === "left") left = Math.max(left, tear);
    if (edge === "right") right = Math.min(right, dims.designWidth - tear);
    if (edge === "top") top = Math.max(top, tear);
    if (edge === "bottom") bottom = Math.min(bottom, dims.designHeight - tear);
  }
  const cuts = (axis: "vertical" | "horizontal", lo: number, hi: number) => {
    const size = axis === "vertical" ? dims.designWidth : dims.designHeight;
    const lines = traits.creases
      .filter((c) => c.axis === axis)
      .map((c) => c.at * size)
      .filter((p) => p > lo && p < hi)
      .sort((a, b) => a - b);
    const spans: [number, number][] = [];
    let start = lo;
    for (const p of lines) {
      spans.push([start, p - FOLD_CLEARANCE]);
      start = p + FOLD_CLEARANCE;
    }
    spans.push([start, hi]);
    return spans.filter(([a, b]) => b - a > 0);
  };
  const panels: Rect[] = [];
  for (const [y0, y1] of cuts("horizontal", top, bottom)) {
    for (const [x0, x1] of cuts("vertical", left, right)) {
      panels.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return panels;
}

/** `zone` shortened so it stays clear of every #10 window. */
function clearOfWindows(
  zone: Rect,
  traits: Pick<PhysicalTraits, "windows">,
  gap: number,
): Rect {
  let z = zone;
  for (const w of traits.windows) {
    const r = {
      x: w.xInches * DESIGN_PPI - gap,
      y: w.yInches * DESIGN_PPI - gap,
      w: w.widthInches * DESIGN_PPI + gap * 2,
      h: w.heightInches * DESIGN_PPI + gap * 2,
    };
    const hits =
      Math.min(z.x + z.w, r.x + r.w) > Math.max(z.x, r.x) &&
      Math.min(z.y + z.h, r.y + r.h) > Math.max(z.y, r.y);
    if (!hits) continue;
    // Keep whichever side of the window leaves the taller zone.
    const above = r.y - z.y;
    const below = z.y + z.h - (r.y + r.h);
    z =
      above >= below
        ? { ...z, h: Math.max(0, above) }
        : { ...z, y: r.y + r.h, h: Math.max(0, below) };
  }
  return z;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** `#rrggbb` with an alpha byte, for the faint decorative disc. */
function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

const DARK_INK = "#01080a";

/** WCAG relative luminance of `#rrggbb` (null for anything else). */
function luminance(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((c) => {
    const v = Number.parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** White or dark ink, whichever contrasts more with `hex`. */
function inkOn(hex: string): string {
  const l = luminance(hex);
  if (l === null) return "#ffffff";
  const dark = luminance(DARK_INK) ?? 0;
  return contrast(l, 1) >= contrast(l, dark) ? "#ffffff" : DARK_INK;
}

function textBlock(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
  color: string,
  align: "left" | "center" = "left",
): TextSpec {
  return {
    text,
    x,
    y,
    width,
    height,
    fontSize,
    fontWeight: BigInt(fontWeight),
    color,
    fontFamily: "Geist",
    align,
  };
}

interface Built {
  elements: TemplateElement[];
  /** Lowest edge of the text stack (design px). */
  bottom: number;
}

/**
 * Lays a template out on `dims`: accent rule down the left of the safe area,
 * a faint accent disc in the top-right corner, the overlay word as a pill
 * badge, then the headline (at most two lines) and the copy lines, and the QR
 * code in the bottom-right corner. The headline starts at a size proportional
 * to the text column's width and shrinks until the whole stack fits.
 */
export function layoutTemplate(
  template: DesignTemplate,
  dims: LayoutDims,
  traits: Pick<
    PhysicalTraits,
    "creases" | "perforations" | "windows"
  > = NO_TRAITS,
): TemplateElement[] {
  const panels = templatePanels(dims, traits);
  const first = panels[0];
  const last = panels[panels.length - 1];
  // The top-right panel: the first of the top row with the largest right edge.
  const topRow = panels.filter((p) => p.y === first.y);
  const corner = topRow[topRow.length - 1];
  const short0 = Math.min(first.w, first.h);
  const gap = Math.max(8, Math.round(short0 * 0.035));
  const zone = clearOfWindows(first, traits, gap);
  const kind = kindOf(zone.w, zone.h);
  const short = Math.min(zone.w, zone.h);
  const ruleW = Math.max(4, Math.round(short * 0.012));
  const x0 = zone.x + ruleW + gap;
  const available = zone.x + zone.w - x0;
  const colW = kind === "portrait" ? available : Math.round(available * 0.62);
  const qrShort = Math.min(last.w, last.h);
  const qrSize = template.hasQrCode
    ? clamp(
        Math.round(
          Math.min(qrShort, short) * (kind === "portrait" ? 0.24 : 0.3),
        ),
        Math.min(72, qrShort),
        150,
      )
    : 0;
  const qrInZone = last === first;
  // One column shares its panel with the QR code, so the copy stops above
  // it; two columns, or a QR code in another panel, never meet the copy.
  const floor =
    kind === "portrait" && qrSize > 0 && qrInZone
      ? zone.y + zone.h - qrSize - gap
      : zone.y + zone.h;
  const disc = Math.round(
    Math.min(Math.min(corner.w, corner.h) * 0.34, corner.w * 0.4),
  );

  const [headline, ...copies] = template.textBlocks;
  const headText = headline?.text ?? template.name;
  const headColor = headline?.color ?? inkOn(template.backgroundColor);
  // Copy keeps the template's own size relationship to the headline, damped
  // so a subline never competes with it.
  const ratio = clamp(
    ((copies[0]?.fontSize ?? 12) / (headline?.fontSize ?? 20)) * 0.75,
    0.36,
    0.55,
  );
  const badgeText = template.overlayText.trim();
  const badgeInk = inkOn(template.accentColor);

  const build = (start: number): Built => {
    const headSize = fitFontSize(headText, {
      width: colW,
      maxLines: 2,
      startSize: start,
      minSize: MIN_TEMPLATE_HEADLINE,
      fontWeight: HEADLINE_WEIGHT,
    });
    const headLines = Math.min(
      2,
      countLines(headText, {
        width: colW,
        fontSize: headSize,
        fontWeight: HEADLINE_WEIGHT,
      }),
    );
    const headH = bandHeight(headLines, {
      fontSize: headSize,
      fontWeight: HEADLINE_WEIGHT,
    });

    const elements: TemplateElement[] = [];
    let height = 0;

    // Badge: the overlay word on a pill in the accent colour.
    let badge: {
      size: number;
      bandW: number;
      bandH: number;
      padX: number;
      padY: number;
    } | null = null;
    if (badgeText) {
      const padFor = (size: number) => ({
        padX: Math.round(size * 0.7),
        padY: Math.max(2, Math.round(size * 0.25)),
      });
      let size = Math.max(MIN_BADGE, Math.round(headSize * 0.3));
      const room = (s: number) => colW - padFor(s).padX * 2;
      size = fitFontSize(badgeText, {
        width: room(size),
        maxLines: 1,
        startSize: size,
        minSize: MIN_BADGE,
        fontWeight: BADGE_WEIGHT,
      });
      const bandW = Math.min(
        room(size),
        Math.ceil(
          textWidth(badgeText, { fontSize: size, fontWeight: BADGE_WEIGHT }),
        ) +
          TEXT_PADDING * 2 +
          2,
      );
      const bandH = bandHeight(1, { fontSize: size, fontWeight: BADGE_WEIGHT });
      badge = { size, bandW, bandH, ...padFor(size) };
      height += bandH + badge.padY * 2 + gap;
    }
    height += headH;
    const copyBlocks = copies.map((c) => {
      const size = Math.max(MIN_COPY, Math.round(headSize * ratio));
      const lines = countLines(c.text, {
        width: colW,
        fontSize: size,
        fontWeight: COPY_WEIGHT,
      });
      return {
        c,
        size,
        h: bandHeight(lines, { fontSize: size, fontWeight: COPY_WEIGHT }),
      };
    });
    const copyGap = Math.round(gap * 0.6);
    for (const b of copyBlocks) height += copyGap + b.h;

    // One column starts at the top; two columns centre the stack.
    let y =
      kind === "portrait"
        ? zone.y
        : zone.y + Math.max(0, Math.round((zone.h - height) / 2));
    if (badge) {
      const pillW = badge.bandW + badge.padX * 2;
      const pillH = badge.bandH + badge.padY * 2;
      elements.push({
        kind: "shape",
        role: "pill",
        logo: {
          url: shapeUrl("badge", template.accentColor, pillW / pillH),
          x: x0,
          y,
          width: pillW,
          height: pillH,
        },
      });
      elements.push({
        kind: "text",
        role: "badge",
        block: textBlock(
          badgeText,
          x0 + badge.padX,
          y + badge.padY,
          badge.bandW,
          badge.bandH,
          badge.size,
          BADGE_WEIGHT,
          badgeInk,
          "center",
        ),
      });
      y += pillH + gap;
    }
    elements.push({
      kind: "text",
      role: "headline",
      block: textBlock(
        headText,
        x0,
        y,
        colW,
        headH,
        headSize,
        HEADLINE_WEIGHT,
        headColor,
      ),
    });
    y += headH;
    for (const b of copyBlocks) {
      y += copyGap;
      elements.push({
        kind: "text",
        role: "copy",
        block: textBlock(
          b.c.text,
          x0,
          y,
          colW,
          b.h,
          b.size,
          COPY_WEIGHT,
          b.c.color,
        ),
      });
      y += b.h;
    }
    return { elements, bottom: y };
  };

  const start = Math.max(
    MIN_TEMPLATE_HEADLINE,
    Math.min(Math.round(colW / 7.5), Math.round(short / 4.5)),
  );
  let built: Built | null = null;
  for (let size = start; size > MIN_TEMPLATE_HEADLINE && !built; size -= 1) {
    const attempt = build(size);
    if (attempt.bottom <= floor) built = attempt;
  }
  built ??= build(MIN_TEMPLATE_HEADLINE);

  return [
    {
      kind: "shape",
      role: "rule",
      logo: {
        url: shapeUrl("rect", template.accentColor),
        x: zone.x,
        y: zone.y,
        width: ruleW,
        height: zone.h,
      },
    },
    {
      kind: "shape",
      role: "disc",
      logo: {
        url: shapeUrl("circle", withAlpha(template.accentColor, 0.15)),
        x: corner.x + corner.w - disc,
        y: corner.y,
        width: disc,
        height: disc,
      },
    },
    ...built.elements,
    ...(qrSize > 0
      ? [
          {
            kind: "qr" as const,
            role: "qr" as const,
            qr: {
              x: last.x + last.w - qrSize,
              y: last.y + last.h - qrSize,
              size: qrSize,
            },
          },
        ]
      : []),
  ];
}
