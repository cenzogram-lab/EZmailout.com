# EZmailout — Visual Identity

## Overview
A crisp, high-conversion SaaS interface for launching direct mail without minimums. Light surfaces, deep postal
navy for structure and trust, vibrant orange for every action item, emerald for verified/positive states.

## Palette (OKLCH tokens in `src/frontend/src/index.css`)
| Token | Light | Purpose |
| --- | --- | --- |
| `--background` | 0.985 0.004 250 | Page background (cool off-white) |
| `--foreground` | 0.22 0.05 262 | Body text (navy ink) |
| `--primary` / `--navy` | 0.33 0.09 262 | Headers, structure, primary buttons |
| `--accent` / `--ember` | 0.72 0.19 45 | CTAs, action items, active states, focus ring |
| `--emerald` | 0.66 0.17 160 | Success, verified, delivered, savings |
| `--muted` | 0.95 0.01 250 | Panels, table headers |
| `--border` | 0.90 0.01 250 | Hairlines |

Dark mode (`.dark`) keeps the same roles on navy surfaces.

## Typography
Display: Space Grotesk · Body: DM Sans · Mono: JetBrains Mono (ids, tracking codes, prices in tables).

## Components
- Cards: white, 1px border, `rounded-xl`, soft shadow; hero cards add `surface-glow`.
- Buttons: navy default, orange accent for the primary action on a screen, outline for secondary.
- Status badges: Created (slate) → In Production (navy) → In Transit (orange) → Sorted (amber) → Delivered (emerald).
- Canvas overlays: bleed red dashed (4%), cut orange dashed (8%), safe emerald dashed (12%).

## Motion
Pipeline truck / print pulse / mailbox flag on the landing page; card float + rotate/flip on the 3D preview; `fade-up` for section reveals. Durations 0.3–0.6s for interactions, 2–3s loops.

## Anti-patterns
No dark-console aesthetic, no cyan, no untinted greys on text, no more than one orange CTA per viewport.
