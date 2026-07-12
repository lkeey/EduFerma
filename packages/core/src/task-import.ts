import {
  type PlatformTask,
  getManualTaskReviewReasons,
  looksLikeBinaryText,
  validatePlatformTask
} from "@eduferma/validators";

export type TaskImportDecision =
  | { action: "import"; task: PlatformTask }
  | { action: "update"; task: PlatformTask }
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
  budgetSkipped: number;
  payloadBytes: number;
  payloadLimitBytes?: number;
  decisions: TaskImportDecision[];
};

export type TaskImportReportOptions = {
  existingTaskIds?: ReadonlySet<string>;
  maxPayloadBytes?: number;
  reviewPolicy?: TaskImportReviewPolicy;
};

export type TaskImportReviewPolicy = "strict" | "source-verified";

export function createEmptyTaskImportReport(): TaskImportReport {
  return {
    scanned: 0,
    toImport: 0,
    toUpdate: 0,
    skipped: 0,
    duplicates: 0,
    manualReview: 0,
    invalid: 0,
    budgetSkipped: 0,
    payloadBytes: 0,
    decisions: []
  };
}

export function buildTaskImportReport(rows: unknown[], options: TaskImportReportOptions = {}): TaskImportReport {
  const report = createEmptyTaskImportReport();
  report.payloadLimitBytes = options.maxPayloadBytes;
  const seen = new Set<string>();
  const reviewPolicy = options.reviewPolicy || "strict";

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

    const task = normalizeTaskForStorage(validation.task);
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

    const manualReviewReasons = getTaskImportReviewReasons(task, reviewPolicy);
    if (manualReviewReasons.length > 0) {
      report.manualReview += 1;
      report.decisions.push({ action: "manual_review", task_id: task.task_id, reason: manualReviewReasons.join("; ") });
      continue;
    }

    if (isTaskImportableUnderPolicy(task, reviewPolicy)) {
      const estimatedBytes = estimateTaskPayloadBytes(task);
      if (
        options.maxPayloadBytes !== undefined &&
        report.payloadBytes + estimatedBytes > options.maxPayloadBytes
      ) {
        report.skipped += 1;
        report.budgetSkipped += 1;
        report.decisions.push({
          action: "skip",
          task_id: task.task_id,
          reason: `payload budget exceeded (${formatBytes(options.maxPayloadBytes)})`
        });
        continue;
      }

      report.payloadBytes += estimatedBytes;
      if (options.existingTaskIds?.has(task.task_id)) {
        report.toUpdate += 1;
        report.decisions.push({ action: "update", task });
      } else {
        report.toImport += 1;
        report.decisions.push({ action: "import", task });
      }
      continue;
    }

    report.skipped += 1;
    report.decisions.push({ action: "skip", task_id: task.task_id, reason: `status=${task.status}` });
  }

  return report;
}

export function getImportableTasks(report: TaskImportReport): PlatformTask[] {
  return report.decisions.flatMap((decision) =>
    decision.action === "import" || decision.action === "update" ? [decision.task] : []
  );
}

export function getTaskImportReviewReasons(
  task: PlatformTask,
  reviewPolicy: TaskImportReviewPolicy = "strict"
): string[] {
  if (reviewPolicy === "strict") {
    return getManualTaskReviewReasons(task);
  }

  const reasons: string[] = [];

  if (task.status === "needs_review") {
    reasons.push("status=needs_review");
  }

  if (task.license_status === "restricted" || task.license_status === "unknown") {
    reasons.push(`license_status=${task.license_status}`);
  }

  if (
    task.verification_status !== "verified" &&
    task.verification_status !== "checked" &&
    task.verification_status !== "verified_by_source"
  ) {
    reasons.push(`verification_status=${task.verification_status}`);
  }

  if (looksLikeBinaryText(task.statement_md)) {
    reasons.push("statement_md looks like binary text");
  }

  return reasons;
}

export function isTaskImportableUnderPolicy(
  task: PlatformTask,
  reviewPolicy: TaskImportReviewPolicy = "strict"
): boolean {
  return task.status === "active" && getTaskImportReviewReasons(task, reviewPolicy).length === 0;
}

export function assertTaskImportReportCanApply(report: TaskImportReport): void {
  if (report.toImport + report.toUpdate === 0) {
    throw new Error("--apply refused: no eligible tasks matched the import filters");
  }
}

export function summarizeTaskImportExclusions(report: TaskImportReport): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const decision of report.decisions) {
    if (decision.action === "import" || decision.action === "update") continue;
    summary[decision.reason] = (summary[decision.reason] || 0) + 1;
  }

  return Object.fromEntries(Object.entries(summary).sort((a, b) => b[1] - a[1]));
}

export function normalizeTaskForStorage(task: PlatformTask): PlatformTask {
  return {
    ...task,
    statement_md: normalizeMarkdownForStorage(task.statement_md),
    solution_md: task.solution_md ? normalizeMarkdownForStorage(task.solution_md) : undefined,
    skill_atoms: task.skill_atoms.map((skill) => skill.trim()).filter(Boolean),
    attachments: task.attachments ?? []
  };
}

export function normalizeMarkdownForStorage(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function estimateTaskPayloadBytes(task: PlatformTask): number {
  const payload = {
    task_id: task.task_id,
    learning_track: task.learning_track,
    exam: task.exam,
    task_number: task.task_number,
    topic: task.topic,
    prototype_id: task.prototype_id,
    skill_atoms: task.skill_atoms,
    difficulty_level: task.difficulty_level,
    source_name: task.source_name,
    source_url: task.source_url,
    source_task_id: task.source_task_id,
    statement_md: task.statement_md,
    answer: task.answer,
    solution_md: task.solution_md,
    verification_status: task.verification_status,
    license_status: task.license_status,
    status: task.status,
    metadata: {
      source_id: task.source_id,
      local_source_path: task.local_source_path,
      attachments: task.attachments,
      solution_language: task.solution_language,
      schema_version: task.schema_version
    }
  };

  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function readTaskId(row: unknown): string | undefined {
  if (row && typeof row === "object" && "task_id" in row && typeof row.task_id === "string") {
    return row.task_id;
  }

  return undefined;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
