import { describe, expect, it } from "vitest";
import { routes } from "@eduferma/config";
import { getRoleRedirectPathForRole } from "../../apps/web/src/lib/platform/auth";

describe("post-login auth routing", () => {
  it("maps provisioned roles to canonical dashboards", () => {
    expect(getRoleRedirectPathForRole("owner")).toBe(routes.teacherDashboard);
    expect(getRoleRedirectPathForRole("teacher")).toBe(routes.teacherDashboard);
    expect(getRoleRedirectPathForRole("student")).toBe(routes.studentDashboard);
    expect(getRoleRedirectPathForRole("guardian")).toBe(routes.studentDashboard);
  });

  it("sends signed-in guests to access pending", () => {
    expect(getRoleRedirectPathForRole("guest")).toBe(routes.accessPending);
  });
});
