import { checkDbConnection, getDatabaseSizeSnapshot, hasRuntimeDatabaseEnv } from "@eduferma/db";
import { evaluateDbSizeLimit, formatBytes, megabytesToBytes } from "@eduferma/core";

export async function checkDatabaseHealth() {
  if (!hasRuntimeDatabaseEnv()) {
    return { ok: false, configured: false };
  }

  await checkDbConnection();
  const snapshot = await getDatabaseSizeSnapshot();
  const limitBytes = megabytesToBytes(Number(process.env.EDUFERMA_DB_SIZE_LIMIT_MB || 500));
  const size = evaluateDbSizeLimit({ currentBytes: snapshot.sizeBytes ?? 0, limitBytes });

  return {
    ok: true,
    configured: true,
    sizeBytes: snapshot.sizeBytes,
    sizePretty: snapshot.sizeBytes === undefined ? undefined : formatBytes(snapshot.sizeBytes),
    sizeLimitBytes: limitBytes,
    sizeLimitPretty: formatBytes(limitBytes),
    withinSizeLimit: size.withinLimit
  };
}
