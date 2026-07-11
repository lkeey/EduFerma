# Local Vs Remote DB

## Production

Production uses remote managed Postgres through `DATABASE_URL`. `DATABASE_URL`
is the pooled runtime URL; `DIRECT_DATABASE_URL` is only for migrations and
other one-off database administration commands.

Production must not use local Postgres, SQLite, local JSON, or file-backed
fixtures as source of truth. If `DATABASE_URL` is absent, DB-backed flows should
surface setup/unavailable state instead of reading local data.

## Development

Development can use:

- Neon dev branch;
- local Postgres;
- dry-run local JSON import.

Use `EDUFERMA_DB_ENV=development` for local or preview DB work. Local JSON is
only an import/seed input and only in dry-run unless an apply command passes its
safety checks.

## Testing

Unit tests can use mocks. Integration tests should use a test database or route
handler/service mocks. Do not require production secrets in CI.

## No Silent Fallback

If `DATABASE_URL` is missing in production, DB-backed endpoints must return a
controlled setup/unavailable error. They must not serve local files or demo data.

The DB package validates that runtime and migration URLs are Postgres URLs. In
production it rejects local hosts such as `localhost`, `127.0.0.1`, and `::1`.
