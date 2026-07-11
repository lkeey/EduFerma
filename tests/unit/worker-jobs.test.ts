import { describe, expect, it } from "vitest";
import { UnknownWorkerJobError, runWorkerJob, workerJobNames } from "../../apps/worker/src/jobs";

describe("worker dry-run jobs", () => {
  it("lists the supported worker jobs", () => {
    expect(workerJobNames).toEqual([
      "telegram:assignment:dry-run",
      "social:posts:dry-run",
      "lesson-feedback:dry-run"
    ]);
  });

  it("renders a Telegram assignment dry-run without sending or leaking teacher-only fields", async () => {
    const result = await runWorkerJob("telegram:assignment:dry-run", {
      now: "2026-07-11T10:00:00.000Z",
      env: {
        TELEGRAM_BOT_TOKEN: "configured-but-not-used",
        TELEGRAM_WEBHOOK_SECRET: "configured",
        TELEGRAM_OWNER_CHAT_ID: "10001",
        TELEGRAM_ALLOWED_CHAT_IDS: "10001",
        TELEGRAM_DELIVERY_SEND_ENABLED: "true",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      }
    });

    expect(result.job).toBe("telegram:assignment:dry-run");
    expect(result.mode).toBe("dry_run");
    expect(result.sendAttempted).toBe(false);
    expect(result.status).toBe("dry_run");
    expect(result.preview).toContain("Новое ДЗ");
    expect(result.preview).toContain("https://eduferma.example/student/assignments/demo-assignment");
    expect(result.preview).not.toContain("4 * 3 * 2");
    expect(result.preview).not.toContain("answerJson");
    expect(result.preview).not.toContain("solutionMd");
  });

  it("creates social post drafts without publishing them", async () => {
    const result = await runWorkerJob("social:posts:dry-run", {
      now: "2026-07-11T10:00:00.000Z"
    });

    expect(result.job).toBe("social:posts:dry-run");
    expect(result.mode).toBe("dry_run");
    expect(result.draftCount).toBe(1);
    expect(result.blockedDraftCount).toBe(0);
    expect(result.publishAttempted).toBe(false);
  });

  it("analyzes lesson feedback locally without external model transfer", async () => {
    const result = await runWorkerJob("lesson-feedback:dry-run", {
      now: "2026-07-11T10:00:00.000Z"
    });

    expect(result.job).toBe("lesson-feedback:dry-run");
    expect(result.mode).toBe("dry_run");
    expect(result.studentId).toBe("demo-student");
    expect(result.signals).toContain("topic_understood");
    expect(result.proposedAdjustmentCount).toBeGreaterThan(0);
    expect(result.transcriptSentToExternalModel).toBe(false);
  });

  it("rejects unknown worker jobs", async () => {
    await expect(runWorkerJob("telegram:assignment:send")).rejects.toThrow(UnknownWorkerJobError);
  });
});
