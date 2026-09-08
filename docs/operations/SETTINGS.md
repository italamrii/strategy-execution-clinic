# System settings (Phase 6)

`/admin/settings` — non-secret operational settings in `system_settings`.

Editable keys are allowlisted in `PUBLIC_SETTINGS`. Secrets remain in environment variables only.

Feature flags: implemented flags toggle product behavior; reserved future flags (PAYMENTS, AI, etc.) are visible but do not enable unimplemented features.

All changes are audit-logged.
