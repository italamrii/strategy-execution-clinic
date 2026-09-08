# Environments

| Env | App URL | Database | Notes |
| --- | --- | --- | --- |
| local | http://localhost:3000 | docker compose Postgres | `.env.local` |
| ci | ephemeral | none required for unit tests | GitHub Actions |
| staging | TBD | production-like | synthetic data |
| production | TBD | managed PostgreSQL | deploy only from reviewed `main` |

Phase 0 does not include a production host. `Dockerfile` is a starting production image, not a live deployment.
