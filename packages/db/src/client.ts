import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getRuntimeDatabaseConfig } from "./config";
import * as schema from "./schema";

type EduFermaDb = ReturnType<typeof createDb>;

let db: EduFermaDb | null = null;

function createDb() {
  const { databaseUrl } = getRuntimeDatabaseConfig();
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export function getDb(): EduFermaDb {
  if (!db) db = createDb();
  return db;
}
