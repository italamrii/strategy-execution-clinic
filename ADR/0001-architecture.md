# ADR 0001 — Modular monolith on Next.js

| Field | Value |
| --- | --- |
| ADR | 0001 |
| Title | Modular monolith: Next.js App Router + PostgreSQL |
| Status | Accepted |
| Date | 2026-08-31 |

---

## Context

The Clinic needs a production membership, volunteering, and credential platform that can later host events, organizations, assessments, and Clinic AI. The initial team and traffic do not justify distributed systems.

Options:

1. Microservices from day one
2. SPA + separate API
3. Modular monolith (Next.js App Router + PostgreSQL)
4. BaaS as the core

---

## Decision

Adopt option 3.

- Next.js 16, React 19, TypeScript strict
- Domain modules in `src/modules/*`
- PostgreSQL + Drizzle ORM
- Zod at boundaries
- next-intl with `/ar` and `/en` always prefixed
- Ports for email, storage, jobs
- Feature flags for future modules

Drizzle is chosen over Prisma for SQL-transparent locking and a thin runtime. Domain code must not leak Drizzle types through HTTP.

Identity (Phase 1): server sessions, magic link/OTP, optional Google. Not implemented in Phase 0.

---

## Consequences

We move faster with one deployable and one CI graph. We accept the discipline cost: no circular module imports, no authorization in Proxy alone, no god services.

We reject microservices until an operational metric (scale, isolation, or team boundary) demands extraction.

---

## Compliance

See `ARCHITECTURE.md` for the module map and dependency rule.
