# Monitoring

## Health endpoints

| Endpoint | Audience | Response |
| --- | --- | --- |
| `GET /api/health` | Public load balancer | `{ "ok": true }` |
| `GET /api/ready` | Public (minimal) | `{ "ok": true }` or 503 |
| `GET /api/ready` + `x-ops-readiness-token` | Ops | DB + failed notification count |

Set `OPS_READINESS_TOKEN` in staging/production secrets.

## Logs

Structured JSON logs via `src/shared/logging/logger.ts`. Fields: `ts`, `level`, `message`, `requestId`.

**Never log:** OTP, session cookies, Authorization headers, SMTP passwords, raw PII.

## Error tracking

Set `ERROR_TRACKING_DSN` to forward to Sentry or compatible provider. Without DSN, errors are logged locally via `captureError()`.

## Worker

Schedule `pnpm worker:health` every 5 minutes. Alert if exit code ≠ 0 or `failedNotifications` grows.

## Metrics (operational)

Track at platform level:

- HTTP 5xx rate
- `/api/ready` failures
- Notification outbox depth / failed count
- OTP rate-limit security events (audit/security viewer)

No product analytics platform in Phase 7.
