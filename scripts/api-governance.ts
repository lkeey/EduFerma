import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { openApiDocument } from "../apps/web/src/lib/platform/openapi";

const repoRoot = process.cwd();
const apiRoot = join(repoRoot, "apps/web/src/app/api");
const docsRoute = join(apiRoot, "docs/route.ts");
const openApiRoute = join(apiRoot, "openapi.json/route.ts");
const v1Root = join(apiRoot, "v1");

const failures: string[] = [];

if (!existsSync(docsRoute)) {
  failures.push("Missing Swagger docs route: apps/web/src/app/api/docs/route.ts");
}

if (!existsSync(openApiRoute)) {
  failures.push("Missing OpenAPI JSON route: apps/web/src/app/api/openapi.json/route.ts");
}

if (openApiDocument.openapi !== "3.1.0") {
  failures.push("OpenAPI document must use openapi: 3.1.0");
}

for (const routeFile of collectRouteFiles(v1Root)) {
  const apiPath = toApiPath(routeFile);
  if (!(apiPath in openApiDocument.paths)) {
    failures.push(`Missing OpenAPI path for ${apiPath}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("API governance passed");
}

function collectRouteFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(path));
    } else if (entry.isFile() && entry.name === "route.ts") {
      files.push(path);
    }
  }

  return files;
}

function toApiPath(routeFile: string) {
  const routeDir = relative(apiRoot, routeFile.replace(`${sep}route.ts`, ""));
  return `/api/${routeDir.split(sep).join("/")}`;
}
