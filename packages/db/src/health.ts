import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb } from "./client";
import { getRuntimeDatabaseConfig, hasRuntimeDatabaseEnv } from "./config";

export async function checkDbConnection() {
  await getDb().execute(sql`select 1`);
}

export type DatabaseSizeSnapshot = {
  configured: boolean;
  sizeBytes?: number;
  databaseName?: string;
};

export function isDatabaseConfigured(env: NodeJS.ProcessEnv = process.env) {
  return hasRuntimeDatabaseEnv(env);
}

export async function getDatabaseSizeSnapshot(): Promise<DatabaseSizeSnapshot> {
  if (!hasRuntimeDatabaseEnv()) {
    return { configured: false };
  }

  const { databaseUrl } = getRuntimeDatabaseConfig();
  const sqlClient = neon(databaseUrl);
  const [row] = await sqlClient`
    select
      current_database() as database_name,
      pg_database_size(current_database())::bigint as size_bytes
  `;

  return {
    configured: true,
    databaseName: typeof row?.database_name === "string" ? row.database_name : undefined,
    sizeBytes: Number(row?.size_bytes ?? 0)
  };
}
