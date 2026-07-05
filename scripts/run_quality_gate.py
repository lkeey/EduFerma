#!/usr/bin/env python3
"""Run local EduFerma quality gates."""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Step:
    name: str
    command: list[str]


def run_step(step: Step, root: Path) -> tuple[int, str]:
    result = subprocess.run(step.command, cwd=root, text=True, capture_output=True, check=False)
    return result.returncode, (result.stdout + result.stderr).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run EduFerma local quality gate.")
    parser.add_argument("--include-repo-governance", action="store_true")
    parser.add_argument("--skip-node", action="store_true", help="Skip pnpm platform checks.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    steps: list[Step] = []
    if args.include_repo_governance:
        steps.append(
            Step(
                "repo-governance",
                [sys.executable, "scripts/repo_governance_harness.py", "--mode", "check"],
            )
        )
    steps.append(
        Step(
            "python-harness-tests",
            [sys.executable, "-m", "unittest", "tests/test_repo_governance_harness.py"],
        )
    )
    if not args.skip_node:
        steps.extend(
            [
                Step("platform-lint", ["pnpm", "lint"]),
                Step("platform-typecheck", ["pnpm", "typecheck"]),
                Step("platform-test", ["pnpm", "test"]),
                Step("platform-build", ["pnpm", "build"]),
                Step("platform-self-review", ["pnpm", "web:self-review"]),
            ]
        )

    failures: list[str] = []
    for step in steps:
        code, output = run_step(step, root)
        status = "PASS" if code == 0 else "FAIL"
        print(f"{step.name}: {status}")
        if output:
            print(output)
        if code != 0:
            failures.append(step.name)
    if failures:
        print(f"Quality gate failed: {', '.join(failures)}")
        return 1
    print("Quality gate passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
