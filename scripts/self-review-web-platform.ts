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
  "apps/web/src/proxy.ts",
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
    checkDashboardServiceLayer(),
    checkStudentSerializer(),
    checkMigrationsAndSeed(),
    checkEnvIgnored()
  ];

  const failed = checks.filter((check) => !check.ok);

  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
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
  return {
    name: "task-sync-dry-run-default",
    ok: sync.includes("const dryRun = argv.includes(\"--dry-run\") || !apply")
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

function checkDashboardServiceLayer(): Check {
  const student = read("apps/web/src/app/dashboard/student/page.tsx");
  const teacher = read("apps/web/src/app/dashboard/teacher/page.tsx");
  const usesServices = student.includes("getServices") && teacher.includes("getServices");
  const noDemoImports = !student.includes("@/lib/demo-data") && !teacher.includes("@/lib/demo-data");
  return { name: "dashboard-service-layer", ok: usesServices && noDemoImports };
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

function checkEnvIgnored(): Check {
  const gitignore = read(".gitignore");
  return {
    name: "env-files-ignored",
    ok: gitignore.includes(".env.*") && gitignore.includes("!.env.example")
  };
}

main();
