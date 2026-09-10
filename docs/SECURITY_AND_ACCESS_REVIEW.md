# Security and Access Review

This document records the production access, permission, and UI review completed on branch `security-access-and-platform-hardening`. The previously fixed owner `super_admin` bootstrap was preserved. No public permission bypasses, hardcoded credentials, or bootstrap HTTP endpoints were added.

## Problems discovered

| Severity | Issue | Resolution |
| --- | --- | --- |
| High | Required roles `expert`, `founder`, and `volunteer` were missing from the RBAC catalog. | Added to `ROLE_SEEDS` and `ROLE_PERMISSION_MAP`. Experts and founders do not receive `admin.dashboard.read`. |
| High | Required permissions such as `admin.settings.manage`, `membership.manage`, `volunteer.manage`, `meeting.start`, `card.read.own`, `card.template.manage`, and `track.member.manage` were missing. | Added to the catalog and assigned to the correct roles. Existing permission names remain valid. |
| High | Protected pages often rendered a blank or one-word “Forbidden” / “Unauthorized” state. | Shared bilingual `AccessDenied` screen with HTTP status, explanation, signed-in email, sign-in/sign-out, retry, and back-to-account actions. |
| High | `/admin/meetings` was missing from the admin route matrix. | Added an admin meetings page gated by `meeting.manage`. |
| High | Meeting lifecycle stopped at create/join. Recordings were not explicitly disabled in Jitsi config. | Added `scheduled` → `live` → `completed` / `cancelled` with audit events. Jitsi embed disables recording and livestream. |
| Medium | Clerk sync assigned the `member` role on every reuse/link, including users who already had operational roles. | Member is now assigned only when the user has no role assignments. New users still receive `member`. |
| Medium | `requireRole` denials were not written as security events. | Failed role checks now write `permission_denied` security events. |
| Medium | Admin navigation had no sidebar, no meetings link, and no shared layout. Account navigation omitted tracks and had no active state. | Admin layout sidebar with active route; member shell includes tracks and `aria-current`. |
| Medium | Duplicate global `user_roles` rows were possible because `NULL` organization ids are not unique in a plain unique constraint. | Partial unique indexes plus an idempotent cleanup migration. |
| Medium | No `loading.tsx` / `error.tsx` for locale, account, or admin trees. | Added bilingual loading and error boundaries that do not leak internals. |
| Low | Admin probe and mobile menu used hardcoded English. Consultation admin showed expert UUIDs. | i18n labels, display names, and accessible menu labels. |
| Accepted remaining | Applied migration `0012_grant_owner_super_admin.sql` contains a specific owner email. | Not edited. Bootstrap remains environment-driven in application code (`BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_CONFIRM=YES`). |

## Files changed

Primary areas:

- Identity / RBAC: `src/modules/identity/rbac/catalog.ts`, `rbac/service.ts`, `auth/clerk-sync.ts`, `session/context.ts`
- Access UI: `src/shared/ui/access-denied.tsx`, `access-denied-actions.tsx`, admin/account layouts, forbidden page
- Meetings: `src/modules/meetings/service.ts`, actions, admin `/admin/meetings`, meeting status controls
- Admin dashboard metrics, consultations admin, card templates, settings
- Translations: `src/i18n/messages/ar.json`, `en.json`
- Schema / migration: `drizzle/0013_rbac_catalog_and_role_uniqueness.sql`
- Startup: `scripts/db-migrate.ts` now seeds the RBAC catalog after migrate

## Route and permission matrix

### Public

| Route | Auth | Permission |
| --- | --- | --- |
| `/`, `/about`, `/tracks`, `/tracks/[slug]`, `/membership`, `/members`, `/volunteer`, `/contact`, `/login` | None | Public |

### Authenticated member

| Route | Permission / scope |
| --- | --- |
| `/account` | Authenticated |
| `/account/profile` | Authenticated |
| `/account/membership` | `membership.read.own` via membership services |
| `/account/consultations` | `consultation.read.own` or assigned/any |
| `/account/consultations/[id]` | Ownership, assignment, or `consultation.read.any` |
| `/account/meetings` | `meeting.read.own` |
| `/account/meetings/[id]` | Participant or `meeting.manage` |
| `/account/credential` | `credential.read.own` |
| `/account/contributions` | `contribution.read.own` |
| `/account/tracks` | Authenticated track membership |
| `/account/tracks/[slug]/manage` | Track-leader scope after `track.*` permission |

### Admin

| Route | Permission |
| --- | --- |
| `/admin` | `admin.dashboard.read` |
| `/admin/memberships` | `membership.read.any` |
| `/admin/tracks` | `track.manage` |
| `/admin/credentials` | `credential.read.any` |
| `/admin/card-templates` | `card.template.manage` or `credential.template.manage` |
| `/admin/consultations` | `consultation.read.any` |
| `/admin/meetings` | `meeting.manage` |
| `/admin/volunteers` | `volunteer.profile.read.any` |
| `/admin/contributions` | `contribution.read.any` |
| `/admin/recognition` | recognition read/issue permissions |
| `/admin/content` | `content.write` |
| `/admin/announcements` | `announcement.manage` |
| `/admin/audit` | `audit.read` |
| `/admin/security` | `security.events.read` |
| `/admin/settings` | `admin.settings.manage` or `settings.manage` |

UI hiding is not used as the security boundary. Server actions continue to call `requirePermission` / `requireAnyPermission`.

## Security changes

- Organization-scoped `user_roles` still cannot grant global permissions.
- Suspended/disabled accounts remain blocked in Clerk mapping and `requireActiveUser`.
- No client-supplied user id is used as a grant. Actor id always comes from the server session.
- Member fallback remains only for authenticated users with no global role assignments.
- Failed permission and role checks write security events without secrets.
- Track leaders still require `requireTrackLeaderScope` for another track.
- Meeting join URLs are generated server-side, shown only after access checks, and disable Jitsi recording/livestream.
- QR payloads remain verification URLs only (`buildVerificationUrl`).
- Test OTP / grant-role routes stay disabled unless `E2E` and `ENABLE_TEST_OTP_ENDPOINT` are both set.

## New migrations

- `drizzle/0013_rbac_catalog_and_role_uniqueness.sql`
  - Deduplicates global and org-scoped role assignments
  - Adds partial unique indexes
  - Inserts missing roles and permissions by slug
- `scripts/db-migrate.ts` runs `seedRbacCatalog()` after migrate so Railway restarts remain idempotent
- Applied migrations `0000`–`0012` were not edited

## Tests and results

Added/extended:

- `src/modules/identity/rbac/catalog.test.ts`
- `src/modules/identity/clerk-sync.test.ts`
- `src/modules/identity/identity.integration.test.ts` (Clerk mapping, identity conflict, org-scope, member fallback, suspended users)
- `src/modules/meetings/meetings.test.ts`
- `src/i18n/messages/parity.test.ts`

Quality gate commands:

```bash
pnpm lint            # pass
pnpm typecheck       # pass
pnpm test            # 19 files, 84 tests pass
pnpm test:integration # 7 files, 46 tests pass
pnpm build           # pass, includes /admin/meetings
pnpm test:e2e        # environment started; 14 migrations applied including 0013.
                     # Playwright ffmpeg was missing in this agent sandbox, so most
                     # browser tests could not open a new page after video capture.
                     # Assertions for denied admin access now use data-access="denied".
```

## Remaining risks

- Migration `0012` still contains the original owner email because already-applied SQL must not be rewritten. Runtime bootstrap does not hardcode emails.
- `listEligibleConsultationExperts` scans active users for `consultation.respond`. This is acceptable at current scale but should be replaced with a role query if the user table grows large.
- Public Jitsi rooms use an unguessable `roomKey`. A self-hosted Jitsi JWT deployment would further restrict guests.
- Design-preview and `/api/test/*` remain environment-gated. Confirm production has `ENABLE_TEST_OTP_ENDPOINT` unset.
- Browser verification of the live Railway deployment was not performed in this change set; local quality-gate commands are the evidence.

## Railway deployment steps

1. Set required environment variables (below).
2. Deploy the image. Startup already runs `tsx scripts/db-migrate.ts && node server.js`.
3. Confirm `/api/health` returns `{ "ok": true }`.
4. Confirm `/api/ready` after migrations.
5. Sign in with the configured owner account and open `/admin`.
6. Sign in with a regular member and confirm `/admin` shows the access-denied screen, not the dashboard.
7. Confirm a track leader cannot manage another track’s `/account/tracks/[slug]/manage` page.

## Required environment variables

Existing production set remains required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `AUTH_PROVIDER=clerk`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `BOOTSTRAP_ADMIN_EMAIL` (owner email only)
- `BOOTSTRAP_CONFIRM=YES` (exactly this value; omit or set anything else to disable bootstrap)
- Object storage variables already required in production validation

Optional (required for live private meeting entry):

- `JITSI_DOMAIN` — HTTPS origin of a **private** Jitsi host. Public `meet.jit.si` / `8x8.vc` are rejected.
- `JITSI_JWT_APP_ID`
- `JITSI_JWT_SECRET`
- `JITSI_JWT_ISSUER` (optional if it matches the app id)
- `JITSI_OPERATOR_VERIFIED=YES` — set only after the operator has tested the real host (valid room-scoped token succeeds; missing, invalid, expired, and wrong-room tokens fail; direct room access cannot bypass authentication)

Until **both** the private JWT configuration and the operator flag are set, meeting records can be stored but live entry is disabled. The host probe is a connectivity diagnostic, not a security attestation; HTTP 401/403, `item-not-found`, and `policy-violation` do not prove JWT enforcement. The client delivers the JWT through the documented `JitsiMeetExternalAPI` `jwt` option. Platform page authorization is not sufficient for conferencing privacy.

Never set `ENABLE_TEST_OTP_ENDPOINT=true` in production.
