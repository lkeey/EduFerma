import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildTaskImportReport, type TaskImportDecision } from "@eduferma/core";
import type { PlatformTask } from "@eduferma/validators";
import { assertImportApplyAllowed, getDb, loadWorkspaceEnv, tasks } from "@eduferma/db";
import { readJsonl } from "./read-jsonl";

type Args = {
  apply: boolean;
  allowPartial: boolean;
  dryRun: boolean;
  limit?: number;
  sourcePath: string;
};

type TaskInsert = typeof tasks.$inferInsert;

const DEFAULT_SOURCE = "/Users/lkeey/IT/data/processed/tasks.jsonl";

async function main() {
  loadWorkspaceEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.sourcePath)) {
    throw new Error(`Task source not found: ${args.sourcePath}`);
  }

  const rows = await readJsonl(args.sourcePath, args.limit);
  const report = buildTaskImportReport(rows);
  const printable = {
    sourcePath: args.sourcePath,
    mode: args.apply ? "apply" : "dry-run",
    scanned: report.scanned,
    toImport: report.toImport,
    toUpdate: report.toUpdate,
    skipped: report.skipped,
    duplicates: report.duplicates,
    manualReview: report.manualReview,
    invalid: report.invalid,
    partialApply: args.allowPartial,
    sampleDecisions: report.decisions.slice(0, 10).map((decision) =>
      decision.action === "import"
        ? { action: "import", task_id: decision.task.task_id }
        : decision
    )
  };

  console.log(JSON.stringify(printable, null, 2));

  if (args.apply) {
    if (!args.allowPartial && (report.invalid > 0 || report.manualReview > 0 || report.duplicates > 0)) {
      throw new Error("--apply refused: invalid, duplicate, or manual-review tasks are present");
    }

    assertImportApplyAllowed(process.env);

    const importableTasks = report.decisions.filter(isImportDecision).map((decision) => decision.task);
    const written = await upsertImportableTasks(importableTasks);

    console.log(JSON.stringify({ ok: true, mode: "apply", written, partialApply: args.allowPartial }, null, 2));
  }
}

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const allowPartial = argv.includes("--allow-partial");
  const dryRun = argv.includes("--dry-run") || !apply;
  const limitFlag = argv.find((arg) => arg.startsWith("--limit="));
  const pathFlag = argv.find((arg) => arg.startsWith("--path="));

  return {
    apply,
    allowPartial,
    dryRun,
    limit: limitFlag ? Number(limitFlag.split("=")[1]) : undefined,
    sourcePath: pathFlag?.split("=")[1] || process.env.EDUFERMA_LOCAL_TASKS_PATH || DEFAULT_SOURCE
  };
}

export async function upsertImportableTasks(importableTasks: PlatformTask[]) {
  if (importableTasks.length === 0) return 0;

  const db = getDb();
  let written = 0;
  for (const task of importableTasks) {
    const values = mapPlatformTaskToDbTask(task);
    await db
      .insert(tasks)
      .values(values)
      .onConflictDoUpdate({
        target: tasks.taskId,
        set: {
          canonicalHash: values.canonicalHash,
          learningTrack: values.learningTrack,
          exam: values.exam,
          subject: values.subject,
          taskNumber: values.taskNumber,
          topic: values.topic,
          prototypeId: values.prototypeId,
          skillAtoms: values.skillAtoms,
          difficultyLevel: values.difficultyLevel,
          sourceName: values.sourceName,
          sourceUrl: values.sourceUrl,
          sourceTaskId: values.sourceTaskId,
          statementMd: values.statementMd,
          answerJson: values.answerJson,
          answerHash: values.answerHash,
          solutionMd: values.solutionMd,
          verificationStatus: values.verificationStatus,
          licenseStatus: values.licenseStatus,
          status: values.status,
          metadata: values.metadata,
          updatedAt: new Date()
        }
      });
    written += 1;
  }

  return written;
}

export function mapPlatformTaskToDbTask(task: PlatformTask): TaskInsert {
  return {
    taskId: task.task_id,
    canonicalHash: readOptionalString(task, "canonical_hash"),
    learningTrack: task.learning_track,
    exam: task.exam,
    subject: readOptionalString(task, "subject") ?? "informatics",
    taskNumber: task.task_number === undefined ? undefined : String(task.task_number),
    topic: task.topic,
    prototypeId: task.prototype_id,
    skillAtoms: task.skill_atoms,
    difficultyLevel: task.difficulty_level,
    sourceName: task.source_name,
    sourceUrl: task.source_url || undefined,
    sourceTaskId: task.source_task_id,
    statementMd: task.statement_md,
    answerJson: normalizeAnswer(task.answer),
    answerHash: readOptionalString(task, "answer_hash"),
    solutionMd: task.solution_md,
    verificationStatus: task.verification_status,
    licenseStatus: task.license_status,
    status: task.status,
    metadata: buildTaskMetadata(task)
  };
}

function normalizeAnswer(answer: PlatformTask["answer"]): Record<string, unknown> | undefined {
  if (answer === undefined) return undefined;
  const answers = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  return { answers };
}

function buildTaskMetadata(task: PlatformTask): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    source_id: task.source_id,
    attachments: task.attachments
  };
  copyOptionalMetadata(task, metadata, "local_source_path");
  copyOptionalMetadata(task, metadata, "difficulty_reason");
  copyOptionalMetadata(task, metadata, "verification_notes");
  copyOptionalMetadata(task, metadata, "tags");
  return metadata;
}

function isImportDecision(decision: TaskImportDecision): decision is Extract<TaskImportDecision, { action: "import" }> {
  return decision.action === "import";
}

function copyOptionalMetadata(task: PlatformTask, metadata: Record<string, unknown>, key: string) {
  const value = readTaskExtra(task, key);
  if (value !== undefined && value !== null && value !== "") {
    metadata[key] = value;
  }
}

function readOptionalString(task: PlatformTask, key: string) {
  const value = readTaskExtra(task, key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readTaskExtra(task: PlatformTask, key: string) {
  return (task as Record<string, unknown>)[key];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
