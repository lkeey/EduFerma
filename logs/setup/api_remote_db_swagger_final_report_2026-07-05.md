# API Remote DB Swagger Final Report

Date: 2026-07-05

## Summary

Implemented the API-first foundation for EduFerma in branch `codex/api-remote-db-swagger` using worktree:

`/Users/lkeey/IT/platform/worktrees/EduFerma-api-remote-db-swagger`

The original dirty worktree at `/Users/lkeey/IT/platform/EduFerma` was preserved.

## Before

- DB schema existed as Drizzle + Neon/Postgres code, but no migrations existed.
- Runtime `getDb()` was lazy, but Drizzle config silently fell back to localhost.
- Seed printed demo JSON only.
- UI dashboards read `apps/web/src/lib/demo-data.ts`.
- Only API route was `/api/health`.
- `/api/openapi.json` and `/api/docs` did not exist.
- Production `/api/health` reported `database:false` and `clerk:false`.
- Production dashboard routes returned public HTTP 200 pages.

## Target DB Architecture

- Production source of truth: remote managed Postgres, preferred Neon Postgres through Vercel Marketplace.
- Development sources: Neon dev branch or local Postgres.
- Tests: mocks or test DB.
- No production SQLite/local-file/local-JSON fallback.

Current remote DB status: not connected in this Codex session. No remote DB URL was invented or committed.

## Env Vars

`.env.example` now documents:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `ENABLE_DEMO_AUTH=false`
- `OPENAPI_DOCS_ENABLED=true`

## Migrations And Seed

- Drizzle migration generated: `packages/db/drizzle/0000_fearless_elektra.sql`
- Drizzle metadata generated under `packages/db/drizzle/meta/`
- Seed CLI: `pnpm db:seed -- --dry-run` and `pnpm db:seed -- --apply`
- Seed apply refuses to run without `DATABASE_URL`.
- `answer_json` was added as explicit teacher-only task data.

## API Endpoints

Common:

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/openapi.json`
- `GET /api/docs`
- `GET /api/v1/me`

Student:

- `GET /api/v1/student/dashboard`
- `GET /api/v1/student/schedule`
- `GET /api/v1/student/plan`
- `GET /api/v1/student/assignments`
- `GET /api/v1/student/assignments/{assignmentId}`
- `GET /api/v1/student/tasks/{taskId}`
- `POST /api/v1/student/tasks/{taskId}/attempts`
- `GET /api/v1/student/progress`

Teacher:

- `GET /api/v1/teacher/dashboard`
- `GET /api/v1/teacher/students`
- `GET /api/v1/teacher/students/{studentId}`
- `GET /api/v1/teacher/students/{studentId}/plan`
- `PATCH /api/v1/teacher/students/{studentId}/plan`
- `GET /api/v1/teacher/students/{studentId}/schedule`
- `POST /api/v1/teacher/students/{studentId}/schedule`
- `GET /api/v1/teacher/students/{studentId}/assignments`
- `GET /api/v1/teacher/students/{studentId}/analytics`
- `GET /api/v1/teacher/task-bank`
- `GET /api/v1/teacher/tasks/{taskId}`
- `POST /api/v1/teacher/assignments`
- `PATCH /api/v1/teacher/assignments/{assignmentId}`
- `POST /api/v1/teacher/assignments/{assignmentId}/publish`
- `GET /api/v1/teacher/attempts/pending-review`
- `POST /api/v1/teacher/attempts/{attemptId}/review`

## OpenAPI / Swagger

- Runtime spec: `/api/openapi.json`
- Tracked generated spec: `packages/api-contract/openapi.json`
- Swagger UI: `/api/docs`
- Contract source: `packages/api-contract/src/registry.ts`
- Docs controlled by `OPENAPI_DOCS_ENABLED`.

Local smoke results:

- `GET http://127.0.0.1:3010/api/health` -> 200
- `GET http://127.0.0.1:3010/api/openapi.json` -> 200
- `HEAD http://127.0.0.1:3010/api/docs` -> 200
- `GET http://127.0.0.1:3010/api/v1/teacher/dashboard` without auth -> 401

## Security

- `/api/v1/**` handlers call `requireApiRole`.
- Teacher routes require owner/tutor.
- Student routes allow owner/tutor/student/guardian.
- Student serializers remove `answer_json`, `solution_md`, `teacher_notes`, and `local_source_path`.
- Dashboards are now dynamic and call server-side role checks instead of being static public pages.
- `ENABLE_DEMO_AUTH` works only outside production.

## Governance

Added `scripts/api-governance.ts` and package scripts:

- `pnpm api:openapi:generate`
- `pnpm api:openapi:check`
- `pnpm api:governance`

Governance checks:

- every `/api/v1/**/route.ts` method is present in OpenAPI;
- OpenAPI operations have `operationId`, `tags`, `summary`, `responses`, and security for protected routes;
- body-accepting operations declare request bodies and route handlers validate JSON;
- protected route handlers call `requireApiRole`;
- student routes do not reference forbidden teacher-only fields;
- API docs/tests exist.

Repo governance Python harness was not present in the clean `main` worktree used for this branch. To avoid mixing unrelated uncommitted repo-governance work from the preserved dirty worktree, this branch adds API governance to platform CI and `web:self-review`.

## Checks

Passed:

- `pnpm install`
- `pnpm db:generate`
- `pnpm api:openapi:generate`
- `pnpm api:openapi:check`
- `pnpm api:governance`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (7 files, 11 tests)
- `pnpm build`
- `pnpm web:self-review`

Parent workshop self-review:

- command: `python3 scripts/self_review_harness.py --mode check`
- status: WARN
- report: `/Users/lkeey/IT/logs/self_review/self_review_20260705_120559.md`
- warnings are pre-existing local corpus warnings about unresolved task numbers and duplicate canonical hashes.

## Manual Vercel / Neon Work

Required before production data works:

1. Add Neon Postgres through Vercel Marketplace or connect an existing managed Postgres.
2. Configure Vercel production and preview env vars:
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL` if available
   - Clerk keys
   - `OWNER_EMAIL`
   - `OPENAPI_DOCS_ENABLED`
3. Run migrations against the remote DB.
4. Run seed/import only after confirming the target database is not production-critical or after backup.

## PR / Deployment

Local branch exists: `codex/api-remote-db-swagger`.

Pushed branch:

`origin/codex/api-remote-db-swagger`

Commit: current HEAD of `codex/api-remote-db-swagger` after the final report amend.

Draft PR status:

- `gh` CLI is not installed in this environment.
- GitHub connector PR creation failed with `403 Resource not accessible by integration`.
- Manual PR URL: `https://github.com/lkeey/EduFerma/pull/new/codex/api-remote-db-swagger`

Vercel preview deployment:

- Stable branch alias URL: `https://edu-ferma-web-git-codex-api-remote-db-swagger-lkeeeey.vercel.app`
- Latest observed branch deployment state: `READY`
