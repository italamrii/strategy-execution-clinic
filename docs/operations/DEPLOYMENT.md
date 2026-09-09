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

Set `JITSI_DOMAIN` to a hostname such as `meet.jit.si` or to the HTTPS origin of a
managed/self-hosted Jitsi deployment. The app derives its CSP, camera, microphone,
WebSocket, and iframe allowlists from this single value.

Meeting pages and records are protected by platform permissions, and room names are
generated with cryptographically random identifiers. The public `meet.jit.si` default
is suitable for initial operation but does not make the conferencing provider private.
For confidential advisory sessions, use a managed or self-hosted Jitsi deployment with
provider-side authentication and the applicable retention policy.
