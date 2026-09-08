# Bootstrap Super Admin

Deliberate, auditable, never automatic.

## Requirements

- Database migrated and RBAC seeded (`pnpm db:migrate && pnpm db:seed-rbac`)
- Environment:
  - `DATABASE_URL`
  - `BOOTSTRAP_ADMIN_EMAIL` (normalized email)
  - `BOOTSTRAP_CONFIRM=YES`

## Command

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_CONFIRM=YES pnpm bootstrap:admin
```

## Guarantees

- No public HTTP bootstrap endpoint
- No default credentials
- Does not run on deploy unless an operator runs this command
- Writes `ROLE_ASSIGNED` audit with reason `bootstrap_super_admin`
