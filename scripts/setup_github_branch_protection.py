#!/usr/bin/env python3
"""Print or apply recommended GitHub branch protection settings."""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

REQUIRED_CHECKS = [
    "repo-governance",
    "python-tests",
    "platform-quality",
    "platform-build",
    "quality-gate",
]


def run(command: list[str], root: Path) -> tuple[int, str]:
    result = subprocess.run(command, cwd=root, text=True, capture_output=True, check=False)
    return result.returncode, (result.stdout + result.stderr).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Show EduFerma branch protection recommendations.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Reserved for future explicit apply flow.",
    )
    parser.add_argument("--branch", default="main")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    _, remote = run(["git", "remote", "get-url", "origin"], root)
    print(f"Repository root: {root}")
    print(f"Remote origin: {remote or '(missing)'}")
    print(f"Target branch: {args.branch}")
    print("")
    print("Recommended settings:")
    print("- Require a pull request before merging.")
    print("- Require conversation resolution.")
    print("- Block force pushes and branch deletion.")
    print("- Require status checks:")
    for check in REQUIRED_CHECKS:
        print(f"  - {check}")
    print("- Prefer Vercel Git integration for preview and production deployments.")
    if shutil.which("gh") is None:
        print("")
        print("gh is not installed; branch protection cannot be inspected locally.")
    if args.apply:
        print("")
        print("--apply is intentionally not implemented yet. Configure the settings in GitHub UI.")
        return 1
    print("")
    print("Dry run only. No GitHub settings were changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
