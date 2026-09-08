# Backups and recovery

**Updated Phase 7.** Local restore drill script exists; **managed production restore must be executed by operator before launch PASS.**

## Targets

| Item | RPO (intent) | RTO (intent) |
| --- | --- | --- |
| PostgreSQL | ≤ 1 hour (PITR if host supports) | ≤ 4 hours |
| Object storage | Provider durability + versioning | ≤ 8 hours |

## PostgreSQL

- Enable automated backups on managed host (daily + PITR).
- Application backup helper: `pnpm backup:db` (requires `pg_dump` + `DATABASE_URL`).
- Encrypt backups at rest; restrict access.

## Object storage

- Versioning on private evidence bucket.
- Lifecycle rules for incomplete multipart uploads.
- Separate public bucket for safe assets only.

## Restore drill (local)

```bash
pnpm restore:drill
```

Writes report to `.data/restore-drill-report.json`.

## Restore test — production requirement

Before launch PASS:

1. Restore managed backup to isolated DB
2. Boot app against restored data
3. Run staging smoke / spot-check credential verification
4. Record in ops log: backup timestamp, duration, validator, result

Until managed restore is recorded, **do not claim production backup PASS**.
