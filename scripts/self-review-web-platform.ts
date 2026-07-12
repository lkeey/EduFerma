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
  "apps/web/src/proxy.ts",
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
