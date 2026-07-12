import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessRoute, resolveRoleFromEmail } from "@eduferma/core";
import { demoUsers, type PlatformRole, type PlatformUser } from "@eduferma/core/platform";
import { mapAppRoleToPlatformRole } from "@eduferma/core";
import { resolveDbAccountAccess } from "@/server/auth/db-account";
import { getAuthSetupStatus } from "@/server/auth/setup-status";

const DEMO_ROLE_COOKIE = "eduferma_demo_role";

export function isDemoAuthEnabled() {
  return process.env.ENABLE_DEMO_AUTH === "true" && process.env.VERCEL_ENV !== "production";
}

export function hasClerkEnv() {
  return getAuthSetupStatus().clerk.configured;
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

    if (getAuthSetupStatus().database.configured) {
      const access = await resolveDbAccountAccess({
        providerUserId: clerkUser.id,
        email,
        name: clerkUser.fullName || undefined
      });

      if (!access.ok) {
        return {
          id: clerkUser.id,
          authProviderUserId: clerkUser.id,
          email,
          name: clerkUser.fullName || email,
          role: "guest"
        };
      }

      return {
        id: access.user.dbUserId,
        authProviderUserId: access.user.id,
        email: access.user.email,
        name: access.user.name || email,
        role: mapAppRoleToPlatformRole(access.user.role)
      };
    }

    const appRole = resolveRoleFromEmail(email, {
      ownerEmail: process.env.OWNER_EMAIL,
      tutorEmails: process.env.TUTOR_EMAILS,
      teacherEmails: process.env.TEACHER_EMAILS,
      studentEmails: process.env.STUDENT_EMAILS,
      guardianEmails: process.env.GUARDIAN_EMAILS
    });
    const role = mapAppRoleToPlatformRole(appRole);
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
  const user = await requireRole(["owner", "teacher", "student", "guardian"]);
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
  if (role === "student" || role === "guardian") return "/student/dashboard";
  return "/sign-in";
}
