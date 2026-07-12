import { describe, expect, it } from "vitest";
import {
  canAccessApiRoute,
  canAccessPlatformPath,
  canAccessRoute,
  dashboardPathForRole,
  hasPermission,
  resolveRoleFromEmail
} from "../../packages/core/src/permissions";

describe("permissions", () => {
  const bootstrapRoles = {
    ownerEmail: "owner@example.com",
    tutorEmails: " tutor@example.com, second-tutor@example.com ",
    teacherEmails: "teacher@example.com",
    studentEmails: "student@example.com",
    guardianEmails: "guardian@example.com"
  };

  it("resolves bootstrap roles from configured email lists", () => {
    expect(resolveRoleFromEmail("OWNER@example.com", bootstrapRoles)).toBe("owner");
    expect(resolveRoleFromEmail("tutor@example.com", bootstrapRoles)).toBe("tutor");
    expect(resolveRoleFromEmail("second-tutor@example.com", bootstrapRoles)).toBe("tutor");
    expect(resolveRoleFromEmail("teacher@example.com", bootstrapRoles)).toBe("tutor");
    expect(resolveRoleFromEmail("student@example.com", bootstrapRoles)).toBe("student");
    expect(resolveRoleFromEmail("guardian@example.com", bootstrapRoles)).toBe("guardian");
  });

  it("keeps unknown signed-in emails as guests", () => {
    expect(resolveRoleFromEmail("unknown@example.com", bootstrapRoles)).toBe("guest");
    expect(resolveRoleFromEmail(null, bootstrapRoles)).toBe("guest");
  });

  it("keeps student users away from teacher routes", () => {
    expect(canAccessRoute("student", "/dashboard/teacher")).toBe(false);
    expect(canAccessRoute("guest", "/dashboard/teacher")).toBe(false);
    expect(canAccessRoute("tutor", "/dashboard/teacher")).toBe(true);
  });

  it("does not reveal answers to students by default", () => {
    expect(hasPermission("student", "answer:reveal")).toBe(false);
    expect(hasPermission("tutor", "answer:reveal")).toBe(true);
  });

  it("sends owner and tutor users to the teacher dashboard", () => {
    expect(dashboardPathForRole("owner")).toBe("/dashboard/teacher");
    expect(dashboardPathForRole("tutor")).toBe("/dashboard/teacher");
    expect(dashboardPathForRole("student")).toBe("/dashboard/student");
    expect(dashboardPathForRole("guest")).toBe("/sign-in");
  });

  it("enforces teacher-only API routes", () => {
    expect(canAccessApiRoute("student", "/api/v1/teacher/dashboard")).toBe(false);
    expect(canAccessApiRoute("guest", "/api/v1/teacher/dashboard")).toBe(false);
    expect(canAccessApiRoute("owner", "/api/v1/teacher/dashboard")).toBe(true);
    expect(canAccessApiRoute("tutor", "/api/v1/teacher/dashboard")).toBe(true);
    expect(canAccessPlatformPath("student", "/api/v1/student/dashboard")).toBe(true);
    expect(canAccessPlatformPath("guest", "/api/v1/task-bank")).toBe(false);
    expect(canAccessPlatformPath("guest", "/api/v1/diagnostics")).toBe(false);
    expect(canAccessPlatformPath("student", "/api/v1/diagnostics")).toBe(true);
    expect(canAccessPlatformPath("tutor", "/api/v1/diagnostics")).toBe(true);
  });
});
