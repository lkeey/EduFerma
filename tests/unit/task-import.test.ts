import { describe, expect, it } from "vitest";
import { buildTaskImportReport } from "../../packages/core/src/task-import";

const baseTask = {
  task_id: "demo-1",
  learning_track: "ege_informatics",
  source_id: "demo",
  source_name: "original",
  statement_md: "Сколько будет 2 + 2?",
  difficulty_level: "basic",
  skill_atoms: ["arithmetic"],
  verification_status: "verified",
  license_status: "original",
  status: "active",
  created_at: "2026-07-05T00:00:00Z",
  updated_at: "2026-07-05T00:00:00Z"
};

describe("buildTaskImportReport", () => {
  it("counts importable, duplicate and manual-review tasks", () => {
    const report = buildTaskImportReport([
      baseTask,
      baseTask,
      { ...baseTask, task_id: "demo-2", license_status: "needs_review" },
      { task_id: "bad" }
    ]);

    expect(report.scanned).toBe(4);
    expect(report.toImport).toBe(1);
    expect(report.duplicates).toBe(1);
    expect(report.manualReview).toBe(1);
    expect(report.invalid).toBe(1);
  });
});
