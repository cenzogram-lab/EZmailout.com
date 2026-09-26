import type { LogoState, QrCodeState, TextBlockState } from "@/backend";
import { type LayoutDims, safeRect } from "@/lib/printSpec";
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
 * The rules depend only on the artboard as laid out (its width and height),
 * so the same template builds natively in either orientation: a portrait or
 * square artboard stacks everything in one column, a landscape one puts the
 * copy in a left column and the QR code on the right. Every text band is
 * measured with `lib/textFit.ts`, and everything sits inside the ¼″ safe area,
 * so a template never overflows and never trips the safe-zone checks.
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

export function templateLayoutKind(dims: LayoutDims): TemplateLayoutKind {
  return dims.designWidth > dims.designHeight * LANDSCAPE_RATIO
    ? "landscape"
    : "portrait";
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

/** Dark ink on light accents, white on dark ones. */
function inkOn(hex: string): string {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = m.slice(1).map((c) => {
    const v = Number.parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#01080a" : "#ffffff";
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
): TemplateElement[] {
  const safe = safeRect(dims);
  const kind = templateLayoutKind(dims);
  const short = Math.min(safe.w, safe.h);
  const right = safe.x + safe.w;
  const bottomEdge = safe.y + safe.h;
  const gap = Math.max(8, Math.round(short * 0.035));
  const ruleW = Math.max(4, Math.round(short * 0.012));
  const x0 = safe.x + ruleW + gap;
  const available = right - x0;
  const colW = kind === "portrait" ? available : Math.round(available * 0.62);
  const qrSize = template.hasQrCode
    ? clamp(Math.round(short * (kind === "portrait" ? 0.24 : 0.3)), 72, 150)
    : 0;
  // In one column the copy has to clear the QR code; in two it never meets it.
  const floor =
    kind === "portrait" && qrSize > 0 ? bottomEdge - qrSize - gap : bottomEdge;
  const disc = Math.round(short * 0.34);

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
        ? safe.y
        : safe.y + Math.max(0, Math.round((safe.h - height) / 2));
    if (badge) {
      const pillW = badge.bandW + badge.padX * 2;
      const pillH = badge.bandH + badge.padY * 2;
      elements.push({
        kind: "shape",
        role: "pill",
        logo: {
          url: shapeUrl("badge", template.accentColor),
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
        x: safe.x,
        y: safe.y,
        width: ruleW,
        height: safe.h,
      },
    },
    {
      kind: "shape",
      role: "disc",
      logo: {
        url: shapeUrl("circle", withAlpha(template.accentColor, 0.15)),
        x: right - disc,
        y: safe.y,
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
            qr: { x: right - qrSize, y: bottomEdge - qrSize, size: qrSize },
          },
        ]
      : []),
  ];
}
