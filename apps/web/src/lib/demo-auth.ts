import { routes } from "@eduferma/config";
import type { PlatformRole } from "@eduferma/core/platform";

export const DEMO_ROLE_COOKIE = "eduferma_demo_role";

export const demoAuthRoles = ["owner", "guest", "teacher", "student"] as const satisfies readonly PlatformRole[];

export type DemoAuthRole = (typeof demoAuthRoles)[number];

export function parseDemoAuthRole(value: string | null | undefined): DemoAuthRole | null {
  return demoAuthRoles.find((role) => role === value) ?? null;
}

export function getDemoAuthRoleFromCookieHeader(cookieHeader: string | null | undefined) {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEMO_ROLE_COOKIE}=`));

  return parseDemoAuthRole(cookie?.slice(DEMO_ROLE_COOKIE.length + 1));
}

export function getDemoAuthRedirectPath(role: DemoAuthRole) {
  if (role === "owner") return routes.ownerAccess;
  if (role === "guest") return routes.accessPending;
  if (role === "teacher") return routes.teacherDashboard;
  return routes.studentDashboard;
}

export function isDemoAuthRuntimeEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_DEMO_AUTH === "true" && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}
