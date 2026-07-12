from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
HARNESS = REPO_ROOT / "scripts" / "repo_governance_harness.py"


class RepoGovernanceHarnessTest(unittest.TestCase):
    def run_harness(self, root: Path, *args: str) -> tuple[int, dict]:
        result = subprocess.run(
            [sys.executable, str(HARNESS), "--root", str(root), *args],
            text=True,
            capture_output=True,
            check=False,
        )
        reports = sorted((root / "logs" / "repo_governance").glob("repo_governance_*.json"))
        self.assertTrue(reports, result.stdout + result.stderr)
        return result.returncode, json.loads(reports[-1].read_text(encoding="utf-8"))

    def make_workspace(self, git_repo: bool = True) -> tempfile.TemporaryDirectory[str]:
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        self.write_minimal_files(root)
        if git_repo:
            subprocess.run(
                ["git", "init", "-b", "main"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            subprocess.run(
                ["git", "config", "user.email", "test@example.com"],
                cwd=root,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.name", "Test User"],
                cwd=root,
                check=True,
            )
            subprocess.run(["git", "add", "."], cwd=root, check=True, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", "baseline"],
                cwd=root,
                check=True,
                capture_output=True,
            )
        return temp

    def write_minimal_files(self, root: Path) -> None:
        (root / "config").mkdir(parents=True)
        (root / ".github" / "workflows").mkdir(parents=True)
        (root / "scripts").mkdir(parents=True)
        (root / "tests").mkdir(parents=True)
        (root / "AGENTS.md").write_text(
            "\n".join(
                [
                    "# AGENTS.md",
                    "GitHub repository workflow",
                    "Repository Definition of Done",
                    "repo governance harness",
                ]
            ),
            encoding="utf-8",
        )
        (root / ".github" / "workflows" / "ci.yml").write_text(
            "\n".join(
                [
                    "on: [push, pull_request]",
                    "permissions: { contents: read }",
                    "jobs:",
                    "  repo-governance: {}",
                    "  python-tests: {}",
                    "  platform-quality: {}",
                    "  platform-build: {}",
                    "  quality-gate: {}",
                ]
            ),
            encoding="utf-8",
        )
        (root / "scripts" / "repo_governance_harness.py").write_text(
            "# placeholder\n",
            encoding="utf-8",
        )
        (root / "tests" / "test_repo_governance_harness.py").write_text(
            "# placeholder\n",
            encoding="utf-8",
        )
        (root / "config" / "repo_governance_rules.yaml").write_text(
            "\n".join(
                [
                    "version: 1",
                    "repository:",
                    f"  expected_root_path: {root.as_posix()}",
                    "required_files:",
                    "  - AGENTS.md",
                    "  - .github/workflows/ci.yml",
                    "  - config/repo_governance_rules.yaml",
                    "  - scripts/repo_governance_harness.py",
                    "recommended_files: []",
                ]
            ),
            encoding="utf-8",
        )

    def finding_codes(self, report: dict) -> set[str]:
        return {finding["code"] for finding in report["findings"]}

    def test_harness_creates_report(self) -> None:
        with self.make_workspace() as temp:
            code, report = self.run_harness(Path(temp), "--mode", "check")
        self.assertEqual(code, 0)
        self.assertIn(report["status"], {"PASS", "WARN"})
        self.assertTrue(report["checked_at"])

    def test_missing_agents_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            (root / "AGENTS.md").unlink()
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("REQUIRED_FILE_MISSING", self.finding_codes(report))

    def test_main_with_changes_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            (root / "README.md").write_text("changed\n", encoding="utf-8")
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("DIRECT_WORK_ON_DEFAULT_BRANCH", self.finding_codes(report))

    def test_missing_ci_workflow_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            (root / ".github" / "workflows" / "ci.yml").unlink()
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("REQUIRED_FILE_MISSING", self.finding_codes(report))

    def test_secret_file_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            (root / ".env").write_text("TOKEN=value\n", encoding="utf-8")
            subprocess.run(["git", "add", ".env"], cwd=root, check=True, capture_output=True)
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("SECRET_FILE_TRACKED_OR_CHANGED", self.finding_codes(report))

    def test_env_local_tracked_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            (root / ".env.local").write_text("DATABASE_URL=value\n", encoding="utf-8")
            subprocess.run(["git", "add", ".env.local"], cwd=root, check=True, capture_output=True)
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("SECRET_FILE_TRACKED_OR_CHANGED", self.finding_codes(report))

    def test_task_slug_does_not_match_openai_key_prefix(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            subprocess.run(
                ["git", "switch", "-c", "codex/task-ui"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            (root / "README.md").write_text("task-bank anchor\n", encoding="utf-8")
            subprocess.run(["git", "add", "README.md"], cwd=root, check=True, capture_output=True)
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 0)
        self.assertNotIn("SECRET_PATTERN_IN_DIFF", self.finding_codes(report))

    def test_openai_key_like_diff_is_failure(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            subprocess.run(
                ["git", "switch", "-c", "codex/secret-check"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            leaked_key = "sk" + "-proj-demo1234567890"
            (root / "README.md").write_text(f"leaked {leaked_key}\n", encoding="utf-8")
            subprocess.run(["git", "add", "README.md"], cwd=root, check=True, capture_output=True)
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 1)
        self.assertIn("SECRET_PATTERN_IN_DIFF", self.finding_codes(report))

    def test_architecture_sensitive_change_without_docs_warns(self) -> None:
        with self.make_workspace() as temp:
            code, report = self.run_harness(
                Path(temp),
                "--mode",
                "check",
                "--changed-files",
                "scripts/sync-from-local-jsonl.ts",
            )
        self.assertEqual(code, 0)
        self.assertIn("ARCHITECTURE_CHANGE_WITHOUT_DOCS", self.finding_codes(report))

    def test_fix_safe_does_not_delete_existing_files(self) -> None:
        with self.make_workspace(git_repo=False) as temp:
            root = Path(temp)
            keep = root / "docs" / "keep.md"
            keep.parent.mkdir(parents=True, exist_ok=True)
            keep.write_text("keep\n", encoding="utf-8")
            code, _ = self.run_harness(root, "--mode", "fix-safe")
            self.assertEqual(code, 0)
            self.assertTrue(keep.exists())
            self.assertTrue((root / "logs" / "repo_governance").exists())

    def test_valid_feature_branch_prefix_is_allowed(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            subprocess.run(
                ["git", "switch", "-c", "codex/demo"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 0)
        self.assertNotIn("BRANCH_PREFIX_UNEXPECTED", self.finding_codes(report))
        self.assertNotIn("ON_DEFAULT_BRANCH", self.finding_codes(report))

    def test_bootstrap_root_without_git_warns(self) -> None:
        with self.make_workspace(git_repo=False) as temp:
            code, report = self.run_harness(Path(temp), "--mode", "check")
        self.assertEqual(code, 0)
        self.assertIn("GIT_REPO_MISSING", self.finding_codes(report))

    def test_nested_git_repository_warns(self) -> None:
        with self.make_workspace() as temp:
            root = Path(temp)
            subprocess.run(
                ["git", "switch", "-c", "codex/nested"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            nested = root / "nested"
            nested.mkdir()
            subprocess.run(["git", "init"], cwd=nested, check=True, capture_output=True)
            code, report = self.run_harness(root, "--mode", "check")
        self.assertEqual(code, 0)
        self.assertIn("NESTED_GIT_REPOSITORY", self.finding_codes(report))


if __name__ == "__main__":
    unittest.main()
