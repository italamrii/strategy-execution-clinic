# Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

Arabic-first professional membership, volunteering, and credentialing platform, with Arabic and English interfaces.

The code includes OTP sign-in, profiles and permissions, membership review, QR credentials and exports, volunteering and hour approval, recognition, public profiles, and administration. This is a local development handoff, not evidence of a production deployment. Infrastructure and real email verification remain open in `LAUNCH_CHECKLIST.md`.

See `CONTINUATION_NOTES.md` for the September 2026 continuation and verification results. `ROADMAP.md` records the original phase scope; its historical wording is not a release certificate.

## Docs

| Document | Purpose |
| --- | --- |
| [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) | Product contract |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Modular monolith |
| [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) | Ubiquitous language |
| [SECURITY.md](./SECURITY.md) | Security policy |
| [THREAT_MODEL.md](./THREAT_MODEL.md) | STRIDE and abuse cases |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | PostgreSQL |
| [RBAC_MATRIX.md](./RBAC_MATRIX.md) | Permissions |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Visual language |
| [I18N_ARCHITECTURE.md](./I18N_ARCHITECTURE.md) | Arabic + English |
| [ROADMAP.md](./ROADMAP.md) | Phases |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to work |

## Stack

Next.js 16 · React 19 · TypeScript strict · PostgreSQL · Drizzle · Zod · next-intl · Tailwind CSS v4 · pnpm

## Local

```bash
pnpm install
cp .env.example .env.local
pnpm dev:local
```

- Arabic: http://localhost:3000/ar
- English: http://localhost:3000/en
- Design preview: http://localhost:3000/ar/design-preview
- Health: http://localhost:3000/api/health
- Membership code entry: http://localhost:3000/ar/verify

`dev:local` starts a local PostgreSQL database, applies migrations, seeds catalogs, and runs the app. Local OTP codes appear in the terminal. The ZIP handoff excludes local secrets, database files, dependencies, and build output. Install dependencies before running it. Production setup is documented in `docs/operations/DEPLOYMENT.md`.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
