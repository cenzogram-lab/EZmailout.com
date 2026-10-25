/**
 * Turns a rendered `MailPiece` side into studio layers.
 *
 * The templates in this folder are React layouts; the studio edits and prints
 * layers (text blocks, image/shape layers, QR codes). This walks the laid-out
 * DOM of one side, in paint order, and emits:
 *
 *  - every run of text as a text block, with its real face, size, weight,
 *    colour, tracking, leading, italic and rotation, so all copy stays
 *    editable and prints from the studio's own text renderer;
 *  - every painted box (fills, borders, radii, clip-path polygons, shadows),
 *    inline SVG artwork (illustrations, badges, patterns, icons) and photo
 *    placeholders as vector SVG, grouped into the side's background image and
 *    movable image layers;
 *  - QR placeholders as real QR layers.
 *
 * USPS address panels (`data-dm="address"`: recipient, indicia, return
 * address, Business Reply Mail permit artwork) are left out: the print
 * partner prints the address, postage and barcode in the zone the studio
 * keeps clear, and a mock permit must never print.
 *
 * Coordinates come out in the piece's own CSS px (96 per inch); the caller
 * maps them onto the artboard.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextItem {
  kind: "text";
  text: string;
  box: Box;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  italic: boolean;
  rotation: number;
  lines: number;
}

export interface PaintItem {
  kind: "paint";
  /** SVG markup in piece px coordinates. */
  svg: string;
  /** Visible extent in piece px (after clipping). */
  bbox: Box;
  role: "box" | "art" | "photo";
}

export interface QrItem {
  kind: "qr";
  box: Box;
}

export type StudioItem = TextItem | PaintItem | QrItem;

const SVG_NS = "http://www.w3.org/2000/svg";

let uid = 0;
const nextId = (p: string) => `${p}${(++uid).toString(36)}`;

/* ---------------------------------------------------------------- colours */

/** `rgb()/rgba()` → `#rrggbb` or `#rrggbbaa`, with extra opacity folded in. */
export function cssColorToHex(css: string, opacity = 1): string | null {
  const m =
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(
      css,
    );
  if (!m) {
    if (/^#[0-9a-f]{6}$/i.test(css)) return css.toLowerCase();
    return null;
  }
  let a =
    m[4] === undefined
      ? 1
      : m[4].endsWith("%")
        ? Number.parseFloat(m[4]) / 100
        : Number(m[4]);
  a *= opacity;
  if (a <= 0.004) return null;
  const hex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  const base = `#${hex(Number(m[1]))}${hex(Number(m[2]))}${hex(Number(m[3]))}`;
  return a >= 0.996 ? base : `${base}${hex(a * 255)}`;
}

/** First family of a CSS `font-family` stack. */
function firstFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "") || "Geist";
}

/* --------------------------------------------------------------- geometry */

interface Frame {
  /** Piece origin in viewport px. */
  ox: number;
  oy: number;
}

interface Placement {
  /** Unrotated box in piece px. */
  box: Box;
  /** Clockwise rotation in degrees about the box centre. */
  angle: number;
  /** Axis-aligned extent in piece px. */
  bbox: Box;
}

function rel(r: DOMRect, f: Frame): Box {
  return { x: r.left - f.ox, y: r.top - f.oy, w: r.width, h: r.height };
}

/** Rotation in degrees from a computed `transform` matrix. */
function matrixAngle(transform: string): number {
  if (!transform || transform === "none") return 0;
  const m = /matrix\(([^)]+)\)/.exec(transform);
  if (!m) return 0;
  const [a, b] = m[1].split(",").map(Number);
  return (Math.atan2(b, a) * 180) / Math.PI;
}

/** Cumulative rotation of an element relative to the piece root. */
function cumulativeAngle(el: Element, root: Element): number {
  let angle = 0;
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
    const cs = getComputedStyle(n);
    angle += matrixAngle(cs.transform);
    if (cs.writingMode.startsWith("vertical")) angle += 90;
  }
  const r = ((angle % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

function place(el: Element, root: Element, f: Frame): Placement {
  const bbox = rel(el.getBoundingClientRect(), f);
  const angle = cumulativeAngle(el, root);
  if (Math.abs(angle) < 0.01) return { box: bbox, angle: 0, bbox };
  const ow = (el as HTMLElement).offsetWidth || bbox.w;
  const oh = (el as HTMLElement).offsetHeight || bbox.h;
  const rad = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const k = bbox.w / Math.max(1e-6, ow * c + oh * s);
  const w = ow * k;
  const h = oh * k;
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  return { box: { x: cx - w / 2, y: cy - h / 2, w, h }, angle, bbox };
}

function intersect(a: Box, b: Box): Box | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const btm = Math.min(a.y + a.h, b.y + b.h);
  return r - x > 0.5 && btm - y > 0.5 ? { x, y, w: r - x, h: btm - y } : null;
}

/** Cumulative CSS `zoom` (the fitting routine zooms columns down). */
function cumulativeZoom(el: Element, root: Element): number {
  let z = 1;
  for (
    let n: Element | null = el;
    n && n !== root.parentElement;
    n = n.parentElement
  ) {
    const v = Number.parseFloat(getComputedStyle(n).zoom || "1");
    if (Number.isFinite(v) && v > 0) z *= v;
  }
  return z;
}

/* ------------------------------------------------------------------ clips */

interface Clip {
  box: Box;
  radius: number;
}

function clipMarkup(clips: Clip[], defs: string[]): string | null {
  if (!clips.length) return null;
  // Nested clip paths: each one clips the next.
  let parent: string | null = null;
  for (const c of clips) {
    const id = nextId("c");
    const r = Math.min(c.radius, c.box.w / 2, c.box.h / 2);
    defs.push(
      `<clipPath id="${id}"${parent ? ` clip-path="url(#${parent})"` : ""}><rect x="${n(c.box.x)}" y="${n(c.box.y)}" width="${n(c.box.w)}" height="${n(c.box.h)}" rx="${n(r)}"/></clipPath>`,
    );
    parent = id;
  }
  return parent;
}

function clipExtent(clips: Clip[], bbox: Box): Box | null {
  let out: Box | null = bbox;
  for (const c of clips) {
    if (!out) return null;
    out = intersect(out, c.box);
  }
  return out;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();

/* ------------------------------------------------------------- box paints */

/** Evaluates `12px`, `40%` or `calc(100% - 10px)` against a length. */
function length(token: string, of: number): number {
  const t = token.trim();
  const calc = /^calc\((.*)\)$/.exec(t);
  if (calc) {
    let total = 0;
    let sign = 1;
    for (const part of calc[1].split(/\s+/)) {
      if (part === "+") sign = 1;
      else if (part === "-") sign = -1;
      else {
        total += sign * length(part, of);
        sign = 1;
      }
    }
    return total;
  }
  if (t.endsWith("%")) return (Number.parseFloat(t) / 100) * of;
  return Number.parseFloat(t) || 0;
}

/** Points of a computed `clip-path: polygon(...)`, or null. */
function polygonPoints(clip: string, box: Box): string | null {
  const m = /^polygon\((.*)\)$/.exec(clip.trim());
  if (!m) return null;
  // Split on commas that are not inside calc().
  const pts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of m[1]) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      pts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) pts.push(cur);
  return pts
    .map((p) => {
      const parts: string[] = [];
      let d = 0;
      let tok = "";
      for (const ch of p.trim()) {
        if (ch === "(") d++;
        if (ch === ")") d--;
        if (ch === " " && d === 0) {
          if (tok) parts.push(tok);
          tok = "";
        } else tok += ch;
      }
      if (tok) parts.push(tok);
      const x = box.x + length(parts[0] ?? "0", box.w);
      const y = box.y + length(parts[1] ?? "0", box.h);
      return `${n(x)},${n(y)}`;
    })
    .join(" ");
}

/** First shadow of a computed `box-shadow` ("rgba(...) 0px 12px 30px 0px"). */
function shadowFilter(
  shadow: string,
  opacity: number,
  defs: string[],
): string | null {
  if (!shadow || shadow === "none") return null;
  const colour = /rgba?\([^)]*\)/.exec(shadow)?.[0];
  const nums = shadow
    .replace(/rgba?\([^)]*\)/, "")
    .trim()
    .split(/\s+/)
    .map((v) => Number.parseFloat(v));
  if (!colour || nums.length < 2) return null;
  const [dx, dy, blur = 0] = nums;
  const hex = cssColorToHex(colour, opacity);
  if (!hex) return null;
  const rgb = hex.slice(0, 7);
  const a = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
  const id = nextId("s");
  defs.push(
    `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${n(dx)}" dy="${n(dy)}" stdDeviation="${n(blur / 2)}" flood-color="${rgb}" flood-opacity="${n(a)}"/></filter>`,
  );
  return id;
}

interface BorderSide {
  width: number;
  color: string | null;
  style: string;
}

function borderSides(cs: CSSStyleDeclaration, opacity: number): BorderSide[] {
  return (["Top", "Right", "Bottom", "Left"] as const).map((s) => {
    const style = cs.getPropertyValue(`border-${s.toLowerCase()}-style`);
    const width =
      Number.parseFloat(
        cs.getPropertyValue(`border-${s.toLowerCase()}-width`),
      ) || 0;
    const color = cssColorToHex(
      cs.getPropertyValue(`border-${s.toLowerCase()}-color`),
      opacity,
    );
    return {
      width: style === "none" || style === "hidden" ? 0 : width,
      color,
      style,
    };
  });
}

function dash(style: string, w: number): string {
  if (style === "dashed") return ` stroke-dasharray="${n(w * 3)} ${n(w * 2)}"`;
  if (style === "dotted")
    return ` stroke-dasharray="0 ${n(w * 2)}" stroke-linecap="round"`;
  return "";
}

/** SVG for an element's own box painting, or null when it paints nothing. */
function boxPaint(
  el: HTMLElement,
  cs: CSSStyleDeclaration,
  p: Placement,
  opacity: number,
  defs: string[],
): string | null {
  const fill = cssColorToHex(cs.backgroundColor, opacity);
  const sides = borderSides(cs, opacity);
  const anyBorder = sides.some((s) => s.width > 0 && s.color);
  const shadow = cs.boxShadow;
  if (!fill && !anyBorder && (shadow === "none" || !shadow)) return null;
  // The element's layout size at piece scale (zoomed columns scale too).
  const { box } = p;
  const radius = Math.min(
    Number.parseFloat(cs.borderTopLeftRadius) || 0,
    box.w / 2,
    box.h / 2,
  );
  const scale = el.offsetWidth ? box.w / el.offsetWidth : 1;
  const r = cs.borderTopLeftRadius.endsWith("%")
    ? (Number.parseFloat(cs.borderTopLeftRadius) / 100) * Math.min(box.w, box.h)
    : radius * scale;
  const shadowId = fill ? shadowFilter(shadow, opacity, defs) : null;
  const parts: string[] = [];
  const poly =
    cs.clipPath && cs.clipPath !== "none"
      ? polygonPoints(cs.clipPath, box)
      : null;
  if (fill) {
    parts.push(
      poly
        ? `<polygon points="${poly}" fill="${fill}"${shadowId ? ` filter="url(#${shadowId})"` : ""}/>`
        : `<rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.w)}" height="${n(box.h)}" rx="${n(r)}" fill="${fill}"${shadowId ? ` filter="url(#${shadowId})"` : ""}/>`,
    );
  }
  if (anyBorder) {
    const [top, right, bottom, left] = sides.map((s) => ({
      ...s,
      width: s.width * scale,
    }));
    const uniform =
      [right, bottom, left].every(
        (s) =>
          Math.abs(s.width - top.width) < 0.01 &&
          s.color === top.color &&
          s.style === top.style,
      ) && top.width > 0;
    if (uniform && top.color) {
      const w = top.width;
      parts.push(
        `<rect x="${n(box.x + w / 2)}" y="${n(box.y + w / 2)}" width="${n(box.w - w)}" height="${n(box.h - w)}" rx="${n(Math.max(0, r - w / 2))}" fill="none" stroke="${top.color}" stroke-width="${n(w)}"${dash(top.style, w)}/>`,
      );
    } else {
      const line = (
        s: BorderSide,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
      ) =>
        s.width > 0 && s.color
          ? `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${s.color}" stroke-width="${n(s.width)}"${dash(s.style, s.width)}/>`
          : "";
      const { x, y, w, h } = box;
      parts.push(
        line(top, x, y + top.width / 2, x + w, y + top.width / 2),
        line(right, x + w - right.width / 2, y, x + w - right.width / 2, y + h),
        line(
          bottom,
          x,
          y + h - bottom.width / 2,
          x + w,
          y + h - bottom.width / 2,
        ),
        line(left, x + left.width / 2, y, x + left.width / 2, y + h),
      );
    }
  }
  const body = parts.join("");
  return body || null;
}

function rotated(svg: string, p: Placement): string {
  if (!p.angle) return svg;
  const cx = p.box.x + p.box.w / 2;
  const cy = p.box.y + p.box.h / 2;
  return `<g transform="rotate(${n(p.angle)} ${n(cx)} ${n(cy)})">${svg}</g>`;
}

/* ------------------------------------------------------------- inline SVG */

/** Copies an inline `<svg>` as a nested SVG placed at `box`, text removed. */
function svgArt(
  svg: SVGSVGElement,
  p: Placement,
  color: string,
): { markup: string; texts: SVGTextElement[] } {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const texts: SVGTextElement[] = [];
  // Plain <text> becomes text layers (an image cannot load the page fonts);
  // text on a path stays in the art and falls back to a system face.
  const live = Array.from(svg.querySelectorAll("text"));
  const copies = Array.from(clone.querySelectorAll("text"));
  live.forEach((t, i) => {
    if (t.querySelector("textPath")) return;
    texts.push(t);
    copies[i].remove();
  });
  clone.removeAttribute("style");
  clone.removeAttribute("class");
  clone.setAttribute("x", n(p.box.x));
  clone.setAttribute("y", n(p.box.y));
  clone.setAttribute("width", n(p.box.w));
  clone.setAttribute("height", n(p.box.h));
  clone.setAttribute("overflow", "hidden");
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute(
      "viewBox",
      `0 0 ${n(svg.clientWidth || p.box.w)} ${n(svg.clientHeight || p.box.h)}`,
    );
  }
  // `currentColor` resolves against the colour the element inherited.
  clone.setAttribute("color", color);
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, "");
  return { markup, texts };
}

/** A `<text>` inside inline art, as a text layer. */
function svgTextItem(
  t: SVGTextElement,
  f: Frame,
  root: Element,
): TextItem | null {
  const text = (t.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const m = t.getScreenCTM();
  if (!m) return null;
  const bb = t.getBBox();
  const scale = Math.hypot(m.a, m.b);
  const angle =
    (Math.atan2(m.b, m.a) * 180) / Math.PI +
    cumulativeAngle(t.ownerSVGElement ?? t, root) * 0;
  const r = rel(t.getBoundingClientRect(), f);
  const cs = getComputedStyle(t);
  const fsUser = Number.parseFloat(cs.fontSize) || 10;
  const fontSize = fsUser * scale;
  const w = bb.width * scale;
  const h = bb.height * scale;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const lsUser =
    Number.parseFloat(t.getAttribute("letter-spacing") ?? cs.letterSpacing) ||
    0;
  const color = cssColorToHex(cs.fill) ?? "#111111";
  const anchor = t.getAttribute("text-anchor") ?? cs.textAnchor;
  // Badges stack their lines tightly: the line box is 80% of the glyph box
  // (the font's em box carries room above the caps), centred on it.
  const lineBox = h * 0.8;
  return {
    kind: "text",
    text,
    box: {
      x: cx - w / 2 - 2,
      y: cy - lineBox / 2 - 2,
      w: w * 1.03 + 6,
      h: lineBox + 4,
    },
    fontFamily: firstFamily(t.getAttribute("font-family") ?? cs.fontFamily),
    fontSize,
    fontWeight:
      Number.parseInt(t.getAttribute("font-weight") ?? cs.fontWeight, 10) ||
      400,
    color,
    align: anchor === "middle" ? "center" : anchor === "end" ? "right" : "left",
    letterSpacing: lsUser / fsUser,
    lineHeight: Math.max(0.7, (bb.height * 0.8) / fsUser),
    italic: cs.fontStyle === "italic",
    rotation: Math.abs(angle) < 0.01 ? 0 : angle,
    lines: 1,
  };
}

/* ------------------------------------------------------------------ text */

const INLINE = new Set([
  "SPAN",
  "B",
  "STRONG",
  "EM",
  "I",
  "SMALL",
  "A",
  "SUP",
  "SUB",
  "MARK",
  "U",
  "S",
  "BR",
]);

function styleKey(cs: CSSStyleDeclaration): string {
  return [
    cs.fontFamily,
    cs.fontSize,
    cs.fontWeight,
    cs.fontStyle,
    cs.color,
    cs.letterSpacing,
    cs.textTransform,
  ].join("|");
}

function transformText(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize")
    return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return text;
}

/**
 * Text nodes that belong to `el`'s own run: its direct text plus inline
 * children set exactly like it (a `<br>` is a line break). Inline children
 * styled differently are runs of their own, visited by the walk.
 */
function ownRun(
  el: HTMLElement,
  key: string,
  mergeAll = false,
): { nodes: Node[]; text: string; merged: HTMLElement[] } | null {
  const nodes: Node[] = [];
  const merged: HTMLElement[] = [];
  let text = "";
  let hasText = false;
  const pre = /pre/.test(getComputedStyle(el).whiteSpace);
  const visit = (node: Node, top: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const v = child.nodeValue ?? "";
        if (v.trim()) hasText = true;
        nodes.push(child);
        text += pre ? v : v.replace(/\s+/g, " ");
      } else if (child instanceof HTMLElement) {
        if (child.tagName === "BR") {
          text += "\n";
          continue;
        }
        if (!top || !INLINE.has(child.tagName)) continue;
        const cs = getComputedStyle(child);
        if (cs.display !== "inline" || (!mergeAll && styleKey(cs) !== key))
          continue;
        // Same look (or a wrapping paragraph): part of this run.
        merged.push(child);
        visit(child, true);
      }
    }
  };
  visit(el, true);
  if (!hasText) return null;
  return {
    merged,
    nodes,
    text: text
      .split("\n")
      .map((l) => l.replace(/^ +| +$/g, ""))
      .join("\n")
      .trim(),
  };
}

function runRects(nodes: Node[]): DOMRect[] {
  const range = document.createRange();
  const rects: DOMRect[] = [];
  for (const node of nodes) {
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects()))
      if (r.width > 0.5 && r.height > 0.5) rects.push(r);
  }
  return rects;
}

function textItem(
  el: HTMLElement,
  cs: CSSStyleDeclaration,
  f: Frame,
  root: Element,
  opacity: number,
): TextItem | null {
  let run = ownRun(el, styleKey(cs));
  if (!run || !run.text) return null;
  let rects = runRects(run.nodes);
  if (!rects.length) return null;
  const zoom = cumulativeZoom(el, root);
  const fontSize = (Number.parseFloat(cs.fontSize) || 16) * zoom;
  {
    // A paragraph that wraps around an inline run set differently (a bold
    // "Mail to:" lead-in) cannot be split into boxes: it becomes one run.
    const tops = new Set(
      rects.map((r) => Math.round(r.top / (fontSize * 0.4))),
    );
    if (tops.size > 1) {
      const all = ownRun(el, styleKey(cs), true);
      if (all && all.merged.length > run.merged.length) {
        run = all;
        rects = runRects(run.nodes);
      }
    }
  }
  for (const m of run.merged) m.setAttribute("data-dm-merged", "");
  const lhRaw = cs.lineHeight;
  const lineHeight =
    lhRaw === "normal" ? 1.2 : (Number.parseFloat(lhRaw) * zoom) / fontSize;
  const ls =
    cs.letterSpacing === "normal"
      ? 0
      : (Number.parseFloat(cs.letterSpacing) * zoom) / fontSize;
  const angle = cumulativeAngle(el, root);
  const color = cssColorToHex(cs.color, opacity) ?? "#111111";
  const ta = cs.textAlign;
  const align: TextItem["align"] =
    ta === "center"
      ? "center"
      : ta === "right" || ta === "end"
        ? "right"
        : "left";
  // Distinct line boxes by their vertical position.
  const tops: number[] = [];
  for (const r of rects)
    if (!tops.some((t) => Math.abs(t - r.top) < fontSize * 0.4))
      tops.push(r.top);
  // A clamped run (`-webkit-line-clamp`) shows only that many lines; the
  // hidden ones still have rects, so the count stops at the clamp.
  const clamp = Number.parseInt(cs.getPropertyValue("-webkit-line-clamp"), 10);
  const shown = Math.max(tops.length, run.text.split("\n").length);
  const lines =
    Number.isFinite(clamp) && clamp > 0 ? Math.min(clamp, shown) : shown;
  const pad = 2;
  const base = {
    kind: "text" as const,
    text: transformText(run.text, cs.textTransform),
    fontFamily: firstFamily(cs.fontFamily),
    fontSize,
    fontWeight: Number.parseInt(cs.fontWeight, 10) || 400,
    color,
    align,
    letterSpacing: Math.round(ls * 1000) / 1000,
    lineHeight: Math.round(lineHeight * 1000) / 1000,
    italic: cs.fontStyle === "italic" || cs.fontStyle.startsWith("oblique"),
    lines,
  };
  if (Math.abs(angle) >= 0.01) {
    const p = place(el, root, f);
    // Vertical writing modes lay the line along the element's height.
    const vertical = cs.writingMode.startsWith("vertical");
    const bw = vertical ? p.box.h : p.box.w;
    const bh = vertical ? p.box.w : p.box.h;
    const cx = p.box.x + p.box.w / 2;
    const cy = p.box.y + p.box.h / 2;
    return {
      ...base,
      rotation: angle,
      box: {
        x: cx - bw / 2 - pad,
        y: cy - bh / 2 - pad,
        w: bw + 2 * pad,
        h: bh + 2 * pad,
      },
    };
  }
  const left = Math.min(...rects.map((r) => r.left)) - f.ox;
  const right = Math.max(...rects.map((r) => r.right)) - f.ox;
  const top = Math.min(...rects.map((r) => r.top)) - f.oy;
  const bottom = Math.max(...rects.map((r) => r.bottom)) - f.oy;
  // The glyph boxes sit centred in their line boxes (half-leading).
  const contentH = rects[0].height;
  const lineBox = fontSize * lineHeight;
  const lead = (lineBox - contentH) / 2;
  const y = top - lead - pad;
  const h =
    Math.max(bottom - top - 2 * lead + 2 * lead, lines * lineBox) + 2 * pad;
  if (lines > 1) {
    // Several lines: they wrap at the element's content edge, and start
    // where the glyphs start (an inline icon before the text is its own
    // layer, so the text box begins after it).
    const er = el.getBoundingClientRect();
    const pl =
      ((Number.parseFloat(cs.paddingLeft) || 0) +
        (Number.parseFloat(cs.borderLeftWidth) || 0)) *
      zoom;
    const pr =
      ((Number.parseFloat(cs.paddingRight) || 0) +
        (Number.parseFloat(cs.borderRightWidth) || 0)) *
      zoom;
    const cl = er.left - f.ox + pl;
    const cr = er.right - f.ox - pr;
    const x0 = align === "left" ? left : Math.min(cl, left);
    const x1 = Math.max(cr, right);
    return {
      ...base,
      rotation: 0,
      box: { x: x0 - pad, y, w: x1 - x0 + 2 * pad, h },
    };
  }
  // One line: a tight box around the glyphs, with a little slack so the
  // studio's own measurement never wraps it, anchored on the side the text
  // is aligned to.
  const tw = right - left;
  const w = tw * 1.03 + 2 * pad + 2;
  const x =
    align === "center"
      ? (left + right) / 2 - w / 2
      : align === "right"
        ? right + pad - w
        : left - pad;
  return { ...base, rotation: 0, box: { x, y, w, h } };
}

/* ------------------------------------------------------------------- walk */

export interface WalkOptions {
  /** Skip a subtree (USPS address panels by default). */
  skip?: (el: Element) => boolean;
}

/** Walks a rendered piece and returns its items in paint order. */
export function walkPiece(
  root: HTMLElement,
  opts: WalkOptions = {},
): StudioItem[] {
  const rr = root.getBoundingClientRect();
  const f: Frame = { ox: rr.left, oy: rr.top };
  const items: StudioItem[] = [];
  const skip =
    opts.skip ??
    ((el: Element) => (el as HTMLElement).dataset?.dm === "address");

  const visit = (el: Element, opacity: number, clips: Clip[]) => {
    if (skip(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (el.tagName === "STYLE" || el.tagName === "SCRIPT") return;
    const op =
      opacity * (Number.parseFloat(cs.opacity) || (cs.opacity === "0" ? 0 : 1));
    if (op <= 0.004) return;
    const dm = (el as HTMLElement).dataset?.dm;

    if (dm === "qr") {
      const p = place(el, root, f);
      items.push({ kind: "qr", box: p.bbox });
      return;
    }

    if (el instanceof SVGSVGElement) {
      const p = place(el, root, f);
      const color = cssColorToHex(cs.color) ?? "#000000";
      const { markup, texts } = svgArt(el, p, color.slice(0, 7));
      const defs: string[] = [];
      const clipId = clipMarkup(clips, defs);
      const extent = clipExtent(clips, p.bbox);
      if (extent) {
        let body = rotated(markup, p);
        if (op < 0.996) body = `<g opacity="${n(op)}">${body}</g>`;
        if (clipId) body = `<g clip-path="url(#${clipId})">${body}</g>`;
        items.push({
          kind: "paint",
          svg: (defs.length ? `<defs>${defs.join("")}</defs>` : "") + body,
          bbox: extent,
          role: dm === "photo" ? "photo" : "art",
        });
      }
      for (const t of texts) {
        const ti = svgTextItem(t, f, root);
        if (ti)
          items.push({
            ...ti,
            color: cssColorToHex(getComputedStyle(t).fill, op) ?? ti.color,
          });
      }
      return;
    }

    if (!(el instanceof HTMLElement)) return;

    if (el instanceof HTMLImageElement) {
      const p = place(el, root, f);
      const defs: string[] = [];
      const clipId = clipMarkup(clips, defs);
      const extent = clipExtent(clips, p.bbox);
      if (extent && el.currentSrc) {
        const fit =
          cs.objectFit === "cover" ? "xMidYMid slice" : "xMidYMid meet";
        let body = rotated(
          `<image href="${el.currentSrc.replace(/"/g, "&quot;")}" x="${n(p.box.x)}" y="${n(p.box.y)}" width="${n(p.box.w)}" height="${n(p.box.h)}" preserveAspectRatio="${fit}"/>`,
          p,
        );
        if (clipId) body = `<g clip-path="url(#${clipId})">${body}</g>`;
        items.push({
          kind: "paint",
          svg: (defs.length ? `<defs>${defs.join("")}</defs>` : "") + body,
          bbox: extent,
          role: "photo",
        });
      }
      return;
    }

    if (el.hasAttribute("data-dm-merged")) {
      // Already drawn as part of its parent's text run.
      return;
    }

    const p = place(el, root, f);
    const defs: string[] = [];
    const paint = boxPaint(el, cs, p, op, defs);
    if (paint) {
      const clipDefs: string[] = [];
      const clipId = clipMarkup(clips, clipDefs);
      const extent = clipExtent(clips, p.bbox);
      if (extent) {
        let body = rotated(paint, p);
        if (clipId) body = `<g clip-path="url(#${clipId})">${body}</g>`;
        const allDefs = [...defs, ...clipDefs];
        items.push({
          kind: "paint",
          svg:
            (allDefs.length ? `<defs>${allDefs.join("")}</defs>` : "") + body,
          bbox: extent,
          role: "box",
        });
      }
    }

    const text = textItem(el, cs, f, root, op);
    if (text) items.push(text);

    let nextClips = clips;
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      if (!p.angle) {
        const r = Number.parseFloat(cs.borderTopLeftRadius) || 0;
        const scale = el.offsetWidth ? p.box.w / el.offsetWidth : 1;
        nextClips = [
          ...clips,
          {
            box: p.box,
            radius: cs.borderTopLeftRadius.endsWith("%")
              ? (Number.parseFloat(cs.borderTopLeftRadius) / 100) *
                Math.min(p.box.w, p.box.h)
              : r * scale,
          },
        ];
      }
    }
    for (const child of Array.from(el.children)) visit(child, op, nextClips);
  };

  // The piece's own background is the canvas colour; walk its children.
  for (const child of Array.from(root.children)) visit(child, 1, []);
  for (const m of Array.from(root.querySelectorAll("[data-dm-merged]")))
    m.removeAttribute("data-dm-merged");
  return items;
}

/** Standalone SVG document for `items` drawn into the window `view`. */
export function svgDocument(
  items: PaintItem[],
  view: Box,
  width: number,
  height: number,
  attrs = "",
): string {
  return `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink"${attrs} width="${Math.max(1, Math.round(width))}" height="${Math.max(1, Math.round(height))}" viewBox="${n(view.x)} ${n(view.y)} ${n(view.w)} ${n(view.h)}" preserveAspectRatio="none">${items.map((i) => i.svg).join("")}</svg>`;
}
