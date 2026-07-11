import { currentUser } from "@clerk/nextjs/server";
import { canAccessRoute, resolveRoleFromEmail, type ServiceContext, type ServiceUser } from "@eduferma/core";
import type { AppRole } from "@eduferma/config";
import { ApiError } from "@/server/api/responses";

const teacherRoles: AppRole[] = ["owner", "teacher", "tutor"];
const studentRoles: AppRole[] = ["owner", "tutor", "student", "guardian"];

export function isDemoAuthEnabled() {
  return process.env.ENABLE_DEMO_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function hasClerkServerEnv() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function demoUser(request?: Request): ServiceUser {
  const requestedRole = request?.headers.get("x-demo-role") as AppRole | null;
  const role: AppRole = requestedRole && ["owner", "tutor", "student", "guardian"].includes(requestedRole)
    ? requestedRole
    : "owner";
  return {
    id: `demo-${role}`,
    email: `${role}@example.com`,
    name: `Demo ${role}`,
    role
  };
}

export async function getCurrentServiceUser(request?: Request): Promise<ServiceUser | null> {
  if (isDemoAuthEnabled()) {
    return demoUser(request);
  }

  if (!hasClerkServerEnv()) {
    return null;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || !email) {
    return null;
  }

  return {
    id: user.id,
    email,
    name: user.fullName || undefined,
    role: resolveRoleFromEmail(email, process.env.OWNER_EMAIL)
  };
}

export async function requireApiRole(allowedRoles: AppRole[], request?: Request): Promise<ServiceContext> {
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
  student: studentRoles
};
