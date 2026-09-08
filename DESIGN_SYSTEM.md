# Design System — Strategy & Execution Clinic

Light-first institutional identity. White is the dominant environment. Navy is authority. Gold is prestige, used sparingly. 3D is progressive enhancement. Arabic is the primary typographic voice.

This is not a dashboard template. Components must look intentionally designed.

Related: `BRAND_TOKENS.md`, `RTL_GUIDELINES.md`, `ACCESSIBILITY_GUIDE.md`, `3D_RENDERING_STRATEGY.md`.

---

## 1. Principles

1. Premium national-institution, not startup chrome.
2. Calm motion. No bounce, no neon, no glass everywhere.
3. Generous whitespace.
4. Logical CSS properties (`margin-inline`, `inset-inline`, `text-align: start`).
5. Tokens only — no raw hex in components.
6. Every 3D moment has a semantic fallback.

---

## 2. Spacing scale

`--space-1` 4px … `--space-16` 96px. Default component padding: `--space-6` (24px). Section vertical rhythm: `--space-16` / `--space-20`.

## 3. Radius

`--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px, `--radius-card` 16px. Cards: 12–16px. Buttons: 8px. No pill-everything.

## 4. Elevation

Shadows are extremely soft, navy-tinted, low opacity. Three levels: rest, raised (hover), overlay (modal). No harsh black drop shadows.

## 5. Typography roles

| Role | Arabic | English | Notes |
| --- | --- | --- | --- |
| Display | IBM Plex Sans Arabic 48–64 | IBM Plex Sans 48–64 | Tight tracking for EN; AR line-height 1.35+ |
| H1 | 32–40 | 32–40 | |
| H2 | 24–28 | 24–28 | |
| H3 | 20 | 20 | |
| Body large | 18 | 18 | AR 1.8, EN 1.6 |
| Body | 16 | 16 | |
| Small | 14 | 14 | |
| Label | 13 medium | 13 | uppercase EN only; never force AR uppercase |
| Caption | 12 | 12 | |
| Numeric/KPI | IBM Plex Sans tabular | | LTR numerals in KPIs |

Never copy English line-height onto Arabic.

## 6. Color usage

See `BRAND_TOKENS.md`. Surfaces: warm white page, ivory secondary, pure white cards. Gold: 1px rules, selected nav, credential edges, focus rings (with navy). Never large yellow fields.

## 7. Components (preview contract)

Buttons: primary (navy), secondary (white + border), ghost, destructive (institutional red).
Inputs: white, 1px gray border, gold/navy focus ring, error text in red, associated `aria`.
Tabs: gold underline on selected.
Cards: white, hairline border, optional gold edge for credentials.
Navigation: institutional header, not app-sidebar-first on marketing pages. Admin uses a quiet sidebar on desktop, bottom nav on member mobile.
Tables: desktop; cards/lists on mobile.
Charts: navy series, gold highlight only for the selected series, minimal grid.

## 8. Motion

Framer Motion. Duration 180–400ms. Easing: cubic, not springy. `prefers-reduced-motion: reduce` → instant or fade only.

## 9. Membership card families

Distinguish with material, engraving, border, micro-icon — not rainbow:

- Founding: highest gold inscription
- Expert: navy credential bar
- Professional: clean institutional
- Volunteer: warm accent, volunteer mark
- Volunteer Leader: leadership mark
- Distinguished Volunteer: achievement treatment
- Strategic Partner / Institutional: organization-focused

## 10. Quality gate

Arabic + English, desktop + mobile, RTL + LTR, contrast, 3D fallback, reduced motion, no horizontal overflow. Do not PASS UI that is “default shadcn”.
