import { checkDbConnection } from "@eduferma/db";

export async function checkDatabaseHealth() {
  if (!process.env.DATABASE_URL) {
    return { ok: false, configured: false };
  }

  await checkDbConnection();
  return { ok: true, configured: true };
}
