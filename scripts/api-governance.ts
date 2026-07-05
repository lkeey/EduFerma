import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { openApiDocument, routeDefinitions, type HttpMethod } from "@eduferma/api-contract";

type Finding = {
  severity: "ERROR" | "WARN";
  message: string;
  path?: string;
};

const root = process.cwd();
const forbiddenStudentFields = ["answer_json", "solution_md", "teacher_notes", "local_source_path"];

function main() {
  const command = process.argv[2] || "check";

  if (command === "generate") {
    writeGeneratedOpenApi();
    return;
  }

  const findings =
    command === "check-openapi"
      ? checkOpenApi()
      : [...checkOpenApi(), ...checkRoutes(), ...checkDocsAndTests()];

  writeReport(findings);

  const errors = findings.filter((finding) => finding.severity === "ERROR");
  if (errors.length > 0) {
    console.error(errors.map((finding) => `${finding.severity}: ${finding.path || ""} ${finding.message}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("api-governance: ok");
  }
}

function writeGeneratedOpenApi() {
  const output = join(root, "packages/api-contract/openapi.json");
  writeFileSync(output, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf8");
  console.log(`Generated ${relative(root, output)}`);
}

function checkOpenApi(): Finding[] {
  const findings: Finding[] = [];
  const generatedPath = join(root, "packages/api-contract/openapi.json");
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  const seenOperationIds = new Set<string>();

  for (const route of routeDefinitions) {
    const operation = paths[route.path]?.[route.method] as Record<string, unknown> | undefined;
    if (!operation) {
      findings.push({ severity: "ERROR", path: route.path, message: `${route.method.toUpperCase()} missing from OpenAPI` });
      continue;
    }
    if (!operation.operationId) findings.push({ severity: "ERROR", path: route.path, message: "operationId missing" });
    if (operation.operationId && seenOperationIds.has(String(operation.operationId))) {
      findings.push({ severity: "ERROR", path: route.path, message: `duplicate operationId ${operation.operationId}` });
    }
    if (operation.operationId) seenOperationIds.add(String(operation.operationId));
    if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
      findings.push({ severity: "ERROR", path: route.path, message: "tags missing" });
    }
    if (!operation.summary) findings.push({ severity: "ERROR", path: route.path, message: "summary missing" });
    if (!operation.responses) findings.push({ severity: "ERROR", path: route.path, message: "responses missing" });
    if (!route.public && !operation.security) {
      findings.push({ severity: "ERROR", path: route.path, message: "protected operation missing security" });
    }
    if (route.requestBody && !operation.requestBody) {
      findings.push({ severity: "ERROR", path: route.path, message: "mutating operation missing requestBody" });
    }
  }

  if (existsSync(generatedPath)) {
    const generated = readFileSync(generatedPath, "utf8").trim();
    const current = JSON.stringify(openApiDocument, null, 2);
    if (generated !== current) {
      findings.push({ severity: "ERROR", path: generatedPath, message: "generated openapi.json is stale; run pnpm api:openapi:generate" });
    }
  }

  return findings;
}

function checkRoutes(): Finding[] {
  const findings: Finding[] = [];
  const routes = listRouteFiles(join(root, "apps/web/src/app/api"));

  for (const file of routes) {
    const apiPath = routeFileToPath(file);
    const source = readFileSync(file, "utf8");
    const methods = Array.from(source.matchAll(/export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\b/g)).map(
      (match) => match[1].toLowerCase() as HttpMethod
    );

    if (methods.length === 0) {
      findings.push({ severity: "ERROR", path: relative(root, file), message: "route.ts exports no HTTP methods" });
      continue;
    }

    for (const method of methods) {
      const definition = routeDefinitions.find((route) => route.path === apiPath && route.method === method);
      if (!definition) {
        findings.push({ severity: "ERROR", path: relative(root, file), message: `${method.toUpperCase()} ${apiPath} missing OpenAPI definition` });
        continue;
      }
      if (!definition.public && !source.includes("requireApiRole")) {
        findings.push({ severity: "ERROR", path: relative(root, file), message: "protected route does not call requireApiRole" });
      }
      if (definition.requestBody && !source.includes("parseJson")) {
        findings.push({ severity: "ERROR", path: relative(root, file), message: "mutating route does not validate JSON body" });
      }
      if (apiPath.includes("/student/") && forbiddenStudentFields.some((field) => source.includes(field))) {
        findings.push({ severity: "ERROR", path: relative(root, file), message: "student route references forbidden teacher-only fields" });
      }
    }
  }

  return findings;
}

function checkDocsAndTests(): Finding[] {
  const findings: Finding[] = [];
  if (!existsSync(join(root, "docs/api.md"))) {
    findings.push({ severity: "ERROR", path: "docs/api.md", message: "API docs missing" });
  }
  const tests = listFiles(join(root, "tests/unit")).filter((file) => /api|openapi|serializers|route/.test(file));
  if (tests.length === 0) {
    findings.push({ severity: "ERROR", path: "tests/unit", message: "API/OpenAPI tests missing" });
  }
  const serializer = join(root, "packages/core/src/services/serializers.ts");
  const serializerSource = existsSync(serializer) ? readFileSync(serializer, "utf8") : "";
  for (const field of forbiddenStudentFields) {
    if (!serializerSource.includes(field)) {
      findings.push({ severity: "ERROR", path: relative(root, serializer), message: `student serializer does not guard ${field}` });
    }
  }
  return findings;
}

function routeFileToPath(file: string) {
  const relativePath = relative(join(root, "apps/web/src/app"), dirname(file));
  return `/${relativePath.replaceAll("\\", "/").replace(/\[([^\]]+)\]/g, "{$1}")}`;
}

function listRouteFiles(directory: string): string[] {
  return listFiles(directory).filter((file) => file.endsWith("/route.ts"));
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function writeReport(findings: Finding[]) {
  const dir = join(root, "logs/api_governance");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
  const report = join(dir, `api_governance_${stamp}.md`);
  const status = findings.some((finding) => finding.severity === "ERROR") ? "FAIL" : "PASS";
  const body = [`# API Governance Report`, "", `Status: ${status}`, "", ...findings.map((finding) => `- ${finding.severity}: ${finding.path || ""} ${finding.message}`), ""].join("\n");
  writeFileSync(report, body, "utf8");
}

main();
