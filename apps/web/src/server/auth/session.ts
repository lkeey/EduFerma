import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { canAccessRoute, resolveRoleFromEmail, type ServiceContext, type ServiceUser } from "@eduferma/core";
import type { AppRole } from "@eduferma/config";
import { ApiError } from "@/server/api/responses";
import { resolveDbAccountAccess } from "@/server/auth/db-account";
import { getAuthSetupStatus } from "@/server/auth/setup-status";
import {
  DEMO_ROLE_COOKIE,
  getDemoAuthRoleFromCookieHeader,
  isDemoAuthRuntimeEnabled,
  parseDemoAuthRole
} from "@/lib/demo-auth";

const teacherRoles: AppRole[] = ["owner", "teacher", "tutor"];
const studentRoles: AppRole[] = ["owner", "tutor", "student", "guardian"];
const authenticatedRoles: AppRole[] = ["owner", "teacher", "tutor", "student", "guardian", "guest"];
type CurrentUserLoader = () => ReturnType<typeof currentUser>;
let loadCurrentUser: CurrentUserLoader = currentUser;

export function setCurrentUserForAuthTests(loader: CurrentUserLoader | null) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("setCurrentUserForAuthTests can only be used in tests");
  }

  loadCurrentUser = loader ?? currentUser;
}

export function isDemoAuthEnabled() {
  return isDemoAuthRuntimeEnabled();
}

export function hasClerkServerEnv() {
  return getAuthSetupStatus().clerk.configured;
}

async function demoUser(request?: Request): Promise<ServiceUser> {
  const requestedRole = request?.headers.get("x-demo-role") as AppRole | null;
  const headerRole: AppRole | null = requestedRole && ["owner", "tutor", "teacher", "student", "guardian", "guest"].includes(requestedRole)
    ? requestedRole
    : null;
  const cookieRole = request
    ? getDemoAuthRoleFromCookieHeader(request.headers.get("cookie"))
    : parseDemoAuthRole((await cookies()).get(DEMO_ROLE_COOKIE)?.value);
  const role: AppRole = headerRole ?? cookieRole ?? "owner";
  const requestedId = request?.headers.get("x-demo-user-id")?.trim();
  const requestedEmail = request?.headers.get("x-demo-email")?.trim();
  const requestedName = request?.headers.get("x-demo-name")?.trim();

  return {
    id: requestedId || `demo-${role}`,
    email: requestedEmail || `${role}@example.com`,
    name: requestedName || `Demo ${role}`,
    role
  };
}

export async function getCurrentServiceUser(request?: Request): Promise<ServiceUser | null> {
  if (isDemoAuthEnabled()) {
    return await demoUser(request);
  }

  if (!hasClerkServerEnv()) {
    return null;
  }

  const user = await loadCurrentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || !email) {
    return null;
  }

  const identity = {
    providerUserId: user.id,
    email,
    name: user.fullName || undefined
  };

  if (getAuthSetupStatus().database.configured) {
    const access = await resolveDbAccountAccess(identity);
    if (!access.ok) {
      return {
        id: user.id,
        email,
        name: user.fullName || undefined,
        role: "guest"
      };
    }

    return access.user;
  }

  return {
    id: user.id,
    email,
    name: user.fullName || undefined,
    role: resolveRoleFromEmail(email, process.env.OWNER_EMAIL)
  };
}

export async function requireApiRole(allowedRoles: AppRole[], request?: Request): Promise<ServiceContext> {
  const setup = getAuthSetupStatus();
  if (!isDemoAuthEnabled() && !setup.clerk.configured) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Clerk authentication is not configured",
      { missingEnv: setup.clerk.missingEnv }
    );
  }

  const user = await getCurrentServiceUser(request);
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "Role is not allowed");
  }
  return { user };
}

export async function requirePageRole(pathname: string, allowedRoles: AppRole[]) {
  const context = await requireApiRole(allowedRoles);
  if (!canAccessRoute(context.user.role, pathname)) {
    throw new ApiError(403, "FORBIDDEN", "Route is not allowed");
  }
  return context;
}

export const roles = {
  teacher: teacherRoles,
  student: studentRoles,
  authenticated: authenticatedRoles
};
