# RTL Guidelines — Strategy & Execution Clinic

`dir="rtl"` is necessary and **not sufficient**.

---

## 1. Document direction

`src/app/[locale]/layout.tsx` sets `lang` and `dir` from locale (`ar` → rtl, `en` → ltr).

---

## 2. Logical properties

Use:

- `margin-inline-start` / `end`
- `padding-inline`
- `border-inline-start`
- `inset-inline-start`
- `text-align: start` / `end`
- `ps-` / `pe-` Tailwind utilities

Avoid physical `left` / `right` unless the asset must not mirror.

---

## 3. What must mirror

Navigation, breadcrumbs, drawers, form label alignment, pagination, timelines, tables (text), card internal layout, progress bars (with care).

---

## 4. What must NOT mirror

- Logo
- QR codes
- Photographs
- Some universal media icons (play)
- Membership public codes and Latin IDs (remain LTR `dir="ltr"` isolates)

---

## 5. Mixed script

A primarily Arabic sentence with an English name or ID: wrap Latin/code in `<span dir="ltr">`.

IBM Plex Sans Arabic + IBM Plex Sans share a family so mixed lines do not clash.

---

## 6. Charts

Labels follow locale. Axis order: do not force LTR charts that clip Arabic. Prefer logical tick placement. Color is not the only encoding.

---

## 7. Test both

Every layout change is verified in `/ar` and `/en`. Horizontal overflow is a defect.
