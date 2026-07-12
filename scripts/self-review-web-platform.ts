import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

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
  "packages/db/src/seed.ts",
  "packages/db/drizzle/0000_fearless_elektra.sql",
  "packages/api-contract/src/openapi.ts",
  "packages/api-contract/src/registry.ts",
  "packages/api-client/src/client.ts",
  "packages/core/src/permissions.ts",
  "packages/core/src/services/serializers.ts",
  "packages/core/src/task-import.ts",
  "packages/validators/src/task.ts",
  "packages/validators/src/api.ts",
  "packages/ui/src/index.tsx",
  "apps/web/src/app/api/openapi.json/route.ts",
  "apps/web/src/app/api/docs/page.tsx",
  "apps/web/src/app/api/v1/me/route.ts",
  "scripts/api-governance.ts",
  "scripts/sync-from-local-jsonl.ts",
  "docs/deployment.md",
  "docs/api.md",
  "docs/database-architecture.md",
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
    checkOpenApiRoutes(),
    checkDashboardRouting(),
    checkVersionedAttemptApiUsage(),
    checkStudentSerializer(),
    checkMigrationsAndSeed(),
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
  const serverAuth = read("apps/web/src/server/auth/session.ts");
  const teacherDashboard = read("apps/web/src/app/teacher/dashboard/page.tsx");
  const teacherAssignments = read("apps/web/src/app/teacher/assignments/page.tsx");
  const studentDashboard = read("apps/web/src/app/student/dashboard/page.tsx");
  const studentAssignments = read("apps/web/src/app/student/assignments/page.tsx");
  const teacherApi = read("apps/web/src/app/api/v1/teacher/dashboard/route.ts");
  const studentApi = read("apps/web/src/app/api/v1/student/dashboard/route.ts");

  const proxyCoversAppAndApi =
    proxy.includes("clerkMiddleware") &&
    proxy.includes("/((?!_next") &&
    (proxy.includes("/(api|trpc)(.*)") || proxy.includes("/api/v1(.*)"));
  const pagesUseServerGuards =
    teacherDashboard.includes("requireTeacherAccess") &&
    teacherAssignments.includes("requireTeacherAccess") &&
    studentDashboard.includes("requireStudentAccess") &&
    studentAssignments.includes("requireStudentAccess");
  const apisUseRoleGuards =
    serverAuth.includes("requireApiRole") &&
    teacherApi.includes("requireApiRole(roles.teacher") &&
    studentApi.includes("requireApiRole(roles.student");

  return {
    name: "protected-student-teacher-routes",
    ok: proxyCoversAppAndApi && pagesUseServerGuards && apisUseRoleGuards
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
    ok:
      seed.includes("demoData") &&
      seed.includes("buildDemoSeed") &&
      read("package.json").includes("\"db:seed\": \"pnpm --filter @eduferma/db db:seed\"") &&
      read("package.json").includes("\"seed:demo\"")
  };
}

function read(pathname: string) {
  return readFileSync(join(root, pathname), "utf8");
}

function checkEnvExample(): Check {
  const env = read(".env.example");
  const required = [
    "OWNER_EMAIL",
    "DATABASE_URL",
    "DIRECT_DATABASE_URL",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "ENABLE_DEMO_AUTH",
    "OPENAPI_DOCS_ENABLED",
    "BLOB_READ_WRITE_TOKEN",
    "NEXT_PUBLIC_TELEGRAM_URL"
  ];
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
  const sourceFile = ts.createSourceFile(
    "sync-from-local-jsonl.ts",
    sync,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const dryRunInitializer = findVariableInitializer(sourceFile, "dryRun");
  const ok = dryRunInitializer ? isDryRunDefaultExpression(dryRunInitializer) : false;

  return {
    name: "task-sync-dry-run-default",
    ok,
    detail: ok ? undefined : "Expected dryRun to default to true unless --apply is provided."
  };
}

function checkOpenApiRoutes(): Check {
  const contract = read("packages/api-contract/src/registry.ts");
  const openapiRoute = read("apps/web/src/app/api/openapi.json/route.ts");
  const docsPage = read("apps/web/src/app/api/docs/page.tsx");
  return {
    name: "openapi-and-swagger-routes",
    ok:
      contract.includes("/api/v1/me") &&
      openapiRoute.includes("openApiDocument") &&
      docsPage.includes("/api/openapi.json")
  };
}

function checkDashboardRouting(): Check {
  const oldStudent = read("apps/web/src/app/dashboard/student/page.tsx");
  const oldTeacher = read("apps/web/src/app/dashboard/teacher/page.tsx");
  const newStudent = read("apps/web/src/app/student/dashboard/page.tsx");
  const newTeacher = read("apps/web/src/app/teacher/dashboard/page.tsx");
  const oldRoutesAreGuardedRedirects =
    oldStudent.includes("requireStudentAccess") &&
    oldStudent.includes("redirect(\"/student/dashboard\")") &&
    oldTeacher.includes("requireTeacherAccess") &&
    oldTeacher.includes("redirect(\"/teacher/dashboard\")");
  const newRoutesAreGuarded =
    newStudent.includes("requireStudentAccess") &&
    newTeacher.includes("requireTeacherAccess") &&
    !newStudent.includes("@/lib/demo-data") &&
    !newTeacher.includes("@/lib/demo-data");
  return { name: "dashboard-routing-and-role-gates", ok: oldRoutesAreGuardedRedirects && newRoutesAreGuarded };
}

function checkVersionedAttemptApiUsage(): Check {
  const answerForm = read("apps/web/src/components/platform/answer-form.tsx");
  return {
    name: "student-attempts-use-versioned-api",
    ok: answerForm.includes("/api/v1/student/tasks/")
  };
}

function checkStudentSerializer(): Check {
  const serializer = read("packages/core/src/services/serializers.ts");
  return {
    name: "student-serializer-removes-teacher-fields",
    ok:
      serializer.includes("answer_json") &&
      serializer.includes("solution_md") &&
      serializer.includes("teacher_notes") &&
      serializer.includes("local_source_path")
  };
}

function checkMigrationsAndSeed(): Check {
  return {
    name: "db-migration-and-seed-exist",
    ok:
      existsSync(join(root, "packages/db/drizzle/0000_fearless_elektra.sql")) &&
      existsSync(join(root, "packages/db/src/seed.ts"))
  };
}

function findVariableInitializer(sourceFile: ts.SourceFile, name: string): ts.Expression | undefined {
  let initializer: ts.Expression | undefined;

  function visit(node: ts.Node) {
    if (initializer) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return initializer;
}

function isDryRunDefaultExpression(expression: ts.Expression): boolean {
  const unwrapped = unwrapParentheses(expression);
  if (!ts.isBinaryExpression(unwrapped) || unwrapped.operatorToken.kind !== ts.SyntaxKind.BarBarToken) {
    return false;
  }

  return (
    (isDryRunFlagCheck(unwrapped.left) && isNotApplyCheck(unwrapped.right)) ||
    (isDryRunFlagCheck(unwrapped.right) && isNotApplyCheck(unwrapped.left))
  );
}

function isDryRunFlagCheck(expression: ts.Expression): boolean {
  const unwrapped = unwrapParentheses(expression);
  if (!ts.isCallExpression(unwrapped) || unwrapped.arguments.length !== 1) return false;

  const [argument] = unwrapped.arguments;
  if (!ts.isStringLiteral(argument) || argument.text !== "--dry-run") return false;

  const callee = unwrapped.expression;
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "includes") return false;

  const target = unwrapParentheses(callee.expression);
  return ts.isIdentifier(target) && (target.text === "argv" || target.text === "normalizedArgv");
}

function isNotApplyCheck(expression: ts.Expression): boolean {
  const unwrapped = unwrapParentheses(expression);
  if (!ts.isPrefixUnaryExpression(unwrapped) || unwrapped.operator !== ts.SyntaxKind.ExclamationToken) {
    return false;
  }

  const operand = unwrapParentheses(unwrapped.operand);
  return ts.isIdentifier(operand) && operand.text === "apply";
}

function unwrapParentheses<T extends ts.Expression>(expression: T): ts.Expression {
  let current: ts.Expression = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function checkEnvIgnored(): Check {
  const gitignore = read(".gitignore");
  return {
    name: "env-files-ignored",
    ok: gitignore.includes(".env.*") && gitignore.includes("!.env.example")
  };
}

main();
