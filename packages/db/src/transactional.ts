import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getRuntimeDatabaseConfig } from "./config";
import * as schema from "./schema";

type DatabaseEnv = Record<string, string | undefined>;

export function createTransactionalDb(
  env: DatabaseEnv = process.env
) {
  const { databaseUrl, directDatabaseUrl } =
    getRuntimeDatabaseConfig(env);
  const pool = new Pool({
    connectionString: directDatabaseUrl ?? databaseUrl
  });

  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end()
  };
}
