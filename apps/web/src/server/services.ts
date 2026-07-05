import { createPlatformServices } from "@eduferma/core";
import { isDemoAuthEnabled } from "@/server/auth/session";

export function getServices() {
  const state = isDemoAuthEnabled() ? "demo" : "unavailable";
  return createPlatformServices({ state });
}
