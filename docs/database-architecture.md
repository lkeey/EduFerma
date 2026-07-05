# Database Architecture

## Production Source Of Truth

Production data must live in a remote managed Postgres database. The preferred
provider is Neon Postgres through Vercel Marketplace because it provides
serverless Postgres, Vercel env integration, branching and pooled runtime
connections.

Do not use SQLite, local files, local JSON, or demo fixtures as production
source of truth.

## Local And Dev Sources

Allowed development sources:

- remote Neon dev branch;
- local Postgres through Docker;
- mock repositories only in unit tests;
- local JSON only for dry-run import and seed generation.

SQLite is not part of the production-compatible path and should not be added as
a runtime fallback.

## Required Env Vars

- `DATABASE_URL`: pooled runtime Postgres URL for Next.js route handlers and services.
- `DIRECT_DATABASE_URL`: direct Postgres URL for migrations, if the provider gives one.
- `NEXT_PUBLIC_APP_URL`: canonical app URL.
- `CLERK_SECRET_KEY`: Clerk server key.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk browser key.
- `OWNER_EMAIL`: bootstrap owner email.
- `ENABLE_DEMO_AUTH`: local/test demo auth only; must remain false in production.
- `OPENAPI_DOCS_ENABLED`: controls `/api/docs` and `/api/openapi.json`.

Never commit real values.

## Migrations

Generate migrations:

```bash
pnpm db:generate
```

Run migrations against a configured database:

```bash
pnpm db:migrate
```

Use `DIRECT_DATABASE_URL` for migrations when available. If it is absent,
Drizzle falls back to `DATABASE_URL`.

## Seed

Dry-run seed preview:

```bash
pnpm db:seed -- --dry-run
```

Apply seed:

```bash
pnpm db:seed -- --apply
```

The seed script must refuse `--apply` without `DATABASE_URL`.

## Importing Tasks From The Local Corpus

The local teaching workshop remains outside this public repository. Import from
the normalized corpus with dry-run first:

```bash
pnpm tasks:sync --dry-run
```

Apply mode must require a configured remote/dev DB and must refuse invalid,
duplicate, restricted, or `needs_review` task rows.

## Production Safety

- Run migrations before deploying code that depends on new columns.
- Do not run seed against production unless the seed is explicitly production-safe.
- Do not point production at a local host, file path, SQLite DB, or unreviewed dump.
- Treat local task corpus paths as private implementation detail; do not expose
  them through student APIs.

## Backup / Restore

TODO before real production data:

- document Neon backup/restore steps;
- document branch restore procedure;
- document point-in-time recovery availability for the chosen plan;
- add a pre-migration backup checklist.
