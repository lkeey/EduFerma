# EduFerma Architecture

EduFerma is a small production-oriented monorepo:

- public Russian landing for the `lkeey` tutor brand;
- invite-only student and tutor dashboards;
- shared domain packages for roles, task import, answer checking and mastery;
- Drizzle schema prepared for Neon Postgres;
- local-first dry-run sync from the teaching workshop.

The public repository never owns the raw teaching corpus. It only contains code
that can validate, summarize and safely import approved rows into platform data.

## Apps

- `apps/web` is the only user-facing app in the MVP.
- `apps/worker` is a placeholder for future scheduled jobs, reminders and
  analytics rollups.

## Packages

- `packages/db`: database schema and lazy `getDb()`.
- `packages/core`: business rules independent of React/Next.
- `packages/validators`: Zod schemas for task rows and student sync payloads.
- `packages/ui`: owned source UI primitives.
- `packages/config`: routes, roles, constants and public app config.
