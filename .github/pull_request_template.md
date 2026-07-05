## Summary

What changed and why?

## Changes

-
-
-

## Validation

Local checks run:

- [ ] `python3 scripts/repo_governance_harness.py --mode check`
- [ ] `python3 -m unittest tests/test_repo_governance_harness.py`
- [ ] `python3 scripts/run_quality_gate.py --include-repo-governance`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm web:self-review`

## Architecture impact

- [ ] No architecture changes
- [ ] AGENTS.md updated
- [ ] docs updated
- [ ] config/scripts/tests updated

## Deployment

- [ ] No deployment impact
- [ ] Vercel preview checked
- [ ] Production deployment expected after merge to main

Preview URL:

## Risks

-

## Rollback

-
