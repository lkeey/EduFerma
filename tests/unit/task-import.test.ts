import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTaskImportReport } from "../../packages/core/src/task-import";
import {
  createExternalStubTaskSource,
  createTaskSourceRegistry,
  runTaskSourcePipeline,
  type TaskImportWriter,
  type TaskSourceAdapter
} from "../../packages/core/src/task-sources";
import type { PlatformTask } from "../../packages/validators/src/task";

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

  it("reports manual-review reasons separately", () => {
    const report = buildTaskImportReport([
      {
        ...baseTask,
        task_id: "demo-review",
        license_status: "needs_review",
        verification_status: "unverified",
        skill_atoms: ["needs_manual_skill_mapping"]
      }
    ]);

    expect(report.manualReview).toBe(1);
    expect(report.decisions[0]).toMatchObject({
      action: "manual_review",
      reason: "license_status=needs_review; verification_status=unverified; skill_atoms includes needs_manual_skill_mapping"
    });
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

  it("keeps source-verified corpus rows eligible without user verification", () => {
    const sourceVerifiedTask = {
      ...baseTask,
      task_id: "demo-source-verified",
      license_status: "needs_review",
      verification_status: "verified_by_source",
      skill_atoms: ["source_mapped"]
    };

    const strictReport = buildTaskImportReport([sourceVerifiedTask]);
    const sourceVerifiedReport = buildTaskImportReport([sourceVerifiedTask], {
      reviewPolicy: "source-verified"
    });

    expect(strictReport.toImport).toBe(0);
    expect(strictReport.manualReview).toBe(1);
    expect(sourceVerifiedReport.toImport).toBe(1);
    expect(sourceVerifiedReport.manualReview).toBe(0);
  });

  it("keeps source-verified rows importable when only skill mapping is pending", () => {
    const report = buildTaskImportReport(
      [
        {
          ...baseTask,
          task_id: "demo-needs-mapping",
          license_status: "needs_review",
          verification_status: "verified_by_source",
          skill_atoms: ["needs_manual_skill_mapping"]
        }
      ],
      { reviewPolicy: "source-verified" }
    );

    expect(report.toImport).toBe(1);
    expect(report.manualReview).toBe(0);
    expect(report.decisions[0]).toMatchObject({
      action: "import"
    });
  });

  it("marks existing importable tasks as updates", () => {
    const report = buildTaskImportReport([baseTask], { existingTaskIds: new Set(["demo-1"]) });

    expect(report.toImport).toBe(0);
    expect(report.toUpdate).toBe(1);
    expect(report.decisions[0]).toMatchObject({ action: "update" });
  });

  it("keeps importable tasks inside a payload budget", () => {
    const report = buildTaskImportReport([baseTask, { ...baseTask, task_id: "demo-2" }], {
      maxPayloadBytes: 1
    });

    expect(report.toImport).toBe(0);
    expect(report.budgetSkipped).toBe(2);
    expect(report.payloadBytes).toBe(0);
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

describe("runTaskSourcePipeline", () => {
  it("defaults to dry-run and does not call the writer", async () => {
    const source = createMemorySource("memory", [baseTask]);
    const writer = createMemoryWriter();

    const result = await runTaskSourcePipeline({
      registry: createTaskSourceRegistry([source]),
      sourceIds: ["memory"],
      writer
    });

    expect(result.mode).toBe("dry-run");
    expect(result.totals.toImport).toBe(1);
    expect(writer.written).toHaveLength(0);
  });

  it("requires an explicit writer for apply mode", async () => {
    const source = createMemorySource("memory", [baseTask]);

    await expect(
      runTaskSourcePipeline({
        apply: true,
        registry: createTaskSourceRegistry([source]),
        sourceIds: ["memory"]
      })
    ).rejects.toThrow("--apply requires a task import writer");
  });

  it("applies importable tasks idempotently through the writer", async () => {
    const source = createMemorySource("memory", [baseTask, { ...baseTask, task_id: "demo-2" }]);
    const writer = createMemoryWriter(["demo-1"]);

    const result = await runTaskSourcePipeline({
      apply: true,
      registry: createTaskSourceRegistry([source]),
      sourceIds: ["memory"],
      writer
    });

    expect(result.totals.toImport).toBe(1);
    expect(result.totals.toUpdate).toBe(1);
    expect(result.totals.inserted).toBe(1);
    expect(result.totals.updated).toBe(1);
    expect(writer.written.map((task) => task.task_id)).toEqual(["demo-1", "demo-2"]);
  });

  it("applies eligible tasks without importing invalid or manual-review rows", async () => {
    const source = createMemorySource("memory", [
      baseTask,
      { ...baseTask, task_id: "demo-review", license_status: "needs_review" },
      { task_id: "bad" },
      baseTask
    ]);
    const writer = createMemoryWriter();

    const result = await runTaskSourcePipeline({
      apply: true,
      registry: createTaskSourceRegistry([source]),
      sourceIds: ["memory"],
      writer
    });

    expect(result.totals.toImport).toBe(1);
    expect(result.totals.manualReview).toBe(1);
    expect(result.totals.invalid).toBe(1);
    expect(result.totals.duplicates).toBe(1);
    expect(result.totals.inserted).toBe(1);
    expect(writer.written.map((task) => task.task_id)).toEqual(["demo-1"]);
  });

  it("applies active source-verified rows while excluding unverified rows", async () => {
    const source = createMemorySource("memory", [
      {
        ...baseTask,
        task_id: "demo-source-verified",
        license_status: "needs_review",
        verification_status: "verified_by_source",
        skill_atoms: ["source_mapped"]
      },
      {
        ...baseTask,
        task_id: "demo-unverified",
        license_status: "needs_review",
        verification_status: "unverified",
        skill_atoms: ["source_mapped"]
      },
      {
        ...baseTask,
        task_id: "demo-needs-mapping",
        license_status: "needs_review",
        verification_status: "verified_by_source",
        skill_atoms: ["needs_manual_skill_mapping"]
      }
    ]);
    const writer = createMemoryWriter();

    const result = await runTaskSourcePipeline({
      apply: true,
      reviewPolicy: "source-verified",
      registry: createTaskSourceRegistry([source]),
      sourceIds: ["memory"],
      writer
    });

    expect(result.totals.toImport).toBe(2);
    expect(result.totals.manualReview).toBe(1);
    expect(result.totals.inserted).toBe(2);
    expect(writer.written.map((task) => task.task_id)).toEqual(["demo-source-verified", "demo-needs-mapping"]);
  });

  it("refuses apply when no eligible tasks matched the filters", async () => {
    const source = createMemorySource("memory", [{ ...baseTask, license_status: "needs_review" }]);
    const writer = createMemoryWriter();

    await expect(
      runTaskSourcePipeline({
        apply: true,
        registry: createTaskSourceRegistry([source]),
        sourceIds: ["memory"],
        writer
      })
    ).rejects.toThrow("--apply refused: no eligible tasks matched the import filters");
  });

  it("keeps network source adapters disabled in the MVP", async () => {
    const result = await runTaskSourcePipeline({
      registry: createTaskSourceRegistry([createExternalStubTaskSource("shkolkovo", "Shkolkovo")]),
      sourceIds: ["shkolkovo"]
    });

    expect(result.totals.scanned).toBe(0);
    expect(result.runs[0].warnings[0]).toContain("disabled in MVP");
  });
});

function createMemorySource(id: string, rows: unknown[]): TaskSourceAdapter {
  return {
    id,
    displayName: id,
    kind: "local_jsonl",
    async collect() {
      return { rows, warnings: [] };
    }
  };
}

function createMemoryWriter(existing: string[] = []): TaskImportWriter & { written: PlatformTask[] } {
  const existingIds = new Set(existing);
  const writer = {
    written: [] as PlatformTask[],
    async getExistingTaskIds(taskIds: string[]) {
      return new Set(taskIds.filter((taskId) => existingIds.has(taskId)));
    },
    async upsertTasks(tasks: PlatformTask[]) {
      writer.written.push(...tasks);
      return {
        inserted: tasks.filter((task) => !existingIds.has(task.task_id)).length,
        updated: tasks.filter((task) => existingIds.has(task.task_id)).length
      };
    }
  };
  return writer;
}
