# Roadmap — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

Aligned with `PRODUCT_REQUIREMENTS.md`. Dates are sequence, not calendar promises.

**Current reading (2026-09-09):** This document preserves the original phase scope. The repository now contains implementations across Phases 1–7, so references to Phase 0 as "this delivery" below are historical. Use `CONTINUATION_NOTES.md` for current checks and `LAUNCH_CHECKLIST.md` for production gates. Phase 8 remains expansion scope.

---

## Phase 0 — Engineering foundation (this delivery)

- Product, architecture, domain, security, threat model
- Data model, RBAC, test strategy, ADRs
- Design system, brand tokens, i18n, RTL, 3D strategy, accessibility
- Repository scaffold, CI, Docker, env example
- Bilingual design preview
- **No Phase 1 auth implementation claimed**

Exit: lint, typecheck, tests, production build pass. Docs internally consistent.

---

## Phase 1 — Identity

- Magic link / OTP
- Optional Google OAuth (behind flag)
- Sessions, logout, revocation
- Profiles (public/private split)
- RBAC enforcement helpers
- Audit writer
- Locale preference persistence
- Security headers + rate limit on auth endpoints

Out: passwords unless explicitly pulled in.

---

## Phase 2 — Membership

**Status: implemented (authoritative lifecycle).**

- Configurable membership types + tracks (seeded idempotently)
- Application flow + review state machine
- Atomic issuance; no self-approval; concurrency-safe
- Membership lifecycle + status history
- Member account + admin console (bilingual)
- See `docs/membership/MEMBERSHIP_LIFECYCLE.md`

Out of Phase 2: cards, QR, credentials, volunteer hours, payments, AI.

---

## Phase 3 — Credentials

- Public codes
- Status history
- `/[locale]/verify/[code]`
- QR
- Card render jobs (mobile, print, LinkedIn, square, certificate PDF)
- Share text + Open Graph
- Immediate revoke behavior
- Rate limits on verify

---

## Phase 4 — Volunteering

- Volunteer profiles
- Opportunities lifecycle
- Applications
- Hour entries + review
- Adjustments
- History
- Progression rules engine (config)

---

## Phase 5 — Impact, recognition, public profile

Implemented:

- Volunteer Leader object-level scope (permission AND resource)
- Contribution lifecycle with no self-approval
- Impact events + breakdown + timeline
- Configurable badges (automatic idempotent / manual prestigious)
- Certificates with public verification + PDF
- Professional public profile, privacy flags, directory
- Social share PNGs (1080×1080 / 1080×1350 / 1200×628)

Not claimed: Open Badges 3.0, government accreditation, LinkedIn certification APIs.

---

## Phase 6 — Admin

- Dashboard (authoritative metrics only)
- Reports
- Configuration UIs for types, tracks, flags, progression
- Security events view for permissioned roles

---

## Phase 7 — Production hardening

- Concurrency tests in CI with Postgres
- Playwright core journeys
- Backup restore **tested**
- Monitoring/error tracking
- Performance pass on verification
- Penetration-style checklist against `THREAT_MODEL.md`

---

## Phase 8 — Expansion (flagged)

- Events & labs
- Organizations / light tenancy
- Assessments engine
- Clinic AI tools (no unrestricted DB)
- Payments / commercial entitlements
- Physical card / NFC readiness (IDs already independent)

---

## Dependency graph

```
Phase 0 → 1 → 2 → 3
                ↘ 4 → 5
                     ↘ 6 → 7 → 8
```

Credentials (3) can start in parallel with volunteering (4) after membership (2) exists, but verification copy depends on membership fields.

---

## Explicit non-goals until requested

- Dark-first UI
- Blockchain
- Undocumented LinkedIn APIs
- Auto-production deploys from feature branches
- Fake metrics on the homepage
