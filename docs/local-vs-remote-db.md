# Local Vs Remote DB

## Production

Production uses remote managed Postgres through `DATABASE_URL`.

## Development

Development can use:

- Neon dev branch;
- local Postgres;
- dry-run local JSON import.

## Testing

Unit tests can use mocks. Integration tests should use a test database or route
handler/service mocks. Do not require production secrets in CI.

## No Silent Fallback

If `DATABASE_URL` is missing in production, DB-backed endpoints must return a
controlled setup/unavailable error. They must not serve local files or demo data.
