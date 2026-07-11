import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";

export function loadWorkspaceEnv(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "..", ".env.local"),
    resolve(cwd, "..", ".env"),
    resolve(cwd, "..", "..", ".env.local"),
    resolve(cwd, "..", "..", ".env")
  ];

  for (const pathname of [...new Set(candidates)]) {
    if (existsSync(pathname)) {
      loadEnvFile({ path: pathname, override: false });
    }
  }
}
