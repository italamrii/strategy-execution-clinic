# Contributing

## Git

- `main` is the protected production branch.
- Feature branches + pull requests.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `security:`, `test:`, `chore:`, `refactor:`, `feat(membership):`.
- Required CI must pass. No `--no-verify`.
- No secrets in Git. Never commit `.env`.

## Definition of done

See `PRODUCT_REQUIREMENTS.md` §22. UI-only is not done. Authorization, validation, audit (when sensitive), AR/EN, and tests are required.

## Architecture

Read `ARCHITECTURE.md` before adding a module import. Do not introduce circular dependencies. Check **permissions**, not role names.

## i18n

Every user-visible string goes through `next-intl`. No hardcoded Arabic or English in JSX.

## Security

Follow `SECURITY.md` and `THREAT_MODEL.md`. Never trust client fields for identity, roles, hours, or credential status.

## Local

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate
pnpm dev
```

Arabic-first URL: `http://localhost:3000/ar`
Design preview: `http://localhost:3000/ar/design-preview`
