import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import type { PlatformTask } from "@eduferma/validators";
import {
  assertTaskImportReportCanApply,
  buildTaskImportReport,
  getImportableTasks,
  type TaskImportReport,
  type TaskImportReviewPolicy
} from "../task-import";

export type TaskSourceKind = "local_jsonl" | "external_stub";

export type TaskSourceCollectOptions = {
  limit?: number;
};

export type TaskSourceCollectResult = {
  rows: unknown[];
  warnings: string[];
};

export type TaskSourceAdapter = {
  id: string;
  displayName: string;
  kind: TaskSourceKind;
  collect(options?: TaskSourceCollectOptions): Promise<TaskSourceCollectResult>;
};

export type TaskSourceRegistry = {
  list(): TaskSourceAdapter[];
  get(id: string): TaskSourceAdapter | undefined;
};

export type TaskImportWriter = {
  getExistingTaskIds(taskIds: string[]): Promise<ReadonlySet<string>>;
  upsertTasks(tasks: PlatformTask[]): Promise<{ inserted: number; updated: number }>;
};

export type TaskSourcePipelineOptions = {
  sourceIds: string[];
  apply?: boolean;
  limit?: number;
  maxPayloadBytes?: number;
  reviewPolicy?: TaskImportReviewPolicy;
  registry?: TaskSourceRegistry;
  writer?: TaskImportWriter;
};

export type TaskSourceRunResult = {
  sourceId: string;
  sourceName: string;
  warnings: string[];
  report: TaskImportReport;
  applied: boolean;
  inserted: number;
  updated: number;
};

export type TaskSourcePipelineResult = {
  mode: "dry-run" | "apply";
  reviewPolicy: TaskImportReviewPolicy;
  payloadLimitBytes?: number;
  runs: TaskSourceRunResult[];
  totals: {
    scanned: number;
    toImport: number;
    toUpdate: number;
    skipped: number;
    duplicates: number;
    manualReview: number;
    invalid: number;
    budgetSkipped: number;
    payloadBytes: number;
    inserted: number;
    updated: number;
  };
};

export function createTaskSourceRegistry(sources: TaskSourceAdapter[]): TaskSourceRegistry {
  const byId = new Map(sources.map((source) => [source.id, source]));

  return {
    list: () => [...sources],
    get: (id) => byId.get(id)
  };
}

export function createDefaultTaskSourceRegistry(options: { localJsonlPath?: string } = {}): TaskSourceRegistry {
  return createTaskSourceRegistry([
    createLocalJsonlTaskSource({
      path: options.localJsonlPath || process.env.EDUFERMA_LOCAL_TASKS_PATH || "/Users/lkeey/IT/data/processed/tasks.jsonl"
    }),
    createExternalStubTaskSource("shkolkovo", "Shkolkovo"),
    createExternalStubTaskSource("yandex-textbook", "Yandex Textbook"),
    createExternalStubTaskSource("kpolyakov", "KPolyakov"),
    createExternalStubTaskSource("umschool", "Umskul")
  ]);
}

export function createLocalJsonlTaskSource(options: { path: string }): TaskSourceAdapter {
  return {
    id: "local-jsonl",
    displayName: "Local JSONL task corpus",
    kind: "local_jsonl",
    async collect(collectOptions) {
      if (!existsSync(options.path)) {
        throw new Error(`Task source not found: ${options.path}`);
      }

      return {
        rows: await readJsonl(options.path, collectOptions?.limit),
        warnings: []
      };
    }
  };
}

export function createExternalStubTaskSource(id: string, displayName: string): TaskSourceAdapter {
  return {
    id,
    displayName,
    kind: "external_stub",
    async collect() {
      return {
        rows: [],
        warnings: [
          `${displayName} adapter is disabled in MVP: add a licensed parser/fetcher before enabling network ingestion.`
        ]
      };
    }
  };
}

export async function runTaskSourcePipeline(options: TaskSourcePipelineOptions): Promise<TaskSourcePipelineResult> {
  const apply = Boolean(options.apply);
  const registry = options.registry || createDefaultTaskSourceRegistry();
  const reviewPolicy = options.reviewPolicy || "strict";

  if (apply && !options.writer) {
    throw new Error("--apply requires a task import writer");
  }

  const sourceIds = options.sourceIds.length > 0 ? options.sourceIds : ["local-jsonl"];
  const runs: TaskSourceRunResult[] = [];
  let remainingPayloadBytes = options.maxPayloadBytes;

  for (const sourceId of sourceIds) {
    const source = registry.get(sourceId);
    if (!source) {
      throw new Error(`Unknown task source: ${sourceId}`);
    }

    const collected = await source.collect({ limit: options.limit });
    let report = buildTaskImportReport(collected.rows, {
      maxPayloadBytes: remainingPayloadBytes,
      reviewPolicy
    });
    const importableTasks = getImportableTasks(report);
    let inserted = 0;
    let updated = 0;

    if (options.writer && importableTasks.length > 0) {
      const existingIds = await options.writer.getExistingTaskIds(importableTasks.map((task) => task.task_id));
      report = buildTaskImportReport(collected.rows, {
        existingTaskIds: existingIds,
        maxPayloadBytes: remainingPayloadBytes,
        reviewPolicy
      });
    }

    if (apply) {
      assertTaskImportReportCanApply(report);
      const tasksToWrite = getImportableTasks(report);
      if (tasksToWrite.length > 0) {
        const writeResult = await options.writer!.upsertTasks(tasksToWrite);
        inserted = writeResult.inserted;
        updated = writeResult.updated;
      }
    }

    if (remainingPayloadBytes !== undefined) {
      remainingPayloadBytes = Math.max(0, remainingPayloadBytes - report.payloadBytes);
    }

    runs.push({
      sourceId: source.id,
      sourceName: source.displayName,
      warnings: collected.warnings,
      report,
      applied: apply,
      inserted,
      updated
    });
  }

  return {
    mode: apply ? "apply" : "dry-run",
    reviewPolicy,
    payloadLimitBytes: options.maxPayloadBytes,
    runs,
    totals: summarizeRuns(runs)
  };
}

function summarizeRuns(runs: TaskSourceRunResult[]): TaskSourcePipelineResult["totals"] {
  return runs.reduce(
    (totals, run) => ({
      scanned: totals.scanned + run.report.scanned,
      toImport: totals.toImport + run.report.toImport,
      toUpdate: totals.toUpdate + run.report.toUpdate,
      skipped: totals.skipped + run.report.skipped,
      duplicates: totals.duplicates + run.report.duplicates,
      manualReview: totals.manualReview + run.report.manualReview,
      invalid: totals.invalid + run.report.invalid,
      budgetSkipped: totals.budgetSkipped + run.report.budgetSkipped,
      payloadBytes: totals.payloadBytes + run.report.payloadBytes,
      inserted: totals.inserted + run.inserted,
      updated: totals.updated + run.updated
    }),
    {
      scanned: 0,
      toImport: 0,
      toUpdate: 0,
      skipped: 0,
      duplicates: 0,
      manualReview: 0,
      invalid: 0,
      budgetSkipped: 0,
      payloadBytes: 0,
      inserted: 0,
      updated: 0
    }
  );
}

async function readJsonl(pathname: string, limit?: number): Promise<unknown[]> {
  const rows: unknown[] = [];
  const stream = createReadStream(pathname, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rows.push(JSON.parse(trimmed));
    if (limit && rows.length >= limit) break;
  }

  return rows;
}
