# Admin operations (Phase 6)

Routes under `/[locale]/admin` require RBAC permissions.

## Dashboard

`/admin` — real counts from PostgreSQL (memberships, volunteers, contributions, failed notifications).

## Analytics

`getAnalyticsSummary` requires `analytics.read`. Aggregated only; no PII in chart APIs.

## Search

Operational search on dashboard: member display names, credential codes, opportunity titles. Bounded `ILIKE` queries.

## Viewers

- `/admin/audit` — `audit.read`, sanitized metadata
- `/admin/security` — `security.events.read`
