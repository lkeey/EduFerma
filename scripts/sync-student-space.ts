import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_STUDENTS_PATH = "/Users/lkeey/IT/students";

type Args = {
  apply: boolean;
  studentId?: string;
  sourceRoot: string;
  exportAnalytics: boolean;
};

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.sourceRoot)) {
    throw new Error(`Students root not found: ${args.sourceRoot}`);
  }

  const studentIds = args.studentId
    ? [args.studentId]
    : readdirSync(args.sourceRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

  const report = studentIds.map((studentId) => {
    const root = join(args.sourceRoot, studentId);
    return {
      student_id: studentId,
      profile_exists: existsSync(join(root, "profile.yaml")),
      goals_exists: existsSync(join(root, "goals.yaml")),
      plan_exists: existsSync(join(root, "plan", "current_plan.yaml")),
      assignments_exists: existsSync(join(root, "assignments")),
      lessons_exists: existsSync(join(root, "lessons"))
    };
  });

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        sourceRoot: args.sourceRoot,
        exportAnalytics: args.exportAnalytics,
        students: report
      },
      null,
      2
    )
  );

  if (args.apply) {
    throw new Error("Student sync apply is disabled in MVP. Run dry-run first and review mappings.");
  }
}

function parseArgs(argv: string[]): Args {
  const studentFlag = argv.find((arg) => arg.startsWith("--student-id="));
  const rootFlag = argv.find((arg) => arg.startsWith("--root="));

  return {
    apply: argv.includes("--apply"),
    studentId: studentFlag?.split("=")[1],
    sourceRoot: rootFlag?.split("=")[1] || process.env.EDUFERMA_LOCAL_STUDENTS_PATH || DEFAULT_STUDENTS_PATH,
    exportAnalytics: argv.includes("--export-analytics")
  };
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
