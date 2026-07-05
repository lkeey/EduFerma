import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessRoute, resolveRoleFromEmail } from "@eduferma/core";
import type { PlatformRole, PlatformUser } from "@eduferma/core";
import { demoUsers } from "@eduferma/core";

const DEMO_ROLE_COOKIE = "eduferma_demo_role";

export function isDemoAuthEnabled() {
  return process.env.ENABLE_DEMO_AUTH === "true" && process.env.VERCEL_ENV !== "production";
}

export function hasClerkEnv() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentUser(): Promise<PlatformUser | null> {
  if (isDemoAuthEnabled()) {
    const cookieStore = await cookies();
    const role = cookieStore.get(DEMO_ROLE_COOKIE)?.value;
    if (role === "teacher") return demoUsers.find((user) => user.role === "teacher") ?? null;
    if (role === "student") return demoUsers.find((user) => user.role === "student") ?? null;
  }

  if (hasClerkEnv()) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    if (!clerkUser || !email) return null;

    const appRole = resolveRoleFromEmail(email, process.env.OWNER_EMAIL);
    const role: PlatformRole = appRole === "tutor" ? "teacher" : appRole;
    return {
      id: clerkUser.id,
      authProviderUserId: clerkUser.id,
      email,
      name: clerkUser.fullName || email,
      role
    };
  }

  return null;
}

export async function getCurrentRole(): Promise<PlatformRole> {
  return (await getCurrentUser())?.role ?? "guest";
}

export async function requireRole(allowed: PlatformRole | PlatformRole[]) {
  const user = await getCurrentUser();
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  if (!user) redirect("/sign-in");
  if (!allowedRoles.includes(user.role)) redirect("/forbidden");

  return user;
}

export async function requireTeacherAccess() {
  return requireRole(["owner", "teacher"]);
}

export async function requireStudentAccess(studentId?: string) {
  const user = await requireRole(["owner", "teacher", "student"]);
  if (user.role === "student" && studentId && studentId !== "demo_student_oge") {
    redirect("/forbidden");
  }

  return user;
}

export async function requireRouteAccess(pathname: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!canAccessRoute(user.role === "teacher" ? "teacher" : user.role, pathname)) redirect("/forbidden");
  return user;
}

export async function getRoleRedirectPath() {
  const role = await getCurrentRole();
  if (role === "teacher" || role === "owner") return "/teacher/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/sign-in";
}
