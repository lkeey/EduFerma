import { describe, expect, it } from "vitest";
import { canAccessRoute, hasPermission } from "../../packages/core/src/permissions";

describe("permissions", () => {
  it("keeps student users away from teacher routes", () => {
    expect(canAccessRoute("student", "/dashboard/teacher")).toBe(false);
    expect(canAccessRoute("student", "/teacher/dashboard")).toBe(false);
    expect(canAccessRoute("tutor", "/dashboard/teacher")).toBe(true);
    expect(canAccessRoute("teacher", "/teacher/dashboard")).toBe(true);
  });

  it("does not reveal answers to students by default", () => {
    expect(hasPermission("student", "answer:reveal")).toBe(false);
    expect(hasPermission("tutor", "answer:reveal")).toBe(true);
    expect(hasPermission("teacher", "answer:reveal")).toBe(true);
  });

  it("allows students to access only student-facing routes", () => {
    expect(canAccessRoute("student", "/student/assignments")).toBe(true);
    expect(canAccessRoute("teacher", "/student/assignments")).toBe(true);
    expect(canAccessRoute("guardian", "/student/progress")).toBe(true);
    expect(canAccessRoute("guest", "/student/dashboard")).toBe(false);
  });
});
