import { pathToFileURL } from "node:url";
import { UnknownWorkerJobError, runWorkerJob, workerJobNames } from "./jobs";

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const jobName = args[0];

  if (!jobName || jobName === "help" || jobName === "--help" || jobName === "-h") {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          usage: "pnpm --filter @eduferma/worker dev -- <job>",
          jobs: workerJobNames
        },
        null,
        2
      )}\n`
    );
    return;
  }

  try {
    const result = await runWorkerJob(jobName, { argv: args.slice(1) });
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
            jobs: workerJobNames
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
