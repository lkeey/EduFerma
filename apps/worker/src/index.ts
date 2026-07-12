import { summarizeTaskImportExclusions, type TaskImportReviewPolicy } from "@eduferma/core";
import { createDefaultTaskSourceRegistry, runTaskSourcePipeline } from "@eduferma/core/task-sources";
import { createRemoteDbTaskImportWriter } from "./db-writer";

type Args = {
  apply: boolean;
  limit?: number;
  localJsonlPath?: string;
  maxPayloadBytes?: number;
  reviewPolicy: TaskImportReviewPolicy;
  batchSize?: number;
  sourceIds: string[];
};

const DEFAULT_MAX_MB = 500;
const DEFAULT_REVIEW_POLICY: TaskImportReviewPolicy = "source-verified";

async function main() {
  const args = parseArgs(process.argv.slice(2));
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

  console.log(JSON.stringify(toPrintableResult(result), null, 2));
}

function parseArgs(argv: string[]): Args {
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
  const reviewPolicy = parseReviewPolicy(reviewPolicyFlag?.split("=")[1]);

  return {
    apply,
    limit: limitFlag ? Number(limitFlag.split("=")[1]) : undefined,
    localJsonlPath: pathFlag?.split("=")[1],
    maxPayloadBytes: megabytesToBytes(maxMb),
    reviewPolicy,
    batchSize: batchSizeFlag ? Number(batchSizeFlag.split("=")[1]) : undefined,
    sourceIds: sourceFlags.length > 0 ? sourceFlags : ["local-jsonl"]
  };
}

function toPrintableResult(result: Awaited<ReturnType<typeof runTaskSourcePipeline>>) {
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

function parseReviewPolicy(value: string | undefined): TaskImportReviewPolicy {
  if (!value) return DEFAULT_REVIEW_POLICY;
  if (value === "strict" || value === "source-verified") return value;
  throw new Error(`Unknown --review-policy=${value}; expected strict or source-verified`);
}

function megabytesToBytes(value: number): number {
  return Math.floor(value * 1024 * 1024);
}

function toMb(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
