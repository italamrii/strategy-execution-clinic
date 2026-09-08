# Continuation handoff — 2026-09-09

## Current state

The supplied archive contains a working implementation across identity, membership, credentials, volunteering, recognition, and administration. The original README and portions of the roadmap still described the Phase 0 foundation. Their introductions now distinguish historical scope from the current implementation.

This handoff is validated locally on Windows. It does not establish production readiness or deployment. Existing operational documents list external launch requirements that were not provisioned or verified in this continuation.

## Completed changes

- Replaced the `/ar/verify` and `/en/verify` coming-soon message with a translated membership-code form. It validates the existing public-code format, trims surrounding spaces, accepts lowercase input, preserves the active language, and opens the existing authoritative verification page. Invalid input stays on the form with an accessible error.
- Added browser coverage for invalid input, normalized codes, locale preservation, and the Arabic mobile layout.
- Removed the Windows E2E runner behavior that forcibly terminated unrelated processes occupying a requested port. It now reports a port conflict without killing the owner.
- Added bounded retries for transient Windows file locks when disposing of test PostgreSQL databases. Persistent databases and paths outside the project's `.data` children are protected. Shutdown errors are not silently discarded.
- Prevented teardown errors from masking a failed integration-test setup.
- Excluded generated nested Playwright reports/results from lint and version control. Previously, running browser tests made a later lint command inspect generated vendor bundles.
- Updated the README and roadmap introduction with current scope and local startup instructions.

## Validation

- `pnpm lint`: passed, including after browser reports were generated.
- `pnpm typecheck`: passed.
- `pnpm test`: 45 tests passed in 13 files.
- `pnpm test:integration`: 37 tests passed in 6 files, including the fixed cleanup.
- `pnpm build`: passed. The existing Google Fonts configuration requires network access during an uncached build; the first sandboxed attempt could not fetch fonts, and the network-enabled build succeeded.
- Browser tests: 16 existing tests passed in the full run. The two new form tests initially used an ambiguous alert locator that also matched Next.js's route announcer. After correcting that locator, both new tests passed in a targeted rerun. This is 18 passing browser tests across the two runs, not a claim of a second full-suite run.
- Two production-only browser checks were skipped in local E2E mode. Hosted smoke checks, live SMTP delivery, and managed backup restoration were not run.
- Visually inspected the Arabic verification form at a 390-pixel mobile viewport.

## Remaining launch requirements

1. Provision separate staging and production PostgreSQL databases, object storage, domain/HTTPS, and transactional SMTP.
2. Supply production secrets, apply migrations, seed catalogs, and bootstrap the intended administrator.
3. Verify real Arabic/English email delivery and DNS authentication.
4. Configure the notification worker and monitoring; execute and record a managed backup restore.
5. Review organizational/legal content and run production-only smoke checks before public launch.

Use `LAUNCH_CHECKLIST.md` and `docs/operations/DEPLOYMENT.md` for the existing operational procedure. No production deployment, external messaging, admin creation, or changes to the supplied archive were performed.

## Contents and local use

The deliverable ZIP includes source, migrations, tests, public assets, lockfile, and documentation. It excludes copied secrets, old databases, dependency directories, generated reports, and build output. Install dependencies and follow the README. For local sign-in, `dev:local` prints OTP codes in its terminal; this is not production email delivery.
