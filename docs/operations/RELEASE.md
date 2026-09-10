# Release process

## Versioning

Tag after launch acceptance: `v1.0.0`

## Pre-release checklist

- [ ] Staging full E2E green
- [ ] `APP_ENV=production pnpm validate:env`
- [ ] Migrations reviewed (no destructive without sign-off)
- [ ] Backup taken
- [ ] Release notes drafted

## Commands

```bash
git tag -a v1.0.0 -m "Strategy & Execution Clinic v1.0.0"
git push origin v1.0.0
```

## PR #6 migration 0014

- File: `drizzle/0014_support_and_membership_validity.sql`
- Production at `8ca08cf` has **not** applied 0014; editing the file in this PR does not rewrite a live checksum.
- Creates `support_requests`.
- Membership validity UPDATE is limited to 0011 factory UUIDs `…440002`–`…440007` that still match the WHERE clause (`lifetime`, `validity_days` NULL, `renewal_required` false, `updated_at` within 5s of `created_at`).
- Run `pnpm preflight:0014` before migrating. The 5-second timestamp window is a conservative filter, not proof a row was never edited.
- Founding / partner / institutional factory rows (`…440001`, `…440008`, `…440009`) stay lifetime.
- Admin-configured policies are not overwritten.

## Release notes template

- Security hardening summary
- Migration count
- Known limitations
- Operator actions required (secrets, DNS, worker cron)
