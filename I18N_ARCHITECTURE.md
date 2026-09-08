# i18n Architecture — Strategy & Execution Clinic

Arabic is PRIMARY. English is fully supported. Internationalization is not a later feature.

---

## 1. Library

`next-intl` with Next.js 16 `src/proxy.ts` (formerly middleware).

Routing:

- Locales: `ar`, `en`
- Default locale: `ar`
- `localePrefix: "always"` so both `/ar` and `/en` exist
- `/` → `/ar`

Switching language preserves the path:

`/ar/members/abc` → `/en/members/abc`

---

## 2. Message files

`src/i18n/messages/ar.json`
`src/i18n/messages/en.json`

Nested by domain: `common`, `nav`, `auth`, `membership`, `volunteer`, `verify`, `admin`, `designPreview`.

No user-visible string in JSX except `{t("key")}`.

---

## 3. Persistence

1. URL locale is source of truth for the page.
2. Authenticated: `users.locale` updated on explicit switch.
3. First visit: `Accept-Language` can suggest, but we still land on `/ar` if no prefix (Clinic is Arabic-first). Documented choice: **default redirect is Arabic**, not browser lottery, to keep institutional identity. Users switch via العربة | English.

Decision: default locale Arabic always for `/`. Browser preference may preselect the language switcher highlight only.

---

## 4. Database content

Authoritative bilingual columns (`name_ar`, `name_en`). No machine translation of membership types, tracks, or legal copy.

Admin editors show AR and EN side by side with completeness: Arabic ✓ / English ✓.

Missing EN: Arabic still publishes; EN surfaces fall back to Arabic with `lang` attribute, not silent English placeholders.

---

## 5. Dates and numbers

Timezone default `Asia/Riyadh`. Dates: Arabic locale uses Arabic month names; digits: Eastern Arabic numerals are optional and configurable — V1 uses Western numerals in IDs and KPIs for verification clarity (`SEC-VOL-2026-…`).

---

## 6. Emails, cards, PDFs

Templates keyed by locale. Card renderer receives already-localized strings from the server, never raw keys.

---

## 7. SEO

`alternates.languages` for `ar` and `en`. Open Graph locale `ar_SA` / `en_US`.
