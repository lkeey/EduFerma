import { createPlatformServices } from "@eduferma/core/services";
import { hasRuntimeDatabaseEnv } from "@eduferma/db";
import { isDemoAuthEnabled } from "@/server/auth/session";
import { createDbPlatformServices } from "@/server/services/db-services";

type DemoPlatformServices = ReturnType<typeof createPlatformServices>;

const demoServicesGlobal = globalThis as typeof globalThis & {
  eduFermaDemoServices?: DemoPlatformServices;
};

export function getServices() {
  if (hasRuntimeDatabaseEnv()) {
    return createDbPlatformServices();
  }

  const state = isDemoAuthEnabled() ? "demo" : "unavailable";
  if (state === "demo") {
    demoServicesGlobal.eduFermaDemoServices ??= createPlatformServices({ state });
    return demoServicesGlobal.eduFermaDemoServices;
  }

  return createPlatformServices({ state });
}
