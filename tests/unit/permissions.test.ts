import { describe, expect, it } from "vitest";
import { canAccessRoute, hasPermission } from "../../packages/core/src/permissions";

describe("permissions", () => {
  it("keeps student users away from teacher routes", () => {
    expect(canAccessRoute("student", "/dashboard/teacher")).toBe(false);
    expect(canAccessRoute("tutor", "/dashboard/teacher")).toBe(true);
  });

  it("does not reveal answers to students by default", () => {
    expect(hasPermission("student", "answer:reveal")).toBe(false);
    expect(hasPermission("tutor", "answer:reveal")).toBe(true);
  });
});
