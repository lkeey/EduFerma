import type { AppRole } from "@eduferma/config";

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

export function resolveRoleFromEmail(email: string | null | undefined, ownerEmail: string | null | undefined): AppRole {
  if (!email) return "guest";
  if (ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) return "owner";
  if (email.endsWith("@edu-ferma.local") && email.startsWith("teacher.")) return "teacher";
  return "student";
}
