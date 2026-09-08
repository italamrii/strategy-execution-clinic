# Environment matrix

| Variable | LOCAL | E2E | STAGING | PRODUCTION |
| --- | --- | --- | --- | --- |
| `APP_ENV` | `local` | `e2e` (via `E2E=true`) | `staging` | `production` |
| `APP_URL` | `http://localhost:3000` | orchestrator URL | `https://staging…` | `https://…` (HTTPS required) |
| `DATABASE_URL` | embedded/docker | embedded e2e | managed PG (isolated) | managed PG |
| `EMAIL_PROVIDER` | `console` | `memory` | `smtp` (test inbox) | `smtp` |
| `OBJECT_STORAGE_PROVIDER` | `local` | `local` | `s3` | `s3` |
| `E2E` | unset | `true` | **forbidden** | **forbidden** |
| `ENABLE_TEST_OTP_ENDPOINT` | `false` | `true` | **forbidden** | **forbidden** |

Validate before deploy:

```bash
APP_ENV=production pnpm validate:env
```

Startup validation runs automatically via `instrumentation.ts` when `APP_ENV` is `staging` or `production`.
