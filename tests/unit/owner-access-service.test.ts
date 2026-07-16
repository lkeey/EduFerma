import { describe, expect, it } from "vitest";
import {
  assertLastActiveOwnerMutation,
  buildDeterministicPublicCode,
  deriveAccessStatus,
  ensureOwnerConfirmation,
  getOwnerConfirmationPhrase
} from "../../apps/web/src/server/owner-access/service";

describe("owner access service helpers", () => {
  it("builds deterministic public codes with collision suffixes", () => {
    expect(buildDeterministicPublicCode("Student Name", [])).toBe("student-name");
    expect(buildDeterministicPublicCode("Student Name", ["student-name", "student-name-2"])).toBe("student-name-3");
  });

  it("requires the exact owner confirmation phrase", () => {
    const phrase = getOwnerConfirmationPhrase("Owner+New@example.com");

    expect(phrase).toBe("MAKE OWNER owner+new@example.com");
    expect(() => ensureOwnerConfirmation(phrase, "Owner+New@example.com")).not.toThrow();
    expect(() => ensureOwnerConfirmation("MAKE OWNER someone@example.com", "Owner+New@example.com")).toThrow(
      /exact confirmation phrase/i
    );
  });

  it("blocks demotion or blocking of the last active owner", () => {
    expect(() =>
      assertLastActiveOwnerMutation({
        activeOwnerCount: 1,
        isTargetOwner: true,
        nextRole: "teacher",
        nextIsActive: true
      })
    ).toThrow(/last active owner/i);

    expect(() =>
      assertLastActiveOwnerMutation({
        activeOwnerCount: 2,
        isTargetOwner: true,
        nextRole: "owner",
        nextIsActive: true
      })
    ).not.toThrow();
  });

  it("derives access states for pending, active, and blocked users", () => {
    const pending = deriveAccessStatus({
      clerkSubject: "user_pending",
      request: {
        id: "req_1",
        clerkSubject: "user_pending",
        requesterEmail: "pending@example.com",
        requesterName: null,
        requestedByUserId: null,
        targetUserId: null,
        studentId: null,
        requestKind: "access",
        requestedRole: null,
        relationshipLabel: null,
        noteMd: null,
        status: "pending",
        reviewedByUserId: null,
        reviewedAt: null,
        decisionNoteMd: null,
        lastSeenAt: new Date("2026-07-16T10:00:00.000Z"),
        metadata: {},
        createdAt: new Date("2026-07-16T09:00:00.000Z"),
        updatedAt: new Date("2026-07-16T10:00:00.000Z")
      }
    });
    const active = deriveAccessStatus({
      clerkSubject: "user_active",
      user: {
        id: "db_1",
        clerkUserId: "user_active",
        authProviderUserId: "user_active",
        email: "active@example.com",
        displayName: "Active User",
        role: "teacher",
        isActive: true,
        blockedAt: null,
        blockedByUserId: null,
        blockReason: null,
        createdAt: new Date("2026-07-16T09:00:00.000Z"),
        updatedAt: new Date("2026-07-16T10:00:00.000Z")
      } as never
    });
    const blocked = deriveAccessStatus({
      clerkSubject: "user_blocked",
      user: {
        id: "db_2",
        clerkUserId: "user_blocked",
        authProviderUserId: "user_blocked",
        email: "blocked@example.com",
        displayName: "Blocked User",
        role: "student",
        isActive: false,
        blockedAt: new Date("2026-07-16T11:00:00.000Z"),
        blockedByUserId: "owner_1",
        blockReason: "Suspended",
        createdAt: new Date("2026-07-16T09:00:00.000Z"),
        updatedAt: new Date("2026-07-16T11:00:00.000Z")
      } as never
    });

    expect(pending.state).toBe("pending");
    expect(active.state).toBe("active");
    expect(active.currentRole).toBe("teacher");
    expect(blocked.state).toBe("blocked");
    expect(blocked.reason).toBe("Suspended");
  });
});
