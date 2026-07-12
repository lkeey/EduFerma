import { readFileSync } from "node:fs";
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

  it("normalizes source-verified nullable fields before import decisions", () => {
    const report = buildTaskImportReport(
      [
        {
          ...baseTask,
          task_number: null,
          answer: null,
          solution_md: null,
          license_status: "needs_review",
          verification_status: "verified_by_source",
          skill_atoms: ["needs_manual_skill_mapping"]
        }
      ],
      { reviewPolicy: "source-verified" }
    );

    expect(report.invalid).toBe(0);
    expect(report.manualReview).toBe(0);
    expect(report.toImport).toBe(1);
  });

  it("keeps strict review policy conservative for source-verified rows", () => {
    const report = buildTaskImportReport([
      {
        ...baseTask,
        task_id: "demo-source-verified",
        license_status: "needs_review",
        verification_status: "verified_by_source",
        skill_atoms: ["needs_manual_skill_mapping"]
      }
    ]);

    expect(report.toImport).toBe(0);
    expect(report.manualReview).toBe(1);
    expect(report.decisions[0]).toMatchObject({
      action: "manual_review",
      reason:
        "license_status=needs_review; verification_status=verified_by_source; skill_atoms includes needs_manual_skill_mapping"
    });
  });

  it("excludes unverified rows in source-verified policy", () => {
    const report = buildTaskImportReport(
      [
        {
          ...baseTask,
          task_id: "demo-source-verified",
          license_status: "needs_review",
          verification_status: "verified_by_source",
          skill_atoms: ["needs_manual_skill_mapping"]
        },
        {
          ...baseTask,
          task_id: "demo-unverified",
          license_status: "needs_review",
          verification_status: "unverified",
          skill_atoms: ["source_mapped"]
        }
      ],
      { reviewPolicy: "source-verified" }
    );

    expect(report.toImport).toBe(1);
    expect(report.manualReview).toBe(1);
    expect(report.decisions[1]).toMatchObject({
      action: "manual_review",
      reason: "verification_status=unverified"
    });
  });

  it("keeps the curated original task bank fully importable", () => {
    const seedPath = new URL("../../packages/db/seed/task-bank-curated-original.jsonl", import.meta.url);
    const rows = readFileSync(seedPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const report = buildTaskImportReport(rows);

    expect(report.scanned).toBe(12);
    expect(report.toImport).toBe(12);
    expect(report.invalid).toBe(0);
    expect(report.duplicates).toBe(0);
    expect(report.manualReview).toBe(0);
    expect(rows.every((row) => row.source_name === "EduFerma original")).toBe(true);
    expect(rows.every((row) => row.license_status === "original")).toBe(true);
    expect(rows.every((row) => row.verification_status === "verified")).toBe(true);
  });
});
