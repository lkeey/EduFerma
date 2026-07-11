#!/usr/bin/env python3
"""Repository governance harness for the EduFerma GitHub repository."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ERROR = "ERROR"
WARN = "WARN"
INFO = "INFO"


DEFAULT_RULES: dict[str, Any] = {
    "default_branch_names": ["main", "master"],
    "required_branch_prefixes": ["codex/", "feature/", "fix/", "chore/", "docs/", "ci/"],
    "forbidden_direct_work_branches": ["main", "master"],
    "required_files": [
        "AGENTS.md",
        ".github/workflows/ci.yml",
        "config/repo_governance_rules.yaml",
        "scripts/repo_governance_harness.py",
    ],
    "recommended_files": [],
    "safe_fix_directories": [".github/workflows", "docs", "logs/repo_governance"],
    "secret_file_patterns": [".env", ".env.*", "*.pem", "*.key"],
    "allowed_secret_file_patterns": [".env.example"],
    "secret_content_patterns": ["sk-", "ghp_", "github_pat_", "VERCEL_TOKEN="],
    "architecture_sensitive_paths": ["AGENTS.md", "config/", "scripts/", ".github/workflows/"],
    "documentation_update_paths": ["AGENTS.md", "docs/"],
    "tests_required_when_changed": {},
}


class ConfigError(Exception):
    """Raised when governance rules cannot be loaded."""


@dataclass
class Finding:
    code: str
    severity: str
    path: str
    message: str
    expected: str = ""
    suggested_fix: str = ""


@dataclass
class RepoContext:
    is_git_repo: bool
    branch: str
    default_branch: str
    remote: str
    status_entries: list[str]
    changed_files: list[str]
    tracked_files: list[str]


def now_stamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S")


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_rules(root: Path) -> tuple[dict[str, Any], list[Finding]]:
    config_path = root / "config" / "repo_governance_rules.yaml"
    warnings: list[Finding] = []
    if not config_path.exists():
        raise ConfigError("Missing config/repo_governance_rules.yaml")
    try:
        import yaml  # type: ignore[import-not-found]
    except ImportError:
        warnings.append(
            Finding(
                "PY_YAML_MISSING",
                WARN,
                str(config_path),
                "PyYAML is not installed; using built-in default rules for this run.",
                "Install requirements-dev.txt for full YAML configuration support.",
            )
        )
        return DEFAULT_RULES, warnings
    with config_path.open("r", encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle) or {}
    if not isinstance(loaded, dict):
        raise ConfigError("config/repo_governance_rules.yaml must contain a YAML mapping")
    return deep_merge(DEFAULT_RULES, loaded), warnings


def run_git(root: Path, *args: str) -> tuple[int, str]:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode, (result.stdout + result.stderr).strip()


def parse_status_files(status_entries: list[str]) -> list[str]:
    files: list[str] = []
    for entry in status_entries:
        path = entry[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if path:
            files.append(path)
    return sorted(set(files))


def collect_repo_context(root: Path, changed_files: list[str] | None) -> RepoContext:
    code, inside = run_git(root, "rev-parse", "--is-inside-work-tree")
    is_git_repo = code == 0 and inside.splitlines()[-1:] == ["true"]
    if not is_git_repo:
        return RepoContext(False, "", "", "", [], changed_files or [], [])

    _, branch = run_git(root, "branch", "--show-current")
    _, remote = run_git(root, "remote", "get-url", "origin")
    code, default_ref = run_git(root, "symbolic-ref", "refs/remotes/origin/HEAD")
    default_branch = "main"
    if code == 0 and "/" in default_ref:
        default_branch = default_ref.rsplit("/", 1)[-1]

    _, status_output = run_git(root, "status", "--porcelain")
    status_entries = [line for line in status_output.splitlines() if line]
    _, tracked_output = run_git(root, "ls-files")
    tracked_files = [line for line in tracked_output.splitlines() if line]
    inferred_changed = parse_status_files(status_entries)
    return RepoContext(
        True,
        branch.strip(),
        default_branch,
        remote.strip(),
        status_entries,
        sorted(set(changed_files or inferred_changed)),
        tracked_files,
    )


def is_allowed_secret_path(path: str, rules: dict[str, Any]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in rules["allowed_secret_file_patterns"])


def matches_any(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def secret_pattern_found(diff_text: str, pattern: str) -> bool:
    if pattern == "sk-":
        return re.search(r"(?<![A-Za-z0-9_])sk-[A-Za-z0-9][A-Za-z0-9_-]{7,}", diff_text) is not None
    return pattern in diff_text


def has_path_with_prefix(paths: list[str], prefixes: list[str]) -> bool:
    return any(
        any(path == prefix.rstrip("/") or path.startswith(prefix) for prefix in prefixes)
        for path in paths
    )


def github_slug(url: str) -> str:
    normalized = url.strip()
    normalized = re.sub(r"https://[^@/]+@", "https://", normalized)
    match = re.search(r"github\.com[:/]([^/]+/[^/.]+)(?:\.git)?/?$", normalized)
    if match:
        return match.group(1).lower()
    return normalized.removesuffix(".git").lower()


def relative_walk(root: Path) -> list[str]:
    ignored = {".git", "node_modules", ".next", ".turbo", "reports", "logs"}
    paths: list[str] = []
    for current, dirs, files in os.walk(root):
        dirs[:] = [item for item in dirs if item not in ignored]
        current_path = Path(current)
        for file_name in files:
            path = (current_path / file_name).relative_to(root).as_posix()
            paths.append(path)
    return paths


class RepoGovernanceHarness:
    def __init__(
        self,
        root: Path,
        mode: str,
        strict: bool,
        changed_files: list[str] | None,
    ) -> None:
        self.root = root.resolve()
        self.mode = mode
        self.strict = strict
        self.cli_changed_files = changed_files
        self.findings: list[Finding] = []
        self.rules: dict[str, Any] = {}
        self.context = RepoContext(False, "", "", "", [], [], [])

    def add(
        self,
        code: str,
        severity: str,
        path: str,
        message: str,
        expected: str = "",
        suggested_fix: str = "",
    ) -> None:
        self.findings.append(Finding(code, severity, path, message, expected, suggested_fix))

    def run(self) -> dict[str, Any]:
        self.rules, config_warnings = load_rules(self.root)
        self.findings.extend(config_warnings)
        if self.mode == "fix-safe":
            self.apply_safe_fixes()
        self.context = collect_repo_context(self.root, self.cli_changed_files)
        self.check_repository_identity()
        self.check_git_context()
        self.check_required_files()
        self.check_agents_contract()
        self.check_secret_hygiene()
        self.check_architecture_change_contract()
        self.check_workflow()
        self.check_pull_request_tools()
        self.check_nested_repositories()
        return self.build_report()

    def apply_safe_fixes(self) -> None:
        for directory in self.rules["safe_fix_directories"]:
            path = self.root / directory
            path.mkdir(parents=True, exist_ok=True)
            if directory != "logs/repo_governance":
                gitkeep = path / ".gitkeep"
                if not any(path.iterdir()) and not gitkeep.exists():
                    gitkeep.write_text("", encoding="utf-8")

    def check_repository_identity(self) -> None:
        repo_rules = self.rules.get("repository", {})
        expected_root = repo_rules.get("expected_root_path")
        if (
            expected_root
            and not os.environ.get("GITHUB_ACTIONS")
            and self.root.as_posix() != str(expected_root)
        ):
            severity = ERROR if self.strict else WARN
            self.add(
                "REPO_ROOT_UNEXPECTED",
                severity,
                self.root.as_posix(),
                "Repository root does not match the documented EduFerma root.",
                str(expected_root),
                "Run governance checks from /Users/lkeey/IT/platform/EduFerma.",
            )
        for forbidden in repo_rules.get("forbidden_root_paths", []):
            if self.root.as_posix() == str(forbidden):
                self.add(
                    "REPO_ROOT_FORBIDDEN",
                    ERROR,
                    self.root.as_posix(),
                    "This path is explicitly not the EduFerma repository root.",
                    str(expected_root),
                    "Use the documented platform/EduFerma repository.",
                )
        expected_remote = repo_rules.get("expected_remote_url")
        if (
            expected_remote
            and self.context.remote
            and github_slug(self.context.remote) != github_slug(str(expected_remote))
        ):
            self.add(
                "REMOTE_ORIGIN_UNEXPECTED",
                WARN,
                "origin",
                "Remote origin differs from the documented EduFerma GitHub repository.",
                str(expected_remote),
                "Verify that the checkout points to the intended repository.",
            )

    def check_git_context(self) -> None:
        if not self.context.is_git_repo:
            severity = ERROR if self.strict else WARN
            self.add(
                "GIT_REPO_MISSING",
                severity,
                ".git",
                "Current root is not a git repository.",
                "Git repository root.",
                "Initialize or run from the EduFerma checkout before publishing.",
            )
            return
        if not self.context.remote:
            severity = ERROR if self.strict else WARN
            self.add(
                "REMOTE_ORIGIN_MISSING",
                severity,
                "origin",
                "Git remote origin is not configured.",
                "origin remote.",
                "Add the GitHub remote before publishing.",
            )
        forbidden = self.rules["forbidden_direct_work_branches"]
        if self.context.branch in forbidden and self.context.status_entries:
            self.add(
                "DIRECT_WORK_ON_DEFAULT_BRANCH",
                ERROR,
                self.context.branch,
                "Working tree has changes on a protected/default branch.",
                "Feature branch for repository changes.",
                "Switch to a branch such as codex/<short-task> before editing.",
            )
        elif self.context.branch in forbidden:
            self.add(
                "ON_DEFAULT_BRANCH",
                WARN,
                self.context.branch,
                "Current branch is a default branch. Start feature work on a scoped branch.",
                "Feature branch.",
                "Use git switch -c codex/<short-task> before editing.",
            )
        allowed_prefixes = self.rules["required_branch_prefixes"]
        if (
            self.context.branch
            and self.context.branch not in self.rules["default_branch_names"]
            and not any(self.context.branch.startswith(prefix) for prefix in allowed_prefixes)
        ):
            self.add(
                "BRANCH_PREFIX_UNEXPECTED",
                WARN,
                self.context.branch,
                "Branch name does not use an approved prefix.",
                ", ".join(allowed_prefixes),
                "Rename or recreate the branch with an approved prefix.",
            )

    def check_required_files(self) -> None:
        for file_path in self.rules["required_files"]:
            if not (self.root / file_path).exists():
                self.add(
                    "REQUIRED_FILE_MISSING",
                    ERROR,
                    file_path,
                    "Required repository governance file is missing.",
                    file_path,
                    "Create the file or update governance rules if intentionally removed.",
                )
        for file_path in self.rules["recommended_files"]:
            if not (self.root / file_path).exists():
                self.add(
                    "RECOMMENDED_FILE_MISSING",
                    WARN,
                    file_path,
                    "Recommended repository governance file is missing.",
                    file_path,
                    "Add the file when expanding the governance workflow.",
                )

    def check_agents_contract(self) -> None:
        path = self.root / "AGENTS.md"
        if not path.exists():
            return
        text = path.read_text(encoding="utf-8")
        normalized_text = text.lower()
        required_phrases = [
            "GitHub repository workflow",
            "Repository Definition of Done",
            "repo governance harness",
        ]
        for phrase in required_phrases:
            if phrase.lower() not in normalized_text:
                self.add(
                    "AGENTS_GOVERNANCE_SECTION_MISSING",
                    ERROR,
                    "AGENTS.md",
                    f"AGENTS.md does not mention {phrase}.",
                    phrase,
                    "Document the repository workflow contract in AGENTS.md.",
                )

    def check_secret_hygiene(self) -> None:
        paths_to_check = sorted(set(self.context.tracked_files + self.context.changed_files))
        if not self.context.is_git_repo:
            paths_to_check = relative_walk(self.root)
        for path in paths_to_check:
            if is_allowed_secret_path(path, self.rules):
                continue
            if matches_any(path, self.rules["secret_file_patterns"]):
                self.add(
                    "SECRET_FILE_TRACKED_OR_CHANGED",
                    ERROR,
                    path,
                    "A secret-like file is tracked or changed.",
                    "No secret files in git.",
                    "Remove it from git and keep only safe examples such as .env.example.",
                )
        if not self.context.is_git_repo:
            return
        for diff_args in (("diff", "--cached"), ("diff",)):
            _, diff_text = run_git(self.root, *diff_args)
            for pattern in self.rules["secret_content_patterns"]:
                if secret_pattern_found(diff_text, pattern):
                    self.add(
                        "SECRET_PATTERN_IN_DIFF",
                        ERROR,
                        "git diff",
                        "Potential secret content pattern found in the git diff.",
                        "No secret values or token prefixes in diffs.",
                        "Remove the secret and rotate it if it was real.",
                    )
                    break

    def check_architecture_change_contract(self) -> None:
        changed = self.context.changed_files
        if not changed:
            return
        sensitive = self.rules["architecture_sensitive_paths"]
        doc_paths = self.rules["documentation_update_paths"]
        has_sensitive_change = has_path_with_prefix(changed, sensitive)
        has_doc_update = has_path_with_prefix(changed, doc_paths)
        if has_sensitive_change and not has_doc_update:
            self.add(
                "ARCHITECTURE_CHANGE_WITHOUT_DOCS",
                WARN,
                ", ".join(changed[:5]),
                "Architecture-sensitive paths changed without AGENTS.md/docs updates.",
                "Architecture docs updated or explicit rationale in PR.",
                "Update AGENTS.md, docs, or the PR description.",
            )
        for source, required_tests in self.rules.get("tests_required_when_changed", {}).items():
            if source in changed and not any(test_path in changed for test_path in required_tests):
                self.add(
                    "TEST_UPDATE_MISSING",
                    ERROR if self.strict else WARN,
                    source,
                    "Governance code/config changed without its required tests.",
                    ", ".join(required_tests),
                    "Update the harness tests with the behavior change.",
                )

    def check_workflow(self) -> None:
        workflow = self.root / ".github" / "workflows" / "ci.yml"
        if not workflow.exists():
            severity = ERROR if self.strict else WARN
            self.add(
                "CI_WORKFLOW_MISSING",
                severity,
                ".github/workflows/ci.yml",
                "Main CI workflow is missing.",
                "CI workflow with repo-governance, Python tests, platform checks, and build.",
                "Create .github/workflows/ci.yml.",
            )
            return
        text = workflow.read_text(encoding="utf-8")
        expected_snippets = {
            "pull_request": "CI must run on pull requests.",
            "push": "CI must run on push to main.",
            "permissions:": "CI must set minimal workflow permissions.",
            "repo-governance": "CI must include a repo-governance job.",
            "python-tests": "CI must include Python harness tests.",
            "platform-quality": "CI must include platform lint/typecheck/test checks.",
            "platform-build": "CI must include platform build checks.",
            "quality-gate": "CI must include an aggregate quality gate.",
        }
        for snippet, message in expected_snippets.items():
            if snippet not in text:
                self.add(
                    "CI_WORKFLOW_EXPECTATION_MISSING",
                    ERROR if self.strict else WARN,
                    ".github/workflows/ci.yml",
                    message,
                    snippet,
                    "Update the workflow to include the expected governance check.",
                )
        if "pull_request_target" in text:
            self.add(
                "CI_PULL_REQUEST_TARGET_USED",
                ERROR,
                ".github/workflows/ci.yml",
                "Workflow uses pull_request_target, which is unsafe for this MVP.",
                "No pull_request_target workflow trigger.",
                "Use pull_request unless there is a reviewed security exception.",
            )

    def check_pull_request_tools(self) -> None:
        if os.environ.get("GITHUB_ACTIONS"):
            return
        if shutil.which("gh") is None:
            self.add(
                "GH_CLI_MISSING",
                WARN,
                "gh",
                "GitHub CLI is not installed, so PR metadata cannot be checked locally.",
                "gh available and authenticated for publish flow.",
                "Install gh or rely on GitHub Actions and manual PR review.",
            )
            return
        code, _ = subprocess.getstatusoutput("gh auth status")
        if code != 0:
            self.add(
                "GH_AUTH_MISSING",
                WARN,
                "gh",
                "GitHub CLI is installed but not authenticated.",
                "Authenticated gh for PR checks.",
                "Run gh auth login before publish flow checks.",
            )

    def check_nested_repositories(self) -> None:
        nested: list[str] = []
        for git_dir in self.root.rglob(".git"):
            if git_dir == self.root / ".git":
                continue
            if "node_modules" in git_dir.parts:
                continue
            nested.append(git_dir.parent.relative_to(self.root).as_posix())
        for path in nested:
            self.add(
                "NESTED_GIT_REPOSITORY",
                WARN,
                path,
                "Nested git repository found inside EduFerma.",
                "Single repository boundary unless intentionally documented.",
                "Document the nested repository or move it outside this checkout.",
            )

    def status(self) -> str:
        if any(finding.severity == ERROR for finding in self.findings):
            return "FAIL"
        if any(finding.severity == WARN for finding in self.findings):
            return "WARN"
        return "PASS"

    def build_report(self) -> dict[str, Any]:
        errors = [finding for finding in self.findings if finding.severity == ERROR]
        warnings = [finding for finding in self.findings if finding.severity == WARN]
        return {
            "status": self.status(),
            "checked_at": now_iso(),
            "mode": self.mode,
            "strict": self.strict,
            "project_root": self.root.as_posix(),
            "current_branch": self.context.branch,
            "default_branch": self.context.default_branch,
            "remote": self.context.remote,
            "changed_files": self.context.changed_files,
            "total_errors": len(errors),
            "total_warnings": len(warnings),
            "findings": [asdict(finding) for finding in self.findings],
        }

    def write_reports(self, report: dict[str, Any]) -> tuple[Path, Path]:
        report_dir = self.root / "logs" / "repo_governance"
        report_dir.mkdir(parents=True, exist_ok=True)
        stamp = now_stamp()
        markdown_path = report_dir / f"repo_governance_{stamp}.md"
        json_path = report_dir / f"repo_governance_{stamp}.json"
        markdown_path.write_text(self.report_markdown(report), encoding="utf-8")
        json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return markdown_path, json_path

    def report_markdown(self, report: dict[str, Any]) -> str:
        lines = [
            "# Repo governance report",
            "",
            "## Summary",
            "",
            f"- status: {report['status']}",
            f"- checked_at: {report['checked_at']}",
            f"- mode: {report['mode']}",
            f"- strict: {report['strict']}",
            f"- project_root: `{report['project_root']}`",
            f"- current_branch: `{report['current_branch']}`",
            f"- default_branch: `{report['default_branch']}`",
            f"- remote: `{report['remote']}`",
            f"- total_errors: {report['total_errors']}",
            f"- total_warnings: {report['total_warnings']}",
            "",
            "## Findings",
            "",
            "| code | severity | path | message | expected | suggested_fix |",
            "|---|---|---|---|---|---|",
        ]
        if report["findings"]:
            for finding in report["findings"]:
                lines.append(
                    (
                        "| {code} | {severity} | `{path}` | {message} | "
                        "{expected} | {suggested_fix} |"
                    ).format(
                        code=finding["code"],
                        severity=finding["severity"],
                        path=finding["path"],
                        message=finding["message"],
                        expected=finding["expected"],
                        suggested_fix=finding["suggested_fix"],
                    )
                )
        else:
            lines.append("|  |  |  |  |  |  |")
        lines.extend(
            [
                "",
                "## PR workflow status",
                "",
                f"- branch: `{report['current_branch']}`",
                f"- base: `{report['default_branch']}`",
                "- PR: checked externally through GitHub or gh when available",
                "",
                "## Next actions",
                "",
            ]
        )
        if report["status"] == "FAIL":
            lines.append("1. Fix ERROR findings and re-run the harness.")
        elif report["status"] == "WARN":
            lines.append("1. Review warnings and document accepted residual risk.")
        else:
            lines.append("1. No action required.")
        return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run EduFerma repository governance checks.")
    parser.add_argument("--mode", choices=["check", "suggest-fixes", "fix-safe"], default="check")
    parser.add_argument("--json", action="store_true", help="Print the report JSON to stdout.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Promote bootstrap warnings to errors.",
    )
    parser.add_argument(
        "--changed-files",
        nargs="*",
        help="Changed files to evaluate instead of git status.",
    )
    parser.add_argument("--root", default=".", help="Repository root to check. Defaults to cwd.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    try:
        harness = RepoGovernanceHarness(root, args.mode, args.strict, args.changed_files)
        report = harness.run()
        markdown_path, json_path = harness.write_reports(report)
    except ConfigError as error:
        print(f"Repo governance config error: {error}", file=sys.stderr)
        return 2
    except Exception as error:  # noqa: BLE001
        print(f"Repo governance runtime error: {error}", file=sys.stderr)
        return 3
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Repo governance status: {report['status']}")
    print(f"Markdown report: {markdown_path}")
    print(f"JSON report: {json_path}")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
