# Elevates OS — Design System (Finexy-light ERP)

## Brand anchor (elevates.live)

| Role | Value | Notes |
|------|-------|-------|
| Accent | `#f26430` | Sole brand accent · active nav · CTAs |
| Ink | `#2d2d34` | Text + primary charcoal buttons |
| Indigo | `#414066` | Secondary semantic only |
| Sage | `#5f7560` | Success / health |

## Product chrome (authenticated)

Finexy / ClickUp–inspired light ERP:

- Soft gray canvas `#f3f4f6` (cool — not cream paper)
- **Light icon rail** (white) + orange active state
- Top bar: Elevates wordmark · pill search · alerts · profile chip
- Floating white cards: soft shadow (`--shadow`), radius 18–22px
- Pill / near-pill action buttons for primary CTAs
- One accent-tinted stat card allowed per dashboard

## Marketing surfaces

Landing, `/eos`, `/join` keep charcoal brand heroes. Login splits charcoal brand panel + light form card.

## Absolute bans

- No cream/sand page bg as identity
- No purple/indigo primary
- No neon glow / glassmorphism default
- No AI copy clichés
- Accent ≤10% of surface outside intentional highlight cards

## Typography

- Display/headings: Syne (brand display)
- Body/UI: Plus Jakarta Sans (soft product sans for Finexy-light ERP)
- Mono/meta: IBM Plex Mono (ticket IDs, timestamps, tabular meta)
- Sentence case headings; `text-wrap: balance`

## Layout

- Structural labeled sidebar `--rail-width: 248px` (icon + label, section headers, brand + user footer)
- Sticky top bar: search · alerts · profile (logo lives in sidebar)
- Content max ~1360px; generous card padding
- Cards: soft shadow (prefer over heavy borders)
- Nested cards discouraged

## Motion

- 180–240ms ease-out on hover/active
- `prefers-reduced-motion` respected
