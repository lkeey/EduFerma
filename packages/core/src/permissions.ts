import type { AppRole } from "@eduferma/config";

type BootstrapEmailList = string | readonly string[] | null | undefined;

export type BootstrapRoleConfig = {
  ownerEmail?: string | null;
  tutorEmails?: BootstrapEmailList;
  teacherEmails?: BootstrapEmailList;
  studentEmails?: BootstrapEmailList;
  guardianEmails?: BootstrapEmailList;
};

export type PermissionAction =
  | "dashboard:view"
  | "task_bank:read"
  | "task_bank:write"
  | "assignment:read"
  | "assignment:write"
  | "answer:reveal"
  | "analytics:read"
  | "student:manage"
  | "settings:manage";

const rolePermissions: Record<AppRole, PermissionAction[]> = {
  owner: [
    "dashboard:view",
    "task_bank:read",
    "task_bank:write",
    "assignment:read",
    "assignment:write",
    "answer:reveal",
    "analytics:read",
    "student:manage",
    "settings:manage"
  ],
  tutor: [
    "dashboard:view",
    "task_bank:read",
    "task_bank:write",
    "assignment:read",
    "assignment:write",
    "answer:reveal",
    "analytics:read",
    "student:manage"
  ],
  teacher: [
    "dashboard:view",
    "task_bank:read",
    "task_bank:write",
    "assignment:read",
    "assignment:write",
    "answer:reveal",
    "analytics:read",
    "student:manage"
  ],
  student: ["dashboard:view", "assignment:read"],
  guardian: ["dashboard:view", "assignment:read"],
  guest: []
};

export function hasPermission(role: AppRole, action: PermissionAction): boolean {
  return rolePermissions[role].includes(action);
}

export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/api/teacher") ||
    pathname.startsWith("/api/v1/teacher") ||
    pathname.startsWith("/dashboard/teacher")
  ) {
    return role === "owner" || role === "teacher" || role === "tutor";
  }

  if (
    pathname.startsWith("/student") ||
    pathname.startsWith("/api/student") ||
    pathname.startsWith("/api/v1/student") ||
    pathname.startsWith("/dashboard/student")
  ) {
    return role === "owner" || role === "teacher" || role === "tutor" || role === "student" || role === "guardian";
  }

  if (pathname.startsWith("/dashboard")) {
    return hasPermission(role, "dashboard:view");
  }

  return true;
}

export function canAccessApiRoute(role: AppRole, pathname: string): boolean {
  if (pathname.startsWith("/api/v1/teacher")) {
    return role === "owner" || role === "teacher" || role === "tutor";
  }

  if (pathname.startsWith("/api/v1/diagnostics")) {
    return role !== "guest";
  }

  if (pathname.startsWith("/api/v1/student") || pathname.startsWith("/api/v1/task-bank")) {
    return role !== "guest";
  }

  return true;
}

export function canAccessPlatformPath(role: AppRole, pathname: string): boolean {
  if (pathname.startsWith("/api/v1")) {
    return canAccessApiRoute(role, pathname);
  }

  return canAccessRoute(role, pathname);
}

export function dashboardPathForRole(role: AppRole): "/dashboard/teacher" | "/dashboard/student" | "/sign-in" {
  if (role === "owner" || role === "teacher" || role === "tutor") {
    return "/dashboard/teacher";
  }

  if (role === "student" || role === "guardian") {
    return "/dashboard/student";
  }

  return "/sign-in";
}

export function resolveRoleFromEmail(email: string | null | undefined, config: BootstrapRoleConfig): AppRole;
export function resolveRoleFromEmail(
  email: string | null | undefined,
  ownerEmail: string | null | undefined
): AppRole;
export function resolveRoleFromEmail(
  email: string | null | undefined,
  configOrOwnerEmail: BootstrapRoleConfig | string | null | undefined
): AppRole {
  if (!email) return "guest";

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return "guest";

  const config: BootstrapRoleConfig =
    typeof configOrOwnerEmail === "object" && configOrOwnerEmail !== null
      ? configOrOwnerEmail
      : { ownerEmail: configOrOwnerEmail };

  if (normalizeEmail(config.ownerEmail) === normalizedEmail) return "owner";

  if (emailListIncludes(config.teacherEmails, normalizedEmail)) return "teacher";
  if (emailListIncludes(config.tutorEmails, normalizedEmail)) return "tutor";

  if (emailListIncludes(config.studentEmails, normalizedEmail)) return "student";
  if (emailListIncludes(config.guardianEmails, normalizedEmail)) return "guardian";

  return "guest";
}

function emailListIncludes(emails: BootstrapEmailList, normalizedEmail: string): boolean {
  return normalizeEmailList(emails).includes(normalizedEmail);
}

function normalizeEmailList(emails: BootstrapEmailList): string[] {
  if (!emails) return [];

  const rawEmails = typeof emails === "string" ? emails.split(",") : emails;

  return rawEmails.map((email) => normalizeEmail(email)).filter((email): email is string => Boolean(email));
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
