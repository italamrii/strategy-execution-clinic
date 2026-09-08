# Launch checklist

## Infrastructure (operator)

- [ ] Managed PostgreSQL provisioned (TLS, backups, PITR)
- [ ] Staging DB separate from production
- [ ] S3-compatible storage (private + public buckets)
- [ ] Production domain + HTTPS certificate
- [ ] SMTP provider + SPF/DKIM/DMARC DNS
- [ ] Secrets in host secret manager (not git)
- [ ] Worker cron / service for `process-notifications`
- [ ] Error tracking DSN (optional but recommended)

## Application

- [x] Environment validation (`pnpm validate:env`)
- [x] Production rejects E2E / test OTP flags
- [x] Production rejects console/memory email
- [x] Test `/api/test/*` return 404 outside E2E
- [x] Design preview blocked in production
- [x] Health endpoint minimal
- [x] Security headers + HSTS (staging/production APP_ENV)
- [x] Standalone build documented

## Data

- [ ] All migrations applied on staging then production
- [ ] Catalog seed only (no fake users/credentials)
- [ ] First admin bootstrapped via CLI + audit
- [ ] Legal pages reviewed by organization

## Verification

- [ ] Staging full E2E journey PASS
- [ ] Real email: OTP, membership approved, hours, badge, certificate
- [ ] Managed restore test recorded
- [ ] Production smoke (read-only) PASS
- [ ] `pnpm lint` / `typecheck` / `test` / `test:integration` / `build` green

## Handoff

- [ ] OWNER_HANDOFF.md delivered to platform owner
- [ ] COST_INVENTORY documented
- [ ] Tag `v1.0.0` after acceptance
