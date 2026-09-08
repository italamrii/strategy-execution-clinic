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

## Release notes template

- Security hardening summary
- Migration count
- Known limitations
- Operator actions required (secrets, DNS, worker cron)
