import { readFileSync } from "node:fs";
import { analyzeLessonFeedback, type LessonFeedbackInput } from "@eduferma/core";

type Args = {
  apply: boolean;
  input?: string;
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = readInput(args.input);
  const result = analyzeLessonFeedback(input);

  console.log(JSON.stringify(result, null, 2));

  if (args.apply) {
    throw new Error("Apply mode is disabled in the lesson feedback MVP. Review the dry-run proposed_adjustments first.");
  }
}

function parseArgs(argv: string[]): Args {
  const inputFlag = argv.find((arg) => arg.startsWith("--input="));

  return {
    apply: argv.includes("--apply"),
    input: inputFlag?.split("=")[1]
  };
}

function readInput(pathname?: string): LessonFeedbackInput {
  if (!pathname) {
    throw new Error("Usage: pnpm tsx scripts/lesson-feedback.ts --input=lesson-feedback.json");
  }

  const parsed = JSON.parse(readFileSync(pathname, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Input must be a JSON object");
  }

  return parsed as LessonFeedbackInput;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
