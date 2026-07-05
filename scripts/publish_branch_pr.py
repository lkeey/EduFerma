#!/usr/bin/env python3
"""Dry-run helper for safely publishing a branch and draft PR."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def run(command: list[str], root: Path) -> tuple[int, str]:
    result = subprocess.run(command, cwd=root, text=True, capture_output=True, check=False)
    return result.returncode, (result.stdout + result.stderr).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a safe EduFerma branch -> PR flow.")
    parser.add_argument("--branch", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--body-file")
    parser.add_argument("--base", default="main")
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--files", nargs="*", default=[])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    _, branch = run(["git", "branch", "--show-current"], root)
    _, status = run(["git", "status", "--short"], root)
    if branch in {"main", "master"}:
        print(
            "Refusing to publish from main/master. Switch to a feature branch first.",
            file=sys.stderr,
        )
        return 1
    print(f"Current branch: {branch}")
    print("Changed files:")
    print(status or "(none)")
    print("")
    checks = [
        [sys.executable, "scripts/repo_governance_harness.py", "--mode", "check"],
        [sys.executable, "-m", "unittest", "tests/test_repo_governance_harness.py"],
        [sys.executable, "scripts/run_quality_gate.py", "--include-repo-governance", "--skip-node"],
    ]
    for command in checks:
        code, output = run(command, root)
        print(f"$ {' '.join(command)}")
        print(output)
        if code != 0:
            print("Stopping because a required local check failed.", file=sys.stderr)
            return code
    if not args.apply:
        print("")
        print("Dry run only. Suggested next commands:")
        if args.files:
            print(f"git add {' '.join(args.files)}")
        else:
            print("git add <intended-files>")
        print(f"git commit -m {args.title!r}")
        print(f"git push -u origin {args.branch}")
        draft = " --draft" if args.draft else ""
        body = f" --body-file {args.body_file}" if args.body_file else ""
        print(f"gh pr create --base {args.base} --title {args.title!r}{body}{draft}")
        return 0
    if not args.files:
        print("--apply requires explicit --files. Refusing git add -A.", file=sys.stderr)
        return 1
    if shutil.which("gh") is None:
        print("gh is not installed; cannot create a PR with --apply.", file=sys.stderr)
        return 1
    print("--apply is intentionally conservative and currently stops before remote mutation.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
