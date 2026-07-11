import { createPlatformServices } from "@eduferma/core/services";
import { hasRuntimeDatabaseEnv } from "@eduferma/db";
import { isDemoAuthEnabled } from "@/server/auth/session";
import { createDbPlatformServices } from "@/server/services/db-services";

export function getServices() {
  if (hasRuntimeDatabaseEnv()) {
    return createDbPlatformServices();
  }

  const state = isDemoAuthEnabled() ? "demo" : "unavailable";
  return createPlatformServices({ state });
}
