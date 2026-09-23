# EZmailout — Visual Identity

## Overview
A light, Canva-style SaaS interface for launching direct mail without minimums. Neutral BG/300 surfaces, near-black ink,
one indigo brand colour for every action, ice-cyan highlights, deep navy for dark panels, emerald only for verified /
delivered states. Source of truth: the MAIL_Command master specification (swatches, Geist type sheet, studio reference).

## Palette (OKLCH tokens in `src/frontend/src/index.css`)
| Token | Hex | Light OKLCH | Purpose |
| --- | --- | --- | --- |
| `--primary` | `#6366f1` | 0.585 0.204 277 | Brand indigo: CTAs, links, active states, focus ring, selection handles |
| `--indigo-deep` | `#4d32a6` | 0.423 0.175 287 | Pressed / gradient end of the brand colour |
| `--background` | `#f4f4f4` (BG/300) | 0.967 0 0 | Page background |
| `--card` | `#ffffff` | 1 0 0 | Cards, panels, studio canvas |
| `--foreground` | `#01080a` | 0.125 0.018 211 | Ink (Geist type sheet black) |
| `--accent` / `--ice` | `#cff3fd` | 0.942 0.04 216 | Highlights, hover tints, chips (Geist type sheet ice) |
| `--navy` | `#0e2b4f` | 0.289 0.074 255 | Dark buttons/panels (studio reference "Book today") |
| `--secondary` | `#f6f7f9` | 0.976 0.003 264 | Studio rail, secondary buttons |
| `--muted` | `#f0f1f5` | 0.959 0.005 275 | Panels, table headers, studio swatch 1 |
| `--muted-foreground` | `#575859` | 0.46 0.006 255 | Secondary text, rail icons |
| `--border` | `#e4e6ec` | 0.925 0.008 271 | Hairlines |
| `--sky` / `--lime` | `#b5d8fc` / `#dbefad` | — | Studio swatches only |
| `--emerald` | `#10b981` | 0.696 0.149 162 | Success, verified, delivered |

Dark mode (`.dark`) keeps the same roles on navy surfaces with indigo-400 as primary.

## Typography
Geist (variable 100–900, self-hosted `public/assets/fonts/Geist-*.woff2`) for display and body; Geist Mono for ids,
tracking codes and prices in tables. Headings: semibold/bold, `tracking-tight`. Body: 400/500.

## Components
- Radius: `--radius: 0.875rem`; cards `rounded-xl`/`rounded-2xl`, buttons and badges are pills (`rounded-full`).
- Buttons: indigo `default` for the primary action, `outline`/`secondary` for secondary, `navy` for dark hero CTAs,
  `ghost` hover uses `muted` (never a colour fill).
- Chips: pill, `bg-primary/10 text-primary` or `bg-ice text-foreground`.
- Status badges: Created (slate) → In Production (navy) → In Transit (indigo) → Sorted (sky) → Delivered (emerald).

## Design studio (Step 3, Canva reference)
- Left icon rail (`#f6f7f9`, `#575859` icons): Templates · Elements · Text · Uploads · Brand · QR code · AI Studio, then Layers.
  The active tool opens a collapsible drawer beside the rail; clicking the active tool (or the collapse chevron) hides it.
- Stage: BG/300 `#f4f4f4` with a dotted grid; the artboard is the finished document size at the fitted scale.
- Print guides: bleed edge = solid red ⅛″ frame outside the cut line (backgrounds are shown running through it),
  cut line = fine dashed line at the trim edge, safe zone = soft green dashed ¼″ inset, USPS address + IMb zone
  hatched in the lower-right quadrant of address-side formats (postcards, EDDM®, rack cards, reply postcards, card stock).
- Selection: indigo outline with round white handles (indigo border); a contextual toolbar floats above the element
  with align left / centre / right / top / middle / bottom, bring forward / send backward / front / back, duplicate, delete.
- Elements are vector shapes stored as SVG data-URL logo layers (`lib/shapes.ts`) so they rasterize and persist like images;
  they resize freely and recolour from the inspector.
- Live 3D proof pinned on the right at `lg+` with flip and rotation; Geist is loaded (`document.fonts.ready`) before rasterizing.
- Swatches: paper, text, QR and shape colour pickers expose the brand palette
  (`#ffffff #f4f4f4 #f0f1f5 #cff3fd #b5d8fc #dbefad #6366f1 #0e2b4f #01080a`).

## Catalog (Step 1 and homepage)
- 14 product families drawn as monochrome line-art icons (`components/catalog/CatalogIcon.tsx`) in a 7-column grid.
- Clicking a family expands an accordion listing every size with an aspect badge, the exact Click2Mail document class,
  trim size, envelope, mail class and per-piece price.

## Motion
Pipeline truck / print pulse / mailbox flag on the landing page; card float + rotate/flip on the 3D preview;
`fade-up` for section reveals. Durations 0.3–0.6s for interactions, 2–3s loops.

## Anti-patterns
No orange or ember accents, no untinted greys on text, one indigo CTA per viewport, no square buttons.
