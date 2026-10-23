/**
 * Every typeface the studio offers. All but the "System" group are
 * self-hosted (`src/fonts.css`, files and licences in `public/assets/fonts`),
 * so a design prints with the face it was designed in on any device; the
 * browser downloads a face only when text set in it is on screen. The
 * system faces stay for designs made before the catalogue existed: they
 * depend on what the customer's device has installed.
 */

export type FontCategory =
  | "Sans serif"
  | "Serif"
  | "Display"
  | "Script"
  | "Mono"
  | "System";

export interface FontEntry {
  family: string;
  category: FontCategory;
  /** Weights the files carry; `VARIABLE` covers 100–900. */
  weights: readonly number[];
}

const VARIABLE = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const FONT_CATALOG: readonly FontEntry[] = [
  { family: "Geist", category: "Sans serif", weights: VARIABLE },
  { family: "DM Sans", category: "Sans serif", weights: VARIABLE },
  { family: "Inter", category: "Sans serif", weights: VARIABLE },
  { family: "Lato", category: "Sans serif", weights: [400, 700, 900] },
  { family: "Montserrat", category: "Sans serif", weights: VARIABLE },
  { family: "Nunito", category: "Sans serif", weights: VARIABLE },
  { family: "Open Sans", category: "Sans serif", weights: VARIABLE },
  {
    family: "Poppins",
    category: "Sans serif",
    weights: [400, 500, 600, 700, 800],
  },
  { family: "Raleway", category: "Sans serif", weights: VARIABLE },
  { family: "Roboto", category: "Sans serif", weights: VARIABLE },
  { family: "Rubik", category: "Sans serif", weights: VARIABLE },
  { family: "Work Sans", category: "Sans serif", weights: VARIABLE },
  { family: "Cormorant Garamond", category: "Serif", weights: VARIABLE },
  { family: "DM Serif Display", category: "Serif", weights: [400] },
  { family: "EB Garamond", category: "Serif", weights: VARIABLE },
  { family: "Libre Baskerville", category: "Serif", weights: [400, 700] },
  { family: "Lora", category: "Serif", weights: VARIABLE },
  { family: "Merriweather", category: "Serif", weights: VARIABLE },
  { family: "Playfair Display", category: "Serif", weights: VARIABLE },
  { family: "Roboto Slab", category: "Serif", weights: VARIABLE },
  { family: "Abril Fatface", category: "Display", weights: [400] },
  { family: "Alfa Slab One", category: "Display", weights: [400] },
  { family: "Anton", category: "Display", weights: [400] },
  { family: "Archivo Black", category: "Display", weights: [400] },
  { family: "Bebas Neue", category: "Display", weights: [400] },
  { family: "Lobster", category: "Display", weights: [400] },
  { family: "Oswald", category: "Display", weights: VARIABLE },
  { family: "Righteous", category: "Display", weights: [400] },
  { family: "Caveat", category: "Script", weights: VARIABLE },
  { family: "Dancing Script", category: "Script", weights: VARIABLE },
  { family: "Great Vibes", category: "Script", weights: [400] },
  { family: "Pacifico", category: "Script", weights: [400] },
  { family: "Permanent Marker", category: "Script", weights: [400] },
  { family: "Satisfy", category: "Script", weights: [400] },
  { family: "Geist Mono", category: "Mono", weights: VARIABLE },
  { family: "JetBrains Mono", category: "Mono", weights: VARIABLE },
  { family: "Space Mono", category: "Mono", weights: [400, 700] },
  { family: "Georgia", category: "System", weights: [400, 700] },
  { family: "Times New Roman", category: "System", weights: [400, 700] },
  { family: "Arial", category: "System", weights: [400, 700] },
];

export const FONT_CATEGORIES: readonly FontCategory[] = [
  "Sans serif",
  "Serif",
  "Display",
  "Script",
  "Mono",
  "System",
];

export function fontEntry(family: string): FontEntry | undefined {
  return FONT_CATALOG.find((f) => f.family === family);
}

/** CSS `font-family` value with the brand face as fallback. */
export function fontStack(family: string): string {
  return `"${family}", "Geist", sans-serif`;
}
