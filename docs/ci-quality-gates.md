# CI Quality Gates

EduFerma CI is defined in `.github/workflows/ci.yml`.

## Required Jobs

- `repo-governance`: runs `scripts/repo_governance_harness.py`.
- `python-tests`: runs Ruff checks, format check, unittest harness tests, and pytest reports.
- `platform-quality`: runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm web:self-review`.
- `platform-build`: runs `pnpm build`.
- `quality-gate`: runs the aggregate local gate with `--include-repo-governance --skip-node`.

## Local Commands

```bash
make repo-governance
make python-test
make platform-lint
make platform-typecheck
make platform-test
make platform-build
make ci-local
```

## Reports

Python CI writes JUnit and coverage reports under `reports/`. Repo governance writes local reports
under `logs/repo_governance/`. Both paths are ignored by git.

Coverage thresholds and screenshot comparisons are not blocking in the MVP. They can become required
after the UI and deterministic seed data stabilize.
