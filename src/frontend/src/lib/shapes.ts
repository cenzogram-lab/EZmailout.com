/**
 * Vector shapes for the studio's Elements tool. A shape is stored as a logo
 * layer whose `url` is an SVG data URL, so the canister schema, the 3D proof
 * and the 300 DPI rasterizer all handle it as an ordinary image layer.
 */
export type ShapeKind =
  | "rect"
  | "rounded"
  | "circle"
  | "triangle"
  | "star"
  | "diamond"
  | "line"
  | "badge";

export interface ShapeDef {
  kind: ShapeKind;
  label: string;
  /** Default size in design px (100 ppi). */
  width: number;
  height: number;
}

export const SHAPES: ShapeDef[] = [
  { kind: "rect", label: "Rectangle", width: 200, height: 120 },
  { kind: "rounded", label: "Rounded", width: 200, height: 120 },
  { kind: "circle", label: "Circle", width: 140, height: 140 },
  { kind: "triangle", label: "Triangle", width: 140, height: 140 },
  { kind: "star", label: "Star", width: 140, height: 140 },
  { kind: "diamond", label: "Diamond", width: 140, height: 140 },
  { kind: "line", label: "Divider", width: 320, height: 8 },
  { kind: "badge", label: "Pill badge", width: 220, height: 64 },
];

export const DEFAULT_SHAPE_FILL = "#6366f1";

const PREFIX = "data:image/svg+xml;utf8,";

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`,
    );
  }
  return pts.join(" ");
}

/** Kinds whose corners must stay round at any width: drawn for their aspect. */
const ASPECT_KINDS: ReadonlySet<ShapeKind> = new Set(["rounded", "badge"]);

/**
 * SVG markup for a shape on a 100-unit-high viewBox. The layer stretches the
 * SVG to its box (`preserveAspectRatio="none"`), so rounded kinds take the
 * box's `aspect` (width / height) into their viewBox: a pill then keeps
 * semicircular ends instead of turning into an ellipse.
 */
export function shapeSvg(kind: ShapeKind, fill: string, aspect = 1): string {
  const w = ASPECT_KINDS.has(kind)
    ? Math.max(1, Math.round(Math.max(0.05, aspect) * 100))
    : 100;
  const attrs = `data-ez-shape="${kind}" xmlns="http://www.w3.org/2000/svg" width="${w}" height="100" viewBox="0 0 ${w} 100" preserveAspectRatio="none"`;
  const body = (() => {
    switch (kind) {
      case "rect":
        return `<rect x="0" y="0" width="100" height="100" fill="${fill}"/>`;
      case "rounded":
        return `<rect x="0" y="0" width="${w}" height="100" rx="14" ry="14" fill="${fill}"/>`;
      case "circle":
        return `<ellipse cx="50" cy="50" rx="50" ry="50" fill="${fill}"/>`;
      case "triangle":
        return `<polygon points="50,0 100,100 0,100" fill="${fill}"/>`;
      case "star":
        return `<polygon points="${starPoints(50, 52, 50, 21)}" fill="${fill}"/>`;
      case "diamond":
        return `<polygon points="50,0 100,50 50,100 0,50" fill="${fill}"/>`;
      case "line":
        return `<rect x="0" y="0" width="100" height="100" fill="${fill}"/>`;
      case "badge":
        return `<rect x="0" y="0" width="${w}" height="100" rx="50" ry="50" fill="${fill}"/>`;
      default:
        return "";
    }
  })();
  return `<svg ${attrs}>${body}</svg>`;
}

/** Data URL for a shape layer; `aspect` is the layer's width / height. */
export function shapeUrl(kind: ShapeKind, fill: string, aspect = 1): string {
  return `${PREFIX}${encodeURIComponent(shapeSvg(kind, fill, aspect))}`;
}

/** True when a logo layer is one of the studio's vector shapes. */
export function isShapeUrl(url: string): boolean {
  return url.startsWith(PREFIX) && url.includes("data-ez-shape");
}

function decode(url: string): string {
  try {
    return decodeURIComponent(url.slice(PREFIX.length));
  } catch {
    return "";
  }
}

export function shapeKindOf(url: string): ShapeKind | null {
  const match = /data-ez-shape="([a-z]+)"/.exec(decode(url));
  return match ? (match[1] as ShapeKind) : null;
}

function rawFillOf(url: string): string | null {
  const match = /fill="(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)"/.exec(decode(url));
  return match ? match[1] : null;
}

/** The shape's colour as `#rrggbb` (any alpha byte is reported separately). */
export function shapeFillOf(url: string): string {
  const fill = rawFillOf(url) ?? DEFAULT_SHAPE_FILL;
  return /^#[0-9a-fA-F]{8}$/.test(fill) ? fill.slice(0, 7) : fill;
}

/** Width / height the shape was drawn for (1 for fixed-viewBox kinds). */
export function shapeAspectOf(url: string): number {
  const match = /viewBox="0 0 ([0-9.]+) 100"/.exec(decode(url));
  return match ? Number(match[1]) / 100 : 1;
}

/**
 * The same shape redrawn for a new box: rounded kinds (pill badge, rounded
 * rectangle) take the new aspect so their corners stay round when resized;
 * every other kind, and any non-shape image, comes back unchanged.
 */
export function reshapeForBox(url: string, width: number, height: number) {
  const kind = shapeKindOf(url);
  if (!kind || !ASPECT_KINDS.has(kind) || width <= 0 || height <= 0) return url;
  const next = shapeUrl(
    kind,
    rawFillOf(url) ?? DEFAULT_SHAPE_FILL,
    width / height,
  );
  return next;
}

/**
 * Same shape, new fill. A translucent shape (a `#rrggbbaa` fill, such as a
 * template's faint accent disc) keeps its transparency, and a rounded shape
 * keeps the aspect it was drawn for.
 */
export function recolorShape(url: string, fill: string): string {
  const kind = shapeKindOf(url);
  if (!kind) return url;
  const old = rawFillOf(url);
  const alpha =
    old && /^#[0-9a-fA-F]{8}$/.test(old) && /^#[0-9a-fA-F]{6}$/.test(fill)
      ? old.slice(7)
      : "";
  return shapeUrl(kind, `${fill}${alpha}`, shapeAspectOf(url));
}
