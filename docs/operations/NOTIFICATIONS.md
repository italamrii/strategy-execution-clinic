# Notifications (Phase 6)

Unified notification domain: `src/modules/notifications/`.

## Flow

1. Domain service commits authoritative state
2. `notifyDomainEvent()` → `scheduleNotification()` writes `notification_outbox` + `in_app_notifications` in the same DB transaction boundary (scheduled after commit via separate call — not inside business transaction rollback path)
3. `scripts/process-notifications.ts` (or E2E auto-drain) delivers email

## Outbox statuses

`PENDING` → `PROCESSING` → `SENT` | `FAILED` (max 3 attempts with backoff)

## Preferences

Required categories (`security`) cannot be disabled. Optional categories respect `notification_preferences`.

## Admin

Failed notifications appear on the operations dashboard. Authorized retry via `notification.ops.manage`.
