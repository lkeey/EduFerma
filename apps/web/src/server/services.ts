import { createPlatformServices } from "@eduferma/core/services";
import { isDemoAuthEnabled } from "@/server/auth/session";
import { createDbPlatformServices } from "@/server/services/db-services";

export function getServices() {
  if (process.env.DATABASE_URL) {
    return createDbPlatformServices();
  }

  const state = isDemoAuthEnabled() ? "demo" : "unavailable";
  return createPlatformServices({ state });
}
