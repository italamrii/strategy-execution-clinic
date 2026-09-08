# Incident response

## Severity

| Level | Example | Response |
| --- | --- | --- |
| SEV-1 | Production down, data breach suspected | Immediate owner + restore/runbook |
| SEV-2 | Email/worker down, auth broken | Fix within hours |
| SEV-3 | Degraded performance, failed notifications backlog | Next business day |

## Common incidents

### Database unreachable
1. Check provider status page
2. Verify `DATABASE_URL` / TLS / IP allowlist
3. Failover to read replica if configured
4. Communicate maintenance page if extended outage

### Bad deployment
1. Roll back app image (see DEPLOYMENT.md)
2. Check migrations — restore if destructive
3. Re-run smoke tests on rolled-back version

### Email outage
1. Check SMTP provider status
2. Inspect failed notifications in admin dashboard
3. Queue will retry; manual retry after provider recovery
4. OTP logins blocked until email recovers — communicate to users

### Storage outage
1. Private evidence uploads fail closed
2. Public pages unaffected
3. Restore bucket access / credentials rotation

### Lost admin access
1. Use `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_CONFIRM=YES pnpm bootstrap:admin` on secure shell with DB access
2. Audit `ADMIN_BOOTSTRAPPED` event
3. Revoke emergency grants when normal admin restored

## Communication

- Arabic-first status for members when user-visible
- No secrets in status messages
