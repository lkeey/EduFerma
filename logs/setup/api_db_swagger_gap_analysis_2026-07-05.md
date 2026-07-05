# API / DB / Swagger Gap Analysis

Date: 2026-07-05

## Current Project Location

- Repository root: `/Users/lkeey/IT/platform/EduFerma`
- Implementation worktree: `/Users/lkeey/IT/platform/worktrees/EduFerma-api-remote-db-swagger`
- Web app: `apps/web`
- Main public deployment: `https://edu-ferma-web.vercel.app`

`platform/AGENTS.md` does not exist. The platform-local contract is `platform/EduFerma/AGENTS.md`.

## Current Database State

- ORM: Drizzle ORM.
- Database driver: `@neondatabase/serverless` with `drizzle-orm/neon-http`.
- Runtime DB client: `packages/db/src/client.ts`, using lazy `getDb()`.
- Production-style database: Postgres/Neon schema is present in `packages/db/src/schema.ts`.
- Prisma: not present.
- SQLite/local file DB: not present in code.
- `DATABASE_URL`: documented in `.env.example` and referenced by DB client, Turborepo env, health endpoint, and sync script.
- `DIRECT_DATABASE_URL`: missing.
- Migrations: no migration files are present under `packages/db/drizzle`.
- Seed: `scripts/seed-demo-data.ts` prints demo JSON only; it does not write to DB.
- Existing tables in schema: `users`, `invitations`, `students`, `skill_mastery`, `lessons`, `tasks`, `assignments`, `assignment_tasks`, `attempts`, `public_results`, `audit_events`, `leads`.
- Data currently used by site: mock/demo arrays from `apps/web/src/lib/demo-data.ts`.

## Current Data Access

- API route handlers found: `apps/web/src/app/api/health/route.ts` only.
- Business API versioning: missing; no `/api/v1/**` routes.
- Server Actions: none found.
- Direct DB queries from React components: none found, because UI does not query DB yet.
- Direct mock usage from components:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/dashboard/student/page.tsx`
  - `apps/web/src/app/dashboard/teacher/page.tsx`
- Service layer: missing for dashboard, student, teacher, task, assignment, attempt, plan, schedule, and analytics operations.
- Typed validators: task import and student sync validators exist, but API request/response validators are missing.
- Server-side role enforcement: permission helpers exist in `packages/core/src/permissions.ts`, but dashboard pages do not enforce roles server-side.

## Current Auth / Role Risk

- `apps/web/src/proxy.ts` protects `/dashboard(.*)` and `/api/platform(.*)` only when Clerk env vars exist.
- If Clerk env vars are absent, proxy falls back to open access.
- Live production `/api/health` currently returns:

```json
{"ok":true,"service":"eduferma-web","database":false,"clerk":false}
```

- Live production `GET /dashboard/student` and `GET /dashboard/teacher` return HTTP 200 and are prerendered public pages.
- This is a high-priority architecture/security gap: teacher/student dashboards must not be publicly available without role checks.

## Current OpenAPI / Swagger State

- `openapi.yaml` / `openapi.json`: not present.
- `GET /api/openapi.json`: returns 404 in production.
- `GET /api/docs`: returns 404 in production.
- Swagger UI / Redoc: not present.
- API contract tests: not present.
- API governance check for route coverage: not present.

## Sensitive Data Risk

- Current DB schema contains `tasks.solutionMd`; it does not yet contain explicit `answer_json`.
- Current platform task validator accepts `answer` and `solution_md` from local task rows.
- No student-facing API serializer exists, so there is no enforced boundary preventing future leaks of answers, solutions, teacher notes, or local source paths.
- Existing student dashboard is mock-only and does not currently display answers, but the absence of API serializers is a structural risk.

## Required Env Vars

Current:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_BRAND_HANDLE`
- `NEXT_PUBLIC_TELEGRAM_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `OWNER_EMAIL`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `EDUFERMA_LOCAL_TASKS_PATH`
- `EDUFERMA_LOCAL_STUDENTS_PATH`

Missing for target architecture:

- `DIRECT_DATABASE_URL`
- `ENABLE_DEMO_AUTH`
- `OPENAPI_DOCS_ENABLED`

## Remote DB Work Needed

- Provision or connect a managed Postgres database, preferably Neon through Vercel Marketplace.
- Configure `DATABASE_URL` for pooled runtime access.
- Configure `DIRECT_DATABASE_URL` for migrations if provider supports direct connections.
- Generate and commit initial Drizzle migration files.
- Add guarded migration and seed commands.
- Ensure production never falls back to local SQLite, local files, or demo/mock data.
- Add setup/unavailable responses when DB env is missing instead of silently using mock data.

## API / Swagger Work Needed

- Add versioned `/api/v1/**` route handlers for common, student, and teacher operations.
- Add request/response/error schemas and typed validation.
- Add server-only auth, role, and ownership checks.
- Add service layer between route handlers and DB/domain logic.
- Add student-safe and teacher serializers.
- Add `GET /api/openapi.json`.
- Add `/api/docs` Swagger UI controlled by `OPENAPI_DOCS_ENABLED`.
- Add API governance so a new route without OpenAPI coverage fails CI/self-review.
- Add tests for OpenAPI coverage, auth/role checks, and answer/solution leak prevention.
