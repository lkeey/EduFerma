import { describe, expect, it } from "vitest";
import { buildTaskImportReport } from "../../packages/core/src/task-import";
import { mapPlatformTaskToDbTask } from "../../scripts/sync-from-local-jsonl";

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

  it("maps importable platform tasks to database task rows", () => {
    const row = mapPlatformTaskToDbTask({
      ...baseTask,
      answer: ["4"],
      canonical_hash: "hash-1",
      local_source_path: "/Users/lkeey/IT/data/raw/original/task.md",
      source_url: "https://example.com/task"
    });

    expect(row.taskId).toBe("demo-1");
    expect(row.learningTrack).toBe("ege_informatics");
    expect(row.sourceName).toBe("original");
    expect(row.answerJson).toEqual({ answers: ["4"] });
    expect(row.metadata).toMatchObject({
      source_id: "demo",
      local_source_path: "/Users/lkeey/IT/data/raw/original/task.md"
    });
  });
});
