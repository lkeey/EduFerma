import { describe, expect, it } from "vitest";
import { getCriticalActionConfirmationMessage } from "../../apps/web/src/app/owner/access/critical-action-form";

describe("owner critical action confirmations", () => {
  it("requires visible confirmation for access request decisions", () => {
    expect(
      getCriticalActionConfirmationMessage({ kind: "approve", subject: "pending@example.com" })
    ).toContain("одобрение запроса pending@example.com");
    expect(
      getCriticalActionConfirmationMessage({ kind: "reject", subject: "pending@example.com" })
    ).toContain("отклонение запроса pending@example.com");
    expect(
      getCriticalActionConfirmationMessage({
        kind: "approve",
        subject: "pending@example.com",
        nextRole: "owner"
      })
    ).toContain("точной owner-фразы");
  });

  it("describes block and restore actions explicitly", () => {
    expect(
      getCriticalActionConfirmationMessage({
        kind: "update-user",
        subject: "teacher@example.com",
        currentRole: "teacher",
        currentIsActive: true,
        nextRole: "teacher",
        nextIsActive: false
      })
    ).toContain("блокировку доступа");
    expect(
      getCriticalActionConfirmationMessage({
        kind: "update-user",
        subject: "teacher@example.com",
        currentRole: "teacher",
        currentIsActive: false,
        nextRole: "teacher",
        nextIsActive: true
      })
    ).toContain("восстановление доступа");
  });

  it("calls out owner promotion and demotion without replacing exact phrase enforcement", () => {
    expect(
      getCriticalActionConfirmationMessage({
        kind: "update-user",
        subject: "owner@example.com",
        currentRole: "owner",
        currentIsActive: true,
        nextRole: "teacher",
        nextIsActive: true
      })
    ).toContain("снятие роли owner");
    expect(
      getCriticalActionConfirmationMessage({
        kind: "update-user",
        subject: "teacher@example.com",
        currentRole: "teacher",
        currentIsActive: true,
        nextRole: "owner",
        nextIsActive: true
      })
    ).toContain("точной owner-фразой");
  });
});
