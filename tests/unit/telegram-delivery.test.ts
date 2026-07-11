import { describe, expect, it } from "vitest";
import {
  TelegramConsentError,
  TelegramPrivacyError,
  createTelegramAssignmentMessage,
  createTelegramTaskMessage,
  type TelegramDeliveryDestination
} from "../../packages/core/src/telegram";
import {
  getSafeTaskForStudent,
  type Assignment,
  type PlatformTask,
  type SafeStudentTask
} from "../../packages/core/src/platform";
import {
  buildTelegramDryRunResult,
  createTelegramDryRunSender,
  readTelegramDeliveryRuntimeConfig
} from "../../apps/worker/src/telegram-delivery";

const destination: TelegramDeliveryDestination = {
  chatId: "10001",
  studentId: "student-1",
  userId: "user-1",
  consentStatus: "granted"
};

const task: PlatformTask = {
  id: "task_1",
  taskId: "ege-7-demo",
  canonicalHash: "hash",
  learningTrack: "ege_informatics",
  exam: "ЕГЭ",
  subject: "Информатика",
  taskNumber: "7",
  topic: "Кодирование информации",
  prototypeId: "ege_7_bits",
  difficultyLevel: "medium",
  sourceId: "original",
  sourceName: "original",
  sourceUrl: "https://example.com/private-source",
  statementMd: "**Условие.** Найдите объем сообщения.",
  answerJson: { type: "numeric", expected: 42 },
  solutionMd: "Скрытое решение: ответ 42.",
  verificationStatus: "verified",
  licenseStatus: "original",
  status: "active",
  skillAtoms: ["encoding_units"],
  visibility: ["assigned"]
};

describe("telegram delivery contracts", () => {
  it("renders student task messages without answers, solutions or source urls", () => {
    const safeTask = getSafeTaskForStudent(task);
    const message = createTelegramTaskMessage({
      destination,
      task: safeTask,
      assignmentId: "assignment_1",
      appUrl: "https://eduferma.example",
      renderedAt: "2026-07-11T10:00:00.000Z"
    });

    expect(message.kind).toBe("task");
    expect(message.text).toContain("Новая задача");
    expect(message.text).toContain("Кодирование информации");
    expect(message.text).toContain("https://eduferma.example/student/tasks/task_1");
    expect(message.text).not.toContain("42");
    expect(message.text).not.toContain("Скрытое решение");
    expect(message.text).not.toContain("private-source");
    expect(JSON.stringify(message)).not.toContain("answerJson");
    expect(JSON.stringify(message)).not.toContain("solutionMd");
    expect(JSON.stringify(message)).not.toContain("sourceUrl");
    expect(message.auditTrail.privacy.ok).toBe(true);
  });

  it("blocks unsafe student payloads even when they are cast to safe task types", () => {
    const unsafeTask = {
      ...getSafeTaskForStudent(task),
      answerJson: { type: "numeric", expected: 42 },
      teacherNotes: "Не отправлять ученику."
    } as unknown as SafeStudentTask;

    expect(() => createTelegramTaskMessage({ destination, task: unsafeTask })).toThrow(TelegramPrivacyError);
  });

  it("requires Telegram opt-in before rendering a message", () => {
    expect(() =>
      createTelegramTaskMessage({
        destination: { ...destination, consentStatus: "pending" },
        task: getSafeTaskForStudent(task)
      })
    ).toThrow(TelegramConsentError);
  });

  it("renders assignment messages with student-safe task previews", () => {
    const assignment: Assignment = {
      id: "assignment_1",
      studentId: "student-1",
      teacherUserId: "teacher-1",
      title: "ДЗ по заданию 7",
      descriptionMd: "Реши задачи без подсказок, ответы появятся после проверки.",
      status: "assigned",
      dueAt: "2026-07-15T18:00:00.000Z",
      taskIds: ["task_1"]
    };

    const message = createTelegramAssignmentMessage({
      destination,
      assignment,
      tasks: [getSafeTaskForStudent(task)],
      appUrl: "https://eduferma.example",
      renderedAt: "2026-07-11T10:00:00.000Z"
    });

    expect(message.kind).toBe("assignment");
    expect(message.text).toContain("Новое ДЗ");
    expect(message.text).toContain("Задач: 1");
    expect(message.text).toContain("https://eduferma.example/student/assignments/assignment_1");
    expect(message.text).not.toContain("Скрытое решение");
    expect(message.auditTrail.taskIds).toEqual(["task_1"]);
  });

  it("keeps the worker adapter in dry-run mode even when token and explicit flag are configured", async () => {
    const config = readTelegramDeliveryRuntimeConfig({
      TELEGRAM_BOT_TOKEN: "configured-but-not-used",
      TELEGRAM_WEBHOOK_SECRET: "configured",
      TELEGRAM_ALLOWED_CHAT_IDS: "10001",
      TELEGRAM_DELIVERY_SEND_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: "https://eduferma.example"
    });
    const sender = createTelegramDryRunSender(config);
    const message = createTelegramTaskMessage({
      destination,
      task: getSafeTaskForStudent(task),
      appUrl: config.appUrl
    });

    const result = await sender.send(message);

    expect(result.status).toBe("dry_run");
    expect(result.sendAttempted).toBe(false);
    expect(result.tokenConfigured).toBe(true);
    expect(result.explicitSendEnabled).toBe(true);
  });

  it("blocks dry-run output for chats outside the allowlist", () => {
    const message = createTelegramTaskMessage({
      destination,
      task: getSafeTaskForStudent(task)
    });
    const result = buildTelegramDryRunResult(message, {
      botTokenConfigured: false,
      webhookSecretConfigured: false,
      allowedChatIds: ["another-chat"],
      sendEnabled: false
    });

    expect(result.status).toBe("blocked");
    expect(result.sendAttempted).toBe(false);
    expect(result.allowedByChatPolicy).toBe(false);
  });
});
