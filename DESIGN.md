# Design Brief — BLO Management 211 Khadakwasla

## Direction
Iron Man / Superhero futuristic theme. Dark metallic tech aesthetic for premium government administrative dashboard. Arc reactor blue accents with gold highlights. Sleek, modern, high-contrast. Marathi-native. Professional yet approachable for 3000+ users. No government branding.

## Palette
| Role | Color | OKLCH | Hex | Usage |
|------|-------|-------|-----|-------|
| Background | Deep Dark Charcoal | 0.06 0.02 255 | #0d0d1a | Main page, immersive dark |
| Surface | Dark Navy Card | 0.11 0.03 255 | #1a1a2e | Cards, popovers |
| Primary/Arc | Cyan Blue | 0.48 0.22 200 | #00d4ff | Active states, glows, focus |
| Secondary/Gold | Amber/Gold | 0.65 0.26 50 | #ffd700 | Highlights, stats, success |
| Text Primary | Near-white | 0.92 0.02 245 | #e8eaf6 | Body text, high contrast |
| Text Muted | Steel Blue | 0.35 0.08 255 | #8892b0 | Secondary text, disabled |
| Destructive | Vivid Red | 0.59 0.23 29 | #ff4757 | Errors, delete |
| Success | Neon Green | 0.75 0.15 130 | #00ff87 | Confirmations |
| Border | Subtle Blue | 0.18 0.05 200 | rgba(0,212,255,0.2) | Dividers, subtle glow |

## Typography
**Heading:** General Sans (bold, sci-fi clean lines)
**Body:** DM Sans (modern, readable)
**Marathi:** Noto Sans Devanagari (native script support)

## Layout & Zones
**Sidebar:** Deep charcoal (0.08 0.02 255), arc cyan accents, full-height navigation.
**Header:** Dark navy (0.11 0.03 255), arc blue bottom border glow.
**Main:** Deep dark background (0.06 0.02 255), card-grid (3-col desktop, responsive).
**Cards:** Dark navy with inset arc glow, elevated shadow, rounded corners (0.5rem).
**Buttons:** Primary gradient arc-blue with hover scale+glow. Secondary gold with dark text.
**Active states:** Arc cyan with glow effect, underline/bottom border.

## Motion & Effects
**Transitions:** 0.2s cubic-bezier(0.4, 0, 0.2, 1) smooth ease.
**Hover:** Scale 1.05 + shadow elevation + glow intensity up.
**Glow:** Subtle cyan (0,212,255,0.3) inset & outset on interactive elements.
**Animations:** Pulse glow (2s infinite), arc flicker (3s infinite) on focused/active elements.

## Shadows
**Card:** 0 8px 24px rgba(0,0,0,0.4), inset arc glow.
**Elevated:** 0 16px 48px rgba(0,0,0,0.6), 0 0 20px arc-blue.
**Glow-Cyan:** 0 0 20px rgba(0,212,255,0.3).
**Glow-Gold:** 0 0 15px rgba(255,215,0,0.3).

## Constraints
- Print styles (government documents) remain untouched & white background.
- Devanagari font support mandatory for all Marathi text.
- Mobile-first responsive (1→2→3 columns).
- High contrast (WCAG AAA): text always readable on dark.
- No Election Commission branding, no caffeine.ai footer.
- Arc reactor blue borders/glows subtly accent every interactive zone.
- No harsh neon — glows are atmospheric, not blinding.
