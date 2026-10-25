import { useEffect } from "react";
import type { FontId } from "./types";

export interface FontDef {
  family: string;
  fallback: "serif" | "sans-serif" | "monospace" | "cursive";
  weights: number[];
  /** request italic axes too */
  italic?: boolean;
}

/**
 * Every Google Fonts family the templates use. Add your own here; templates
 * reference fonts by key so swapping a family is one line.
 */
export const FONT_LIBRARY: Record<FontId, FontDef> = {
  // --- serif display / text
  fraunces: {
    family: "Fraunces",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  playfair: {
    family: "Playfair Display",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  dmserif: {
    family: "DM Serif Display",
    fallback: "serif",
    weights: [400],
    italic: true,
  },
  cormorant: {
    family: "Cormorant Garamond",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  instrumentserif: {
    family: "Instrument Serif",
    fallback: "serif",
    weights: [400],
    italic: true,
  },
  librebaskerville: {
    family: "Libre Baskerville",
    fallback: "serif",
    weights: [400, 700],
    italic: true,
  },
  lora: {
    family: "Lora",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  bodoni: {
    family: "Bodoni Moda",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  youngserif: { family: "Young Serif", fallback: "serif", weights: [400] },
  abril: { family: "Abril Fatface", fallback: "serif", weights: [400] },
  cinzel: { family: "Cinzel", fallback: "serif", weights: [400, 600, 700] },
  merriweather: {
    family: "Merriweather",
    fallback: "serif",
    weights: [400, 700],
  },
  gloock: { family: "Gloock", fallback: "serif", weights: [400] },
  newsreader: {
    family: "Newsreader",
    fallback: "serif",
    weights: [400, 500, 600],
    italic: true,
  },
  spectral: {
    family: "Spectral",
    fallback: "serif",
    weights: [400, 600],
    italic: true,
  },
  marcellus: { family: "Marcellus", fallback: "serif", weights: [400] },
  italiana: { family: "Italiana", fallback: "serif", weights: [400] },
  prata: { family: "Prata", fallback: "serif", weights: [400] },
  yeseva: { family: "Yeseva One", fallback: "serif", weights: [400] },
  alfaslab: { family: "Alfa Slab One", fallback: "serif", weights: [400] },
  ptserif: {
    family: "PT Serif",
    fallback: "serif",
    weights: [400, 700],
    italic: true,
  },
  sourceserif: {
    family: "Source Serif 4",
    fallback: "serif",
    weights: [400, 600, 700],
    italic: true,
  },
  ebgaramond: {
    family: "EB Garamond",
    fallback: "serif",
    weights: [400, 500, 600],
    italic: true,
  },
  crimson: {
    family: "Crimson Pro",
    fallback: "serif",
    weights: [400, 600],
    italic: true,
  },
  zilla: { family: "Zilla Slab", fallback: "serif", weights: [400, 600, 700] },
  robotoslab: { family: "Roboto Slab", fallback: "serif", weights: [400, 700] },
  arvo: { family: "Arvo", fallback: "serif", weights: [400, 700] },
  bitter: { family: "Bitter", fallback: "serif", weights: [400, 600, 700] },
  // --- sans
  inter: {
    family: "Inter",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  dmsans: {
    family: "DM Sans",
    fallback: "sans-serif",
    weights: [400, 500, 700],
  },
  jost: { family: "Jost", fallback: "sans-serif", weights: [400, 500, 600] },
  spacegrotesk: {
    family: "Space Grotesk",
    fallback: "sans-serif",
    weights: [400, 500, 700],
  },
  syne: {
    family: "Syne",
    fallback: "sans-serif",
    weights: [400, 600, 700, 800],
  },
  archivoblack: {
    family: "Archivo Black",
    fallback: "sans-serif",
    weights: [400],
  },
  archivo: {
    family: "Archivo",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  bricolage: {
    family: "Bricolage Grotesque",
    fallback: "sans-serif",
    weights: [400, 600, 800],
  },
  instrumentsans: {
    family: "Instrument Sans",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  karla: { family: "Karla", fallback: "sans-serif", weights: [400, 500, 700] },
  outfit: {
    family: "Outfit",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  manrope: {
    family: "Manrope",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700, 800],
  },
  jakarta: {
    family: "Plus Jakarta Sans",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  poppins: {
    family: "Poppins",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  nunito: {
    family: "Nunito",
    fallback: "sans-serif",
    weights: [400, 600, 700, 800],
  },
  worksans: {
    family: "Work Sans",
    fallback: "sans-serif",
    weights: [400, 500, 600],
  },
  figtree: {
    family: "Figtree",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  unbounded: {
    family: "Unbounded",
    fallback: "sans-serif",
    weights: [400, 600, 800],
  },
  anton: { family: "Anton", fallback: "sans-serif", weights: [400] },
  roboto: {
    family: "Roboto",
    fallback: "sans-serif",
    weights: [400, 500, 700],
  },
  bebas: { family: "Bebas Neue", fallback: "sans-serif", weights: [400] },
  barlow: {
    family: "Barlow",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  barlowcond: {
    family: "Barlow Condensed",
    fallback: "sans-serif",
    weights: [500, 600, 700],
  },
  oswald: {
    family: "Oswald",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  opensans: {
    family: "Open Sans",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  plexsans: {
    family: "IBM Plex Sans",
    fallback: "sans-serif",
    weights: [400, 500, 600],
  },
  nunitosans: {
    family: "Nunito Sans",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  chivo: { family: "Chivo", fallback: "sans-serif", weights: [400, 500, 700] },
  sora: {
    family: "Sora",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  epilogue: {
    family: "Epilogue",
    fallback: "sans-serif",
    weights: [400, 500, 600, 800],
  },
  rubik: {
    family: "Rubik",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  lato: { family: "Lato", fallback: "sans-serif", weights: [400, 700] },
  raleway: {
    family: "Raleway",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  josefin: {
    family: "Josefin Sans",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  montserrat: {
    family: "Montserrat",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  publicsans: {
    family: "Public Sans",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  redhatdisplay: {
    family: "Red Hat Display",
    fallback: "sans-serif",
    weights: [400, 500, 700],
  },
  redhattext: {
    family: "Red Hat Text",
    fallback: "sans-serif",
    weights: [400, 500],
  },
  krona: { family: "Krona One", fallback: "sans-serif", weights: [400] },
  bungee: { family: "Bungee", fallback: "sans-serif", weights: [400] },
  comfortaa: {
    family: "Comfortaa",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  quicksand: {
    family: "Quicksand",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  fredoka: {
    family: "Fredoka",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  baloo: {
    family: "Baloo 2",
    fallback: "sans-serif",
    weights: [400, 600, 700, 800],
  },
  righteous: { family: "Righteous", fallback: "sans-serif", weights: [400] },
  sourcesans: {
    family: "Source Sans 3",
    fallback: "sans-serif",
    weights: [400, 600, 700],
  },
  leaguespartan: {
    family: "League Spartan",
    fallback: "sans-serif",
    weights: [500, 700],
  },
  dela: { family: "Dela Gothic One", fallback: "sans-serif", weights: [400] },
  lexend: {
    family: "Lexend",
    fallback: "sans-serif",
    weights: [400, 500, 600],
  },
  urbanist: {
    family: "Urbanist",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  hanken: {
    family: "Hanken Grotesk",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  onest: {
    family: "Onest",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  schibsted: {
    family: "Schibsted Grotesk",
    fallback: "sans-serif",
    weights: [400, 500, 700],
  },
  gabarito: {
    family: "Gabarito",
    fallback: "sans-serif",
    weights: [400, 500, 600, 700],
  },
  golos: {
    family: "Golos Text",
    fallback: "sans-serif",
    weights: [400, 500, 600],
  },
  familjen: {
    family: "Familjen Grotesk",
    fallback: "sans-serif",
    weights: [400, 500, 600],
  },
  bowlby: { family: "Bowlby One", fallback: "sans-serif", weights: [400] },
  staatliches: {
    family: "Staatliches",
    fallback: "sans-serif",
    weights: [400],
  },
  teko: { family: "Teko", fallback: "sans-serif", weights: [500, 600] },
  bigshoulders: {
    family: "Big Shoulders Display",
    fallback: "sans-serif",
    weights: [700, 800],
  },
  shrikhand: { family: "Shrikhand", fallback: "cursive", weights: [400] },
  pacifico: { family: "Pacifico", fallback: "cursive", weights: [400] },
  caveat: { family: "Caveat", fallback: "cursive", weights: [400, 600, 700] },
  kalam: { family: "Kalam", fallback: "cursive", weights: [400, 700] },
  // --- script / decorative
  greatvibes: { family: "Great Vibes", fallback: "cursive", weights: [400] },
  dancingscript: {
    family: "Dancing Script",
    fallback: "cursive",
    weights: [400, 700],
  },
  parisienne: { family: "Parisienne", fallback: "cursive", weights: [400] },
  allura: { family: "Allura", fallback: "cursive", weights: [400] },
  sacramento: { family: "Sacramento", fallback: "cursive", weights: [400] },
  pinyon: { family: "Pinyon Script", fallback: "cursive", weights: [400] },
  alexbrush: { family: "Alex Brush", fallback: "cursive", weights: [400] },
  satisfy: { family: "Satisfy", fallback: "cursive", weights: [400] },
  mrdafoe: { family: "Mr Dafoe", fallback: "cursive", weights: [400] },
  courgette: { family: "Courgette", fallback: "cursive", weights: [400] },
  cookie: { family: "Cookie", fallback: "cursive", weights: [400] },
  marck: { family: "Marck Script", fallback: "cursive", weights: [400] },
  tenor: { family: "Tenor Sans", fallback: "sans-serif", weights: [400] },
  cormorantsc: {
    family: "Cormorant SC",
    fallback: "serif",
    weights: [400, 600],
  },
  // --- mono
  plexmono: {
    family: "IBM Plex Mono",
    fallback: "monospace",
    weights: [400, 500, 600],
  },
  spacemono: {
    family: "Space Mono",
    fallback: "monospace",
    weights: [400, 700],
  },
  dmmono: { family: "DM Mono", fallback: "monospace", weights: [400, 500] },
  courierprime: {
    family: "Courier Prime",
    fallback: "monospace",
    weights: [400, 700],
  },
  jetbrains: {
    family: "JetBrains Mono",
    fallback: "monospace",
    weights: [400, 500, 700],
  },
};

export function fontStack(id: FontId): string {
  const def = FONT_LIBRARY[id];
  if (!def) return "system-ui, sans-serif";
  const generic =
    def.fallback === "serif"
      ? 'Georgia, "Times New Roman", serif'
      : def.fallback === "monospace"
        ? "ui-monospace, Menlo, monospace"
        : def.fallback === "cursive"
          ? "cursive"
          : 'system-ui, -apple-system, "Segoe UI", sans-serif';
  return `"${def.family}", ${generic}`;
}

/**
 * EZmailout self-hosts every face the templates use (`src/fonts.css`, files in
 * `public/assets/fonts`): the CSP allows no third-party font host, and a design
 * must print in the face it was designed in. This asks the browser for the
 * faces a theme needs and resolves once they are ready (or failed), so text is
 * measured in the real face rather than a fallback.
 */
export function loadFonts(ids: FontId[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts)
    return Promise.resolve();
  const jobs: Promise<unknown>[] = [];
  for (const id of new Set(ids)) {
    const def = FONT_LIBRARY[id];
    if (!def) continue;
    for (const w of def.weights)
      jobs.push(
        document.fonts.load(`${w} 16px "${def.family}"`).catch(() => undefined),
      );
  }
  return Promise.all(jobs).then(() => undefined);
}

/** Starts loading a theme's faces; the renderer refits once they arrive. */
export function useTemplateFonts(ids: FontId[]): void {
  const key = Array.from(new Set(ids)).sort().join(",");
  useEffect(() => {
    if (key) void loadFonts(key.split(",") as FontId[]);
  }, [key]);
}
