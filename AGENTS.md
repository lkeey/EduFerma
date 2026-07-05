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
python3 scripts/repo_governance_harness.py --mode check
python3 -m unittest tests/test_repo_governance_harness.py
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

## GitHub repository workflow

All repository changes must use GitHub flow:

1. Work from `/Users/lkeey/IT/platform/EduFerma`.
2. Create a feature branch from `main`.
3. Make scoped changes only.
4. Run local checks.
5. Push the branch.
6. Open a draft Pull Request.
7. Wait for GitHub Actions checks.
8. Fix failing checks.
9. Mark ready only after checks pass.
10. Merge to `main` only after required checks and review.

Do not push directly to `main`, bypass failed checks, commit secrets, or open a PR without a filled
description and validation notes.

## Repository Definition of Done

A repository change is ready only when:

1. The working branch is not `main` or `master`.
2. `python3 scripts/repo_governance_harness.py --mode check` passes or warnings are explained.
3. Harness tests pass with `python3 -m unittest tests/test_repo_governance_harness.py`.
4. Platform checks pass: lint, typecheck, test, build, and web self-review.
5. Architecture changes update `AGENTS.md`, `docs/`, or governance config/tests as needed.
6. No `.env`, token, key, credential, cookie, or production data file is committed.
7. GitHub Actions required checks are green before merge.

## Repo governance harness

Run after meaningful repository changes:

```bash
python3 scripts/repo_governance_harness.py --mode check
```

If it fails, read the report in `logs/repo_governance/`, fix the errors, and run it again. The
`fix-safe` mode may create only safe local folders; it must not push, commit, delete files, or change
remote branch protection.
