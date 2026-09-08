# Email delivery (Phase 6)

Transactional email uses the `EmailProvider` port (`src/shared/ports/email.ts`).

## Providers

| `EMAIL_PROVIDER` | Use |
|------------------|-----|
| `memory` / `console` | Local dev and tests |
| `smtp` | Production SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional auth) |

Set `EMAIL_CAPTURE=true` or `E2E=true` to append rendered messages to `.data/email-capture.json`.

## Templates

Bilingual HTML templates live in `src/modules/notifications/email-templates.ts`. Business code schedules events via `notifyDomainEvent()`; rendering happens in the outbox worker.

## Security

- Headers and variables are sanitized
- CTA URLs are built from `APP_URL` only
- No arbitrary client redirect URLs

## Verification

Integration tests exercise the memory provider. Live SMTP against a real mailbox is a Phase 7 deployment check when credentials are available.
