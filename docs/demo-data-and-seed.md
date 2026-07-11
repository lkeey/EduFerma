# Demo Data And Seed

Demo data is allowed for local development and tests. It is not production data.

## Rules

- `ENABLE_DEMO_AUTH=true` works only outside production.
- Seed dry-run can print fixtures without DB access.
- Seed apply requires `DATABASE_URL`.
- Seed apply requires a Postgres URL and rejects local DB URLs in production.
- Production seed apply requires both `EDUFERMA_ALLOW_PRODUCTION_SEED=true` and
  `--allow-production-seed`.
- Frontend components must not import demo arrays directly for production paths.
- Demo responses should move through the same service and serializer boundaries
  as DB-backed responses.

## Commands

```bash
pnpm db:seed -- --dry-run
pnpm db:seed -- --apply
```

Production break-glass seed command, only after backup and migration review:

```bash
EDUFERMA_ALLOW_PRODUCTION_SEED=true pnpm db:seed -- --apply --allow-production-seed
```

The demo seed is idempotent for development and preview branches: it uses stable
IDs and `onConflictDoNothing()`.
