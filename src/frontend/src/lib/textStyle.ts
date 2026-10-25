import type { TextBlockState } from "@/backend";
import {
  type FontSpec,
  TEXT_PADDING,
  contentAreaRatio,
  countLines,
  textWidth,
} from "@/lib/textFit";

/**
 * Typographic settings a text block can carry beyond the canister's
 * `TextBlockState`: tracking, leading, italic and rotation. They live on the
 * block in the studio (and in the saved draft) and drive the editor, the 3D
 * proof, the text measurement and the 300 DPI export. The canister keeps only
 * a preview of the design (the print file is uploaded on its own), so
 * `canvasForStorage` drops them and the stored candid type stays unchanged.
 */
export interface TextExtras {
  /** Tracking in em (0.1 = 10% of the type size after every character). */
  letterSpacing?: number;
  /** Line height as a multiple of the type size (1.2 when unset). */
  lineHeight?: number;
  italic?: boolean;
  /** Clockwise turn in degrees about the box centre. */
  rotation?: number;
}

export type StudioTextBlock = TextBlockState & TextExtras;

export const DEFAULT_LINE_HEIGHT = 1.2;

/** Bounds the inspector offers; imported templates are clamped to them. */
export const LETTER_SPACING_RANGE = { min: -0.1, max: 1 } as const;
export const LINE_HEIGHT_RANGE = { min: 0.7, max: 3 } as const;

export const TEXT_EXTRA_KEYS = [
  "letterSpacing",
  "lineHeight",
  "italic",
  "rotation",
] as const satisfies readonly (keyof TextExtras)[];

/** The block's extras with defaults filled in. */
export function textExtras(block: TextBlockState): Required<TextExtras> {
  const b = block as StudioTextBlock;
  return {
    letterSpacing: finite(b.letterSpacing, 0),
    lineHeight:
      finite(b.lineHeight, DEFAULT_LINE_HEIGHT) || DEFAULT_LINE_HEIGHT,
    italic: b.italic === true,
    rotation: finite(b.rotation, 0),
  };
}

function finite(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Everything the text measurement needs to lay a block out. */
export function fontSpecOf(block: TextBlockState): Required<FontSpec> {
  const x = textExtras(block);
  return {
    fontSize: block.fontSize,
    fontWeight: Number(block.fontWeight),
    fontFamily: block.fontFamily,
    letterSpacing: x.letterSpacing,
    lineHeight: x.lineHeight,
    italic: x.italic,
  };
}

/** CSS `font` shorthand for a 2D canvas context at `px` size. */
export function canvasFont(
  spec: Pick<Required<FontSpec>, "fontWeight" | "fontFamily" | "italic">,
  px: number,
): string {
  return `${spec.italic ? "italic " : ""}${spec.fontWeight} ${px}px "${spec.fontFamily}", "Geist", sans-serif`;
}

/** The block without studio-only fields, as the canister stores it. */
export function stripTextExtras(block: TextBlockState): TextBlockState {
  const {
    letterSpacing: _ls,
    lineHeight: _lh,
    italic: _it,
    rotation: _rot,
    ...rest
  } = block as StudioTextBlock;
  return rest;
}

/** True when a patch touches anything that changes how the text wraps. */
export function changesTextLayout(patch: Partial<StudioTextBlock>): boolean {
  return (
    patch.text !== undefined ||
    patch.fontFamily !== undefined ||
    patch.fontSize !== undefined ||
    patch.fontWeight !== undefined ||
    patch.width !== undefined ||
    patch.letterSpacing !== undefined ||
    patch.lineHeight !== undefined ||
    patch.italic !== undefined
  );
}

/**
 * Where a block's lines actually sit: the box less its padding, as tall as
 * its line boxes. Two blocks collide when these overlap; their padded boxes
 * may touch (tight display type overhangs its line box by design).
 */
export function textLinesRect(block: TextBlockState): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const { x, y, w, h } = linesBox(block);
  const { rotation } = textExtras(block);
  if (!rotation) return { x, y, w, h };
  // A turned block covers its rotated extent.
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  const rw = w * c + h * s;
  const rh = w * s + h * c;
  return { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh };
}

/**
 * The unturned rectangle the lines fill: inside the padding, as tall as the
 * line boxes; a single line as wide as its words, placed by its alignment.
 */
function linesBox(block: TextBlockState) {
  const spec = fontSpecOf(block);
  const text = block.text || " ";
  const lines = countLines(text, { ...spec, width: block.width });
  const inner = Math.max(0, block.width - TEXT_PADDING * 2);
  const h = Math.min(
    Math.max(0, block.height - TEXT_PADDING * 2),
    lines * spec.fontSize * spec.lineHeight,
  );
  let x = block.x + TEXT_PADDING;
  let w = inner;
  if (lines === 1 && !text.includes("\n")) {
    w = Math.min(inner, textWidth(text, spec));
    if (block.align === "center") x += (inner - w) / 2;
    else if (block.align === "right") x += inner - w;
  }
  return { x, y: block.y + TEXT_PADDING, w, h };
}

/** Line rects in a frame turned by -rotation (the blocks' own frame). */
function unturnedLines(block: TextBlockState, rotation: number) {
  const b = linesBox(block);
  const rad = (-rotation * Math.PI) / 180;
  // Turn about the block centre, then express the lines in that frame.
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  const rx = cx * Math.cos(rad) - cy * Math.sin(rad);
  const ry = cx * Math.sin(rad) + cy * Math.cos(rad);
  return {
    x: rx + (b.x - cx),
    y: ry + (b.y - cy),
    w: b.w,
    h: b.h,
  };
}

/**
 * Whether two blocks' lines sit on each other. Blocks turned by the same
 * angle (the lines of one badge) are compared in their own frame, where
 * their extents do not overlap just because they are tilted.
 */
export function textLinesOverlap(
  a: TextBlockState,
  b: TextBlockState,
  // Stacked type (a name over its tagline) may touch by a pixel or two;
  // words on words overlap by far more than a quarter of the type size.
  margin = Math.min(3, Math.max(1, Math.min(a.fontSize, b.fontSize) / 4)),
): boolean {
  const ra = textExtras(a).rotation;
  const rb = textExtras(b).rotation;
  const sameTurn = ra !== 0 && Math.abs(ra - rb) < 0.5;
  const pa = sameTurn ? unturnedLines(a, ra) : textLinesRect(a);
  const pb = sameTurn ? unturnedLines(b, rb) : textLinesRect(b);
  return (
    Math.min(pa.x + pa.w, pb.x + pb.w) - Math.max(pa.x, pb.x) > margin &&
    Math.min(pa.y + pa.h, pb.y + pb.h) - Math.max(pa.y, pb.y) > margin
  );
}

/**
 * Where a block's ink is: its lines (a single line as wide as its words)
 * plus the glyphs' overhang above and below the line boxes when the leading
 * is tighter than the face. This is what the safe-area check measures; the
 * padded box also carries room for the bottom overhang, which is not ink.
 */
export function textInkRect(block: TextBlockState): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const b = linesBox(block);
  const spec = fontSpecOf(block);
  const over =
    Math.max(0, contentAreaRatio(spec) - spec.lineHeight) * spec.fontSize;
  const ink = { x: b.x, y: b.y - over / 2, w: b.w, h: b.h + over };
  const { rotation } = textExtras(block);
  if (!rotation) return ink;
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  // Turned about the block centre: the ink's offset from it turns too.
  const bx = block.x + block.width / 2;
  const by = block.y + block.height / 2;
  const ix = ink.x + ink.w / 2 - bx;
  const iy = ink.y + ink.h / 2 - by;
  const cx = bx + ix * Math.cos(rad) - iy * Math.sin(rad);
  const cy = by + ix * Math.sin(rad) + iy * Math.cos(rad);
  const rw = ink.w * c + ink.h * s;
  const rh = ink.w * s + ink.h * c;
  return { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh };
}
