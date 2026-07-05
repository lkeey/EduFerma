.PHONY: repo-governance repo-governance-fix python-lint python-format-check python-test platform-lint platform-typecheck platform-test platform-build platform-self-review ci-local quality

repo-governance:
	python3 scripts/repo_governance_harness.py --mode check

repo-governance-fix:
	python3 scripts/repo_governance_harness.py --mode fix-safe

python-lint:
	python3 -m ruff check scripts tests

python-format-check:
	python3 -m ruff format --check scripts tests

python-test:
	python3 -m unittest tests/test_repo_governance_harness.py

platform-lint:
	pnpm lint

platform-typecheck:
	pnpm typecheck

platform-test:
	pnpm test

platform-build:
	pnpm build

platform-self-review:
	pnpm web:self-review

ci-local: repo-governance python-lint python-format-check python-test platform-lint platform-typecheck platform-test platform-build platform-self-review
	python3 scripts/run_quality_gate.py --include-repo-governance --skip-node

quality:
	python3 scripts/run_quality_gate.py --include-repo-governance
