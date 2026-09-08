# Notification worker (Phase 6)

## Run

```bash
pnpm process-notifications
```

Processes pending rows from `notification_outbox` with safe claiming (`PROCESSING` state) and idempotent delivery.

## Production

Run as a cron job or sidecar every 1–5 minutes. Multiple workers are safe: rows are claimed before send.

## E2E

When `E2E=true`, `notifyDomainEvent()` auto-drains the outbox after scheduling so Playwright sees in-app notifications without a separate worker process.
