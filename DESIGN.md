# Elevates OS — Design System

Synthesized from:
- [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — token layers
- [taste-skill](https://github.com/Leonxlnx/taste-skill) — redesign + minimalist protocols
- [hallmark](https://github.com/nutlope/hallmark) — anti-slop, token lock, restraint
- [unslop-ui](https://github.com/JCarterJohnson/vibecoded-design-tells) — vibe-coded tells catalog
- [impeccable](https://github.com/pbakaus/impeccable) — product register, absolute bans

## Brand anchor (elevates.live)

| Role | Value | Notes |
|------|-------|-------|
| Accent | `#f26430` | Sole brand accent |
| Ink | `#2d2d34` | Charcoal text + chrome |
| Indigo | `#414066` | Secondary semantic only |
| Sage | `#758173` | Success/health only — never primary |

## Escape the 2026 “tasteful default”

Unslop tell #0: cream + serif + sage. We **do not** use warm cream page backgrounds or serif display fonts.
Canvas is cool/neutral white. Warmth comes from orange accent + imagery, not body tint.

## Color strategy (impeccable): Restrained

Tinted neutrals + one accent ≤10% of surface. Product default.

## Absolute bans applied

- No cream/sand page bg as the identity
- No purple/indigo primary
- No gradient text, neon glow, glassmorphism default
- No side-stripe accent borders on cards
- No border + large soft shadow on the same element
- No `rounded-full` on large containers; cards ≤12px radius
- No Lucide-as-identity (icons stay functional, thin secondary)
- No identical 3-column feature card grids on marketing
- No tiny uppercase tracked eyebrow on every section
- No AI copy clichés (“seamless”, “unleash”, “next-gen”)

## Typography

- Display: Syne (geometric, not serif)
- Body/UI: IBM Plex Sans
- Mono/meta: IBM Plex Mono (tabular nums for stats)
- Sentence case headings; `text-wrap: balance` on h1–h3
- Display tracking ≥ -0.03em (floor -0.04em)

## Layout

- Icon rail (64px charcoal) + white canvas — not a fat cream sidebar
- Max content width ~1200px
- Cards: hairline border OR soft shadow, never both
- Nested cards forbidden

## Motion

- 180–240ms ease-out on hover/active only
- `prefers-reduced-motion` respected
- No staggered section entrances on every block

## Hallmark critique target

P≥4 H≥4 E≥4 S≥4 R≥4 V≥3 — restraint over decoration.
