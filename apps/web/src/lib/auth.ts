import { resolveRoleFromEmail } from "@eduferma/core";

export function resolveBootstrapRole(email?: string | null) {
  return resolveRoleFromEmail(email, process.env.OWNER_EMAIL);
}

export function hasClerkEnv() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
