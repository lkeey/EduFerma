import { describe, expect, it } from "vitest";
import {
  deriveClerkE2EEmail,
  getClerkE2EIdentities,
  getClerkE2EUserCreatePayload
} from "../../scripts/lib/clerk-e2e-identities";

describe("Clerk E2E identities", () => {
  it("derives stable role aliases from a base email", () => {
    expect(deriveClerkE2EEmail("Owner+old-tag@Example.com", "owner")).toBe(
      "owner+eduferma_e2e_owner@example.com"
    );
    expect(deriveClerkE2EEmail("Owner+old-tag@Example.com", "teacher")).toBe(
      "owner+eduferma_e2e_teacher@example.com"
    );
    expect(deriveClerkE2EEmail("Owner+old-tag@Example.com", "student")).toBe(
      "owner+eduferma_e2e_student@example.com"
    );
  });

  it("falls back to OWNER_EMAIL and exposes isolated storage states", () => {
    const identities = getClerkE2EIdentities({
      OWNER_EMAIL: "owner@example.com"
    });

    expect(identities.map((identity) => identity.role)).toEqual([
      "owner",
      "teacher",
      "student"
    ]);
    expect(identities.map((identity) => identity.storageStatePath)).toEqual([
      "playwright/.clerk/owner.json",
      "playwright/.clerk/teacher.json",
      "playwright/.clerk/student.json"
    ]);
  });

  it("requires a valid base email", () => {
    expect(() => getClerkE2EIdentities({})).toThrow(
      "E2E_CLERK_BASE_EMAIL or OWNER_EMAIL is required"
    );
    expect(() => deriveClerkE2EEmail("invalid", "owner")).toThrow(
      "must be a valid email address"
    );
  });

  it("creates passwordless users for Clerk instances that require passwords", () => {
    const [owner] = getClerkE2EIdentities({
      E2E_CLERK_BASE_EMAIL: "owner@example.com"
    });

    expect(getClerkE2EUserCreatePayload(owner)).toMatchObject({
      email_address: ["owner+eduferma_e2e_owner@example.com"],
      skip_password_requirement: true,
      public_metadata: {
        edufermaE2E: true,
        edufermaRole: "owner",
        isolated: true
      }
    });
  });
});
