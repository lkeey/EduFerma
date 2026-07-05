import { existsSync } from "node:fs";
import { buildTaskImportReport } from "@eduferma/core";
import { readJsonl } from "./read-jsonl";

type Args = {
  apply: boolean;
  dryRun: boolean;
  limit?: number;
  sourcePath: string;
};

const DEFAULT_SOURCE = "/Users/lkeey/IT/data/processed/tasks.jsonl";

async function main() {
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
    sampleDecisions: report.decisions.slice(0, 10).map((decision) =>
      decision.action === "import"
        ? { action: "import", task_id: decision.task.task_id }
        : decision
    )
  };

  console.log(JSON.stringify(printable, null, 2));

  if (args.apply) {
    if (report.invalid > 0 || report.manualReview > 0 || report.duplicates > 0) {
      throw new Error("--apply refused: invalid, duplicate, or manual-review tasks are present");
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("--apply requires DATABASE_URL");
    }

    console.log("Apply path passed safety checks. DB write implementation is intentionally deferred after preview infra setup.");
  }
}

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const dryRun = argv.includes("--dry-run") || !apply;
  const limitFlag = argv.find((arg) => arg.startsWith("--limit="));
  const pathFlag = argv.find((arg) => arg.startsWith("--path="));

  return {
    apply,
    dryRun,
    limit: limitFlag ? Number(limitFlag.split("=")[1]) : undefined,
    sourcePath: pathFlag?.split("=")[1] || process.env.EDUFERMA_LOCAL_TASKS_PATH || DEFAULT_SOURCE
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
