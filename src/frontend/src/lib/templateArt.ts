/**
 * Original vector artwork for the gallery templates.
 *
 * Everything here is drawn from primitives in code (no stock imagery), so it
 * prints crisply at any size and costs a few kilobytes. Two kinds of image
 * come out of this module:
 *
 * - **Scenes** (`sceneUrl`): an illustration on a 100 × 100 grid, placed on
 *   the canvas as an ordinary image layer the customer can move, resize or
 *   delete. The SVG carries the layer's own width and height, so the editor's
 *   `object-contain` and the rasterizer's contain-fit draw it edge to edge.
 * - **Backgrounds** (`backgroundUrl`): full-bleed decoration for a whole side
 *   (gradients, bands, arcs), set as the side's background image. It declares
 *   300 DPI pixel dimensions so the resolution preflight reads it as print
 *   quality, which it is: it is vector.
 *
 * Neither ever contains text — an image cannot load the page's fonts — so
 * every word on a template stays an editable text layer.
 */

export interface TemplatePalette {
  /** Page background. */
  bg: string;
  /** Cards and panels on the page. */
  surface: string;
  /** Main text colour on `bg`. */
  ink: string;
  /** Secondary text on `bg` (still ≥ 4.5:1). */
  muted: string;
  /** Brand colour: highlights, buttons, art. */
  accent: string;
  /** Second brand colour for art and offers. */
  accent2: string;
  /** Text on an `accent` fill. */
  onAccent: string;
}

export type SceneKind =
  | "skyline"
  | "house"
  | "food"
  | "coffee"
  | "health"
  | "tooth"
  | "fitness"
  | "tools"
  | "car"
  | "bag"
  | "plant"
  | "paw"
  | "cap"
  | "gift"
  | "team"
  | "chart"
  | "shield"
  | "calendar"
  | "salon"
  | "thermo"
  | "pin"
  | "heart";

const PREFIX = "data:image/svg+xml;utf8,";

export function svgUrl(svg: string): string {
  return `${PREFIX}${encodeURIComponent(svg)}`;
}

/** `#rrggbb` mixed toward white (t > 0) or black (t < 0). */
export function tint(hex: string, t: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const target = t >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(t));
  return `#${m
    .slice(1)
    .map((c) => {
      const v = Number.parseInt(c, 16);
      return Math.round(v + (target - v) * k)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

/** `a` blended toward `b` by `t` (0–1), both `#rrggbb`. */
export function mix(a: string, b: string, t: number): string {
  const pa = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(a);
  const pb = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(b);
  if (!pa || !pb) return a;
  return `#${[1, 2, 3]
    .map((i) => {
      const va = Number.parseInt(pa[i], 16);
      const vb = Number.parseInt(pb[i], 16);
      return Math.round(va + (vb - va) * t)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();

// ─── Scenes (100 × 100 grid) ────────────────────────────────────────────────

function windowsGrid(
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  fill: string,
): string {
  const out: string[] = [];
  const gx = w / (cols * 2 + 1);
  const gy = h / (rows * 2 + 1);
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      out.push(
        `<rect x="${n(x + gx * (c * 2 + 1))}" y="${n(y + gy * (r * 2 + 1))}" width="${n(gx)}" height="${n(gy)}" fill="${fill}"/>`,
      );
    }
  }
  return out.join("");
}

function scene(kind: SceneKind, p: TemplatePalette): string {
  const a = p.accent;
  const b = p.accent2;
  const s = p.surface;
  const d = p.ink;
  const light = tint(a, 0.75);
  const pale = tint(a, 0.88);
  switch (kind) {
    case "skyline":
      return [
        `<circle cx="74" cy="26" r="13" fill="${tint(b, 0.35)}"/>`,
        `<rect x="6" y="40" width="18" height="56" rx="1.5" fill="${tint(a, -0.15)}"/>`,
        windowsGrid(6, 44, 18, 48, 2, 6, light),
        `<rect x="26" y="22" width="20" height="74" rx="1.5" fill="${a}"/>`,
        `<polygon points="26,22 36,10 46,22" fill="${a}"/>`,
        windowsGrid(26, 26, 20, 66, 2, 8, pale),
        `<rect x="48" y="48" width="16" height="48" rx="1.5" fill="${tint(d, 0.25)}"/>`,
        windowsGrid(48, 52, 16, 40, 2, 5, tint(b, 0.5)),
        `<rect x="66" y="32" width="26" height="64" rx="1.5" fill="${tint(a, 0.25)}"/>`,
        windowsGrid(66, 36, 26, 56, 3, 7, s),
        `<rect x="0" y="94" width="100" height="6" fill="${tint(d, 0.15)}"/>`,
      ].join("");
    case "house":
      return [
        `<circle cx="80" cy="22" r="10" fill="${tint(b, 0.3)}"/>`,
        `<rect x="66" y="22" width="7" height="16" fill="${tint(d, 0.2)}"/>`,
        `<polygon points="10,48 46,16 82,48" fill="${a}"/>`,
        `<rect x="18" y="46" width="56" height="44" fill="${s}" stroke="${tint(d, 0.2)}" stroke-width="1.5"/>`,
        `<rect x="40" y="62" width="14" height="28" rx="1" fill="${b}"/>`,
        `<circle cx="51" cy="77" r="1.2" fill="${s}"/>`,
        `<rect x="24" y="56" width="11" height="11" fill="${light}" stroke="${tint(d, 0.2)}" stroke-width="1"/>`,
        `<rect x="59" y="56" width="11" height="11" fill="${light}" stroke="${tint(d, 0.2)}" stroke-width="1"/>`,
        `<circle cx="88" cy="68" r="10" fill="${tint(b, -0.1)}"/>`,
        `<rect x="86.5" y="74" width="3" height="16" fill="${tint(d, 0.2)}"/>`,
        `<rect x="0" y="89" width="100" height="11" fill="${tint(b, 0.55)}"/>`,
      ].join("");
    case "food":
      return [
        `<ellipse cx="50" cy="54" rx="36" ry="36" fill="${s}" stroke="${tint(d, 0.7)}" stroke-width="1.5"/>`,
        `<ellipse cx="50" cy="54" rx="27" ry="27" fill="${pale}"/>`,
        `<path d="M34 56 Q40 38 52 44 Q58 34 66 48 Q72 58 60 66 Q50 74 40 66 Q30 62 34 56Z" fill="${tint(b, 0.1)}"/>`,
        `<circle cx="44" cy="52" r="5" fill="${a}"/>`,
        `<circle cx="58" cy="56" r="4" fill="${a}"/>`,
        `<circle cx="52" cy="62" r="3" fill="${tint(a, -0.2)}"/>`,
        `<rect x="6" y="22" width="3" height="64" rx="1.5" fill="${tint(d, 0.35)}"/>`,
        `<rect x="3" y="22" width="2" height="16" rx="1" fill="${tint(d, 0.35)}"/>`,
        `<rect x="10" y="22" width="2" height="16" rx="1" fill="${tint(d, 0.35)}"/>`,
        `<path d="M92 22 Q98 40 93 52 L93 86 L90 86 L90 22Z" fill="${tint(d, 0.35)}"/>`,
      ].join("");
    case "coffee":
      return [
        `<path d="M40 14 q-6 8 0 16 q6 8 0 16" fill="none" stroke="${tint(d, 0.45)}" stroke-width="2.5" stroke-linecap="round"/>`,
        `<path d="M54 10 q-6 8 0 16 q6 8 0 16" fill="none" stroke="${tint(d, 0.45)}" stroke-width="2.5" stroke-linecap="round"/>`,
        `<ellipse cx="48" cy="88" rx="38" ry="7" fill="${tint(d, 0.6)}"/>`,
        `<path d="M20 48 L76 48 L70 84 Q69 88 64 88 L32 88 Q27 88 26 84Z" fill="${a}"/>`,
        `<path d="M76 54 q16 0 14 12 q-2 12 -18 12" fill="none" stroke="${a}" stroke-width="6"/>`,
        `<rect x="20" y="46" width="56" height="6" rx="3" fill="${tint(a, -0.2)}"/>`,
        `<path d="M36 64 q12 -8 24 0" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>`,
      ].join("");
    case "health":
      return [
        `<path d="M50 90 C14 66 4 44 14 28 C24 12 44 16 50 30 C56 16 76 12 86 28 C96 44 86 66 50 90Z" fill="${a}"/>`,
        `<polyline points="14,52 34,52 40,40 48,66 56,34 62,52 86,52" fill="none" stroke="${s}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`,
        `<circle cx="82" cy="18" r="12" fill="${s}" stroke="${b}" stroke-width="2"/>`,
        `<rect x="79" y="10" width="6" height="16" rx="1" fill="${b}"/>`,
        `<rect x="74" y="15" width="16" height="6" rx="1" fill="${b}"/>`,
      ].join("");
    case "tooth":
      return [
        `<path d="M30 14 C18 14 14 28 18 44 C22 58 24 70 26 82 C28 92 36 92 38 82 C40 70 44 64 50 64 C56 64 60 70 62 82 C64 92 72 92 74 82 C76 70 78 58 82 44 C86 28 82 14 70 14 C62 14 58 20 50 20 C42 20 38 14 30 14Z" fill="${s}" stroke="${a}" stroke-width="3"/>`,
        `<path d="M30 30 Q34 24 42 26" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
        `<path d="M86 8 L88 14 L94 16 L88 18 L86 24 L84 18 L78 16 L84 14Z" fill="${b}"/>`,
        `<path d="M12 60 L13.5 64 L17.5 65.5 L13.5 67 L12 71 L10.5 67 L6.5 65.5 L10.5 64Z" fill="${b}"/>`,
      ].join("");
    case "fitness":
      return [
        '<g transform="rotate(-20 50 50)">',
        `<rect x="22" y="46" width="56" height="8" rx="3" fill="${tint(d, 0.3)}"/>`,
        `<rect x="8" y="30" width="12" height="40" rx="3" fill="${a}"/>`,
        `<rect x="18" y="36" width="8" height="28" rx="2" fill="${tint(a, -0.2)}"/>`,
        `<rect x="80" y="30" width="12" height="40" rx="3" fill="${a}"/>`,
        `<rect x="74" y="36" width="8" height="28" rx="2" fill="${tint(a, -0.2)}"/>`,
        "</g>",
        `<path d="M62 84 L66 74 L70 84 L80 86 L70 88 L66 98 L62 88 L52 86Z" fill="${b}"/>`,
      ].join("");
    case "tools":
      return [
        '<g transform="rotate(45 50 50)">',
        `<rect x="45" y="22" width="10" height="66" rx="4" fill="${a}"/>`,
        `<path d="M36 8 h28 a6 6 0 0 1 6 6 v6 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6 v-6 a6 6 0 0 1 6 -6Z" fill="${tint(d, 0.3)}"/>`,
        "</g>",
        '<g transform="rotate(-45 50 50)">',
        `<rect x="45" y="30" width="10" height="58" rx="4" fill="${b}"/>`,
        `<circle cx="50" cy="22" r="15" fill="${b}"/>`,
        `<rect x="44" y="4" width="12" height="18" fill="${p.bg}"/>`,
        "</g>",
      ].join("");
    case "car":
      return [
        `<rect x="0" y="80" width="100" height="4" rx="2" fill="${tint(d, 0.6)}"/>`,
        `<path d="M8 66 Q8 56 18 54 L28 52 L38 36 Q41 32 47 32 L68 32 Q74 32 78 38 L86 52 Q94 54 94 64 L94 72 Q94 76 90 76 L12 76 Q8 76 8 72Z" fill="${a}"/>`,
        `<path d="M42 38 L49 38 L49 52 L34 52Z" fill="${pale}"/>`,
        `<path d="M53 38 L68 38 Q72 38 74 42 L79 52 L53 52Z" fill="${pale}"/>`,
        `<circle cx="28" cy="76" r="11" fill="${tint(d, 0.15)}"/>`,
        `<circle cx="28" cy="76" r="5" fill="${s}"/>`,
        `<circle cx="74" cy="76" r="11" fill="${tint(d, 0.15)}"/>`,
        `<circle cx="74" cy="76" r="5" fill="${s}"/>`,
        `<rect x="86" y="58" width="6" height="4" rx="1" fill="${b}"/>`,
      ].join("");
    case "bag":
      return [
        `<path d="M34 34 Q34 12 50 12 Q66 12 66 34" fill="none" stroke="${tint(d, 0.3)}" stroke-width="4"/>`,
        `<path d="M18 30 L82 30 L88 92 L12 92Z" fill="${a}"/>`,
        `<rect x="18" y="30" width="64" height="8" fill="${tint(a, -0.15)}"/>`,
        `<circle cx="34" cy="40" r="2.5" fill="${s}"/>`,
        `<circle cx="66" cy="40" r="2.5" fill="${s}"/>`,
        `<g transform="rotate(-14 70 70)"><path d="M58 60 L80 60 L86 70 L80 80 L58 80Z" fill="${b}"/><circle cx="64" cy="70" r="2.5" fill="${s}"/></g>`,
      ].join("");
    case "plant":
      return [
        `<path d="M50 84 Q48 50 50 22" fill="none" stroke="${tint(b, -0.2)}" stroke-width="3"/>`,
        `<path d="M50 40 Q24 40 18 20 Q42 18 50 40Z" fill="${b}"/>`,
        `<path d="M50 52 Q78 54 84 30 Q58 28 50 52Z" fill="${tint(b, -0.15)}"/>`,
        `<path d="M50 28 Q38 10 50 2 Q62 10 50 28Z" fill="${tint(b, 0.2)}"/>`,
        `<path d="M50 66 Q26 68 20 50 Q42 46 50 66Z" fill="${tint(b, 0.15)}"/>`,
        `<path d="M28 76 L72 76 L66 98 L34 98Z" fill="${a}"/>`,
        `<rect x="24" y="72" width="52" height="8" rx="2" fill="${tint(a, -0.15)}"/>`,
      ].join("");
    case "paw":
      return [
        `<ellipse cx="50" cy="66" rx="22" ry="19" fill="${a}"/>`,
        `<ellipse cx="22" cy="44" rx="9" ry="12" transform="rotate(-20 22 44)" fill="${a}"/>`,
        `<ellipse cx="38" cy="26" rx="9" ry="12" transform="rotate(-6 38 26)" fill="${a}"/>`,
        `<ellipse cx="62" cy="26" rx="9" ry="12" transform="rotate(6 62 26)" fill="${a}"/>`,
        `<ellipse cx="78" cy="44" rx="9" ry="12" transform="rotate(20 78 44)" fill="${a}"/>`,
        `<path d="M50 92 C34 82 30 74 34 68 C38 62 46 64 50 70 C54 64 62 62 66 68 C70 74 66 82 50 92Z" fill="${b}" transform="translate(30 -6) scale(0.45)"/>`,
      ].join("");
    case "cap":
      return [
        `<path d="M28 52 L28 70 Q50 84 72 70 L72 52Z" fill="${tint(d, 0.2)}"/>`,
        `<polygon points="50,22 94,40 50,58 6,40" fill="${a}"/>`,
        `<polygon points="50,28 80,40 50,52 20,40" fill="${tint(a, -0.15)}"/>`,
        `<path d="M50 40 L84 50 L84 72" fill="none" stroke="${b}" stroke-width="2.5"/>`,
        `<path d="M80 72 L88 72 L90 84 L78 84Z" fill="${b}"/>`,
      ].join("");
    case "gift":
      return [
        `<rect x="14" y="44" width="72" height="50" rx="3" fill="${a}"/>`,
        `<rect x="10" y="32" width="80" height="16" rx="3" fill="${tint(a, -0.15)}"/>`,
        `<rect x="45" y="32" width="10" height="62" fill="${b}"/>`,
        `<path d="M50 32 C38 12 18 18 26 30 C30 34 42 34 50 32Z" fill="${b}"/>`,
        `<path d="M50 32 C62 12 82 18 74 30 C70 34 58 34 50 32Z" fill="${tint(b, -0.15)}"/>`,
      ].join("");
    case "team":
      return [
        `<rect x="54" y="10" width="42" height="32" rx="3" fill="${s}" stroke="${tint(d, 0.3)}" stroke-width="2"/>`,
        `<polyline points="60,34 70,26 78,30 90,16" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<rect x="74" y="42" width="2" height="12" fill="${tint(d, 0.3)}"/>`,
        `<circle cx="20" cy="40" r="9" fill="${tint(b, -0.1)}"/>`,
        `<path d="M6 86 Q6 54 20 54 Q34 54 34 86Z" fill="${b}"/>`,
        `<circle cx="50" cy="48" r="10" fill="${tint(d, 0.35)}"/>`,
        `<path d="M34 96 Q34 62 50 62 Q66 62 66 96Z" fill="${a}"/>`,
        `<circle cx="80" cy="60" r="8" fill="${tint(a, -0.2)}"/>`,
        `<path d="M68 96 Q68 72 80 72 Q92 72 92 96Z" fill="${tint(a, 0.35)}"/>`,
      ].join("");
    case "chart":
      return [
        `<rect x="8" y="64" width="16" height="28" rx="2" fill="${tint(a, 0.45)}"/>`,
        `<rect x="30" y="50" width="16" height="42" rx="2" fill="${tint(a, 0.2)}"/>`,
        `<rect x="52" y="36" width="16" height="56" rx="2" fill="${a}"/>`,
        `<rect x="74" y="20" width="16" height="72" rx="2" fill="${tint(a, -0.2)}"/>`,
        `<polyline points="10,52 36,36 58,24 86,8" fill="none" stroke="${b}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<polygon points="88,4 90,14 80,10" fill="${b}"/>`,
        `<rect x="4" y="92" width="92" height="3" fill="${tint(d, 0.3)}"/>`,
      ].join("");
    case "shield":
      return [
        `<path d="M50 6 L86 18 L86 46 Q86 76 50 94 Q14 76 14 46 L14 18Z" fill="${a}"/>`,
        `<path d="M50 14 L78 24 L78 46 Q78 70 50 85 Z" fill="${tint(a, -0.15)}"/>`,
        `<polyline points="32,50 45,63 70,36" fill="none" stroke="${s}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
      ].join("");
    case "calendar": {
      const days: string[] = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 5; c += 1) {
          const hot = r === 1 && c === 3;
          days.push(
            `<rect x="${n(17 + c * 14)}" y="${n(46 + r * 14)}" width="9" height="9" rx="2" fill="${hot ? b : light}"/>`,
          );
        }
      }
      return [
        `<rect x="8" y="16" width="84" height="78" rx="6" fill="${s}" stroke="${tint(d, 0.3)}" stroke-width="2"/>`,
        `<path d="M8 22 a6 6 0 0 1 6 -6 h72 a6 6 0 0 1 6 6 v14 h-84Z" fill="${a}"/>`,
        `<rect x="26" y="8" width="6" height="16" rx="3" fill="${tint(d, 0.3)}"/>`,
        `<rect x="68" y="8" width="6" height="16" rx="3" fill="${tint(d, 0.3)}"/>`,
        ...days,
      ].join("");
    }
    case "salon":
      return [
        `<circle cx="28" cy="78" r="12" fill="none" stroke="${a}" stroke-width="5"/>`,
        `<circle cx="72" cy="78" r="12" fill="none" stroke="${a}" stroke-width="5"/>`,
        `<path d="M36 68 L80 10" stroke="${tint(d, 0.3)}" stroke-width="6" stroke-linecap="round"/>`,
        `<path d="M64 68 L20 10" stroke="${tint(d, 0.45)}" stroke-width="6" stroke-linecap="round"/>`,
        `<circle cx="50" cy="44" r="3" fill="${b}"/>`,
        `<path d="M88 30 L90 36 L96 38 L90 40 L88 46 L86 40 L80 38 L86 36Z" fill="${b}"/>`,
      ].join("");
    case "thermo":
      return [
        `<circle cx="74" cy="26" r="14" fill="${tint(b, 0.25)}"/>`,
        `<g stroke="${tint(b, 0.25)}" stroke-width="3" stroke-linecap="round"><path d="M74 4 v4"/><path d="M74 44 v4"/><path d="M52 26 h4"/><path d="M92 26 h4"/></g>`,
        `<rect x="30" y="8" width="18" height="64" rx="9" fill="${s}" stroke="${tint(d, 0.3)}" stroke-width="2.5"/>`,
        `<circle cx="39" cy="80" r="14" fill="${a}"/>`,
        `<rect x="35" y="34" width="8" height="44" rx="4" fill="${a}"/>`,
        `<g stroke="${tint(d, 0.3)}" stroke-width="2"><path d="M50 20 h6"/><path d="M50 30 h4"/><path d="M50 40 h6"/><path d="M50 50 h4"/></g>`,
        `<path d="M78 66 l4 7 l-4 7 l-4 -7Z M70 72 l14 0" fill="${tint(a, 0.4)}" stroke="${tint(a, 0.4)}" stroke-width="2"/>`,
      ].join("");
    case "pin":
      return [
        `<ellipse cx="50" cy="92" rx="22" ry="5" fill="${tint(d, 0.7)}"/>`,
        `<path d="M50 90 C30 64 18 50 18 34 A32 32 0 0 1 82 34 C82 50 70 64 50 90Z" fill="${a}"/>`,
        `<circle cx="50" cy="34" r="13" fill="${s}"/>`,
        `<path d="M44 36 L50 30 L56 36 L56 42 L44 42Z" fill="${b}"/>`,
      ].join("");
    case "heart":
      return [
        `<path d="M50 30 C46 18 28 16 24 30 C20 44 38 52 50 62 C62 52 80 44 76 30 C72 16 54 18 50 30Z" fill="${a}"/>`,
        `<path d="M8 72 Q20 60 34 64 L54 70 Q60 72 58 78 Q56 82 50 81 L38 79" fill="${tint(b, 0.15)}" stroke="${tint(d, 0.3)}" stroke-width="1.5"/>`,
        `<path d="M92 72 Q80 60 66 64 L46 70 Q40 72 42 78 Q44 82 50 81 L62 79" fill="${b}" stroke="${tint(d, 0.3)}" stroke-width="1.5"/>`,
        `<path d="M84 14 L86 20 L92 22 L86 24 L84 30 L82 24 L76 22 L82 20Z" fill="${tint(b, -0.1)}"/>`,
      ].join("");
    default:
      return "";
  }
}

/** A scene drawn into a `width × height` layer (centred, never stretched). */
export function sceneUrl(
  kind: SceneKind,
  palette: TemplatePalette,
  width: number,
  height: number,
): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${scene(kind, palette)}</svg>`,
  );
}

export type FrameKind = "diamond" | "arch" | "circle" | "blob" | "rounded";

/**
 * A scene inside a coloured frame — the illustrated stand-in for a photo
 * (a diamond like an architecture brochure, an arch, a circle or a soft
 * blob), drawn for the layer's own box so the frame fills it.
 */
export function framedSceneUrl(
  kind: SceneKind,
  frame: FrameKind,
  palette: TemplatePalette,
  width: number,
  height: number,
): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const fill = tint(palette.accent, 0.82);
  const ring = palette.accent;
  let path: string;
  switch (frame) {
    case "diamond":
      path = `M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${h / 2}Z`;
      break;
    case "arch":
      path = `M0 ${h} L0 ${w / 2} A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} L${w} ${h}Z`;
      break;
    case "circle":
      path = `M0 ${h / 2} A${w / 2} ${h / 2} 0 1 1 ${w} ${h / 2} A${w / 2} ${h / 2} 0 1 1 0 ${h / 2}Z`;
      break;
    case "blob":
      path = `M${w * 0.5} 0 C${w * 0.85} 0 ${w} ${h * 0.2} ${w} ${h * 0.48} C${w} ${h * 0.8} ${w * 0.78} ${h} ${w * 0.46} ${h} C${w * 0.16} ${h} 0 ${h * 0.78} 0 ${h * 0.5} C0 ${h * 0.18} ${w * 0.2} 0 ${w * 0.5} 0Z`;
      break;
    default: {
      const r = Math.min(w, h) * 0.12;
      path = `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 0 ${h - r} V${r} A${r} ${r} 0 0 1 ${r} 0Z`;
    }
  }
  // The scene sits in the frame's inner 70 % so it never touches the edge.
  const inner = Math.min(w, h) * (frame === "diamond" ? 0.5 : 0.7);
  const sx = (w - inner) / 2;
  const sy = frame === "arch" ? h - inner - h * 0.08 : (h - inner) / 2;
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><clipPath id="f"><path d="${path}"/></clipPath></defs><path d="${path}" fill="${fill}"/><g clip-path="url(#f)"><circle cx="${n(w * 0.85)}" cy="${n(h * 0.15)}" r="${n(Math.min(w, h) * 0.3)}" fill="${tint(palette.accent, 0.65)}"/><svg x="${n(sx)}" y="${n(sy)}" width="${n(inner)}" height="${n(inner)}" viewBox="0 0 100 100">${scene(kind, palette)}</svg></g><path d="${path}" fill="none" stroke="${ring}" stroke-width="${n(Math.max(2, Math.min(w, h) * 0.018))}"/></svg>`,
  );
}

/** Small round icon used before bullet and contact lines. */
export type IconKind = "check" | "dot" | "phone" | "web" | "pin" | "star";

export function iconUrl(
  kind: IconKind,
  fill: string,
  ink: string,
  size: number,
): string {
  const s = Math.max(1, Math.round(size));
  const glyph = (() => {
    switch (kind) {
      case "check":
        return `<polyline points="28,52 44,67 72,36" fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
      case "phone":
        return `<path d="M36 26 L44 26 L48 38 L42 44 Q48 56 58 60 L64 54 L76 58 L76 66 Q74 74 66 74 Q30 70 28 34 Q28 26 36 26Z" fill="${ink}"/>`;
      case "web":
        return `<g fill="none" stroke="${ink}" stroke-width="6"><circle cx="50" cy="50" r="24"/><ellipse cx="50" cy="50" rx="10" ry="24"/><path d="M26 50 h48"/></g>`;
      case "pin":
        return `<path d="M50 78 C40 64 32 56 32 44 A18 18 0 0 1 68 44 C68 56 60 64 50 78Z" fill="${ink}"/><circle cx="50" cy="44" r="7" fill="${fill}"/>`;
      case "star":
        return `<polygon points="50,24 57,42 76,43 61,55 66,74 50,63 34,74 39,55 24,43 43,42" fill="${ink}"/>`;
      default:
        return `<circle cx="50" cy="50" r="14" fill="${ink}"/>`;
    }
  })();
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${fill}"/>${glyph}</svg>`,
  );
}

/** Starburst offer badge: a rosette in the layer's box. */
export function burstUrl(fill: string, ring: string, size: number): string {
  const s = Math.max(1, Math.round(size));
  const pts: string[] = [];
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? 50 : 44;
    const t = (i * Math.PI) / spikes - Math.PI / 2;
    pts.push(`${n(50 + r * Math.cos(t))},${n(50 + r * Math.sin(t))}`);
  }
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100"><polygon points="${pts.join(" ")}" fill="${fill}"/><circle cx="50" cy="50" r="37" fill="none" stroke="${ring}" stroke-width="1.6" stroke-dasharray="3 3"/></svg>`,
  );
}

/** Dashed coupon outline with scissors notch, drawn for its box. */
export function couponUrl(
  fill: string,
  stroke: string,
  width: number,
  height: number,
): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const r = Math.min(14, h * 0.18);
  const sw = Math.max(1.5, Math.min(w, h) * 0.02);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="${n(sw)}" y="${n(sw)}" width="${n(w - sw * 2)}" height="${n(h - sw * 2)}" rx="${n(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${n(sw)}" stroke-dasharray="${n(sw * 4)} ${n(sw * 3)}"/></svg>`,
  );
}

// ─── Backgrounds ────────────────────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a background is drawn around: the artboard and its regions. */
export interface BackgroundPlan {
  width: number;
  height: number;
  /** Cover region of the side, extended to the trim and the folds. */
  cover: Box;
  /** Every panel between folds, extended to the trim. */
  panels: Box[];
}

export type BackgroundKind =
  | "gradient"
  | "split"
  | "poster"
  | "classic"
  | "band"
  | "event"
  | "dark"
  | "offer"
  | "letter"
  | "back";

function rect(b: Box, fill: string, extra = ""): string {
  return `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" fill="${fill}"${extra}/>`;
}

function dotGrid(
  x: number,
  y: number,
  cols: number,
  rows: number,
  gap: number,
  r: number,
  fill: string,
): string {
  const out: string[] = [];
  for (let c = 0; c < cols; c += 1) {
    for (let k = 0; k < rows; k += 1) {
      out.push(
        `<circle cx="${n(x + c * gap)}" cy="${n(y + k * gap)}" r="${n(r)}" fill="${fill}"/>`,
      );
    }
  }
  return out.join("");
}

function backgroundBody(
  kind: BackgroundKind,
  p: TemplatePalette,
  plan: BackgroundPlan,
): string {
  const { width: W, height: H, cover: c } = plan;
  const short = Math.min(c.w, c.h);
  switch (kind) {
    case "gradient":
      return [
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="0.55" stop-color="${tint(p.accent, 0.78)}"/><stop offset="1" stop-color="${tint(p.accent2, 0.55)}"/></linearGradient><radialGradient id="r" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${tint(p.accent2, 0.35)}" stop-opacity="0.55"/><stop offset="1" stop-color="${tint(p.accent2, 0.35)}" stop-opacity="0"/></radialGradient></defs>`,
        rect({ x: 0, y: 0, w: W, h: H }, "url(#g)"),
        `<circle cx="${n(c.x + c.w * 0.92)}" cy="${n(c.y + c.h * 0.88)}" r="${n(short * 0.7)}" fill="url(#r)"/>`,
        `<circle cx="${n(c.x + c.w * 0.15)}" cy="${n(c.y + c.h * 0.05)}" r="${n(short * 0.35)}" fill="url(#r)"/>`,
      ].join("");
    case "split": {
      // Accents only on the outer edge and the top corner, where the
      // compositions never put text.
      const t = short * 0.16;
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        `<polygon points="${n(c.x + c.w - t * 1.4)},${n(c.y)} ${n(c.x + c.w)},${n(c.y)} ${n(c.x + c.w)},${n(c.y + t * 1.4)}" fill="${tint(p.accent, 0.7)}"/>`,
        `<polygon points="${n(c.x + c.w)},${n(c.y + c.h * 0.45)} ${n(c.x + c.w)},${n(c.y + c.h)} ${n(c.x + c.w - t * 0.5)},${n(c.y + c.h)}" fill="${p.accent}"/>`,
      ].join("");
    }
    case "poster":
      // Layered corner triangles, mixed from the page colour so they stay
      // quiet on light and dark posters alike; text never reaches them.
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        `<polygon points="${n(c.x + c.w * 0.58)},${n(c.y)} ${n(c.x + c.w)},${n(c.y)} ${n(c.x + c.w)},${n(c.y + c.h * 0.4)}" fill="${mix(p.bg, p.accent, 0.16)}"/>`,
        `<polygon points="${n(c.x + c.w * 0.8)},${n(c.y)} ${n(c.x + c.w)},${n(c.y)} ${n(c.x + c.w)},${n(c.y + c.h * 0.22)}" fill="${mix(p.bg, p.accent, 0.38)}"/>`,
        `<polygon points="${n(c.x + c.w)},${n(c.y + c.h * 0.7)} ${n(c.x + c.w)},${n(c.y + c.h)} ${n(c.x + c.w * 0.8)},${n(c.y + c.h)}" fill="${mix(p.bg, p.accent, 0.3)}"/>`,
        `<polygon points="${n(c.x + c.w)},${n(c.y + c.h * 0.84)} ${n(c.x + c.w)},${n(c.y + c.h)} ${n(c.x + c.w * 0.9)},${n(c.y + c.h)}" fill="${p.accent}"/>`,
      ].join("");
    case "classic": {
      const inset = Math.min(W, H) * 0.035;
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        rect(
          { x: inset, y: inset, w: W - inset * 2, h: H - inset * 2 },
          "none",
          ` stroke="${tint(p.ink, 0.72)}" stroke-width="1.2"`,
        ),
      ].join("");
    }
    case "band": {
      const bandH = c.h * 0.42;
      const top = c.y + c.h - bandH;
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        rect({ x: c.x, y: c.y, w: c.w, h: Math.max(4, c.h * 0.012) }, p.accent),
        rect({ x: c.x, y: top, w: c.w, h: c.y + c.h - top }, p.accent),
        `<path d="M${n(c.x)} ${n(top)} Q${n(c.x + c.w * 0.25)} ${n(top - bandH * 0.06)} ${n(c.x + c.w * 0.5)} ${n(top)} T${n(c.x + c.w)} ${n(top)} V${n(top + 2)} H${n(c.x)}Z" fill="${p.accent}"/>`,
      ].join("");
    }
    case "event": {
      const out: string[] = [rect({ x: 0, y: 0, w: W, h: H }, p.bg)];
      const r = short * 0.004 + 1;
      out.push(
        dotGrid(
          c.x + c.w * 0.06,
          c.y + c.h * 0.05,
          4,
          4,
          short * 0.03,
          r,
          tint(p.accent, 0.45),
        ),
        dotGrid(
          c.x + c.w * 0.85,
          c.y + c.h * 0.86,
          4,
          4,
          short * 0.03,
          r,
          tint(p.accent, 0.45),
        ),
      );
      return out.join("");
    }
    case "dark":
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        `<circle cx="${n(c.x + c.w * 0.95)}" cy="${n(c.y + c.h * 0.2)}" r="${n(short * 0.55)}" fill="${tint(p.bg, 0.08)}"/>`,
        `<circle cx="${n(c.x + c.w * 0.95)}" cy="${n(c.y + c.h * 0.2)}" r="${n(short * 0.38)}" fill="none" stroke="${tint(p.accent2, 0.1)}" stroke-opacity="0.55" stroke-width="${n(short * 0.012)}"/>`,
        `<path d="M${n(c.x + c.w * 0.62)} ${n(c.y + c.h)} A${n(short * 0.4)} ${n(short * 0.4)} 0 0 1 ${n(c.x + c.w * 0.62 + short * 0.8)} ${n(c.y + c.h)}Z" fill="${tint(p.bg, 0.14)}"/>`,
        rect(
          {
            x: c.x + c.w * 0.9,
            y: c.y + c.h * 0.55,
            w: c.w * 0.1,
            h: c.h * 0.45,
          },
          tint(p.accent, -0.1),
          ` opacity="0.85"`,
        ),
        rect(
          {
            x: c.x,
            y: c.y + c.h - Math.max(4, c.h * 0.015),
            w: c.w,
            h: Math.max(4, c.h * 0.015),
          },
          p.accent2,
        ),
      ].join("");
    case "offer": {
      const rays: string[] = [];
      const cx = c.x + c.w * 0.82;
      const cy = c.y + c.h * 0.22;
      const R = Math.hypot(c.w, c.h);
      for (let i = 0; i < 24; i += 2) {
        const a0 = (i * Math.PI) / 12;
        const a1 = ((i + 1) * Math.PI) / 12;
        rays.push(
          `<polygon points="${n(cx)},${n(cy)} ${n(cx + R * Math.cos(a0))},${n(cy + R * Math.sin(a0))} ${n(cx + R * Math.cos(a1))},${n(cy + R * Math.sin(a1))}" fill="${tint(p.bg, 0.12)}" fill-opacity="0.35"/>`,
        );
      }
      return [rect({ x: 0, y: 0, w: W, h: H }, p.bg), ...rays].join("");
    }
    case "letter": {
      const bar = Math.max(6, W * 0.02);
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        rect({ x: 0, y: 0, w: bar, h: H }, p.accent),
        rect(
          {
            x: 0,
            y: H - Math.max(5, H * 0.008),
            w: W,
            h: Math.max(5, H * 0.008),
          },
          tint(p.accent, 0.4),
        ),
      ].join("");
    }
    default: {
      // Back: the page colour with an accent edge over every panel's top.
      const edge = Math.max(4, Math.min(W, H) * 0.014);
      return [
        rect({ x: 0, y: 0, w: W, h: H }, p.bg),
        ...plan.panels
          .filter((b) => b.y === 0)
          .map((b) => rect({ x: b.x, y: b.y, w: b.w, h: edge }, p.accent)),
      ].join("");
    }
  }
}

/** Full-bleed background for one side, as a 300 DPI-sized vector image. */
export function backgroundUrl(
  kind: BackgroundKind,
  palette: TemplatePalette,
  plan: BackgroundPlan,
): string {
  const W = plan.width;
  const H = plan.height;
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * 3)}" height="${Math.round(H * 3)}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${backgroundBody(kind, palette, plan)}</svg>`,
  );
}
