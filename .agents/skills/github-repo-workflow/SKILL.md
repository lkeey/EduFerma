---
name: github-repo-workflow
description: Use whenever working with EduFerma GitHub branches, pull requests, CI checks, merges, or Vercel deployment readiness.
---

# GitHub Repository Workflow

Always use branch -> pull request -> checks -> merge.

## Before Changes

1. Work from `/Users/lkeey/IT/platform/EduFerma`.
2. Run `git status -sb`.
3. Confirm `origin` is `https://github.com/lkeey/EduFerma.git`.
4. Never work directly on `main` or `master`.
5. Create a scoped branch, usually `codex/<short-description>`.

## Before Commit

Run:

```bash
python3 scripts/repo_governance_harness.py --mode check
python3 -m unittest tests/test_repo_governance_harness.py
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:self-review
```

## Publish

1. Stage only intended files.
2. Commit with a clear message.
3. Push the branch.
4. Open a draft PR.
5. Fill the PR template.
6. Fix failing checks.
7. Mark ready only after checks pass.

Never invent PR or deployment URLs.
