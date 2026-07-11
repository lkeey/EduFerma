import { pathToFileURL } from "node:url";
import { evaluateDbSizeLimit, formatBytes, megabytesToBytes } from "@eduferma/core";
import { getDatabaseSizeSnapshot, loadWorkspaceEnv } from "@eduferma/db";

type Args = {
  maxDbMb: number;
  estimatedImportBytes: number;
};

async function main() {
  loadWorkspaceEnv();
  const args = parseArgs(process.argv.slice(2));
  const snapshot = await getDatabaseSizeSnapshot();

  if (!snapshot.configured) {
    throw new Error("Database env is not configured; set DATABASE_URL or a supported provider alias before checking size");
  }

  const limitBytes = megabytesToBytes(args.maxDbMb);
  const size = evaluateDbSizeLimit({
    currentBytes: snapshot.sizeBytes ?? 0,
    estimatedImportBytes: args.estimatedImportBytes,
    limitBytes
  });

  console.log(JSON.stringify({
    ok: size.withinLimit,
    databaseName: snapshot.databaseName,
    currentBytes: size.currentBytes,
    currentPretty: formatBytes(size.currentBytes),
    estimatedImportBytes: size.estimatedImportBytes,
    estimatedImportPretty: formatBytes(size.estimatedImportBytes),
    projectedBytes: size.projectedBytes,
    projectedPretty: formatBytes(size.projectedBytes),
    limitBytes: size.limitBytes,
    limitPretty: formatBytes(size.limitBytes),
    remainingBytes: size.remainingBytes,
    remainingPretty: formatBytes(size.remainingBytes)
  }, null, 2));

  if (!size.withinLimit) {
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): Args {
  const maxDbFlag = argv.find((arg) => arg.startsWith("--max-db-mb="));
  const estimatedImportFlag = argv.find((arg) => arg.startsWith("--estimated-import-bytes="));

  return {
    maxDbMb: maxDbFlag ? Number(maxDbFlag.split("=")[1]) : Number(process.env.EDUFERMA_DB_SIZE_LIMIT_MB || 500),
    estimatedImportBytes: estimatedImportFlag ? Number(estimatedImportFlag.split("=")[1]) : 0
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
