import { describe, expect, it } from "vitest";
import { routes } from "@eduferma/config";
import { getRoleRedirectPathForRole } from "../../apps/web/src/lib/platform/auth";
import {
  getDemoAuthRedirectPath,
  getDemoAuthRoleFromCookieHeader,
  isDemoAuthRuntimeEnabled,
  parseDemoAuthRole
} from "../../apps/web/src/lib/demo-auth";

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

  it("maps explicit owner and guest demo entries", () => {
    expect(parseDemoAuthRole("owner")).toBe("owner");
    expect(parseDemoAuthRole("guest")).toBe("guest");
    expect(parseDemoAuthRole("unknown")).toBeNull();
    expect(getDemoAuthRedirectPath("owner")).toBe(routes.ownerAccess);
    expect(getDemoAuthRedirectPath("guest")).toBe(routes.accessPending);
    expect(getDemoAuthRoleFromCookieHeader("theme=dark; eduferma_demo_role=guest")).toBe("guest");
    expect(getDemoAuthRoleFromCookieHeader("eduferma_demo_role=admin")).toBeNull();
  });

  it("never enables demo auth in a production runtime", () => {
    expect(isDemoAuthRuntimeEnabled({ ENABLE_DEMO_AUTH: "true", NODE_ENV: "development" })).toBe(true);
    expect(isDemoAuthRuntimeEnabled({ ENABLE_DEMO_AUTH: "true", NODE_ENV: "production" })).toBe(false);
    expect(
      isDemoAuthRuntimeEnabled({ ENABLE_DEMO_AUTH: "true", NODE_ENV: "test", VERCEL_ENV: "production" })
    ).toBe(false);
  });
});
