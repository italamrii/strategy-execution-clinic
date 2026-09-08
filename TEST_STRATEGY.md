# Test Strategy — Strategy & Execution Clinic

Tests prove **business rules and authorization**, not only that a component rendered.

---

## 1. Layers

| Layer | Tool | What |
| --- | --- | --- |
| Unit | Vitest | domain invariants, DTO mappers, scoring, public-code generator, RBAC helper |
| Component | Vitest + RTL | design system primitives, forms, RTL layout queries |
| Integration | Vitest + Postgres (when available) | transactions, concurrent hour approval, unique constraints |
| E2E | Playwright | apply, review, verify, volunteer hour path, i18n switch |
| Static | TypeScript, ESLint, CI audit | |

Phase 0: unit tests for tokens, public DTO mapper, feature flags, health payload, membership code generator (algorithm), hour-approval policy functions (even if DB is not live).

Phase 5 recognition: contribution self-approval, badge≠RBAC, certificate revocation verification, volunteer-leader object scope, public DTO privacy, share PNG/PDF MIME tests, Playwright recognition journey.

---

## 2. Mandatory cases (from threat model)

These must exist before the related phase is PASS:

1. Member cannot approve own application.
2. Volunteer cannot approve own hours.
3. Non-admin cannot issue memberships.
4. Revoked credential verification is not ACTIVE.
5. Private fields absent from public verification/profile.
6. Role escalation via payload is ignored.
7. Duplicate approval does not duplicate hours.
8. Concurrent approval: one decision (integration).
9. Adjustments preserve original entry.
10. Public code / QR resolves the correct credential.
11. Expired and suspended states render correctly and block privileges.
12. Self-assigned membership type from client is ignored.
13. Volunteer cannot approve own hours.
14. Volunteer Leader A cannot review Leader B scoped resources.
15. Badge award does not grant volunteer or admin permissions.
16. Revoked certificate/badge verification is not ACTIVE.
17. Private contributions and evidence never appear on public profiles.

---

## 3. i18n / a11y / visual

- No raw English/Arabic literals in `src/**/*.tsx` except tests and design-preview *token names*.
- Playwright: `/ar` and `/en` for landing and design-preview.
- `prefers-reduced-motion` does not trap keyboard users.
- Contrast: navy on white (documented in design system; automated checks where practical).

---

## 4. What we do not test

- Vendor SDK internals
- Fake “all green” snapshots that ignore status text
- Blockchain
- Unimplemented Phase 8 modules

---

## 5. CI gates

PR to `main`:

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Playwright on PR when browser deps are available; otherwise nightly. Phase 0 includes at least one Playwright smoke if install succeeds; if browsers cannot install in this environment, document as limitation and keep the spec.

---

## 6. Fixtures

- Users with known roles
- Membership types seed
- Never production data
- Public DTO snapshots with emails present in source objects to prove stripping

---

## 7. Concurrency

Hour approval tests use two overlapping transactions. Unique/check constraints are the last line of defense; application locking is the first.

---

## 8. Definition of done for tests

A critical workflow is not done without an automated test named after the invariant, not the UI widget.
