# GitHub Workflow

EduFerma repository work happens in `/Users/lkeey/IT/platform/EduFerma`.

## Start

1. Run `git status -sb`.
2. Confirm the remote is `https://github.com/lkeey/EduFerma.git`.
3. Do not edit directly on `main` or `master`.
4. Create a scoped branch such as `codex/<short-task>`, `feature/<name>`, or `fix/<name>`.

## Before Commit

Run the local gates that match the change:

```bash
python3 scripts/repo_governance_harness.py --mode check
python3 -m unittest tests/test_repo_governance_harness.py
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:self-review
```

For a complete local pass:

```bash
make ci-local
```

## Pull Request

1. Stage only files related to the task.
2. Commit with a clear message.
3. Push the branch.
4. Open a draft PR to `main`.
5. Fill the PR template.
6. Wait for CI checks.
7. Fix failing checks before marking the PR ready.

Do not invent PR, preview, or deployment URLs. Use only links returned by GitHub or Vercel.

## Merge

Merge only after required checks pass and review is complete. Production deployment must come from
the production branch, normally `main`.
