import { defineConfig } from "drizzle-kit";
import { getMigrationDatabaseUrl } from "./src/config";
import { loadWorkspaceEnv } from "./src/script-env";

loadWorkspaceEnv();

const dbCommandsThatRequireUrl = new Set(["migrate", "push", "studio"]);
const requiresConnection = process.argv.some((arg) => dbCommandsThatRequireUrl.has(arg));
const databaseUrl = getMigrationDatabaseUrl(process.env, { required: requiresConnection });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true
});
