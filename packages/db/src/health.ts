import { sql } from "drizzle-orm";
import { getDb } from "./client";

export async function checkDbConnection() {
  await getDb().execute(sql`select 1`);
}
