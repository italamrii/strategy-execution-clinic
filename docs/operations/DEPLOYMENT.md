# Deployment

## Architecture (target)

| Component | Service |
| --- | --- |
| Web app | Single Node process (`next start` or standalone `server.js`) |
| Worker | `pnpm process-notifications` (cron or separate service) |
| Database | Managed PostgreSQL (TLS) |
| Object storage | S3-compatible (R2, S3, MinIO) |
| Email (auth OTP) | Clerk (when `AUTH_PROVIDER=clerk`) |
| Email (notifications) | Optional SMTP transactional provider |
| Audio/video meetings | Jitsi-compatible HTTPS deployment embedded behind platform authorization |

No Kubernetes. No microservices.

## Railway + Clerk

1. In Railway, set:
   - `AUTH_PROVIDER=clerk`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (public)
   - `CLERK_SECRET_KEY` (secret — never expose to the client or logs)
2. In the Clerk Dashboard:
   - Enable email verification code for sign-in and sign-up
   - Add the Railway public HTTPS URL to allowed origins / redirect URLs
   - Prefer Clerk-delivered email (do not point auth mail at a personal SMTP inbox)
3. Deploy: Docker startup already runs `scripts/db-migrate.ts` before Next.js (adds `users.clerk_user_id`).
4. Smoke: `/api/health`, `/ar/login`, `/en/login`, new-user OTP, existing-user OTP, logout.

## Build

```bash
pnpm install --frozen-lockfile
pnpm validate:env   # with production/staging env file
pnpm db:migrate
pnpm build
```

### Standalone output

`next.config.ts` sets `output: "standalone"`. After build:

```bash
node .next/standalone/server.js
```

Copy `public/` and `.next/static/` into standalone per Next.js docs when using standalone deploy.

## Staging first

1. Provision staging DB + storage + secrets (separate from production).
2. Run migrations: `pnpm db:migrate`
3. Seed catalog only: `pnpm db:seed-rbac` (+ membership seed if needed)
4. Bootstrap admin: `BOOTSTRAP_ADMIN_EMAIL=… BOOTSTRAP_CONFIRM=YES pnpm bootstrap:admin`
5. Deploy app + worker
6. Run `pnpm test:e2e` against staging base URL (full journey)
7. Run production smoke: `PRODUCTION_SMOKE_BASE_URL=https://staging… playwright test e2e/production-smoke.spec.ts`

## Production deploy

1. Pre-deploy backup (managed snapshot + `scripts/backup-db.ts` if direct access)
2. `pnpm db:migrate`
3. Deploy new app version
4. Deploy/restart worker
5. Verify `/api/health` and privileged `/api/ready` with `x-ops-readiness-token`
6. Run production smoke (read-only)

## Rollback

1. Roll back application to previous container/image tag.
2. If migration was backward-compatible: no DB action.
3. If migration was destructive: restore DB from pre-deploy backup (see DISASTER_RECOVERY.md).
4. Roll back worker to matching app version.

Document each release migration compatibility in `docs/operations/RELEASE.md`.

## Audio/video meetings

Private consultation entry requires all of:

- `JITSI_DOMAIN` — HTTPS origin of a **private** Jitsi host. `meet.jit.si` is rejected because anyone with the room URL can join.
- `JITSI_JWT_APP_ID` and `JITSI_JWT_SECRET` — Jitsi token plugin credentials. The app issues a short-lived, room-scoped JWT only to authorized participants.
- Optional `JITSI_JWT_ISSUER` if it differs from the app id.
- A successful provider probe: `/external_api.js` serves `JitsiMeetExternalAPI`, `config.js` does not advertise `anonymousdomain`, and an unauthenticated BOSH bind to `/http-bind` is rejected.

Env JWT values alone do not open live entry. Until the probe verifies tokenAuth, the platform still stores scheduled meetings but **does not render a joinable room**. The client passes the token as the documented `JitsiMeetExternalAPI` `jwt` option, not as a URL the app concatenates.

The conferencing host must enable JWT authentication (`tokenAuth` / `asap_accepted_*`). A bare `/room` URL without a JWT must be rejected by the provider; platform page authorization alone is not enough.

## Migration 0014

`drizzle/0014_support_and_membership_validity.sql` is new in this release (production at `8ca08cf` has not applied it).

It creates `support_requests`, then updates membership validity **only** for 0011 factory rows that still match the UPDATE WHERE clause.

Run the read-only listing first: `pnpm preflight:0014`. That SELECT uses the same WHERE as the UPDATE and prints exactly which membership types would change.

| UUID | Slug | Result |
| --- | --- | --- |
| `…440002`–`…440007` | expert, professional, contributor, volunteer, volunteer leader, distinguished volunteer | 1-year (`fixed_days` / 365) **if** the row still has `lifetime`, `validity_days` NULL, `renewal_required` false, and `updated_at` within 5s of `created_at` |
| `…440001`, `…440008`, `…440009` | founding member, strategic partner, institutional member | not updated |

The 5-second `updated_at` window is a conservative filter for likely-unedited seed rows. It is not proof a row was never edited: seed sets both timestamps together, and an administrator save within 5 seconds would still match. Rows with a customized validity policy or a later `updated_at` are skipped. New types created after 0011 follow application defaults in `seedMembershipCatalog` / catalog writes, not this UPDATE.
