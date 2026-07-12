import { pathToFileURL } from "node:url";
import { estimateJsonStorageBytes, summarizeTaskImportExclusions, type TaskImportReviewPolicy } from "@eduferma/core";
import { loadWorkspaceEnv } from "@eduferma/db";
import type { PlatformTask } from "@eduferma/validators";
import { createDefaultTaskSourceRegistry, runTaskSourcePipeline } from "../packages/core/src/task-sources";

type Args = {
  apply: boolean;
  allowPartial: boolean;
  dryRun: boolean;
  limit?: number;
  maxPayloadBytes?: number;
  reviewPolicy: TaskImportReviewPolicy;
  sourcePath: string;
};

const DEFAULT_SOURCE = "/Users/lkeey/IT/data/processed/tasks.jsonl";
const DEFAULT_MAX_MB = 500;
const DEFAULT_REVIEW_POLICY: TaskImportReviewPolicy = "source-verified";

async function main() {
  loadWorkspaceEnv();
  const args = parseArgs(process.argv.slice(2));
  const result = await runTaskSourcePipeline({
    apply: false,
    limit: args.limit,
    maxPayloadBytes: args.maxPayloadBytes,
    reviewPolicy: args.reviewPolicy,
    registry: createDefaultTaskSourceRegistry({ localJsonlPath: args.sourcePath }),
    sourceIds: ["local-jsonl"]
  });
  const report = result.runs[0].report;
  const printable = {
    sourcePath: args.sourcePath,
    mode: args.dryRun ? "dry-run" : "apply-requested",
    reviewPolicy: result.reviewPolicy,
    scanned: report.scanned,
    toImport: report.toImport,
    toUpdate: report.toUpdate,
    skipped: report.skipped,
    duplicates: report.duplicates,
    manualReview: report.manualReview,
    invalid: report.invalid,
    budgetSkipped: report.budgetSkipped,
    payloadBytes: report.payloadBytes,
    payloadMb: toMb(report.payloadBytes),
    payloadLimitMb: report.payloadLimitBytes === undefined ? undefined : toMb(report.payloadLimitBytes),
    partialApply: args.allowPartial,
    exclusionSummary: summarizeTaskImportExclusions(report),
    sampleDecisions: report.decisions.slice(0, 10).map((decision) =>
      decision.action === "import" || decision.action === "update"
        ? { action: decision.action, task_id: decision.task.task_id }
        : decision
    )
  };

  console.log(JSON.stringify(printable, null, 2));

  if (args.apply) {
    throw new Error(
      "--apply moved to the worker: use `pnpm --filter @eduferma/worker dev -- task-import --apply --source=local-jsonl` with DATABASE_URL"
    );
  }
}

function parseArgs(argv: string[]): Args {
  const normalizedArgv = argv.filter((arg) => arg !== "--");
  const apply = normalizedArgv.includes("--apply");
  const allowPartial = normalizedArgv.includes("--allow-partial");
  const dryRun = normalizedArgv.includes("--dry-run") || !apply;
  const limitFlag = normalizedArgv.find((arg) => arg.startsWith("--limit="));
  const maxMbFlag = normalizedArgv.find((arg) => arg.startsWith("--max-mb="));
  const reviewPolicyFlag = normalizedArgv.find((arg) => arg.startsWith("--review-policy="));
  const pathFlag = normalizedArgv.find((arg) => arg.startsWith("--path="));
  const maxMb = maxMbFlag ? Number(maxMbFlag.split("=")[1]) : DEFAULT_MAX_MB;

  return {
    apply,
    allowPartial,
    dryRun,
    limit: limitFlag ? Number(limitFlag.split("=")[1]) : undefined,
    maxPayloadBytes: megabytesToBytes(maxMb),
    reviewPolicy: parseReviewPolicy(reviewPolicyFlag?.split("=")[1]),
    sourcePath: pathFlag?.split("=")[1] || process.env.EDUFERMA_LOCAL_TASKS_PATH || DEFAULT_SOURCE
  };
}

function parseReviewPolicy(value: string | undefined): TaskImportReviewPolicy {
  if (!value) return DEFAULT_REVIEW_POLICY;
  if (value === "strict" || value === "source-verified") return value;
  throw new Error(`Unknown --review-policy=${value}; expected strict or source-verified`);
}

export function estimateImportStorageBytes(importableTasks: PlatformTask[]) {
  return estimateJsonStorageBytes(importableTasks);
}

function megabytesToBytes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--max-mb must be a positive number");
  }

  return Math.floor(value * 1024 * 1024);
}

function toMb(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
