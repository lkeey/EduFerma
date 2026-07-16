import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getRuntimeDatabaseConfig } from "../../packages/db/src/config";
import * as schema from "../../packages/db/src/schema";

type DatabaseEnv = Record<string, string | undefined>;

export function createTransactionalDb(
  env: DatabaseEnv = process.env
) {
  const { databaseUrl, directDatabaseUrl } = getRuntimeDatabaseConfig(env);
  const pool = new Pool({
    connectionString: directDatabaseUrl ?? databaseUrl
  });

  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end()
  };
}
