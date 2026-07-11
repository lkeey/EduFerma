import type { AppRole } from "@eduferma/config";
import type { PlatformRole } from "./platform/types";
import type { ServiceUser } from "./services/types";

export type AuthenticatedIdentity = {
  providerUserId: string;
  email: string;
  name?: string;
};

export type ProvisionedAccount = {
  dbUserId: string;
  providerUserId?: string | null;
  clerkUserId?: string | null;
  email: string;
  displayName?: string | null;
  role: AppRole;
  isActive: boolean;
};

export type ProvisionedServiceUser = ServiceUser & {
  dbUserId: string;
};

export function normalizeAccessEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isOwnerBootstrapEmail(email: string, ownerEmail?: string | null) {
  return Boolean(ownerEmail && normalizeAccessEmail(email) === normalizeAccessEmail(ownerEmail));
}

export function mapAppRoleToPlatformRole(role: AppRole): PlatformRole {
  if (role === "tutor") return "teacher";
  if (role === "owner" || role === "teacher" || role === "student" || role === "guardian") return role;
  return "guest";
}

export function buildProvisionedServiceUser(
  identity: AuthenticatedIdentity,
  account: ProvisionedAccount
): ProvisionedServiceUser | null {
  if (!account.isActive) return null;

  return {
    id: account.providerUserId || account.clerkUserId || identity.providerUserId,
    dbUserId: account.dbUserId,
    email: normalizeAccessEmail(account.email || identity.email),
    name: account.displayName || identity.name,
    role: account.role
  };
}
