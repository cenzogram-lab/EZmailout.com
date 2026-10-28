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

/**
 * Text as the studio shows, measures and prints it: a tab is one space. The
 * page would lay a tab out at 8-space tab stops, which the print renderer
 * does not reproduce, so every view (editor, previews, campaign page, print)
 * goes through this and new text is stored without tabs (`updateTextBlock`).
 */
export function shownText(text: string): string {
  return text.includes("\t") ? text.replace(/\t/g, " ") : text;
}

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
    // Kern as page text does: Chromium's canvas default ("auto") kerns
    // less, which measured Playfair lines up to 0.5 px wider than the editor.
    if (measureCtx) measureCtx.fontKerning = "normal";
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

/**
 * The font as the editor (`textBlockStyle`) and the rasterizer (`canvasFont`)
 * set it, Geist as the fallback: a face missing on the device (Georgia on
 * Linux) or a character outside its range is measured in what is drawn.
 */
function measureFont(
  italic: boolean,
  fontWeight: number,
  fontSize: number,
  fontFamily: string,
): string {
  return `${italic ? "italic " : ""}${fontWeight} ${fontSize}px "${fontFamily}", "Geist", sans-serif`;
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
  ctx.font = measureFont(italic, fontWeight, fontSize, fontFamily);
  // Tracking turns ligatures off ("ff", "fi" are two glyphs again), in the
  // page and in a canvas that letter-spaces natively, so it is measured that
  // way where the context can; added by hand only where it cannot.
  if (tracking !== 0 && "letterSpacing" in ctx) {
    ctx.letterSpacing = `${letterSpacing * fontSize}px`;
    const width = ctx.measureText(text).width;
    ctx.letterSpacing = "0px";
    return width;
  }
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
  ctx.font = measureFont(italic, fontWeight, fontSize, fontFamily);
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
  rawText: string,
  maxWidth: number,
  advance: (s: string) => number,
): string[] {
  const text = shownText(rawText);
  const lines: string[] = [];
  // Chromium's line breaker measures in layout units (1/64 px), rounding a
  // run's width down: a run up to 1/64 px wider than the line still fits.
  // A run is measured with what follows it (`following`, or the space it
  // ends in), as Chromium shapes the whole line: a face that kerns a letter
  // against the next character (Playfair's "r " before " baz", Pacifico's
  // "/" before "t" in a word split letter by letter) changes the run's width.
  const fits = (s: string, following = "") => {
    const t = s.trimEnd();
    const next = t !== s ? " " : following;
    const width = next ? advance(`${t}${next}`) - advance(next) : advance(t);
    return Math.floor(width * 64) / 64 <= maxWidth;
  };
  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    let current: string | null = null;
    const words = paragraph.split(" ");
    for (let i = 0; i < words.length; i++) {
      let pieces = hyphenSegments(words[i]);
      let join = i > 0 ? " " : "";
      for (let j = 0; j < pieces.length; j++) {
        const word = pieces[j];
        const candidate: string =
          current === null ? word : `${current}${join}${word}`;
        join = "";
        // Spaces at a wrap point hang past the edge, as in the editor.
        const spaceAfter = j === pieces.length - 1 && i < words.length - 1;
        if (fits(candidate, spaceAfter ? " " : "")) {
          current = candidate;
          continue;
        }
        // Spaces before a word that does not fit stay on their own line,
        // as Chromium leaves them (an indented continuation line).
        if (current !== null) {
          lines.push(current.trimEnd());
          current = null;
        }
        // A piece that cannot fit on its own line is broken character by
        // character; the run that ends the word is measured with the space
        // after it, as Chromium does (a letter after the run is not: checked
        // against Chromium, that made more lines differ, not fewer).
        const chars = graphemes(word);
        let chunk = "";
        for (let k = 0; k < chars.length; k++) {
          const char = chars[k];
          const last = k === chars.length - 1 && spaceAfter;
          if (chunk === "" || fits(chunk + char, last ? " " : "")) {
            chunk += char;
            continue;
          }
          lines.push(chunk);
          chunk = char;
        }
        current = chunk;
        if (chunk !== word) {
          // The rest of the word now starts a line, and Chromium cuts it
          // again from there: "pre-1990" in a narrow box is "pre" / "-19" /
          // "90", since "-1990" at a line's start keeps its hyphen.
          pieces = hyphenSegments([chunk, ...pieces.slice(j + 1)].join(""));
          current = null;
          j = -1;
        }
      }
    }
    lines.push((current ?? "").trimEnd());
  }
  return lines;
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** User-perceived characters: an emoji sequence or an accent stays whole. */
function graphemes(word: string): string[] {
  return segmenter
    ? Array.from(segmenter.segment(word), (s) => s.segment)
    : Array.from(word);
}

const HYPHEN = "-";
const DASHES = "\u2010\u2013";
const EM_DASH = "\u2014";
const ELLIPSIS = "\u2026";
const ASCII_LETTER = /[A-Za-z]/;
const ASCII_ALNUM = /[A-Za-z0-9]/;
const DIGIT = /[0-9]/;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
/** Ideographs and currency: Chromium breaks before them after any dash. */
const ALWAYS_OPENS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Sc}]/u;
/** ASCII punctuation Chromium breaks before after a Unicode dash or ellipsis. */
const OPENS_AFTER_DASH = "#$%&(*+<=>@[\\^_`{~";
/** ...and after an ASCII hyphen (its own table: no `$`, but `-`, quotes, `|`). */
const OPENS_AFTER_HYPHEN = "\"#%&'(*+-<=>@[\\^_`{|~";
/** ...and after a U+2010 hyphen that starts a word. */
const OPENS_AFTER_LEADING_DASH = "$%(+[\\{";
/** Characters Chromium never breaks after when an em dash follows. */
const HOLDS_EM_DASH = "\"'([{\u201c\u2018\u2014";

/** Whether Chromium breaks between `dash` (at a word's start when `prev` is undefined) and `next`. */
function breaksAfterDash(
  dash: string,
  prev: string | undefined,
  next: string,
): boolean {
  if (dash === HYPHEN) {
    if (next.charCodeAt(0) < 128) {
      if (ASCII_LETTER.test(next) || OPENS_AFTER_HYPHEN.includes(next))
        return true;
      // "a-5", "5-6"; never "-5", "$-5", "--5".
      return DIGIT.test(next) && prev !== undefined && ASCII_ALNUM.test(prev);
    }
    if (ALWAYS_OPENS.test(next)) return true;
    // "a-é" breaks, "-é" and "--é" do not.
    return LETTER_OR_NUMBER.test(next) && prev !== undefined && prev !== HYPHEN;
  }
  if (ALWAYS_OPENS.test(next) || DIGIT.test(next)) return true;
  // A U+2010 hyphen that starts a word keeps a letter after it.
  if (dash === "\u2010" && prev === undefined)
    return OPENS_AFTER_LEADING_DASH.includes(next);
  return LETTER_OR_NUMBER.test(next) || OPENS_AFTER_DASH.includes(next);
}

/**
 * A word cut where Chromium may wrap inside it, as measured from its line
 * breaker (UAX #14 plus Blink's ASCII table): after a hyphen, U+2010 hyphen
 * or en dash followed by a letter or digit ("Award-" / "winning",
 * "555-" / "0123"), by another ASCII hyphen ("e-mail-" / "-and") or by
 * opening punctuation, but not "-5", "$-5" or "1,000-$2,000"; before an em
 * dash (unless it follows an opening bracket or quote) and after one
 * followed by a letter, digit or opening punctuation ("local" /
 * "—delivered"); and after an ellipsis likewise ("20%…" / "limited").
 */
function hyphenSegments(word: string): string[] {
  const chars = Array.from(word);
  const out: string[] = [];
  let start = 0;
  const cut = (at: number) => {
    if (at > start && at < chars.length) {
      out.push(chars.slice(start, at).join(""));
      start = at;
    }
  };
  for (let k = 0; k < chars.length - 1; k++) {
    const c = chars[k];
    const prev = k > 0 ? chars[k - 1] : undefined;
    const next = chars[k + 1];
    if (c === HYPHEN || DASHES.includes(c)) {
      if (breaksAfterDash(c, prev, next)) cut(k + 1);
    } else if (c === EM_DASH) {
      if (prev !== undefined && !HOLDS_EM_DASH.includes(prev)) cut(k);
      if (
        ALWAYS_OPENS.test(next) ||
        LETTER_OR_NUMBER.test(next) ||
        OPENS_AFTER_DASH.includes(next)
      )
        cut(k + 1);
    } else if (c === ELLIPSIS) {
      if (
        ALWAYS_OPENS.test(next) ||
        LETTER_OR_NUMBER.test(next) ||
        OPENS_AFTER_DASH.includes(next)
      )
        cut(k + 1);
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
