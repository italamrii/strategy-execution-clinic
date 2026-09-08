# Accessibility Guide — Strategy & Execution Clinic

Target: **WCAG 2.2 AA** where practical.

---

## 1. Non-negotiables

- Semantic HTML (`header`, `nav`, `main`, `button`, labels)
- Keyboard: all actions reachable; visible focus (navy/gold ring)
- Screen reader: bilingual `lang` on page and on mixed-language islands
- Contrast: navy `#152238` on `#FFFFFF` / `#F7F5F1` exceeds AA for body
- Errors: `aria-invalid`, `aria-describedby`, not color alone
- Reduced motion: disable nonessential motion and 3D animation
- 3D never exclusive

---

## 2. Language

`html[lang]` matches route. Language switcher: `aria-label` in the current language.

---

## 3. Forms

Every input has a label. Required fields announced. Validation on submit + field errors. Do not rely on placeholder as label.

---

## 4. Cards and status

Status text + icon. Do not use gold/green alone. `ACTIVE` / `REVOKED` announced as text.

---

## 5. Target sizes

Interactive controls ≥ 24px (prefer 44px on mobile member journeys).

---

## 6. Testing

Keyboard pass on design preview, landing, (later) apply and verify. axe in Playwright when E2E is enabled.
