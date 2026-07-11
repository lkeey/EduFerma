import { describe, expect, it } from "vitest";
import { buildTaskImportReport } from "@eduferma/core";
import { estimateImportStorageBytes } from "../../scripts/sync-from-local-jsonl";

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

describe("production import policy", () => {
  it("keeps unknown or unverified tasks out of production imports", () => {
    const report = buildTaskImportReport([
      { ...baseTask, task_id: "verified" },
      { ...baseTask, task_id: "unknown-verification", verification_status: "unknown" },
      { ...baseTask, task_id: "unverified", verification_status: "unverified" },
      { ...baseTask, task_id: "unknown-license", license_status: "unknown" },
      { ...baseTask, task_id: "public-reference", verification_status: "checked", license_status: "public_reference" }
    ]);

    expect(report.toImport).toBe(2);
    expect(report.manualReview).toBe(3);
    const importedIds = report.decisions.flatMap((decision) =>
      decision.action === "import" ? [decision.task.task_id] : []
    );
    expect(importedIds).toEqual(["verified", "public-reference"]);
  });

  it("estimates import storage bytes without reading the database", () => {
    const estimate = estimateImportStorageBytes([{ ...baseTask, answer: "4" }]);

    expect(estimate).toBeGreaterThan(0);
  });
});
