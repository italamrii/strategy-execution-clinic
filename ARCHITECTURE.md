# Architecture — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

| Field | Value |
| --- | --- |
| Status | Phase 0 — Binding |
| Style | Modular monolith |
| Runtime | Next.js 16 App Router, React 19, TypeScript strict |
| Data | PostgreSQL + Drizzle ORM |
| i18n | next-intl, Arabic primary, `/ar` and `/en` always prefixed |

This document describes the system we will actually operate. It is not a future microservices wishlist.

Related: `ADR/0001-architecture.md`, `DOMAIN_MODEL.md`, `DATABASE_SCHEMA.md`, `SECURITY.md`, `I18N_ARCHITECTURE.md`.

---

## 1. Architectural principles

1. **Modular monolith first.** One deployable application, clear domain modules, no network hops between domains.
2. **Boring reliability over cleverness.** Prefer Postgres, HTTP, cookies, and queues over novel infrastructure.
3. **Server is the authority.** Cards, hours, roles, membership types, and scores are never trusted from the client.
4. **Arabic-first, bilingual always.** Localization is a platform concern, not a feature.
5. **Extract later, if ever.** Domain folders must be extractable. Circular imports are a defect.
6. **Vendor-agnostic at the edges.** Object storage, email, jobs, and identity providers sit behind ports.
7. **Progressive enhancement.** 3D, social images, and rich clients must not be required to complete a journey.
8. **Least privilege.** Authorization is evaluated on the server for every sensitive mutation.

---

## 2. System context

```
                    ┌─────────────┐
   Browser / Mobile │  Next.js     │
   (AR/EN, RTL/LTR)  │  App Router  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   PostgreSQL         Object storage      Email provider
   (system of         (S3-compatible,     (magic links,
    record)            private default)   notifications)

         │                 │                 │
         ▼                 ▼                 ▼
   Job queue              Observability     Secrets manager
   (abstraction;          (logs, traces,    (env in Phase 0–1)
    in-process start)     health)
```

There is no client-side database. There is no blockchain. There is no AI with database credentials.

---

## 3. Modular monolith map

Application code lives under `src/`. Domain logic lives under `src/modules/<domain>`. Shared kernel lives under `src/shared`.

| Module | Responsibility | V1 |
| --- | --- | --- |
| `identity` | Users, sessions, MFA-ready hooks, profile identity, locale preference | Phase 1 |
| `membership` | Types, applications, memberships, tracks, member-track links | Phase 2 |
| `credentials` | Public codes, status history, verification, card/PDF jobs, QR | Phase 3 |
| `volunteering` | Profiles, opportunities, applications, sessions, hours, adjustments | Phase 4 |
| `community` | Impact scoring helpers | Phase 5 |
| `recognition` | Contributions, badges, certificates, public professional profile, directory | Phase 5 |
| `events` | Workshops, labs, attendance, check-in | Flagged, Phase 8 |
| `organizations` | Org accounts, memberships, future tenancy | Flagged, Phase 8 |
| `content` | Localized editorial pages, labs/initiatives copy | Partial V1 |
| `notifications` | Email/in-app notification dispatch | Phase 1+ |
| `admin` | Control center composition UI + admin queries | Phase 6 |
| `audit` | Immutable-style audit log writer/reader | Phase 1 |
| `analytics` | Derived metrics, admin dashboard aggregations | Phase 6 |
| `platform` | Feature flags, system settings, health | Phase 0 |
| `assessments` | Future engine boundary only | Flagged |
| `clinic-ai` | Future tool-calling boundary; no data plane access | Flagged |
| `commercial` | Entitlements distinct from RBAC | Flagged |

### 3.1 Allowed dependencies

```
app (routes, server actions)
  → modules/* (application services)
    → modules/*/domain
    → shared/*

modules/A may import from shared.
modules/A may NOT import from modules/B except through an explicit module public API (`index.ts`) and only downward or sideways via published ports.

Forbidden:
- volunteering importing admin UI
- credentials trusting membership type from a form field without membership service
- clinic-ai importing drizzle schema directly
```

Enforcement in Phase 0: folder convention + documented public `index.ts`. Lint/path rules can tighten in Phase 7.

---

## 4. Runtime topology

- **Stateless app servers.** Sessions in DB (or signed cookie + server session record). Any instance can serve any request.
- **External PostgreSQL.** Migrations only via Drizzle Kit. No manual production DDL.
- **External object storage.** Private buckets. Signed URLs. No local disk as source of truth.
- **Background jobs.** Port: `JobQueue`. Phase 0–2: in-process / `after()` / simple worker. Replaceable with Redis/SQS later without domain rewrites.
- **Horizontal scale:** add app instances behind a load balancer. Sticky sessions are not required if session store is shared.

---

## 5. Request path

1. `src/proxy.ts` (Next.js 16 Proxy)
   - locale negotiation via next-intl (`localePrefix: "always"`)
   - security headers
   - correlation / request ID
   - **not** the authorization engine
2. Localized App Router tree: `src/app/[locale]/...`
3. Route handlers / Server Actions call module services
4. Services:
   - authenticate session
   - authorize permission
   - validate with Zod
   - mutate in a transaction
   - write audit for sensitive actions
   - emit domain events (impact, notifications)

Public verification (`/[locale]/verify/[code]`) is a read path: indexed lookup, public DTO only, `Cache-Control: no-store`.

---

## 6. Identity architecture (Phase 1 contract)

Phase 0 does not implement login. The identity port is defined now so membership and credentials do not invent a second user table.

**Planned mechanisms:**

- email magic link
- email OTP
- optional Google OAuth
- database sessions
- HttpOnly, Secure, SameSite cookies
- session rotation on privilege elevation
- logout and session revocation
- MFA-ready (TOTP/WebAuthn columns and step-up hooks; not required for members in V1)
- Argon2id if passwords are added later (not V1 default)

**Admin accounts** use the same identity module with stronger policy (step-up, shorter sessions, login monitoring).

Never:

- store plaintext passwords or OTP codes
- put roles in JWTs as the only authorization source
- hardcode admin emails in source

See `SECURITY.md`.

---

## 7. Authorization model

RBAC is permission-based.

```
User ──< UserRole >── Role ──< RolePermission >── Permission
User ──< UserRole >── Role (optional organizationId for future tenancy)
```

Application code checks **permissions**, not role names, except for a tiny set of break-glass super-admin operations.

UI hiding is not security. Every mutation re-checks.

Organization-scoped permissions: `organizationId` is nullable on `user_roles`. V1 issues only platform-scoped roles. Schema must not need a rewrite to add org scope.

Full matrix: `RBAC_MATRIX.md`.

---

## 8. Data architecture

- PostgreSQL is the system of record.
- UUIDv7 primary keys.
- Public membership codes are unique, separate from IDs.
- Soft delete only where legal retention requires a reversible hide (e.g. profiles). Audit logs and hour entries are **not** soft-deleted.
- Append-only: volunteer hour entries, hour adjustments, credential status history, audit logs, impact events.
- Localized content columns: `name_ar`, `name_en`, etc.
- Feature flags and system settings in `platform` tables with env overrides for break-glass.

Schema: `DATABASE_SCHEMA.md`.

---

## 9. Credential and card architecture

```
membership (authoritative)
   └── credential (1:1 active public credential per membership)
          ├── public_code
          ├── status
          ├── status_history
          ├── verification_token_version
          └── render_jobs → object storage assets
```

Verification service returns a **public DTO**. Mapping is explicit. No `select *`.

Card generation:

- runs server-side
- templated with a closed design system (no user HTML)
- user text is treated as plain text
- images fetched only from allowlisted storage
- outputs stored privately; public share images copied to a public CDN prefix only if the member opted into sharing

3D card on the website is a visual client of the same DTO. It cannot change status.

---

## 10. Volunteer hour integrity

```
opportunity → application → session/attendance → hour_entry (PENDING)
                         reviewer decision
                         APPROVED | REJECTED
adjustment (if correction needed) → new signed delta, never overwrite
```

Concurrency: unique constraints + row locks on the hour entry during review. Approved totals are materialized **and** recalculable from events.

---

## 11. Impact score

`impact_events` is the ledger. Weights live in configurable `impact_rules` (admin). Displayed score = `sum(event.value * rule.weight)` for non-revoked events.

Recalculation is idempotent. UI never writes the score directly.

---

## 12. File uploads

Port: `ObjectStorage`.

Rules: MIME allowlist, magic-byte check, size limit, randomized object keys, private by default, signed GET, malware-scan hook (no-op implementation in Phase 0 that still exists as a required step in the pipeline), SVG blocked, processors receive only sanitized buffers.

---

## 13. Notifications and email

Port: `EmailProvider`.

Phase 1: magic link / OTP and application status mail. Templates are localized. No secrets in templates. Unsubscribe and purpose limitation for marketing (marketing is off by default).

---

## 14. Feature flags

```
env  →  database flags  →  in-process cache (short TTL)
```

Code: `src/modules/platform/flags.ts`.

A disabled module must 404/403 at the route and service layer, not only hide a nav item.

---

## 15. i18n and routing

```
/                → 302 /ar
/ar              landing
/en              landing
/ar/verify/:code
/en/verify/:code
/ar/design-preview
/en/design-preview
```

`localePrefix: "always"` avoids default-locale rewrite hazards on standalone Node.

Details: `I18N_ARCHITECTURE.md`, `RTL_GUIDELINES.md`.

---

## 16. Frontend architecture

- Server Components by default
- Client Components only for interaction, 3D, and motion
- Design tokens in CSS (`src/shared/design/tokens.css`) — no scattered hex
- UI primitives in `src/shared/ui`
- next-intl for all user-visible strings
- Framer Motion for UI motion; Three.js / R3F lazy-loaded
- No dashboard template kits

Public pages must work without JS for core content (verification, landing copy). Card 3D is optional.

---

## 17. Observability

- Structured JSON logs
- `x-request-id` on every response
- `GET /api/health` (liveness)
- `GET /api/ready` (DB ping)
- security events via `audit` + dedicated `security_events`
- no secrets, OTP codes, or tokens in logs

---

## 18. Environments

| Name | Purpose |
| --- | --- |
| `local` | docker-compose Postgres, `.env.local` |
| `ci` | GitHub Actions ephemeral |
| `staging` | production-like, synthetic data |
| `production` | protected `main` only |

No auto-deploy from unreviewed branches.

Backup/restore plan: `docs/operations/BACKUPS.md`. Restores are not claimed working until tested.

---

## 19. CI/CD

GitHub Actions on pull requests to `main`:

1. install (pnpm)
2. lint
3. typecheck
4. unit tests
5. integration tests (service-level; DB when service available)
6. build
7. security/static checks where practical (`pnpm audit` / lockfile)

Deployment is a separate, reviewed workflow. Not in Phase 0.

---

## 20. Future modules (boundaries only)

- **Events:** registration, capacity, attendance, QR check-in share the credential/QR primitives; they do not fork ID strategy.
- **Organizations:** `users` remain people. `organization_members` will bind people to orgs. Do not make `user.organization_id` the only tenancy key.
- **Assessments:** versioned definition engine. No hardcoded assessment.
- **Clinic AI:** tool interface with the same authorization as humans. Cannot approve memberships, hours, roles, or paid credentials.
- **Commercial:** `entitlements` table, not roles. Paid ≠ admin.

---

## 21. Performance budgets (Phase 0 targets)

| Surface | Budget |
| --- | --- |
| Public verification TTFB | < 200 ms at app (excludes network) once indexed |
| JS for verification page | near-zero; no 3D |
| Landing JS | 3D lazy; static fallback first |
| Admin lists | cursor pagination, never unbounded |

---

## 22. What Phase 0 ships in code

- repository, TypeScript strict, lint, tests, CI, Docker, env example
- module folders and public APIs
- Drizzle schema matching `DATABASE_SCHEMA.md`
- feature flag module
- health/ready
- bilingual design preview
- **not** working login, applications, or hour approval
