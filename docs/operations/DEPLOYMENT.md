# Deployment

## Architecture (target)

| Component | Service |
| --- | --- |
| Web app | Single Node process (`next start` or standalone `server.js`) |
| Worker | `pnpm process-notifications` (cron or separate service) |
| Database | Managed PostgreSQL (TLS) |
| Object storage | S3-compatible (R2, S3, MinIO) |
| Email | SMTP transactional provider |

No Kubernetes. No microservices.

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
