# Brand Tokens — Strategy & Execution Clinic

Canonical color, type, and elevation tokens. CSS implementation: `src/shared/design/tokens.css`. Components consume CSS variables / Tailwind theme mappings only.

---

## Color

| Token | Role | Hex | Notes |
| --- | --- | --- | --- |
| `--color-bg` | Background primary | `#F7F5F1` | Warm institutional white |
| `--color-bg-secondary` | Secondary | `#F1EDE6` | Ivory |
| `--color-surface` | Surface | `#FFFFFF` | Cards, sheets |
| `--color-text` | Primary text | `#152238` | Executive navy |
| `--color-text-secondary` | Secondary text | `#4B5563` | Graphite |
| `--color-text-muted` | Muted | `#6B7280` | |
| `--color-navy` | Brand navy | `#152238` | |
| `--color-navy-deep` | Deep navy | `#0E1A2B` | |
| `--color-gold` | Accent gold | `#C4A574` | Muted; never neon |
| `--color-gold-deep` | Gold deep | `#A68654` | |
| `--color-border` | Border | `#E6E1D8` | |
| `--color-border-strong` | Strong border | `#D4CDBF` | |
| `--color-success` | Success | `#2F6F4E` | |
| `--color-warning` | Warning | `#B45309` | |
| `--color-danger` | Error | `#B42318` | Accessible on white |
| `--color-focus` | Focus | `#152238` | Gold may accompany |

Do not implement a dark-first theme. `prefers-color-scheme: dark` must **not** invert the product to a cyber UI. Light remains the product.

## Type

- Arabic: `IBM Plex Sans Arabic` (OFL, `next/font/google`)
- Latin: `IBM Plex Sans`
- Numeric: IBM Plex Sans, `font-variant-numeric: tabular-nums`

## Elevation

```
--shadow-rest: 0 1px 2px rgba(21, 34, 56, 0.04), 0 8px 24px rgba(21, 34, 56, 0.04);
--shadow-raised: 0 2px 8px rgba(21, 34, 56, 0.06), 0 16px 40px rgba(21, 34, 56, 0.06);
--shadow-overlay: 0 24px 64px rgba(21, 34, 56, 0.12);
```

## Z-index

`--z-base` 0, `--z-header` 40, `--z-overlay` 50, `--z-modal` 60, `--z-toast` 70.

## Motion

`--ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);`
`--duration-fast: 180ms;`
`--duration-md: 280ms;`
`--duration-slow: 400ms;`
