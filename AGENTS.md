# AGENTS.md

## Scope

This repository contains only the EduFerma web platform code. Do not copy the
local teaching corpus, raw sources, student histories, logs, local databases, or
secrets from `/Users/lkeey/IT` into this public repository.

## Architecture

- `apps/web` — Next.js App Router public landing and invite-only dashboards.
- `apps/worker` — placeholder for background jobs.
- `packages/db` — Drizzle schema and lazy Neon client.
- `packages/core` — roles, permissions, answer checking, mastery and import logic.
- `packages/validators` — Zod schemas for platform-facing data.
- `packages/ui` — shared UI primitives inspired by shadcn/new-york.
- `scripts` — dry-run import, seed and quality gates.
- `docs` — architecture, deploy, privacy and sync notes.

## Data Safety

- Production secrets live only in Vercel, GitHub secrets, or local `.env.local`.
- `OWNER_EMAIL`, Clerk keys, `DATABASE_URL` and Blob tokens must never be
  committed.
- Import scripts must default to dry-run.
- `--apply` must refuse invalid, duplicate, or `needs_review` task rows.
- Public results/testimonials render only when `published=true` and
  `consent_status=granted`.

## Verification

Before pushing platform changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:self-review
```

Also run the parent workshop gate when changing the local project contract:

```bash
python3 /Users/lkeey/IT/scripts/self_review_harness.py --mode check
```
