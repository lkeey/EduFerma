import { pathToFileURL } from "node:url";
import { summarizeTaskImportExclusions, type TaskImportReviewPolicy } from "@eduferma/core";
import { createDefaultTaskSourceRegistry, runTaskSourcePipeline } from "@eduferma/core/task-sources";
import { createRemoteDbTaskImportWriter } from "./db-writer";
import { UnknownWorkerJobError, runWorkerJob, workerJobNames } from "./jobs";

type TaskImportArgs = {
  apply: boolean;
  limit?: number;
  localJsonlPath?: string;
  maxPayloadBytes?: number;
  reviewPolicy: TaskImportReviewPolicy;
  batchSize?: number;
  sourceIds: string[];
};

const TASK_IMPORT_JOB = "task-import";
const DEFAULT_MAX_MB = 500;
const DEFAULT_REVIEW_POLICY: TaskImportReviewPolicy = "source-verified";

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const jobName = args[0];
  const availableJobs = [...workerJobNames, TASK_IMPORT_JOB];

  if (!jobName || jobName === "help" || jobName === "--help" || jobName === "-h") {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          usage: "pnpm --filter @eduferma/worker dev -- <job>",
          jobs: availableJobs
        },
        null,
        2
      )}\n`
    );
    return;
  }

  try {
    const result = isTaskImportInvocation(jobName)
      ? await runTaskImportJob(jobName === TASK_IMPORT_JOB ? args.slice(1) : args)
      : await runWorkerJob(jobName, { argv: args.slice(1) });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.exitCode = 1;

    if (error instanceof UnknownWorkerJobError) {
      process.stderr.write(
        `${JSON.stringify(
          {
            ok: false,
            error: error.name,
            message: error.message,
            jobs: availableJobs
          },
          null,
          2
        )}\n`
      );
      return;
    }

    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : "Worker job failed."
        },
        null,
        2
      )}\n`
    );
  }
}

async function runTaskImportJob(argv: string[]) {
  const args = parseTaskImportArgs(argv);
  const writer = args.apply ? createRemoteDbTaskImportWriter({ batchSize: args.batchSize }) : undefined;
  const result = await runTaskSourcePipeline({
    apply: args.apply,
    limit: args.limit,
    maxPayloadBytes: args.maxPayloadBytes,
    reviewPolicy: args.reviewPolicy,
    registry: createDefaultTaskSourceRegistry({ localJsonlPath: args.localJsonlPath }),
    sourceIds: args.sourceIds,
    writer
  });

  return {
    ok: true,
    job: TASK_IMPORT_JOB,
    ...toPrintableTaskImportResult(result)
  };
}

function parseTaskImportArgs(argv: string[]): TaskImportArgs {
  const normalizedArgv = argv.filter((arg) => arg !== "--");
  const apply = normalizedArgv.includes("--apply");
  const limitFlag = normalizedArgv.find((arg) => arg.startsWith("--limit="));
  const maxMbFlag = normalizedArgv.find((arg) => arg.startsWith("--max-mb="));
  const reviewPolicyFlag = normalizedArgv.find((arg) => arg.startsWith("--review-policy="));
  const batchSizeFlag = normalizedArgv.find((arg) => arg.startsWith("--batch-size="));
  const pathFlag = normalizedArgv.find((arg) => arg.startsWith("--path="));
  const sourceFlags = normalizedArgv
    .filter((arg) => arg.startsWith("--source="))
    .flatMap((arg) => arg.slice("--source=".length).split(","))
    .map((source) => source.trim())
    .filter(Boolean);
  const maxMb = maxMbFlag ? Number(maxMbFlag.split("=")[1]) : DEFAULT_MAX_MB;

  return {
    apply,
    limit: limitFlag ? Number(limitFlag.split("=")[1]) : undefined,
    localJsonlPath: pathFlag?.split("=")[1],
    maxPayloadBytes: megabytesToBytes(maxMb),
    reviewPolicy: parseReviewPolicy(reviewPolicyFlag?.split("=")[1]),
    batchSize: batchSizeFlag ? Number(batchSizeFlag.split("=")[1]) : undefined,
    sourceIds: sourceFlags.length > 0 ? sourceFlags : ["local-jsonl"]
  };
}

function toPrintableTaskImportResult(result: Awaited<ReturnType<typeof runTaskSourcePipeline>>) {
  return {
    mode: result.mode,
    reviewPolicy: result.reviewPolicy,
    payloadLimitMb: result.payloadLimitBytes === undefined ? undefined : toMb(result.payloadLimitBytes),
    totals: {
      ...result.totals,
      payloadMb: toMb(result.totals.payloadBytes)
    },
    runs: result.runs.map((run) => ({
      sourceId: run.sourceId,
      sourceName: run.sourceName,
      warnings: run.warnings,
      scanned: run.report.scanned,
      toImport: run.report.toImport,
      toUpdate: run.report.toUpdate,
      skipped: run.report.skipped,
      duplicates: run.report.duplicates,
      manualReview: run.report.manualReview,
      invalid: run.report.invalid,
      budgetSkipped: run.report.budgetSkipped,
      payloadBytes: run.report.payloadBytes,
      payloadMb: toMb(run.report.payloadBytes),
      inserted: run.inserted,
      updated: run.updated,
      exclusionSummary: summarizeTaskImportExclusions(run.report),
      sampleDecisions: run.report.decisions.slice(0, 10).map((decision) =>
        decision.action === "import" || decision.action === "update"
          ? { action: decision.action, task_id: decision.task.task_id }
          : decision
      )
    }))
  };
}

function isTaskImportInvocation(jobName: string): boolean {
  return TASK_IMPORT_JOB === jobName || jobName.startsWith("--");
}

function parseReviewPolicy(value: string | undefined): TaskImportReviewPolicy {
  if (!value) return DEFAULT_REVIEW_POLICY;
  if (value === "strict" || value === "source-verified") return value;
  throw new Error(`Unknown --review-policy=${value}; expected strict or source-verified`);
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
  void main();
}
