import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const root = process.cwd();

const requiredFiles = [
  "apps/web/package.json",
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/dashboard/student/page.tsx",
  "apps/web/src/app/dashboard/teacher/page.tsx",
  "apps/web/src/app/student/dashboard/page.tsx",
  "apps/web/src/app/student/schedule/page.tsx",
  "apps/web/src/app/student/plan/page.tsx",
  "apps/web/src/app/student/assignments/page.tsx",
  "apps/web/src/app/student/assignments/[assignmentId]/page.tsx",
  "apps/web/src/app/student/tasks/[taskId]/page.tsx",
  "apps/web/src/app/student/progress/page.tsx",
  "apps/web/src/app/teacher/dashboard/page.tsx",
  "apps/web/src/app/teacher/students/page.tsx",
  "apps/web/src/app/teacher/students/[studentId]/plan/page.tsx",
  "apps/web/src/app/teacher/students/[studentId]/schedule/page.tsx",
  "apps/web/src/app/teacher/students/[studentId]/assignments/page.tsx",
  "apps/web/src/app/teacher/students/[studentId]/analytics/page.tsx",
  "apps/web/src/app/teacher/task-bank/page.tsx",
  "apps/web/src/app/teacher/assignments/new/page.tsx",
  "apps/web/src/app/teacher/reviews/page.tsx",
  "apps/web/src/proxy.ts",
  "apps/web/src/lib/platform/auth.ts",
  "apps/web/src/lib/platform/data.ts",
  "apps/worker/src/index.ts",
  "packages/db/src/client.ts",
  "packages/db/src/schema.ts",
  "packages/core/src/permissions.ts",
  "packages/core/src/task-import.ts",
  "packages/validators/src/task.ts",
  "packages/ui/src/index.tsx",
  "scripts/sync-from-local-jsonl.ts",
  "docs/deployment.md",
  ".env.example"
];

function main() {
  const checks: Check[] = [
    ...requiredFiles.map((file) => ({
      name: `required:${file}`,
      ok: existsSync(join(root, file))
    })),
    checkEnvExample(),
    checkLazyDb(),
    checkTestimonialsConsent(),
    checkTaskSyncDefaultsDryRun(),
    checkEnvIgnored(),
    checkProtectedRoutes(),
    checkSafeTaskSerialization(),
    checkDemoSeed()
  ];

  const failed = checks.filter((check) => !check.ok);

  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function checkProtectedRoutes(): Check {
  const proxy = read("apps/web/src/proxy.ts");
  return {
    name: "protected-student-teacher-routes",
    ok: proxy.includes("/student(.*)") && proxy.includes("/teacher(.*)") && proxy.includes("/api/student(.*)") && proxy.includes("/api/teacher(.*)")
  };
}

function checkSafeTaskSerialization(): Check {
  const safeTask = read("packages/core/src/platform/safe-task.ts");
  return {
    name: "safe-task-excludes-answers",
    ok: safeTask.includes("answerJson") && safeTask.includes("solutionMd") && safeTask.includes("sourceUrl")
  };
}

function checkDemoSeed(): Check {
  const seed = read("scripts/seed-demo-data.ts");
  return {
    name: "demo-seed-command",
    ok: seed.includes("demoData") && read("package.json").includes("\"db:seed\"")
  };
}

function read(pathname: string) {
  return readFileSync(join(root, pathname), "utf8");
}

function checkEnvExample(): Check {
  const env = read(".env.example");
  const required = ["OWNER_EMAIL", "DATABASE_URL", "BLOB_READ_WRITE_TOKEN", "NEXT_PUBLIC_TELEGRAM_URL"];
  const missing = required.filter((name) => !env.includes(`${name}=`));
  return { name: "env-example-required-vars", ok: missing.length === 0, detail: missing.join(", ") };
}

function checkLazyDb(): Check {
  const client = read("packages/db/src/client.ts");
  const hasLazyGetter = client.includes("export function getDb()");
  const createsInsideFunction = client.includes("function createDb()");
  return { name: "db-client-lazy-getDb", ok: hasLazyGetter && createsInsideFunction };
}

function checkTestimonialsConsent(): Check {
  const core = read("packages/core/src/testimonials.ts");
  return {
    name: "public-results-consent-gate",
    ok: core.includes("result.published && result.consent_status === \"granted\"")
  };
}

function checkTaskSyncDefaultsDryRun(): Check {
  const sync = read("scripts/sync-from-local-jsonl.ts");
  return {
    name: "task-sync-dry-run-default",
    ok: sync.includes("const dryRun = argv.includes(\"--dry-run\") || !apply")
  };
}

function checkEnvIgnored(): Check {
  const gitignore = read(".gitignore");
  return {
    name: "env-files-ignored",
    ok: gitignore.includes(".env.*") && gitignore.includes("!.env.example")
  };
}

main();
