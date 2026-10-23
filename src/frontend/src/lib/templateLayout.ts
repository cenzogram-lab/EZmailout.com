import type { LogoState, QrCodeState, TextBlockState } from "@/backend";
import { PERFORATION_INSET_INCHES, type PhysicalTraits } from "@/lib/physical";
import { DESIGN_PPI, type LayoutDims, safeRect } from "@/lib/printSpec";
import { shapeUrl } from "@/lib/shapes";
import {
  type BackgroundKind,
  type Box,
  type IconKind,
  type TemplatePalette,
  backgroundUrl,
  burstUrl,
  couponUrl,
  framedSceneUrl,
  iconUrl,
  sceneUrl,
  tint,
} from "@/lib/templateArt";
import {
  TEXT_PADDING,
  bandHeight,
  countLines,
  fitFontSize,
  textWidth,
} from "@/lib/textFit";
import type { CanvasSideKey, DesignTemplate } from "@/types";

/**
 * How a gallery template is laid out on an artboard of a given shape.
 *
 * A template is content (copy, palette, fonts, a scene) plus a composition
 * (`archetype`). The composition is never placed in absolute coordinates:
 * each region of the piece gets a *stack* of items — brand line, headline,
 * subhead, checklist, coupon, button, contact lines, QR code — and the stack
 * is fitted to its box by searching the type scale (every size measured with
 * `lib/textFit.ts`), dropping optional items in priority order only when even
 * the smallest readable scale does not fit. So one template builds natively
 * on every format and orientation:
 *
 * - folds split the safe area into panels, each kept ¼″ clear of a crease
 *   (`templatePanels`); the cover goes in the first panel, details in the
 *   middle one and contact details in the last;
 * - tear strips, #10 windows and — on the back — the USPS address zone are
 *   kept clear;
 * - every layer sits inside the ¼″ safe area; anything that runs to the trim
 *   (gradients, bands, arcs) is the side's vector background image.
 */

export type TemplateLayoutKind = "portrait" | "landscape";

/** Wider than this (width / height) and a region uses two columns. */
export const LANDSCAPE_RATIO = 1.15;

/** Headline type never shrinks below this, whatever the format (design px). */
export const MIN_TEMPLATE_HEADLINE = 14;
/** Smallest body and caption type (design px ≈ 7.5 pt). */
const MIN_SMALL = 10.5;
/** Smallest printed QR code (design px = 0.7″), still reliably scannable. */
export const MIN_TEMPLATE_QR = 70;
const MAX_QR = 130;

type TextSpec = Omit<TextBlockState, "id" | "zIndex">;
type LogoSpec = Omit<LogoState, "id" | "zIndex">;
type QrSpec = Pick<QrCodeState, "x" | "y" | "size">;

/** One element of a laid-out template, in paint order. */
export type TemplateElement =
  | { kind: "text"; role: string; block: TextSpec }
  | { kind: "logo"; role: string; logo: LogoSpec }
  | { kind: "qr"; role: "qr"; qr: QrSpec };

/** One side of a laid-out template. */
export interface TemplateSide {
  backgroundColor: string;
  backgroundImageUrl: string;
  elements: TemplateElement[];
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
/** Gap kept around a #10 window or the USPS zone (design px). */
const KEEP_CLEAR = 0.125 * DESIGN_PPI;

type Traits = Pick<PhysicalTraits, "creases" | "perforations" | "windows">;

const NO_TRAITS: Traits = { creases: [], perforations: [], windows: [] };

/** The safe area less any tear strip (design px). */
function usableRect(dims: LayoutDims, traits: Traits): Box {
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
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function creaseLines(
  dims: LayoutDims,
  traits: Traits,
  axis: "vertical" | "horizontal",
): number[] {
  const size = axis === "vertical" ? dims.designWidth : dims.designHeight;
  return traits.creases
    .filter((c) => c.axis === axis)
    .map((c) => c.at * size)
    .sort((a, b) => a - b);
}

/**
 * Where a template may put things on this piece: the safe area less any tear
 * strip, cut into panels by the creases (each kept `FOLD_CLEARANCE` clear of
 * a fold). Panels come top-left first.
 */
export function templatePanels(dims: LayoutDims, traits: Traits): Box[] {
  const u = usableRect(dims, traits);
  const cuts = (axis: "vertical" | "horizontal", lo: number, hi: number) => {
    const spans: [number, number][] = [];
    let start = lo;
    for (const p of creaseLines(dims, traits, axis).filter(
      (q) => q > lo && q < hi,
    )) {
      spans.push([start, p - FOLD_CLEARANCE]);
      start = p + FOLD_CLEARANCE;
    }
    spans.push([start, hi]);
    return spans.filter(([a, b]) => b - a > 0);
  };
  const panels: Box[] = [];
  for (const [y0, y1] of cuts("horizontal", u.y, u.y + u.h)) {
    for (const [x0, x1] of cuts("vertical", u.x, u.x + u.w)) {
      panels.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return panels;
}

/** Panels between the creases, out to the trim (for backgrounds). */
function rawPanels(dims: LayoutDims, traits: Traits): Box[] {
  const span = (axis: "vertical" | "horizontal") => {
    const size = axis === "vertical" ? dims.designWidth : dims.designHeight;
    const stops = [0, ...creaseLines(dims, traits, axis), size];
    const out: [number, number][] = [];
    for (let i = 0; i < stops.length - 1; i += 1)
      out.push([stops[i], stops[i + 1]]);
    return out;
  };
  const panels: Box[] = [];
  for (const [y0, y1] of span("horizontal")) {
    for (const [x0, x1] of span("vertical")) {
      panels.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return panels;
}

const overlaps = (a: Box, b: Box) =>
  Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) &&
  Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);

const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);

/**
 * The parts of `zone` left over around an obstacle (grown by `gap`): above,
 * below, left and right of it. Left and right run the zone's full height,
 * or with `bands` only the obstacle's own height (text flowing around a
 * window: above it, beside it, below it).
 */
function around(zone: Box, obstacle: Box, gap: number, bands = false): Box[] {
  const o = {
    x: obstacle.x - gap,
    y: obstacle.y - gap,
    w: obstacle.w + gap * 2,
    h: obstacle.h + gap * 2,
  };
  if (!overlaps(zone, o)) return [zone];
  const right = zone.x + zone.w;
  const bottom = zone.y + zone.h;
  const sy = bands ? Math.max(zone.y, o.y) : zone.y;
  const sh = bands ? Math.min(bottom, o.y + o.h) - sy : zone.h;
  return [
    { x: zone.x, y: zone.y, w: zone.w, h: o.y - zone.y },
    { x: zone.x, y: o.y + o.h, w: zone.w, h: bottom - (o.y + o.h) },
    { x: zone.x, y: sy, w: o.x - zone.x, h: sh },
    { x: o.x + o.w, y: sy, w: right - (o.x + o.w), h: sh },
  ].filter((b) => b.w > 0 && b.h > 0);
}

function windowBoxes(traits: Pick<PhysicalTraits, "windows">): Box[] {
  return traits.windows.map((w) => ({
    x: w.xInches * DESIGN_PPI,
    y: w.yInches * DESIGN_PPI,
    w: w.widthInches * DESIGN_PPI,
    h: w.heightInches * DESIGN_PPI,
  }));
}

/** The largest part of `zone` clear of every obstacle. */
function largestClear(zone: Box, obstacles: Box[], gap: number): Box {
  let best = zone;
  for (const o of obstacles) {
    const parts = around(best, o, gap);
    best = parts.reduce(
      (a, b) => (area(b) > area(a) ? b : a),
      parts[0] ?? best,
    );
  }
  return best;
}

/** Every useful part of `zone` clear of the obstacles, largest first. */
function clearParts(
  zone: Box,
  obstacles: Box[],
  gap: number,
  bands = false,
): Box[] {
  let parts = [zone];
  for (const o of obstacles) {
    parts = parts.flatMap((p) => around(p, o, gap, bands));
  }
  // Drop slivers and parts wholly inside a bigger one.
  const useful = parts
    .filter((p) => Math.min(p.w, p.h) >= 0.9 * DESIGN_PPI)
    .sort((a, b) => area(b) - area(a));
  const out: Box[] = [];
  for (const p of useful) {
    if (out.some((q) => overlaps(p, q))) continue;
    out.push(p);
  }
  return out;
}

// ─── Colour ──────────────────────────────────────────────────────────────────

/** WCAG relative luminance of `#rrggbb` (null for anything else). */
export function luminance(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((c) => {
    const v = Number.parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a) ?? 1;
  const lb = luminance(b) ?? 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `color`, darkened or lightened in steps until it reads on `bg` (≥ `min`). */
export function readable(color: string, bg: string, min = 4.5): string {
  if (contrastRatio(color, bg) >= min) return color;
  const darker = (luminance(bg) ?? 1) > 0.4;
  let c = color;
  for (let i = 1; i <= 10; i += 1) {
    c = tint(color, darker ? -i * 0.1 : i * 0.1);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return darker ? "#000000" : "#ffffff";
}

/** The palette the back uses: the front's, or a light one for dark fronts. */
export function backPalette(p: TemplatePalette): TemplatePalette {
  if ((luminance(p.bg) ?? 1) >= 0.35) return p;
  const bg = "#ffffff";
  const accent = readable(p.accent, bg, 3.2);
  return {
    bg,
    surface: tint(p.accent, 0.9),
    ink: "#111827",
    muted: "#4b5563",
    accent,
    accent2: p.accent2,
    onAccent: readable("#ffffff", accent, 4.5),
  };
}

// ─── Stacks ──────────────────────────────────────────────────────────────────

export type Align = "left" | "center" | "right";

interface TextItem {
  t: "text";
  role: string;
  text: string;
  family?: string;
  weight: number;
  /** Size as a fraction of the stack's base (the headline size). */
  rel: number;
  min?: number;
  maxLines: number;
  color: string;
  align?: Align;
  /** Optional items are dropped highest first when nothing else fits. */
  drop?: number;
}
interface GapItem {
  t: "gap";
  rel: number;
}
interface RuleItem {
  t: "rule";
  color: string;
  /** Width as a fraction of the column. */
  wFrac: number;
  hRel: number;
  align?: Align;
  drop?: number;
}
interface PillItem {
  t: "pill";
  role: string;
  text: string;
  fill: string;
  ink: string;
  rel: number;
  family?: string;
  weight: number;
  align?: Align;
  /** An outlined pill (no fill) in this colour. */
  outline?: string;
  drop?: number;
}
interface ListLine {
  icon: IconKind;
  text: string;
}
interface ListItem {
  t: "list";
  role: string;
  lines: ListLine[];
  rel: number;
  color: string;
  iconFill: string;
  iconInk: string;
  weight: number;
  family?: string;
  maxLinesEach?: number;
  drop?: number;
}
interface ArtItem {
  t: "art";
  role: string;
  /** Image for a `w × h` box. */
  make: (w: number, h: number) => string;
  /** Width / height. */
  aspect: number;
  /** Height as a multiple of the base. */
  hRel: number;
  /** Cap on the width as a fraction of the column. */
  wFrac?: number;
  align?: Align;
  drop?: number;
}
interface QrItem {
  t: "qr";
  rel: number;
  label?: string;
  labelColor: string;
  align?: Align;
  drop?: number;
}
interface BoxItem {
  t: "box";
  role: string;
  style: "card" | "coupon";
  fill: string;
  stroke: string;
  items: Item[];
  padRel: number;
  drop?: number;
}
interface RowItem {
  t: "row";
  left: TextItem;
  right: TextItem;
  drop?: number;
}
interface BurstItem {
  t: "burst";
  big: string;
  small: string;
  fill: string;
  ink: string;
  family: string;
  /** Diameter as a multiple of the base. */
  rel: number;
  align?: Align;
  drop?: number;
}

type Item =
  | TextItem
  | GapItem
  | RuleItem
  | PillItem
  | ListItem
  | ArtItem
  | QrItem
  | BoxItem
  | RowItem
  | BurstItem;

/** Item groups anchored to the top, the middle and the bottom of a box. */
export interface Groups {
  top?: Item[];
  middle?: Item[];
  bottom?: Item[];
}

interface Measured {
  h: number;
  place: (x: number, y: number, out: TemplateElement[]) => void;
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
  family = "Geist",
  align: Align = "left",
): TextSpec {
  return {
    text,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.ceil(height),
    fontSize,
    fontWeight: BigInt(fontWeight),
    color,
    fontFamily: family,
    align,
  };
}

const alignX = (x: number, colW: number, w: number, align: Align = "left") =>
  align === "center"
    ? x + (colW - w) / 2
    : align === "right"
      ? x + colW - w
      : x;

function measureText(
  it: TextItem,
  base: number,
  colW: number,
): { size: number; lines: number; h: number } {
  const family = it.family ?? "Geist";
  const min = it.min ?? MIN_SMALL;
  const start = Math.max(min, Math.round(base * it.rel));
  const size = fitFontSize(it.text, {
    width: colW,
    maxLines: it.maxLines,
    startSize: start,
    minSize: min,
    fontWeight: it.weight,
    fontFamily: family,
  });
  const lines = countLines(it.text, {
    width: colW,
    fontSize: size,
    fontWeight: it.weight,
    fontFamily: family,
  });
  return {
    size,
    lines,
    h: bandHeight(lines, {
      fontSize: size,
      fontWeight: it.weight,
      fontFamily: family,
    }),
  };
}

function measure(it: Item, base: number, colW: number): Measured {
  switch (it.t) {
    case "gap": {
      const h = Math.round(base * it.rel);
      return { h, place: () => {} };
    }
    case "text": {
      const m = measureText(it, base, colW);
      return {
        h: m.h,
        place: (x, y, out) =>
          out.push({
            kind: "text",
            role: it.role,
            block: textBlock(
              it.text,
              x,
              y,
              colW,
              m.h,
              m.size,
              it.weight,
              it.color,
              it.family,
              it.align,
            ),
          }),
      };
    }
    case "rule": {
      const h = Math.max(2, Math.round(base * it.hRel));
      const w = Math.round(colW * it.wFrac);
      return {
        h,
        place: (x, y, out) =>
          out.push({
            kind: "logo",
            role: "rule",
            logo: {
              url: shapeUrl("rect", it.color),
              x: Math.round(alignX(x, colW, w, it.align)),
              y: Math.round(y),
              width: w,
              height: h,
            },
          }),
      };
    }
    case "pill": {
      const family = it.family ?? "Geist";
      const min = MIN_SMALL + 0.5;
      let size = Math.max(min, Math.round(base * it.rel));
      const pad = (s: number) => ({
        x: Math.round(s * 1.1),
        y: Math.max(3, Math.round(s * 0.45)),
      });
      size = fitFontSize(it.text, {
        width: colW - pad(size).x * 2,
        maxLines: 1,
        startSize: size,
        minSize: min,
        fontWeight: it.weight,
        fontFamily: family,
      });
      const p = pad(size);
      const bandW = Math.min(
        colW - p.x * 2,
        Math.ceil(
          textWidth(it.text, {
            fontSize: size,
            fontWeight: it.weight,
            fontFamily: family,
          }),
        ) +
          TEXT_PADDING * 2 +
          2,
      );
      const bandH = bandHeight(1, {
        fontSize: size,
        fontWeight: it.weight,
        fontFamily: family,
      });
      const w = bandW + p.x * 2;
      const h = bandH + p.y * 2;
      return {
        h,
        place: (x, y, out) => {
          const px = alignX(x, colW, w, it.align);
          out.push({
            kind: "logo",
            role: `${it.role}-pill`,
            logo: {
              url: it.outline
                ? outlinePillUrl(it.outline, w, h)
                : shapeUrl("badge", it.fill, w / h),
              x: Math.round(px),
              y: Math.round(y),
              width: Math.round(w),
              height: Math.round(h),
            },
          });
          out.push({
            kind: "text",
            role: it.role,
            block: textBlock(
              it.text,
              px + p.x,
              y + p.y,
              bandW,
              bandH,
              size,
              it.weight,
              it.ink,
              family,
              "center",
            ),
          });
        },
      };
    }
    case "list": {
      const family = it.family ?? "Geist";
      const size = Math.max(MIN_SMALL, Math.round(base * it.rel));
      const icon = Math.round(size * 1.3);
      const gapX = Math.round(size * 0.55);
      const textW = Math.max(20, colW - icon - gapX);
      const rows = it.lines.map((line) => {
        const lines = Math.min(
          it.maxLinesEach ?? 3,
          countLines(line.text, {
            width: textW,
            fontSize: size,
            fontWeight: it.weight,
            fontFamily: family,
          }),
        );
        const real = countLines(line.text, {
          width: textW,
          fontSize: size,
          fontWeight: it.weight,
          fontFamily: family,
        });
        const th = bandHeight(Math.max(lines, real), {
          fontSize: size,
          fontWeight: it.weight,
          fontFamily: family,
        });
        return { line, th, h: Math.max(icon, th) };
      });
      const lineGap = Math.round(size * 0.45);
      const h =
        rows.reduce((s, r) => s + r.h, 0) +
        lineGap * Math.max(0, rows.length - 1);
      return {
        h,
        place: (x, y, out) => {
          let cy = y;
          for (const r of rows) {
            const lineTop = cy + (r.h - r.th) / 2;
            // The icon centres on the first line of text.
            const firstLine = bandHeight(1, {
              fontSize: size,
              fontWeight: it.weight,
              fontFamily: family,
            });
            out.push({
              kind: "logo",
              role: `${it.role}-icon`,
              logo: {
                url: iconUrl(r.line.icon, it.iconFill, it.iconInk, icon),
                x: Math.round(x),
                y: Math.round(lineTop + Math.max(0, (firstLine - icon) / 2)),
                width: icon,
                height: icon,
              },
            });
            out.push({
              kind: "text",
              role: it.role,
              block: textBlock(
                r.line.text,
                x + icon + gapX,
                lineTop,
                textW,
                r.th,
                size,
                it.weight,
                it.color,
                family,
              ),
            });
            cy += r.h + lineGap;
          }
        },
      };
    }
    case "art": {
      let h = Math.round(base * it.hRel);
      let w = Math.round(h * it.aspect);
      const maxW = Math.round(colW * (it.wFrac ?? 1));
      if (w > maxW) {
        w = maxW;
        h = Math.round(w / it.aspect);
      }
      return {
        h,
        place: (x, y, out) => {
          const px = alignX(x, colW, w, it.align);
          out.push({
            kind: "logo",
            role: it.role,
            logo: {
              url: it.make(w, h),
              x: Math.round(px),
              y: Math.round(y),
              width: w,
              height: h,
            },
          });
        },
      };
    }
    case "qr": {
      // Big enough to scan, never a poster: a fraction of the column.
      const size = Math.max(
        MIN_TEMPLATE_QR,
        Math.min(MAX_QR, Math.round(base * it.rel), Math.round(colW * 0.3)),
      );
      const gapX = Math.round(size * 0.14);
      const labelW = colW - size - gapX;
      const label =
        it.label && labelW >= 60
          ? (() => {
              const fs = Math.max(
                MIN_SMALL,
                Math.min(Math.round(size * 0.15), Math.round(base * 0.3)),
              );
              const fitted = fitFontSize(it.label, {
                width: labelW,
                maxLines: 3,
                startSize: fs,
                minSize: MIN_SMALL,
                fontWeight: 600,
              });
              const lines = countLines(it.label, {
                width: labelW,
                fontSize: fitted,
                fontWeight: 600,
              });
              return {
                size: fitted,
                h: bandHeight(lines, { fontSize: fitted, fontWeight: 600 }),
              };
            })()
          : null;
      const h = Math.max(size, label?.h ?? 0);
      return {
        h,
        place: (x, y, out) => {
          const right = it.align === "right";
          const qx = label
            ? right
              ? x + colW - size
              : x
            : alignX(x, colW, size, it.align);
          out.push({
            kind: "qr",
            role: "qr",
            qr: { x: Math.round(qx), y: Math.round(y + (h - size) / 2), size },
          });
          if (label && it.label) {
            const lx = right ? x : x + size + gapX;
            out.push({
              kind: "text",
              role: "qr-label",
              block: textBlock(
                it.label,
                lx,
                y + (h - label.h) / 2,
                labelW,
                label.h,
                label.size,
                600,
                it.labelColor,
                "Geist",
                right ? "right" : "left",
              ),
            });
          }
        },
      };
    }
    case "box": {
      const pad = Math.max(8, Math.round(base * it.padRel));
      const inner = colW - pad * 2;
      const parts = it.items.map((sub) => measure(sub, base, inner));
      const h = parts.reduce((s, p) => s + p.h, 0) + pad * 2;
      return {
        h,
        place: (x, y, out) => {
          out.push({
            kind: "logo",
            role: `${it.role}-box`,
            logo: {
              url:
                it.style === "coupon"
                  ? couponUrl(it.fill, it.stroke, colW, h)
                  : cardUrl(it.fill, it.stroke, colW, h),
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(colW),
              height: Math.round(h),
            },
          });
          let cy = y + pad;
          for (const p of parts) {
            p.place(x + pad, cy, out);
            cy += p.h;
          }
        },
      };
    }
    case "row": {
      const half = Math.floor((colW - 12) / 2);
      const l = measureText(it.left, base, half);
      const r = measureText(it.right, base, half);
      const h = Math.max(l.h, r.h);
      return {
        h,
        place: (x, y, out) => {
          out.push({
            kind: "text",
            role: it.left.role,
            block: textBlock(
              it.left.text,
              x,
              y,
              half,
              l.h,
              l.size,
              it.left.weight,
              it.left.color,
              it.left.family,
              "left",
            ),
          });
          out.push({
            kind: "text",
            role: it.right.role,
            block: textBlock(
              it.right.text,
              x + colW - half,
              y,
              half,
              r.h,
              r.size,
              it.right.weight,
              it.right.color,
              it.right.family,
              "right",
            ),
          });
        },
      };
    }
    case "burst": {
      const d = Math.min(colW, Math.max(90, Math.round(base * it.rel)));
      // Text sits in the inner square of the rosette's circle.
      const inner = Math.round(d * 0.62);
      const big = fitFontSize(it.big, {
        width: inner,
        maxLines: 1,
        startSize: Math.round(d * 0.3),
        minSize: 12,
        fontWeight: 400,
        fontFamily: it.family,
      });
      const bigH = bandHeight(1, {
        fontSize: big,
        fontWeight: 400,
        fontFamily: it.family,
      });
      const small = fitFontSize(it.small, {
        width: inner,
        maxLines: 2,
        startSize: Math.max(MIN_SMALL, Math.round(d * 0.09)),
        minSize: MIN_SMALL,
        fontWeight: 700,
      });
      const smallLines = countLines(it.small, {
        width: inner,
        fontSize: small,
        fontWeight: 700,
      });
      const smallH = bandHeight(smallLines, {
        fontSize: small,
        fontWeight: 700,
      });
      return {
        h: d,
        place: (x, y, out) => {
          const px = alignX(x, colW, d, it.align);
          out.push({
            kind: "logo",
            role: "burst",
            logo: {
              url: burstUrl(it.fill, it.ink, d),
              x: Math.round(px),
              y: Math.round(y),
              width: d,
              height: d,
            },
          });
          const total = bigH + smallH;
          const top = y + (d - total) / 2;
          const ix = px + (d - inner) / 2;
          out.push({
            kind: "text",
            role: "offer",
            block: textBlock(
              it.big,
              ix,
              top,
              inner,
              bigH,
              big,
              400,
              it.ink,
              it.family,
              "center",
            ),
          });
          out.push({
            kind: "text",
            role: "offer-detail",
            block: textBlock(
              it.small,
              ix,
              top + bigH,
              inner,
              smallH,
              small,
              700,
              it.ink,
              "Geist",
              "center",
            ),
          });
        },
      };
    }
    default:
      return { h: 0, place: () => {} };
  }
}

function cardUrl(
  fill: string,
  stroke: string,
  width: number,
  height: number,
): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const r = Math.min(18, Math.min(w, h) * 0.12);
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/></svg>`,
  )}`;
}

function outlinePillUrl(stroke: string, width: number, height: number): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const sw = Math.max(1.5, h * 0.05);
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="${(h - sw) / 2}" fill="none" stroke="${stroke}" stroke-width="${sw}"/></svg>`,
  )}`;
}

/** Items with something to show: no empty text, list or box. */
function present(items: Item[]): Item[] {
  return items.flatMap((it): Item[] => {
    if (it.t === "text" && !it.text.trim()) return [];
    if (it.t === "pill" && !it.text.trim()) return [];
    if (it.t === "list" && it.lines.length === 0) return [];
    if (it.t === "box") {
      const items = present(it.items);
      return items.some((x) => x.t !== "gap") ? [{ ...it, items }] : [];
    }
    return [it];
  });
}

const dropOf = (it: Item): number | undefined =>
  "drop" in it ? it.drop : undefined;

/**
 * Fits item groups into `box`: the largest base size (the headline's size)
 * at which every group fits, found by bisection; when even `minBase` is too
 * big, the optional item with the highest `drop` goes and the search runs
 * again. Returns the elements in paint order.
 */
export function fitStack(
  groups: Groups,
  box: Box,
  opts: { start?: number; minBase?: number; gap?: number } = {},
): TemplateElement[] {
  const minBase = opts.minBase ?? MIN_TEMPLATE_HEADLINE;
  const start = Math.max(
    minBase,
    Math.round(opts.start ?? Math.min(box.w / 6, box.h / 4)),
  );
  let g: Required<Groups> = {
    top: present(groups.top ?? []),
    middle: present(groups.middle ?? []),
    bottom: present(groups.bottom ?? []),
  };

  const layout = (base: number) => {
    const m = {
      top: g.top.map((it) => measure(it, base, box.w)),
      middle: g.middle.map((it) => measure(it, base, box.w)),
      bottom: g.bottom.map((it) => measure(it, base, box.w)),
    };
    const sum = (a: Measured[]) => a.reduce((s, x) => s + x.h, 0);
    const gap = Math.round(opts.gap ?? base * 0.6);
    const used = [m.top, m.middle, m.bottom].filter((a) => a.length > 0);
    const total =
      sum(m.top) +
      sum(m.middle) +
      sum(m.bottom) +
      gap * Math.max(0, used.length - 1);
    return { m, total, gap };
  };

  for (;;) {
    let lo = minBase;
    let hi = start;
    let best: ReturnType<typeof layout> | null = null;
    const atMin = layout(lo);
    if (atMin.total <= box.h) {
      best = atMin;
      while (hi - lo > 0.5) {
        const mid = Math.round(((lo + hi) / 2) * 2) / 2;
        if (mid <= lo) break;
        const attempt = layout(mid);
        if (attempt.total <= box.h) {
          lo = mid;
          best = attempt;
        } else {
          hi = mid - 0.5;
        }
      }
      if (hi > lo) {
        const attempt = layout(hi);
        if (attempt.total <= box.h) best = attempt;
      }
    }
    if (best) return place(best.m, box, best.gap);
    // Drop the most optional item, wherever it is.
    let worst: { group: keyof Groups; index: number; drop: number } | null =
      null;
    for (const key of ["top", "middle", "bottom"] as const) {
      g[key].forEach((it, index) => {
        const d = dropOf(it);
        if (d !== undefined && (!worst || d > worst.drop))
          worst = { group: key, index, drop: d };
      });
    }
    if (!worst) return place(atMin.m, box, atMin.gap);
    const w: { group: keyof Groups; index: number } = worst;
    g = { ...g, [w.group]: g[w.group].filter((_, i) => i !== w.index) };
  }
}

function place(
  m: { top: Measured[]; middle: Measured[]; bottom: Measured[] },
  box: Box,
  gap: number,
): TemplateElement[] {
  const out: TemplateElement[] = [];
  const sum = (a: Measured[]) => a.reduce((s, x) => s + x.h, 0);
  let y = box.y;
  for (const it of m.top) {
    it.place(box.x, y, out);
    y += it.h;
  }
  const topEnd = y;
  const bottomH = sum(m.bottom);
  const bottomStart = box.y + box.h - bottomH;
  const midH = sum(m.middle);
  const free = bottomStart - topEnd;
  // The middle group is centred in what the top and bottom leave, never
  // closer than `gap` to either.
  let my = topEnd + Math.max(m.top.length ? gap : 0, (free - midH) / 2);
  if (m.bottom.length && my + midH > bottomStart - gap)
    my = Math.max(topEnd, bottomStart - gap - midH);
  for (const it of m.middle) {
    it.place(box.x, my, out);
    my += it.h;
  }
  let by = bottomStart;
  for (const it of m.bottom) {
    it.place(box.x, by, out);
    by += it.h;
  }
  return out;
}

// ─── Compositions ───────────────────────────────────────────────────────────

export type TemplateArchetype =
  | "gradient"
  | "split"
  | "poster"
  | "classic"
  | "band"
  | "event"
  | "dark"
  | "offer"
  | "letterhead";

interface Ctx {
  t: DesignTemplate;
  p: TemplatePalette;
  head: string;
  headWeight: number;
}

const contactLines = (t: DesignTemplate, withAddress = true): ListLine[] => [
  { icon: "phone", text: t.copy.contact.phone },
  { icon: "web", text: t.copy.contact.web },
  ...(withAddress && t.copy.contact.address
    ? [{ icon: "pin" as const, text: t.copy.contact.address }]
    : []),
];

function brandLine(c: Ctx, color: string, align: Align = "left"): TextItem {
  return {
    t: "text",
    role: "brand",
    text: c.t.copy.brand,
    weight: 800,
    rel: 0.26,
    maxLines: 1,
    color,
    align,
  };
}

function headline(
  c: Ctx,
  color: string,
  align: Align = "left",
  maxLines = 3,
  rel = 1,
): TextItem {
  return {
    t: "text",
    role: "headline",
    text: c.t.copy.headline,
    family: c.head,
    weight: c.headWeight,
    rel,
    min: MIN_TEMPLATE_HEADLINE,
    maxLines,
    color,
    align,
  };
}

function subhead(
  c: Ctx,
  color: string,
  align: Align = "left",
  drop = 6,
): TextItem {
  return {
    t: "text",
    role: "subhead",
    text: c.t.copy.subhead,
    weight: 500,
    rel: 0.36,
    maxLines: 4,
    color,
    align,
    drop,
  };
}

function eyebrow(c: Ctx, color: string, align: Align = "left"): TextItem {
  return {
    t: "text",
    role: "eyebrow",
    text: c.t.copy.eyebrow.toUpperCase(),
    weight: 800,
    rel: 0.24,
    maxLines: 1,
    color,
    align,
    drop: 7,
  };
}

function cta(c: Ctx, align: Align = "left", drop = 5): PillItem {
  return {
    t: "pill",
    role: "cta",
    text: c.t.copy.cta,
    fill: c.p.accent,
    ink: c.p.onAccent,
    rel: 0.32,
    weight: 700,
    align,
    drop,
  };
}

function qr(c: Ctx, color: string, align: Align = "left", drop = 3): QrItem[] {
  return c.t.hasQrCode
    ? [
        {
          t: "qr",
          rel: 2.6,
          label: c.t.copy.qrLabel,
          labelColor: color,
          align,
          drop,
        },
      ]
    : [];
}

function contactList(
  c: Ctx,
  color: string,
  withAddress = true,
  drop = 4,
): ListItem {
  return {
    t: "list",
    role: "contact",
    lines: contactLines(c.t, withAddress),
    rel: 0.27,
    color,
    iconFill: c.p.accent,
    iconInk: c.p.onAccent,
    weight: 600,
    maxLinesEach: 2,
    drop,
  };
}

function checklist(c: Ctx, color: string, drop = 6): ListItem {
  return {
    t: "list",
    role: "bullet",
    lines: c.t.copy.bullets.map((text) => ({ icon: "check" as const, text })),
    rel: 0.29,
    color,
    iconFill: c.p.accent,
    iconInk: c.p.onAccent,
    weight: 500,
    maxLinesEach: 2,
    drop,
  };
}

function offerCoupon(c: Ctx, drop = 5): BoxItem[] {
  const o = c.t.copy.offer;
  if (!o) return [];
  const ink = readable(c.p.ink, c.p.surface);
  return [
    {
      t: "box",
      role: "coupon",
      style: "coupon",
      fill: c.p.surface,
      stroke: c.p.accent,
      padRel: 0.4,
      drop,
      items: [
        {
          t: "text",
          role: "offer",
          text: o.big,
          family: "Bebas Neue",
          weight: 400,
          rel: 0.8,
          min: 16,
          maxLines: 1,
          color: readable(c.p.accent, c.p.surface),
          align: "center",
        },
        {
          t: "text",
          role: "offer-detail",
          text: o.small,
          weight: 600,
          rel: 0.27,
          maxLines: 2,
          color: ink,
          align: "center",
        },
        ...(o.code
          ? [
              {
                t: "text" as const,
                role: "offer-code",
                text: o.code,
                family: "Geist Mono",
                weight: 700,
                rel: 0.24,
                maxLines: 1,
                color: ink,
                align: "center" as const,
              },
            ]
          : []),
      ],
    },
  ];
}

/** Cover, detail and contact regions of a side, folds and windows cleared. */
interface Frame {
  cover: Box;
  /** The cover's panel out to the trim and folds, for backgrounds. */
  coverRaw: Box;
  detail: Box | null;
  contact: Box | null;
  raw: Box[];
}

function frontFrame(dims: LayoutDims, traits: Traits): Frame {
  const panels = templatePanels(dims, traits);
  const raw = rawPanels(dims, traits);
  const windows = windowBoxes(traits);
  const clear = (b: Box) => largestClear(b, windows, KEEP_CLEAR);
  const cover = clear(panels[0]);
  const coverRaw = raw[0] ?? {
    x: 0,
    y: 0,
    w: dims.designWidth,
    h: dims.designHeight,
  };
  if (panels.length === 1)
    return { cover, coverRaw, detail: null, contact: null, raw };
  const contact = clear(panels[panels.length - 1]);
  const detail = panels.length >= 3 ? clear(panels[1]) : null;
  return { cover, coverRaw, detail, contact, raw };
}

/** Starting base for a column: the headline's natural size there. */
const startFor = (w: number, h: number) => Math.min(w / 6.2, h / 4.2);

/** Generic detail panel: heading, checklist and the offer. */
function detailPanel(c: Ctx, box: Box): TemplateElement[] {
  return fitStack(
    {
      top: [
        {
          t: "text",
          role: "detail-heading",
          text: c.t.copy.listTitle,
          family: c.head,
          weight: c.headWeight,
          rel: 0.6,
          min: 13,
          maxLines: 2,
          color: c.p.ink,
        },
        { t: "gap", rel: 0.3 },
        checklist(c, c.p.ink, 8),
      ],
      bottom: [...offerCoupon(c, 6)],
    },
    box,
    { start: startFor(box.w, box.h) },
  );
}

/**
 * Generic contact panel: illustration, then the checklist and offer when no
 * detail panel carries them (a bifold), else the call to action, then the
 * contact lines and QR code.
 */
function contactPanel(
  c: Ctx,
  box: Box,
  withDetail: boolean,
): TemplateElement[] {
  // A short, wide panel (the lower half of a half-folded mailer) gets two
  // columns: the details on the left, the way to respond on the right.
  if (withDetail && box.w > box.h * 1.5) {
    const gap = Math.round(box.h * 0.1);
    const [l, r] = columns(box, 0.56, gap);
    return [
      ...detailPanel(c, l),
      ...fitStack(
        {
          top: [
            {
              t: "art",
              role: "scene",
              make: (w, h) => framedSceneUrl(c.t.scene, "circle", c.p, w, h),
              aspect: 1,
              hRel: 2.4,
              wFrac: 0.5,
              align: "left",
              drop: 7,
            },
          ],
          bottom: [
            contactList(c, c.p.ink, true, 6),
            { t: "gap", rel: 0.3 },
            ...qr(c, c.p.muted),
          ],
        },
        r,
        { start: startFor(r.w, r.h) },
      ),
    ];
  }
  const middle: Item[] = withDetail
    ? [
        {
          t: "text",
          role: "detail-heading",
          text: c.t.copy.listTitle,
          family: c.head,
          weight: c.headWeight,
          rel: 0.6,
          min: 13,
          maxLines: 2,
          color: c.p.ink,
        },
        { t: "gap", rel: 0.3 },
        checklist(c, c.p.ink, 8),
        { t: "gap", rel: 0.4 },
        ...offerCoupon(c, 6),
      ]
    : [
        {
          t: "text",
          role: "detail-heading",
          text: c.t.copy.cta,
          family: c.head,
          weight: c.headWeight,
          rel: 0.6,
          min: 13,
          maxLines: 2,
          color: c.p.ink,
          align: "center",
        },
      ];
  return fitStack(
    {
      top: [
        {
          t: "art",
          role: "scene",
          make: (w, h) => framedSceneUrl(c.t.scene, "circle", c.p, w, h),
          aspect: 1,
          hRel: withDetail ? 2.4 : 3.2,
          wFrac: 0.6,
          align: "center",
          drop: 7,
        },
      ],
      middle,
      bottom: [
        contactList(c, c.p.ink, true, 6),
        { t: "gap", rel: 0.3 },
        ...qr(c, c.p.muted),
      ],
    },
    box,
    { start: startFor(box.w, box.h) },
  );
}

/** Splits a landscape region into a text column and an art column. */
function columns(box: Box, textFrac: number, gap: number): [Box, Box] {
  const tw = Math.round((box.w - gap) * textFrac);
  return [
    { x: box.x, y: box.y, w: tw, h: box.h },
    { x: box.x + tw + gap, y: box.y, w: box.w - tw - gap, h: box.h },
  ];
}

/** An art layer filling as much of `box` as its aspect allows, centred. */
function artIn(
  box: Box,
  aspect: number,
  make: (w: number, h: number) => string,
  role = "scene",
): TemplateElement {
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  w = Math.round(w);
  h = Math.round(h);
  return {
    kind: "logo",
    role,
    logo: {
      url: make(w, h),
      x: Math.round(box.x + (box.w - w) / 2),
      y: Math.round(box.y + (box.h - h) / 2),
      width: w,
      height: h,
    },
  };
}

type Cover = (c: Ctx, box: Box, raw: Box, solo: boolean) => TemplateElement[];

const COVERS: Record<
  Exclude<TemplateArchetype, "letterhead">,
  { bg: BackgroundKind; cover: Cover }
> = {
  gradient: {
    bg: "gradient",
    cover: (c0, box, _raw, solo) => {
      // Text sits on the gradient, so it must read on its darkest stop.
      const field = [
        c0.p.bg,
        tint(c0.p.accent, 0.78),
        tint(c0.p.accent2, 0.55),
      ].reduce((a, b) => ((luminance(a) ?? 1) < (luminance(b) ?? 1) ? a : b));
      const c: Ctx = {
        ...c0,
        p: {
          ...c0.p,
          ink: readable(c0.p.ink, field),
          muted: readable(c0.p.muted, field),
          accent: readable(c0.p.accent, field, 3),
        },
      };
      const land = kindOf(box.w, box.h) === "landscape";
      const gap = Math.round(Math.min(box.w, box.h) * 0.06);
      const [textBox, artBox] = land ? columns(box, 0.62, gap) : [box, null];
      const brandRow: ListItem = {
        t: "list",
        role: "brand",
        lines: [{ icon: "check", text: c.t.copy.brand }],
        rel: 0.28,
        color: c.p.ink,
        iconFill: c.p.accent,
        iconInk: c.p.onAccent,
        weight: 800,
        maxLinesEach: 1,
      };
      const els = fitStack(
        {
          top: [brandRow],
          middle: [
            eyebrow(c, readable(c.p.accent, field)),
            headline(c, c.p.ink),
            { t: "gap", rel: 0.25 },
            subhead(c, c.p.muted),
            { t: "gap", rel: 0.35 },
            cta(c),
          ],
          bottom: solo
            ? [
                contactList(c, c.p.ink, false, 4),
                { t: "gap", rel: 0.25 },
                ...qr(c, c.p.muted),
              ]
            : [
                {
                  t: "text",
                  role: "web",
                  text: c.t.copy.contact.web,
                  weight: 700,
                  rel: 0.26,
                  maxLines: 1,
                  color: c.p.ink,
                },
              ],
        },
        textBox,
        { start: startFor(textBox.w, textBox.h) },
      );
      if (artBox)
        els.push(
          artIn(
            { ...artBox, y: artBox.y + artBox.h * 0.15, h: artBox.h * 0.7 },
            1,
            (w, h) => framedSceneUrl(c.t.scene, "blob", c.p, w, h),
          ),
        );
      return els;
    },
  },
  split: {
    bg: "split",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const gap = Math.round(Math.min(box.w, box.h) * 0.06);
      const frame = c.t.frame ?? "diamond";
      const text = (b: Box) =>
        fitStack(
          {
            top: [brandLine(c, c.p.ink)],
            middle: [
              headline(c, c.p.ink, "left", 2),
              ...(c.t.copy.headline2
                ? [
                    {
                      ...headline(
                        c,
                        readable(c.p.accent, c.p.bg, 3.2),
                        "left",
                        2,
                      ),
                      role: "headline2",
                      text: c.t.copy.headline2,
                    },
                  ]
                : []),
              { t: "gap", rel: 0.3 },
              subhead(c, c.p.muted),
              { t: "gap", rel: 0.35 },
              contactList(c, c.p.ink, solo, 4),
            ],
            bottom: solo ? qr(c, c.p.muted) : [],
          },
          b,
          { start: startFor(b.w, b.h) },
        );
      if (land) {
        const [t, a] = columns(box, 0.56, gap);
        return [
          ...text(t),
          artIn(a, frame === "arch" ? 0.78 : 1, (w, h) =>
            framedSceneUrl(c.t.scene, frame, c.p, w, h),
          ),
        ];
      }
      const artH = Math.round(box.h * 0.4);
      const a = { x: box.x, y: box.y, w: box.w, h: artH };
      const t = {
        x: box.x,
        y: box.y + artH + gap,
        w: box.w,
        h: box.h - artH - gap,
      };
      return [
        artIn(a, frame === "arch" ? 0.78 : 1, (w, h) =>
          framedSceneUrl(c.t.scene, frame, c.p, w, h),
        ),
        ...text(t),
      ];
    },
  },
  poster: {
    bg: "poster",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const col = { ...box, w: Math.round(box.w * (land ? 0.7 : 0.78)) };
      const brandRow: ListItem = {
        t: "list",
        role: "brand",
        lines: [{ icon: "star", text: c.t.copy.brand }],
        rel: 0.22,
        color: c.p.ink,
        iconFill: c.p.accent,
        iconInk: c.p.onAccent,
        weight: 700,
        maxLinesEach: 1,
      };
      const groups: Groups = {
        top: [brandRow],
        middle: [
          {
            ...headline(c, readable(c.p.accent, c.p.bg, 3.2), "left", 3, 1.25),
            family: "Bebas Neue",
            weight: 400,
          },
          { t: "gap", rel: 0.2 },
          {
            t: "text",
            role: "subhead",
            text: c.t.copy.subhead,
            weight: 500,
            rel: 0.42,
            maxLines: 3,
            color: c.p.ink,
            drop: 6,
          },
          { t: "gap", rel: 0.4 },
          ...(c.t.copy.offer
            ? [
                {
                  t: "text" as const,
                  role: "offer",
                  text: c.t.copy.offer.big,
                  family: "Bebas Neue",
                  weight: 400,
                  rel: 0.7,
                  min: 16,
                  maxLines: 1,
                  color: c.p.ink,
                  drop: 7,
                },
              ]
            : []),
        ],
        bottom: [
          {
            t: "text",
            role: "eyebrow",
            text: c.t.copy.eyebrow,
            weight: 500,
            rel: 0.24,
            maxLines: 1,
            color: c.p.muted,
            drop: 8,
          },
          {
            t: "text",
            role: "contact",
            text: `${c.t.copy.contact.phone}  ·  ${c.t.copy.contact.web}`,
            weight: 700,
            rel: 0.26,
            maxLines: 2,
            color: readable(c.p.accent, c.p.bg),
            drop: 5,
          },
          ...(solo
            ? [{ t: "gap" as const, rel: 0.25 }, ...qr(c, c.p.muted)]
            : []),
        ],
      };
      // A very wide piece (12 × 4.5 card stock, a long rack card on its
      // side) puts the contact block and QR code in a column of their own.
      if (box.w > box.h * 1.9) {
        const gap = Math.round(box.h * 0.08);
        const [l, r] = columns(
          { ...box, w: Math.round(box.w * 0.78) },
          0.68,
          gap,
        );
        return [
          ...fitStack({ top: groups.top, middle: groups.middle }, l, {
            start: startFor(l.w, l.h) * 1.1,
          }),
          ...fitStack({ bottom: groups.bottom }, r, {
            start: startFor(l.w, l.h),
          }),
        ];
      }
      return fitStack(groups, col, { start: startFor(col.w, col.h) * 1.1 });
    },
  },
  classic: {
    bg: "classic",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const pad = Math.round(Math.min(box.w, box.h) * 0.06);
      const inner = {
        x: box.x + pad,
        y: box.y + pad,
        w: box.w - pad * 2,
        h: box.h - pad * 2,
      };
      return fitStack(
        {
          middle: [
            { ...headline(c, c.p.ink, "left", 2, 1.1), weight: 500 },
            { t: "gap", rel: 0.15 },
            {
              t: "rule",
              color: tint(c.p.ink, 0.55),
              wFrac: land ? 0.85 : 1,
              hRel: 0.025,
            },
            { t: "gap", rel: 0.25 },
            {
              t: "text",
              role: "eyebrow",
              text: c.t.copy.eyebrow.toUpperCase(),
              weight: 700,
              rel: 0.24,
              maxLines: 2,
              color: c.p.ink,
            },
            { t: "gap", rel: 0.2 },
            { ...subhead(c, c.p.muted), rel: 0.3 },
          ],
          bottom: [
            ...(solo
              ? [...qr(c, c.p.muted), { t: "gap" as const, rel: 0.3 }]
              : []),
            {
              t: "row",
              left: {
                t: "text",
                role: "contact",
                text: [c.t.copy.contact.phone, c.t.copy.contact.web].join("\n"),
                weight: 500,
                rel: 0.22,
                maxLines: 3,
                color: c.p.muted,
              },
              right: {
                t: "text",
                role: "brand",
                text: c.t.copy.brand,
                family: c.head,
                weight: 600,
                rel: 0.3,
                maxLines: 2,
                color: c.p.ink,
              },
              drop: 4,
            },
          ],
        },
        inner,
        { start: startFor(inner.w, inner.h) * 1.05 },
      );
    },
  },
  band: {
    bg: "band",
    cover: (c, box, raw, solo) => {
      const bandTop = raw.y + raw.h * 0.58;
      const gap = Math.round(Math.min(box.w, box.h) * 0.05);
      const upper = {
        x: box.x,
        y: box.y + gap,
        w: box.w,
        h: bandTop - gap - box.y - gap,
      };
      const lower = {
        x: box.x,
        y: bandTop + gap,
        w: box.w,
        h: box.y + box.h - bandTop - gap,
      };
      const els = fitStack(
        {
          top: [
            { ...brandLine(c, c.p.muted, "center"), rel: 0.22, weight: 600 },
          ],
          middle: [
            headline(c, c.p.ink, "center", 2),
            { t: "gap", rel: 0.2 },
            subhead(c, c.p.muted, "center"),
          ],
        },
        upper,
        { start: startFor(upper.w, upper.h * 1.3) },
      );
      const onBand = readable(c.p.onAccent, c.p.accent);
      const bottom: Item[] = solo
        ? [
            {
              t: "text",
              role: "web",
              text: `${c.t.copy.contact.phone}  ·  ${c.t.copy.contact.web}`,
              weight: 700,
              rel: 0.3,
              maxLines: 2,
              color: onBand,
              align: "center",
              drop: 5,
            },
          ]
        : [];
      // The illustration fills the band; the contact line runs under it.
      const stripH = bottom.length ? Math.round(lower.h * 0.22) : 0;
      const artBox = {
        x: lower.x + lower.w * 0.05,
        y: lower.y,
        w: lower.w * 0.9,
        h: lower.h - stripH,
      };
      const lowerEls: TemplateElement[] = [
        artIn(artBox, 1.6, (w, h) =>
          sceneUrl(c.t.scene, { ...c.p, bg: c.p.accent }, w, h),
        ),
      ];
      if (stripH > 0) {
        lowerEls.push(
          ...fitStack(
            { middle: bottom },
            {
              x: lower.x,
              y: lower.y + lower.h - stripH,
              w: lower.w,
              h: stripH,
            },
            { start: stripH / 1.2 },
          ),
        );
      }
      return [...els, ...lowerEls];
    },
  },
  event: {
    bg: "event",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const gap = Math.round(Math.min(box.w, box.h) * 0.05);
      const deep = readable(c.p.accent, c.p.bg, 4.5);
      const script = c.t.copy.script ?? "Join us";
      const titleItems = (align: Align): Item[] => [
        {
          t: "pill",
          role: "brand",
          text: c.t.copy.brand,
          fill: c.p.surface,
          ink: c.p.ink,
          rel: 0.24,
          weight: 700,
          align,
          outline: tint(c.p.ink, 0.5),
        },
        { t: "gap", rel: 0.25 },
        {
          t: "text",
          role: "script",
          text: script,
          family: "Pacifico",
          weight: 400,
          rel: 0.8,
          min: 16,
          maxLines: 1,
          color: readable(c.p.accent2, c.p.bg, 3.2),
          align,
        },
        {
          ...headline(c, deep, align, 2, 1.1),
          family: "Bebas Neue",
          weight: 400,
        },
        { t: "gap", rel: 0.2 },
        {
          t: "pill",
          role: "subhead",
          text: c.t.copy.eyebrow,
          fill: c.p.bg,
          ink: c.p.ink,
          rel: 0.28,
          weight: 600,
          align,
          outline: c.p.accent,
          drop: 7,
        },
      ];
      const box2: BoxItem = {
        t: "box",
        role: "checklist",
        style: "card",
        fill: c.p.surface,
        stroke: tint(c.p.accent, 0.5),
        padRel: 0.35,
        drop: 6,
        items: [
          {
            t: "text",
            role: "detail-heading",
            text: c.t.copy.listTitle,
            weight: 800,
            rel: 0.3,
            maxLines: 1,
            color: readable(c.p.ink, c.p.surface),
          },
          { t: "gap", rel: 0.15 },
          {
            ...checklist(c, readable(c.p.ink, c.p.surface)),
            drop: undefined,
            rel: 0.25,
          },
        ],
      };
      const details: TextItem = {
        t: "text",
        role: "details",
        text: (c.t.copy.details ?? []).join("\n"),
        weight: 700,
        rel: 0.27,
        maxLines: 4,
        color: c.p.ink,
        align: land ? "left" : "center",
        drop: 4,
      };
      // On a folded piece the checklist goes in the next panel; the cover
      // gets the illustration instead.
      const feature: Item = solo
        ? box2
        : {
            t: "art",
            role: "scene",
            make: (w, h) => framedSceneUrl(c.t.scene, "circle", c.p, w, h),
            aspect: 1,
            hRel: 3.4,
            wFrac: 0.7,
            align: "center",
            drop: 6,
          };
      if (land) {
        const [l, r] = columns(box, 0.55, gap);
        return [
          ...fitStack({ middle: titleItems("left") }, l, {
            start: startFor(l.w, l.h),
          }),
          ...fitStack(
            {
              top: [feature],
              bottom: solo
                ? [details, { t: "gap", rel: 0.2 }, ...qr(c, c.p.muted)]
                : [details],
            },
            r,
            { start: startFor(r.w, r.h) },
          ),
        ];
      }
      return fitStack(
        {
          top: titleItems("center"),
          middle: [feature],
          bottom: solo
            ? [details, { t: "gap", rel: 0.2 }, ...qr(c, c.p.muted, "center")]
            : [details],
        },
        box,
        { start: startFor(box.w, box.h) },
      );
    },
  },
  dark: {
    bg: "dark",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const gap = Math.round(Math.min(box.w, box.h) * 0.06);
      const [t, a] = land ? columns(box, 0.6, gap) : [box, null];
      const els = fitStack(
        {
          top: [{ ...brandLine(c, c.p.muted), weight: 600 }],
          middle: [
            headline(c, c.p.ink, "left", 2),
            ...(c.t.copy.headline2
              ? [
                  {
                    ...headline(
                      c,
                      readable(c.p.accent2, c.p.bg, 3.2),
                      "left",
                      2,
                    ),
                    role: "headline2",
                    text: c.t.copy.headline2,
                  },
                ]
              : []),
            { t: "gap", rel: 0.3 },
            subhead(c, c.p.muted),
            { t: "gap", rel: 0.35 },
            {
              ...cta(c),
              fill: c.p.accent2,
              ink: readable("#0b1020", c.p.accent2),
            },
          ],
          bottom: solo
            ? [
                contactList(c, c.p.ink, false, 4),
                { t: "gap", rel: 0.25 },
                ...qr(c, c.p.muted),
              ]
            : [
                {
                  t: "text",
                  role: "eyebrow",
                  text: c.t.copy.eyebrow,
                  weight: 600,
                  rel: 0.24,
                  maxLines: 2,
                  color: c.p.muted,
                  drop: 5,
                },
              ],
        },
        t,
        { start: startFor(t.w, t.h) },
      );
      if (a)
        els.push(
          artIn({ ...a, y: a.y + a.h * 0.08, h: a.h * 0.84 }, 0.78, (w, h) =>
            framedSceneUrl(
              c.t.scene,
              "arch",
              { ...c.p, accent: c.p.accent },
              w,
              h,
            ),
          ),
        );
      return els;
    },
  },
  offer: {
    bg: "offer",
    cover: (c, box, _raw, solo) => {
      const land = kindOf(box.w, box.h) === "landscape";
      const gap = Math.round(Math.min(box.w, box.h) * 0.06);
      const o = c.t.copy.offer ?? {
        big: c.t.copy.eyebrow,
        small: c.t.copy.cta,
      };
      const burst: BurstItem = {
        t: "burst",
        big: o.big,
        small: o.small,
        fill: c.p.accent2,
        ink: readable(c.p.ink === "#ffffff" ? "#111827" : c.p.ink, c.p.accent2),
        family: "Bebas Neue",
        rel: 4.2,
        align: land ? "center" : "left",
      };
      const text: Groups = {
        top: [brandLine(c, c.p.ink)],
        middle: [
          ...(land ? [] : [burst, { t: "gap" as const, rel: 0.3 }]),
          headline(c, c.p.ink, "left", 3),
          { t: "gap", rel: 0.25 },
          subhead(c, c.p.ink),
          { t: "gap", rel: 0.35 },
          {
            ...cta(c),
            fill: c.p.surface,
            ink: readable(c.p.accent, c.p.surface),
          },
        ],
        bottom: solo
          ? [
              ...(o.code
                ? [
                    {
                      t: "text" as const,
                      role: "offer-code",
                      text: `Use code ${o.code}${o.expires ? ` · ${o.expires}` : ""}`,
                      weight: 700,
                      rel: 0.25,
                      maxLines: 2,
                      color: c.p.ink,
                      drop: 6,
                    },
                  ]
                : []),
              { t: "gap", rel: 0.2 },
              ...qr(c, c.p.ink),
            ]
          : [
              {
                t: "text",
                role: "web",
                text: c.t.copy.contact.web,
                weight: 700,
                rel: 0.26,
                maxLines: 1,
                color: c.p.ink,
              },
            ],
      };
      if (land) {
        const [l, r] = columns(box, 0.6, gap);
        return [
          ...fitStack(text, l, { start: startFor(l.w, l.h) }),
          ...fitStack({ middle: [burst] }, r, {
            start: Math.min(r.w, r.h) / 4.2,
            minBase: 90 / 4.2,
          }),
        ];
      }
      return fitStack(text, box, { start: startFor(box.w, box.h) });
    },
  },
};

/** The bounding box of every #10 window: text flows around it as one. */
function windowUnion(traits: Pick<PhysicalTraits, "windows">): Box[] {
  const ws = windowBoxes(traits);
  if (ws.length === 0) return [];
  const x0 = Math.min(...ws.map((w) => w.x));
  const y0 = Math.min(...ws.map((w) => w.y));
  const x1 = Math.max(...ws.map((w) => w.x + w.w));
  const y1 = Math.max(...ws.map((w) => w.y + w.h));
  return [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
}

/** The letterhead: a letter page with header, body and signature. */
function letterFront(
  c: Ctx,
  dims: LayoutDims,
  traits: Traits,
): TemplateElement[] {
  // A letter reads across its folds; only the tear strips and the envelope
  // windows are kept clear.
  const page = usableRect(dims, traits);
  const regions = clearParts(page, windowUnion(traits), KEEP_CLEAR, true).sort(
    (a, b) => a.y - b.y || a.x - b.x,
  );
  const L = c.t.copy.letter;
  const deep = readable(c.p.accent, c.p.bg, 4.5);
  const header: Item[] = [
    {
      t: "row",
      left: {
        t: "text",
        role: "brand",
        text: c.t.copy.brand,
        family: c.head,
        weight: c.headWeight,
        rel: 0.6,
        maxLines: 2,
        color: deep,
      },
      right: {
        t: "text",
        role: "contact",
        text: [
          c.t.copy.contact.phone,
          c.t.copy.contact.web,
          c.t.copy.contact.address ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        weight: 500,
        rel: 0.26,
        maxLines: 4,
        color: c.p.muted,
      },
    },
    { t: "gap", rel: 0.25 },
    { t: "rule", color: c.p.accent, wFrac: 1, hRel: 0.05 },
    { t: "gap", rel: 0.45 },
  ];
  const opening: Item[] = [
    ...(L?.date
      ? [
          {
            t: "text" as const,
            role: "date",
            text: L.date,
            weight: 500,
            rel: 0.3,
            maxLines: 1,
            color: c.p.muted,
            drop: 9,
          },
          { t: "gap" as const, rel: 0.35 },
        ]
      : []),
    eyebrow(c, deep),
    headline(c, c.p.ink, "left", 2, 0.95),
    { t: "gap", rel: 0.35 },
    {
      t: "text",
      role: "greeting",
      text: L?.greeting ?? "Dear Neighbor,",
      weight: 600,
      rel: 0.36,
      maxLines: 1,
      color: c.p.ink,
    },
  ];
  const body: Item[] = (L?.paragraphs ?? [c.t.copy.subhead]).flatMap(
    (text, i): Item[] => [
      { t: "gap", rel: 0.3 },
      {
        t: "text",
        role: "body",
        text,
        weight: 400,
        rel: 0.36,
        maxLines: 9,
        color: c.p.ink,
        drop: 3 + i,
      },
    ],
  );
  const list: Item[] = [
    { t: "gap", rel: 0.3 },
    { ...checklist(c, c.p.ink, 6), rel: 0.34 },
  ];
  const closing: Item[] = [
    { t: "gap", rel: 0.45 },
    {
      t: "text",
      role: "closing",
      text: L?.closing ?? "Sincerely,",
      weight: 500,
      rel: 0.36,
      maxLines: 1,
      color: c.p.ink,
    },
    {
      t: "text",
      role: "signature",
      text: L?.signer ?? c.t.copy.brand,
      family: "Pacifico",
      weight: 400,
      rel: 0.62,
      min: 15,
      maxLines: 1,
      color: deep,
    },
    {
      t: "text",
      role: "signer",
      text: L?.title ?? "",
      weight: 600,
      rel: 0.28,
      maxLines: 2,
      color: c.p.muted,
    },
    ...(L?.ps
      ? [
          { t: "gap" as const, rel: 0.3 },
          {
            t: "text" as const,
            role: "ps",
            text: `P.S. ${L.ps}`,
            weight: 600,
            rel: 0.34,
            maxLines: 4,
            color: deep,
            drop: 5,
          },
        ]
      : []),
  ];
  const footer: Item[] = qr(c, c.p.muted, "left", 1);
  const opts = (b: Box) => ({ start: Math.min(b.w / 12, 46), minBase: 18 });

  if (regions.length <= 1) {
    const b = regions[0] ?? page;
    return fitStack(
      {
        top: [...header, ...opening, ...body, ...list, ...closing],
        bottom: footer,
      },
      b,
      opts(b),
    );
  }
  // Header and opening above the windows, a card beside them, the letter
  // itself below.
  const [first, ...rest] = regions;
  const main = rest.reduce((a, b) => (area(b) > area(a) ? b : a), rest[0]);
  const out = fitStack({ top: [...header, ...opening] }, first, opts(first));
  for (const side of rest.filter((r) => r !== main)) {
    out.push(
      ...fitStack(
        {
          middle: c.t.copy.offer
            ? offerCoupon(c, 1)
            : [
                {
                  t: "art",
                  role: "scene",
                  make: (w, h) =>
                    framedSceneUrl(c.t.scene, "rounded", c.p, w, h),
                  aspect: 1.4,
                  hRel: 6,
                  align: "center",
                  drop: 1,
                },
              ],
        },
        side,
        { start: startFor(side.w, side.h) },
      ),
    );
  }
  out.push(
    ...fitStack(
      { top: [...body, ...list, ...closing], bottom: footer },
      main,
      opts(main),
    ),
  );
  return out;
}

/**
 * Message regions of one panel on the back: clear of the USPS zone, with a
 * full-height column preferred (the classic postcard back: message on one
 * side, address on the other), then the largest leftover beside it.
 */
function backRegions(panel: Box, zone: Box | null): Box[] {
  if (!zone) return [panel];
  const parts = around(panel, zone, KEEP_CLEAR).filter(
    (p) => Math.min(p.w, p.h) >= 0.9 * DESIGN_PPI,
  );
  if (parts.length === 0) return [];
  if (parts.length === 1 && parts[0] === panel) return [panel];
  const tall = parts.filter((p) => p.h >= panel.h - 1 && p.w >= panel.w * 0.33);
  const main = (tall.length ? tall : parts).reduce((a, b) =>
    area(b) > area(a) ? b : a,
  );
  const rest = clearParts(panel, [zone, main], KEEP_CLEAR);
  return [main, ...rest.slice(0, 1)];
}

/** The back: brand, message, checklist, offer and contact, clear of the zone. */
function backSide(c: Ctx, dims: LayoutDims, traits: Traits): TemplateElement[] {
  const zone = dims.addressZone ?? null;
  // Without an address zone the back is a page to read (a letter's second
  // side, a notecard): one region across its folds.
  const pages = zone
    ? templatePanels(dims, traits)
    : [usableRect(dims, traits)];
  const perPanel = pages.map((p) => backRegions(p, zone));
  const mains = perPanel.map((r) => r[0]).filter(Boolean);
  if (mains.length === 0) return [];
  const main = mains.reduce((a, b) => (area(b) > area(a) ? b : a));
  const others = perPanel
    .flat()
    .filter((r) => r !== main)
    .sort((a, b) => area(b) - area(a));
  const second = others[0];
  const deep = readable(c.p.accent, c.p.bg, 4.5);
  const back = c.t.copy.back;
  const out = fitStack(
    {
      top: [
        {
          t: "text",
          role: "brand",
          text: c.t.copy.brand,
          weight: 800,
          rel: 0.32,
          maxLines: 2,
          color: deep,
        },
        { t: "gap", rel: 0.35 },
        {
          t: "text",
          role: "headline",
          text: back.headline,
          family: c.head,
          weight: c.headWeight,
          rel: 1,
          min: 13,
          maxLines: 3,
          color: c.p.ink,
        },
        { t: "gap", rel: 0.25 },
        {
          t: "text",
          role: "body",
          text: back.body,
          weight: 400,
          rel: 0.4,
          maxLines: 7,
          color: c.p.ink,
          drop: 3,
        },
        { t: "gap", rel: 0.35 },
        { ...checklist(c, c.p.ink, 5), rel: 0.36 },
        { t: "gap", rel: 0.35 },
        ...offerCoupon(c, 6),
      ],
      bottom: [
        { ...contactList(c, c.p.ink, true, 4), rel: 0.32 },
        ...(second
          ? []
          : [{ t: "gap" as const, rel: 0.35 }, ...qr(c, c.p.muted, "left", 2)]),
      ],
    },
    main,
    { start: Math.min(startFor(main.w, main.h), 52) },
  );
  if (second) {
    const scene: ArtItem = {
      t: "art",
      role: "scene",
      make: (w, h) => framedSceneUrl(c.t.scene, "circle", c.p, w, h),
      aspect: 1,
      hRel: 99,
      align: "center",
      drop: 4,
    };
    if (second.w > second.h * 1.5 && c.t.hasQrCode) {
      // A wide strip: the illustration on one side, the QR code on the other.
      const gap = Math.round(second.h * 0.12);
      const [a, b] = columns(second, 0.4, gap);
      out.push(artIn(a, 1, scene.make));
      out.push(
        ...fitStack({ middle: qr(c, c.p.muted, "left", 99) }, b, {
          start: b.h / 2.6,
        }),
      );
    } else {
      out.push(
        ...fitStack(
          {
            middle: [
              { ...scene, hRel: 2.6, wFrac: 0.8 },
              { t: "gap", rel: 0.3 },
              ...qr(c, c.p.muted, "center", 1).map((q) => ({
                ...q,
                label: undefined,
              })),
              ...(c.t.hasQrCode
                ? [
                    {
                      t: "text" as const,
                      role: "qr-label",
                      text: c.t.copy.qrLabel,
                      weight: 600,
                      rel: 0.3,
                      maxLines: 2,
                      color: c.p.muted,
                      align: "center" as const,
                      drop: 2,
                    },
                  ]
                : []),
            ],
          },
          second,
          { start: startFor(second.w, second.h) },
        ),
      );
    }
  }
  return out;
}

/**
 * Lays one side of `template` out on `dims`. The front follows the
 * template's composition; the back is the shared message side.
 */
export function layoutTemplateSide(
  template: DesignTemplate,
  dims: LayoutDims,
  traits: Traits = NO_TRAITS,
  side: CanvasSideKey = "front",
): TemplateSide {
  const front = side === "front";
  const p = front ? template.palette : backPalette(template.palette);
  const c: Ctx = {
    t: template,
    p,
    head: template.fonts.head,
    headWeight: template.fonts.headWeight,
  };
  const raw = rawPanels(dims, traits);
  const plan = (cover: Box) => ({
    width: dims.designWidth,
    height: dims.designHeight,
    cover,
    panels: raw,
  });
  if (!front) {
    return {
      backgroundColor: p.bg,
      backgroundImageUrl: backgroundUrl("back", p, plan(raw[0])),
      elements: backSide(c, dims, traits),
    };
  }
  if (template.archetype === "letterhead") {
    return {
      backgroundColor: p.bg,
      backgroundImageUrl: backgroundUrl("letter", p, plan(raw[0])),
      elements: letterFront(c, dims, traits),
    };
  }
  const frame = frontFrame(dims, traits);
  const comp = COVERS[template.archetype];
  const solo = !frame.contact;
  const elements = comp.cover(c, frame.cover, frame.coverRaw, solo);
  if (frame.detail) elements.push(...detailPanel(c, frame.detail));
  if (frame.contact)
    elements.push(...contactPanel(c, frame.contact, !frame.detail));
  return {
    backgroundColor: p.bg,
    backgroundImageUrl: backgroundUrl(comp.bg, p, plan(frame.coverRaw)),
    elements,
  };
}
