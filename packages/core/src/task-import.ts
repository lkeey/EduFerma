import {
  type PlatformTask,
  isImportableTask,
  needsManualTaskReview,
  validatePlatformTask
} from "@eduferma/validators";

export type TaskImportDecision =
  | { action: "import"; task: PlatformTask }
  | { action: "skip"; task_id?: string; reason: string }
  | { action: "manual_review"; task_id?: string; reason: string }
  | { action: "invalid"; task_id?: string; reason: string };

export type TaskImportReport = {
  scanned: number;
  toImport: number;
  toUpdate: number;
  skipped: number;
  duplicates: number;
  manualReview: number;
  invalid: number;
  decisions: TaskImportDecision[];
};

export function createEmptyTaskImportReport(): TaskImportReport {
  return {
    scanned: 0,
    toImport: 0,
    toUpdate: 0,
    skipped: 0,
    duplicates: 0,
    manualReview: 0,
    invalid: 0,
    decisions: []
  };
}

export function buildTaskImportReport(rows: unknown[]): TaskImportReport {
  const report = createEmptyTaskImportReport();
  const seen = new Set<string>();

  for (const row of rows) {
    report.scanned += 1;
    const validation = validatePlatformTask(row);

    if (!validation.ok) {
      report.invalid += 1;
      report.decisions.push({
        action: "invalid",
        task_id: readTaskId(row),
        reason: validation.issues.slice(0, 3).join("; ")
      });
      continue;
    }

    const task = validation.task;
    if (seen.has(task.task_id)) {
      report.duplicates += 1;
      report.decisions.push({ action: "skip", task_id: task.task_id, reason: "duplicate task_id in source" });
      continue;
    }
    seen.add(task.task_id);

    if (task.status === "archived") {
      report.skipped += 1;
      report.decisions.push({ action: "skip", task_id: task.task_id, reason: "archived" });
      continue;
    }

    if (needsManualTaskReview(task)) {
      report.manualReview += 1;
      report.decisions.push({ action: "manual_review", task_id: task.task_id, reason: "license, verification, skill mapping, or text quality needs review" });
      continue;
    }

    if (isImportableTask(task)) {
      report.toImport += 1;
      report.decisions.push({ action: "import", task });
      continue;
    }

    report.skipped += 1;
    report.decisions.push({ action: "skip", task_id: task.task_id, reason: `status=${task.status}` });
  }

  return report;
}

function readTaskId(row: unknown): string | undefined {
  if (row && typeof row === "object" && "task_id" in row && typeof row.task_id === "string") {
    return row.task_id;
  }

  return undefined;
}
