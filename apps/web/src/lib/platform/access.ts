import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { AppRole } from "@eduferma/config";
import { canAccessPlatformPath, dashboardPathForRole } from "@eduferma/core";
import { hasClerkEnv, resolveBootstrapRole } from "@/lib/auth";

type ClerkUserEmail = {
  emailAddress?: string | null;
};

type ClerkUserLike = {
  primaryEmailAddress?: ClerkUserEmail | null;
  emailAddresses?: ClerkUserEmail[] | null;
};

type PlatformAccess = {
  email: string | null;
  role: AppRole;
};

type PlatformAccessAllowed = {
  access: PlatformAccess;
  ok: true;
};

type PlatformAccessDenied = {
  access: PlatformAccess;
  ok: false;
  redirectTo: ReturnType<typeof dashboardPathForRole>;
  status: 401 | 403;
};

export async function getCurrentPlatformAccess(): Promise<PlatformAccess> {
  if (!hasClerkEnv()) {
    return {
      email: process.env.OWNER_EMAIL ?? null,
      role: "owner"
    };
  }

  const user = await currentUser();
  const email = getPrimaryEmail(user);

  return {
    email,
    role: resolveBootstrapRole(email)
  };
}

export async function getDashboardPathForCurrentUser() {
  const access = await getCurrentPlatformAccess();
  return dashboardPathForRole(access.role);
}

export async function requirePlatformPath(pathname: string): Promise<PlatformAccessAllowed | PlatformAccessDenied> {
  const access = await getCurrentPlatformAccess();

  if (canAccessPlatformPath(access.role, pathname)) {
    return { access, ok: true };
  }

  return {
    access,
    ok: false,
    redirectTo: dashboardPathForRole(access.role),
    status: access.role === "guest" ? 401 : 403
  };
}

export function platformAccessDeniedResponse(result: PlatformAccessDenied) {
  return Response.json(
    {
      error: result.status === 401 ? "Unauthorized" : "Forbidden",
      role: result.access.role
    },
    { status: result.status }
  );
}

function getPrimaryEmail(user: ClerkUserLike | null): string | null {
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
}
