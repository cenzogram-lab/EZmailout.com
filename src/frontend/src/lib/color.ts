/**
 * Colour helpers for the studio's colour picker: parse whatever a customer
 * types (hex with or without `#`, `rgb()`, `hsl()`, any CSS colour name,
 * "light blue" with spaces), convert between hex and HSV for the spectrum,
 * and search colours by name. Every result is `#rrggbb` lowercase, which is
 * what the canvas, the rasterizer and `recolorShape` expect.
 */

/** The 148 CSS named colours (CSS Color Module Level 4). */
export const CSS_COLORS: Readonly<Record<string, string>> = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32",
};

/** Everyday names CSS lacks, so "cream" or "mustard" finds something. */
const EXTRA_COLORS: Readonly<Record<string, string>> = {
  cream: "#f3ead8",
  sand: "#e7d7b9",
  mustard: "#d4a017",
  rust: "#b7410e",
  burgundy: "#800020",
  wine: "#722f37",
  mint: "#98ff98",
  sage: "#9caf88",
  emerald: "#008058",
  jade: "#00a86b",
  peach: "#ffcba4",
  blush: "#f4c2c2",
  rose: "#ff007f",
  mauve: "#b784a7",
  lilac: "#c8a2c8",
  charcoal: "#36454f",
  graphite: "#383838",
  ink: "#01080a",
  cobalt: "#0047ab",
  sapphire: "#0f52ba",
  denim: "#1560bd",
  sky: "#87ceeb",
  ice: "#cff3fd",
  cloud: "#f0f1f5",
  stone: "#a8a29e",
  terracotta: "#e2725b",
  copper: "#b87333",
  bronze: "#cd7f32",
  champagne: "#f7e7ce",
  ivorycream: "#fffdd0",
  forest: "#228b22",
  olivegreen: "#556b2f",
  lemon: "#fff44f",
  tangerine: "#f28500",
  pumpkin: "#ff7518",
  cherry: "#d2042d",
  ruby: "#e0115f",
  plumpurple: "#8e4585",
  eggplant: "#614051",
  ocean: "#1d5fa8",
};

const ALL_NAMES: [string, string][] = [
  ...Object.entries(CSS_COLORS),
  ...Object.entries(EXTRA_COLORS),
];

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const hex2 = (v: number) =>
  Math.round(clamp(v, 0, 255))
    .toString(16)
    .padStart(2, "0");

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return [
    Number.parseInt(m[1], 16),
    Number.parseInt(m[2], 16),
    Number.parseInt(m[3], 16),
  ];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) =>
    lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function hsvToHex(h: number, s: number, v: number): string {
  const sat = clamp(s, 0, 1);
  const val = clamp(v, 0, 1);
  const f = (n: number) => {
    const k = (n + (((h % 360) + 360) % 360) / 60) % 6;
    return val - val * sat * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255);
}

/** Hue 0–360, saturation and value 0–1. */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}

const normalizeName = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

/** `#rrggbb` for anything a customer might type, or null. */
export function parseColor(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const hex = /^#?([0-9a-f]{3,8})$/.exec(raw);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6)}`;
    return null;
  }
  const nums = (s: string) =>
    s
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((p) => Number.parseFloat(p));
  const rgb = /^rgba?\(([^)]*)\)$/.exec(raw);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const [r, g, b] = parts.map((p) =>
      p.endsWith("%")
        ? (Number.parseFloat(p) / 100) * 255
        : Number.parseFloat(p),
    );
    return [r, g, b].every(Number.isFinite) ? rgbToHex(r, g, b) : null;
  }
  const hsl = /^hsla?\(([^)]*)\)$/.exec(raw);
  if (hsl) {
    const [h, s, l] = nums(hsl[1].replace(/deg|%/g, ""));
    return [h, s, l].every(Number.isFinite) ? hslToHex(h, s, l) : null;
  }
  const name = normalizeName(raw);
  return CSS_COLORS[name] ?? EXTRA_COLORS[name] ?? null;
}

/** Display name of a named colour ("lightskyblue" → "Light sky blue"). */
function prettyName(name: string): string {
  const words = name
    .replace(
      /(light|dark|medium|pale|deep|hot|dim|navajo|ghost|lemon|lawn|old|sea|sky|slate|steel|royal|rebecca|midnight|forest|olive|indian|cadet|cornflower|dodger|fire|spring|yellow|green|blue|violet|orchid|purple|goldenrod|gold|gray|grey|cyan|turquoise|pink|salmon|coral|aquamarine|white|brown|red|orange|khaki|magenta|chiffon|smoke|lace|whip|puff|wood|almond|blush|rose|cream|silk|drab|chocolate|tan)/g,
      " $1",
    )
    .trim()
    .replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface NamedColor {
  name: string;
  hex: string;
}

/**
 * Named colours matching `query` (every typed word must appear in the
 * name), exact and prefix matches first.
 */
export function searchColors(query: string, limit = 24): NamedColor[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const joined = words.join("");
  const seen = new Set<string>();
  const hits: { c: NamedColor; rank: number }[] = [];
  for (const [name, hex] of ALL_NAMES) {
    if (!words.every((w) => name.includes(w))) continue;
    const key = `${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rank = name === joined ? 0 : name.startsWith(joined) ? 1 : 2;
    hits.push({ c: { name: prettyName(name), hex }, rank });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.c.name.length - b.c.name.length)
    .slice(0, limit)
    .map((h) => h.c);
}

/**
 * The palette grid: twelve hues across, tints at the top and shades at the
 * bottom, with a grey ramp underneath — the colour chart customers expect.
 */
export function paletteGrid(): string[][] {
  const hues = [0, 20, 35, 50, 65, 90, 140, 170, 195, 215, 260, 300];
  const lightness = [92, 82, 70, 58, 48, 38, 28, 18];
  const rows = lightness.map((l) =>
    hues.map((h) => hslToHex(h, l > 80 ? 75 : 85, l)),
  );
  const greys = hues.map((_, i) => {
    const v = (255 * (hues.length - 1 - i)) / (hues.length - 1);
    return rgbToHex(v, v, v);
  });
  rows.push(greys);
  return rows;
}
