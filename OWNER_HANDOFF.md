# Owner handoff — Strategy & Execution Clinic

عيادة الاستراتيجية والتنفيذ

## What this platform does

A bilingual (Arabic-first) professional membership platform for:

- Membership applications and credentials
- Verifiable QR credentials
- Volunteering (opportunities, hours, progression)
- Recognition (contributions, badges, certificates)
- Public member directory (when enabled)
- Admin operations (content, announcements, analytics, audit)

## Where it runs

| Piece | Typical hosting |
| --- | --- |
| Website | Node.js app (Vercel, Railway, Fly.io, VPS) |
| Database | Managed PostgreSQL |
| Files | S3-compatible storage |
| Auth email OTP | Clerk (`AUTH_PROVIDER=clerk`) |
| Notification email | Optional SMTP |
| Worker | Cron job running notification processor |

**Production URL:** _[set by operator — not deployed in Phase 7 session]_

## How admins log in

1. Go to `/ar/login` or `/en/login`
2. Enter email → receive a Clerk-delivered OTP code by email
3. Admin routes at `/ar/admin` require assigned **local** RBAC roles (Clerk never grants admin by itself)

## How to add an admin

**Never use a default password.**

```bash
BOOTSTRAP_ADMIN_EMAIL=owner@your-domain.com BOOTSTRAP_CONFIRM=YES pnpm bootstrap:admin
```

Requires shell access to the server and database. Action is audited.

## Backups

- Database: automated snapshots on managed host + optional `pnpm backup:db`
- Restore: see `docs/operations/DISASTER_RECOVERY.md`
- Run `pnpm restore:drill` for procedure practice (local)

## Email

- Login OTP is delivered by Clerk when `AUTH_PROVIDER=clerk` (not via personal SMTP/Resend)
- Optional notification mail still uses `EMAIL_PROVIDER` / SMTP when configured
- Failed notification deliveries visible on admin dashboard
- Worker: `pnpm process-notifications` every 1–5 minutes

## Content updates

- Admin → Content (`/admin/content`) for homepage, about, legal drafts
- Admin → Announcements for broadcast messages
- Admin → Settings for feature flags and operational toggles

## Start / stop

```bash
# App
pnpm build && node .next/standalone/server.js

# Worker (schedule)
pnpm process-notifications
```

## Recurring costs (estimate — operator fills actuals)

| Service | Notes |
| --- | --- |
| Hosting | App + worker |
| PostgreSQL | Managed tier |
| Object storage | Per GB + egress |
| Email | Per message tier |
| Domain | Annual registration |
| Monitoring | Optional SaaS |

## Support documents

- `docs/operations/PRODUCTION.md`
- `docs/operations/DEPLOYMENT.md`
- `docs/operations/MONITORING.md`
- `docs/operations/INCIDENT_RESPONSE.md`
- `LAUNCH_CHECKLIST.md`

**Secrets are never stored in this document.**
