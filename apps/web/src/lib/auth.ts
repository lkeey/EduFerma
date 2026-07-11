import { resolveRoleFromEmail } from "@eduferma/core";
import { getAuthSetupStatus } from "@/server/auth/setup-status";

export function resolveBootstrapRole(email?: string | null) {
  return resolveRoleFromEmail(email, process.env.OWNER_EMAIL);
}

export function hasClerkEnv() {
  return getAuthSetupStatus().clerk.configured;
}
