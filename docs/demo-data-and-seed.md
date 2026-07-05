# Demo Data And Seed

Demo data is allowed for local development and tests. It is not production data.

## Rules

- `ENABLE_DEMO_AUTH=true` works only outside production.
- Seed dry-run can print fixtures without DB access.
- Seed apply requires `DATABASE_URL`.
- Frontend components must not import demo arrays directly for production paths.
- Demo responses should move through the same service and serializer boundaries
  as DB-backed responses.

## Commands

```bash
pnpm db:seed -- --dry-run
pnpm db:seed -- --apply
```
