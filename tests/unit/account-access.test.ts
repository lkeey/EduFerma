import { describe, expect, it } from "vitest";
import {
  buildProvisionedServiceUser,
  isOwnerBootstrapEmail,
  mapAppRoleToPlatformRole,
  normalizeAccessEmail
} from "../../packages/core/src/account-access";

describe("account access helpers", () => {
  it("normalizes access emails and matches owner bootstrap case-insensitively", () => {
    expect(normalizeAccessEmail(" Owner@Example.COM ")).toBe("owner@example.com");
    expect(isOwnerBootstrapEmail("OWNER@example.com", "owner@example.com")).toBe(true);
    expect(isOwnerBootstrapEmail("student@example.com", "owner@example.com")).toBe(false);
  });

  it("maps tutor to teacher for platform UI roles", () => {
    expect(mapAppRoleToPlatformRole("owner")).toBe("owner");
    expect(mapAppRoleToPlatformRole("tutor")).toBe("teacher");
    expect(mapAppRoleToPlatformRole("guardian")).toBe("guardian");
  });

  it("builds service users only for active DB accounts", () => {
    const identity = { providerUserId: "clerk_123", email: "student@example.com", name: "Student" };
    const active = buildProvisionedServiceUser(identity, {
      dbUserId: "db-user-1",
      providerUserId: "clerk_123",
      email: "student@example.com",
      role: "student",
      isActive: true
    });
    const inactive = buildProvisionedServiceUser(identity, {
      dbUserId: "db-user-2",
      providerUserId: "clerk_456",
      email: "blocked@example.com",
      role: "student",
      isActive: false
    });

    expect(active).toMatchObject({
      id: "clerk_123",
      dbUserId: "db-user-1",
      role: "student"
    });
    expect(inactive).toBeNull();
  });
});
