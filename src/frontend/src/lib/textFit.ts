/**
 * Text measurement for the layout presets.
 *
 * The canvas renders every text block through `textBlockStyle`, which fixes
 * `line-height: 1.2` and `padding: 2` on a border-box element. A preset that
 * budgets a band of `fontSize * n` therefore only fits `n / 1.2` lines, which
 * is how the hero headline used to paint over its supporting line. Everything
 * here works in the same units the preset writes into the block, so a band
 * sized with `bandHeight()` always contains the text `countLines()` reports.
 */

/** Line height applied by `textBlockStyle` — keep the two in step. */
export const TEXT_LINE_HEIGHT = 1.2;

/** Padding applied by `textBlockStyle`, on all four sides (design px). */
export const TEXT_PADDING = 2;

/** Default canvas font; matches `DEFAULT_FONT_FAMILY` in `lib/canvas.ts`. */
const DEFAULT_FAMILY = "Geist";

/** Fallback advance width per character, as a fraction of the font size. */
const FALLBACK_CHAR_RATIO = 0.52;

/** Fallback content-area height where the font metrics are unavailable. */
const FALLBACK_CONTENT_RATIO = 1.32;

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Shared offscreen 2D context, or null where canvas is unavailable (SSR). */
function context(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  try {
    measureCtx = document.createElement("canvas").getContext("2d");
  } catch {
    measureCtx = null;
  }
  return measureCtx;
}

function widthOf(
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): number {
  const ctx = context();
  if (!ctx) return text.length * fontSize * FALLBACK_CHAR_RATIO;
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  return ctx.measureText(text).width;
}

export interface FontSpec {
  fontSize: number;
  fontWeight?: number;
  fontFamily?: string;
}

export interface MeasureOptions extends FontSpec {
  /** Block width as written into the text block, padding included. */
  width: number;
}

/**
 * Height of the font's content area as a multiple of the font size.
 *
 * Geist's ascent + descent is taller than `line-height: 1.2`, so the glyphs
 * spill past the line box and the browser counts that spill in `scrollHeight`.
 * A band budgeted purely from the line height is a few pixels short at display
 * sizes, which is exactly the gap that used to show up as a 1–5px overflow.
 */
function contentAreaRatio(spec: FontSpec): number {
  const ctx = context();
  if (!ctx) return FALLBACK_CONTENT_RATIO;
  const { fontSize, fontWeight = 400, fontFamily = DEFAULT_FAMILY } = spec;
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  const m = ctx.measureText("Hgjpq");
  const ascent = m.fontBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent;
  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
    return FALLBACK_CONTENT_RATIO;
  }
  const ratio = (ascent + descent) / fontSize;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : FALLBACK_CONTENT_RATIO;
}

/**
 * Lines the browser will lay out for `text` inside a block of `width`.
 *
 * Mirrors `white-space: pre-wrap` + `word-break: break-word`: explicit newlines
 * always break, words wrap greedily, and a single word wider than the line is
 * split across lines rather than overflowing.
 */
export function countLines(text: string, opts: MeasureOptions): number {
  const {
    width,
    fontSize,
    fontWeight = 400,
    fontFamily = DEFAULT_FAMILY,
  } = opts;
  const content = Math.max(1, width - TEXT_PADDING * 2);
  const advance = (s: string) => widthOf(s, fontSize, fontWeight, fontFamily);

  let lines = 0;
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines += 1;
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (advance(candidate) <= content) {
        current = candidate;
        continue;
      }
      if (current) {
        lines += 1;
        current = "";
      }
      // A word that cannot fit on its own line is broken character by character.
      let chunk = "";
      for (const char of word) {
        if (advance(chunk + char) <= content) {
          chunk += char;
          continue;
        }
        if (chunk) lines += 1;
        chunk = char;
      }
      current = chunk;
    }
    lines += 1;
  }
  return Math.max(1, lines);
}

/**
 * Block height (design px) that contains `lines` lines without overflow.
 *
 * Covers the stacked line boxes plus whatever the glyphs spill past the last
 * one, so `scrollHeight <= clientHeight` holds for the rendered block.
 */
export function bandHeight(lines: number, spec: FontSpec): number {
  const { fontSize } = spec;
  const spill = Math.max(0, contentAreaRatio(spec) - TEXT_LINE_HEIGHT);
  return (
    Math.ceil(fontSize * TEXT_LINE_HEIGHT * lines + fontSize * spill) +
    TEXT_PADDING * 2
  );
}

/** Block height that contains `text` at `fontSize` inside `opts.width`. */
export function measuredHeight(text: string, opts: MeasureOptions): number {
  return bandHeight(countLines(text, opts), opts);
}

export interface FitOptions extends Omit<MeasureOptions, "fontSize"> {
  /** Largest size to try; the result never exceeds it. */
  startSize: number;
  /** Smallest size to accept, even if the text still overflows. */
  minSize?: number;
  /** Line budget the text must fit within. */
  maxLines: number;
}

/**
 * Largest font size at or below `startSize` that lays `text` out in at most
 * `maxLines` lines inside `width`. Falls back to `minSize` when even that
 * overflows, so a caller always gets a usable size.
 */
export function fitFontSize(text: string, opts: FitOptions): number {
  const { startSize, minSize = 10, maxLines, ...rest } = opts;
  const start = Math.max(minSize, Math.floor(startSize));
  for (let size = start; size > minSize; size -= 1) {
    if (countLines(text, { ...rest, fontSize: size }) <= maxLines) return size;
  }
  return minSize;
}
