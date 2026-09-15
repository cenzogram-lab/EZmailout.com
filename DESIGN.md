# Premium Dark Command Center — Direct Mail Campaign Console

## Overview
A sophisticated, enterprise-grade SaaS dashboard for launching direct mail campaigns through the Lob API. The design evokes a premium command center with deep navy foundations, electric cyan CTAs, and gold accents for status highlights. Animated pipeline graphics and 3D card previews showcase professional mail production.

## Design Direction
**Tone**: Premium, professional, commanding, data-forward  
**Aesthetic**: Dark tech console with editorial polish — mission control meets modern SaaS  
**Differentiation**: Animated mail pipeline widget, interactive 3D card preview engine, monospace tracking codes, glowing cyan buttons

## Color Palette
| Use | OKLCH | Purpose |
|-----|-------|----------|
| Deep Background | `0.14 0 0` | Primary page background |
| Navy Surface | `0.19 0.01 250` | Cards, elevated zones |
| Cyan Primary | `0.6 0.18 262` | CTAs, active states, primary actions |
| Gold Accent | `0.7 0.15 60` | Status highlights, premium markers |
| Muted Text | `0.65 0 0` | Secondary copy, disabled states |
| Bright Foreground | `0.93 0 0` | Body text, high contrast |

## Typography
**Display**: Space Grotesk (headlines, 24–48px)  
**Body**: DM Sans (UI text, copy, 14–18px)  
**Monospace**: JetBrains Mono (tracking codes, data, 12–14px)  

## Animation Choreography
### Mail Pipeline Widget
- **Truck Motion**: 3s infinite horizontal slide (left-to-right, ease-in-out)
- **Printing Pulse**: 2s infinite scale (1.0 → 1.1) + gold drop-shadow glow
- **Mailbox Flag**: 0.6s ease-out rotateZ (0° → 90°)
- **Marquee Scroll**: 25s linear infinite horizontal text scroll

### 3D Card Preview
- **Float**: 3s infinite translateY (0 → -8px)
- **Rotate Left**: 0.4s ease-out rotateY (0° → -25°)
- **Rotate Right**: 0.4s ease-out rotateY (0° → 25°)
- **Perspective**: 1200px distance for realistic depth

## Visual Structure
**Layout**: Card-based grid, 2–4 columns responsive  
**Elevation**: Layered shadows with inset highlights  
**Spacing**: 16px base, 8px micro, 24px macro  
**Radius**: 0.5rem default  

## Component Patterns
- **Buttons**: Cyan background, dark text, subtle glow on hover
- **Cards**: Navy with 1px inset highlight, gold borders for active states
- **Input Fields**: Dark slate, cyan focus ring, monospace for codes
- **Status Badges**: Cyan for pending, gold for active, muted for completed
- **Progress**: Cyan gradient, navy background

## Structural Zones
| Zone | Styling |
|------|----------|
| Header | Navy, cyan accent line |
| Hero Pipeline | Dark background, animated workflow |
| Canvas Editor | Grid overlay, cyan boundary lines |
| 3D Preview | Perspective container, floating animation |
| Status Panel | Monospace data, cyan progress bars |

## Key Constraints
- No Bootstrap defaults; all shadows custom-built
- OKLCH-only color system
- Cyan reserved for CTAs and active states
- Gold for premium status highlights
- All animations use hardware-optimized transforms (translate, rotate, scale)
- Animation durations: 2–3s for loops, 0.4–0.6s for interactions

## Signature Details
- Animated mail pipeline on hero showing digital → print → delivery → inbox flow
- Infinite marquee scrolling validation stats below pipeline
- Interactive 3D card preview with user-controlled rotations
- Monospace tracking codes with cyan glow on hover

## Anti-Patterns
- No bright flat colors without context
- No excessive drop shadows
- No untinted whites (foreground: 0.93 0 0)
- No slow animations (prioritize performance)
- No secondary buttons that compete with primary cyan
