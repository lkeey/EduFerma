import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourceDirs = ["apps", "packages", "scripts", "tests"];
const errors: string[] = [];

for (const file of listFiles(sourceDirs)) {
  const content = readFileSync(file, "utf8");
  const relative = file.replace(`${root}/`, "");

  if (/sk-[A-Za-z0-9_-]{48,}/.test(content)) {
    errors.push(`${relative}: possible API key literal`);
  }

  if (relative.endsWith("client.ts") && content.includes("new Proxy")) {
    errors.push(`${relative}: DB clients must use getDb(), not Proxy wrappers`);
  }

  if (relative !== "scripts/lint-project.ts" && content.includes("TODO: secret")) {
    errors.push(`${relative}: unresolved secret TODO`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("lint-project: ok");
}

function listFiles(paths: string[]) {
  const files: string[] = [];

  for (const pathname of paths) {
    const absolute = join(root, pathname);
    if (!existsSync(absolute)) continue;
    visit(absolute, files);
  }

  return files.filter((file) => /\.(ts|tsx|md|json|css)$/.test(file));
}

function visit(pathname: string, files: string[]) {
  for (const entry of readdirSync(pathname, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const absolute = join(pathname, entry.name);
    if (entry.isDirectory()) {
      visit(absolute, files);
    } else {
      files.push(absolute);
    }
  }
}
