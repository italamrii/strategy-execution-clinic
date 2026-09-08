# Disaster recovery

## Scenarios

| Scenario | Runbook |
| --- | --- |
| DB outage | Failover / restore from snapshot; see BACKUPS.md |
| Bad deployment | Roll back app; DB restore only if migration incompatible |
| Email outage | Pause non-critical mail; retry outbox after recovery |
| Storage outage | Restore bucket; re-upload evidence if needed |
| Credential signing compromise | Rotate `AUTH_SECRET` invalidates sessions; audit credentials |
| Lost admin | `pnpm bootstrap:admin` with deliberate confirm |
| Domain/TLS issue | Fix DNS + certificate at host; verify `APP_URL` |

## RPO / RTO (targets — measure on managed host)

| Asset | RPO (intent) | RTO (intent) |
| --- | --- | --- |
| PostgreSQL | ≤ 1 hour with PITR | ≤ 4 hours |
| Object storage | Provider durability | ≤ 8 hours object restore |

Measured restore drill (local embedded): see `.data/restore-drill-report.json` after `pnpm restore:drill`.

**Production PASS requires a managed-DB restore test recorded by the operator.**

## Restore procedure (managed PostgreSQL)

1. Create isolated restore instance from backup/snapshot
2. Point staging `DATABASE_URL` at restored instance
3. `pnpm db:migrate` (verify at head)
4. Boot app + worker
5. Verify known membership count + credential verification sample
6. Record timestamp, operator, duration, result

## Bus factor

- Repository remote required
- Secrets in host secret manager (not laptop-only)
- Domain and hosting credentials documented for owner (see OWNER_HANDOFF.md)
