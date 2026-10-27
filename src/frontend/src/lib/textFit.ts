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

/** Default line height applied by `textBlockStyle` — keep the two in step. */
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

export interface FontSpec {
  fontSize: number;
  fontWeight?: number;
  fontFamily?: string;
  /** Tracking in em, added after every character as CSS does. */
  letterSpacing?: number;
  /** Line height as a multiple of the size (`TEXT_LINE_HEIGHT` when unset). */
  lineHeight?: number;
  italic?: boolean;
}

function widthOf(text: string, spec: FontSpec): number {
  const {
    fontSize,
    fontWeight = 400,
    fontFamily = DEFAULT_FAMILY,
    letterSpacing = 0,
    italic = false,
  } = spec;
  const tracking = letterSpacing * fontSize * [...text].length;
  const ctx = context();
  if (!ctx) return text.length * fontSize * FALLBACK_CHAR_RATIO + tracking;
  ctx.font = `${italic ? "italic " : ""}${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  return ctx.measureText(text).width + tracking;
}

export interface MeasureOptions extends FontSpec {
  /** Block width as written into the text block, padding included. */
  width: number;
}

/** Advance width of `text` set on one line (design px), padding excluded. */
export function textWidth(text: string, spec: FontSpec): number {
  return widthOf(text, spec);
}

/**
 * Height of the font's content area as a multiple of the font size.
 *
 * Geist's ascent + descent is taller than `line-height: 1.2`, so the glyphs
 * spill past the line box and the browser counts that spill in `scrollHeight`.
 * A band budgeted purely from the line height is a few pixels short at display
 * sizes, which is exactly the gap that used to show up as a 1–5px overflow.
 */
export function contentAreaRatio(spec: FontSpec): number {
  const ctx = context();
  if (!ctx) return FALLBACK_CONTENT_RATIO;
  const {
    fontSize,
    fontWeight = 400,
    fontFamily = DEFAULT_FAMILY,
    italic = false,
  } = spec;
  ctx.font = `${italic ? "italic " : ""}${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
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
  const content = Math.max(1, opts.width - TEXT_PADDING * 2);
  return Math.max(1, wrapText(text, content, (s) => widthOf(s, opts)).length);
}

/**
 * The lines a text block breaks into at `maxWidth`, as the editor lays it out
 * (`white-space: pre-wrap` + `word-break: break-word`): explicit newlines
 * always break, words wrap greedily, runs of spaces are kept, a hyphenated
 * word may break after its hyphen or dash (as the browser does: "family-" /
 * "owned"), and a word wider than the line is split across lines. The
 * measurement above and the print rasterizer both use it, so the PDF wraps
 * exactly where the editor and the height refit do.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  advance: (s: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    let current: string | null = null;
    const pieces = paragraph.split(" ").flatMap((word, i) =>
      hyphenSegments(word).map((text, j) => ({
        text,
        join: j > 0 ? "" : i > 0 ? " " : "",
      })),
    );
    for (const { text: word, join } of pieces) {
      const candidate: string =
        current === null ? word : `${current}${join}${word}`;
      // Spaces at a wrap point hang past the edge, as in the editor.
      if (advance(candidate.trimEnd()) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current !== null && current.trim() !== "") {
        lines.push(current.trimEnd());
        current = null;
      }
      // A word that cannot fit on its own line is broken character by character.
      let chunk = "";
      for (const char of word) {
        if (chunk === "" || advance(chunk + char) <= maxWidth) {
          chunk += char;
          continue;
        }
        lines.push(chunk);
        chunk = char;
      }
      current = chunk;
    }
    lines.push((current ?? "").trimEnd());
  }
  return lines;
}

const HYPHENS = "-\u2010\u2013\u2014";

/**
 * A word cut after each hyphen or dash that the browser may wrap at: one
 * with a character before it and a letter or digit after it ("Award-" /
 * "winning", "555-" / "0123", as Chromium breaks them; a leading "-5" and
 * "1,000-$2,000" stay whole).
 */
function hyphenSegments(word: string): string[] {
  const chars = Array.from(word);
  const out: string[] = [];
  let start = 0;
  for (let k = 1; k < chars.length - 1; k++) {
    const next = chars[k + 1];
    if (HYPHENS.includes(chars[k]) && /[\p{L}\p{N}]/u.test(next)) {
      out.push(chars.slice(start, k + 1).join(""));
      start = k + 1;
    }
  }
  out.push(chars.slice(start).join(""));
  return out;
}

/**
 * Block height (design px) that contains `lines` lines without overflow.
 *
 * Covers the stacked line boxes plus whatever the glyphs spill past the last
 * one, so `scrollHeight <= clientHeight` holds for the rendered block.
 */
export function bandHeight(lines: number, spec: FontSpec): number {
  const { fontSize } = spec;
  const lineHeight = spec.lineHeight ?? TEXT_LINE_HEIGHT;
  const spill = Math.max(0, contentAreaRatio(spec) - lineHeight);
  return (
    Math.ceil(fontSize * lineHeight * lines + fontSize * spill) +
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
