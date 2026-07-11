import type { Assignment, SafeStudentTask } from "../platform/types";

export const TELEGRAM_MESSAGE_LIMIT = 4096;

export const TELEGRAM_STUDENT_FORBIDDEN_FIELDS = [
  "answerJson",
  "answer_json",
  "solutionMd",
  "solution_md",
  "teacherNotes",
  "teacher_notes",
  "localSourcePath",
  "local_source_path",
  "sourceUrl",
  "source_url"
] as const;

export type TelegramConsentStatus = "pending" | "granted" | "revoked";

export type TelegramDeliveryDestination = {
  chatId: string;
  studentId: string;
  userId?: string;
  consentStatus: TelegramConsentStatus;
};

export type TelegramMessageKind = "task" | "assignment";

export type TelegramPrivacyIssue = {
  path: string;
  field: string;
  reason: string;
};

export type TelegramPrivacyCheckResult = {
  ok: boolean;
  issues: TelegramPrivacyIssue[];
};

export type TelegramMessageAuditTrail = {
  eventType: "telegram.message.rendered";
  renderedAt: string;
  studentId: string;
  userId?: string;
  assignmentId?: string;
  taskIds: string[];
  idempotencyKey: string;
  privacy: TelegramPrivacyCheckResult;
};

export type TelegramOutboundMessage = {
  kind: TelegramMessageKind;
  destination: TelegramDeliveryDestination;
  text: string;
  parseMode: "plain_text";
  disableWebPagePreview: true;
  idempotencyKey: string;
  auditTrail: TelegramMessageAuditTrail;
};

export type TelegramSendResult = {
  status: "dry_run" | "blocked" | "sent";
  sendAttempted: boolean;
  message: TelegramOutboundMessage;
  reason?: string;
  providerMessageId?: string;
  tokenConfigured?: boolean;
  explicitSendEnabled?: boolean;
  allowedByChatPolicy?: boolean;
};

export type TelegramMessageSender = {
  send(message: TelegramOutboundMessage): Promise<TelegramSendResult>;
};

export type TelegramTaskMessageInput = {
  destination: TelegramDeliveryDestination;
  task: SafeStudentTask;
  assignmentId?: string;
  appUrl?: string;
  renderedAt?: string;
};

export type TelegramAssignmentMessageInput = {
  destination: TelegramDeliveryDestination;
  assignment: Pick<Assignment, "id" | "title" | "descriptionMd" | "dueAt" | "taskIds">;
  tasks: SafeStudentTask[];
  appUrl?: string;
  renderedAt?: string;
};

export class TelegramPrivacyError extends Error {
  readonly issues: TelegramPrivacyIssue[];

  constructor(issues: TelegramPrivacyIssue[]) {
    super("Telegram student payload contains teacher-only fields.");
    this.name = "TelegramPrivacyError";
    this.issues = issues;
  }
}

export class TelegramConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramConsentError";
  }
}

export function createTelegramTaskMessage(input: TelegramTaskMessageInput): TelegramOutboundMessage {
  assertTelegramDestinationOptedIn(input.destination);
  const privacy = assertTelegramStudentPayloadSafe(input.task);
  const renderedAt = input.renderedAt ?? new Date().toISOString();
  const taskUrl = buildAppUrl(input.appUrl, `/student/tasks/${encodeURIComponent(input.task.id)}`);

  const lines = [
    "Новая задача в EduFerma",
    "",
    formatTaskSummary(input.task),
    `Сложность: ${formatDifficulty(input.task.difficultyLevel)}`,
    input.task.prototypeId ? `Прототип: ${input.task.prototypeId}` : undefined,
    "",
    renderTelegramPlainText(input.task.statementMd),
    taskUrl ? "" : undefined,
    taskUrl ? `Открыть в EduFerma: ${taskUrl}` : undefined
  ].filter((line): line is string => line !== undefined);

  const text = clampTelegramMessage(lines.join("\n"));
  const idempotencyKey = buildTelegramIdempotencyKey([
    "telegram",
    "task",
    input.destination.studentId,
    input.assignmentId ?? "single",
    input.task.id,
    stableHash(text)
  ]);

  return {
    kind: "task",
    destination: input.destination,
    text,
    parseMode: "plain_text",
    disableWebPagePreview: true,
    idempotencyKey,
    auditTrail: {
      eventType: "telegram.message.rendered",
      renderedAt,
      studentId: input.destination.studentId,
      userId: input.destination.userId,
      assignmentId: input.assignmentId,
      taskIds: [input.task.id],
      idempotencyKey,
      privacy
    }
  };
}

export function createTelegramAssignmentMessage(input: TelegramAssignmentMessageInput): TelegramOutboundMessage {
  assertTelegramDestinationOptedIn(input.destination);
  const privacy = assertTelegramStudentPayloadSafe({ assignment: input.assignment, tasks: input.tasks });
  const renderedAt = input.renderedAt ?? new Date().toISOString();
  const assignmentUrl = buildAppUrl(input.appUrl, `/student/assignments/${encodeURIComponent(input.assignment.id)}`);
  const taskPreview = input.tasks.slice(0, 5).map((task, index) => `${index + 1}. ${formatTaskSummary(task)}`);
  const hiddenCount = Math.max(input.tasks.length - taskPreview.length, 0);

  const lines = [
    "Новое ДЗ в EduFerma",
    "",
    input.assignment.title.trim(),
    input.assignment.dueAt ? `Срок: ${formatIsoDateTime(input.assignment.dueAt)}` : undefined,
    `Задач: ${input.assignment.taskIds.length}`,
    "",
    input.assignment.descriptionMd ? renderTelegramPlainText(input.assignment.descriptionMd) : undefined,
    taskPreview.length > 0 ? "" : undefined,
    ...taskPreview,
    hiddenCount > 0 ? `Еще задач: ${hiddenCount}` : undefined,
    assignmentUrl ? "" : undefined,
    assignmentUrl ? `Открыть ДЗ: ${assignmentUrl}` : undefined
  ].filter((line): line is string => line !== undefined);

  const text = clampTelegramMessage(lines.join("\n"));
  const idempotencyKey = buildTelegramIdempotencyKey([
    "telegram",
    "assignment",
    input.destination.studentId,
    input.assignment.id,
    stableHash(input.assignment.taskIds.join(",")),
    stableHash(text)
  ]);

  return {
    kind: "assignment",
    destination: input.destination,
    text,
    parseMode: "plain_text",
    disableWebPagePreview: true,
    idempotencyKey,
    auditTrail: {
      eventType: "telegram.message.rendered",
      renderedAt,
      studentId: input.destination.studentId,
      userId: input.destination.userId,
      assignmentId: input.assignment.id,
      taskIds: input.assignment.taskIds,
      idempotencyKey,
      privacy
    }
  };
}

export function checkTelegramStudentPayloadSafety(payload: unknown): TelegramPrivacyCheckResult {
  const issues: TelegramPrivacyIssue[] = [];
  const seen = new WeakSet<object>();

  visitPayload(payload, "$", seen, issues);

  return {
    ok: issues.length === 0,
    issues
  };
}

export function assertTelegramStudentPayloadSafe(payload: unknown): TelegramPrivacyCheckResult {
  const privacy = checkTelegramStudentPayloadSafety(payload);
  if (!privacy.ok) {
    throw new TelegramPrivacyError(privacy.issues);
  }
  return privacy;
}

export function assertTelegramDestinationOptedIn(destination: TelegramDeliveryDestination): void {
  if (!destination.chatId.trim()) {
    throw new TelegramConsentError("Telegram destination chat_id is required.");
  }

  if (destination.consentStatus !== "granted") {
    throw new TelegramConsentError("Telegram destination has not granted delivery consent.");
  }
}

export function renderTelegramPlainText(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function visitPayload(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
  issues: TelegramPrivacyIssue[]
): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => visitPayload(item, `${path}[${index}]`, seen, issues));
    return;
  }

  for (const [field, child] of Object.entries(value)) {
    const childPath = `${path}.${field}`;
    if (isTelegramForbiddenField(field)) {
      issues.push({
        path: childPath,
        field,
        reason: "teacher-only field is not allowed in a Telegram student payload"
      });
      continue;
    }
    visitPayload(child, childPath, seen, issues);
  }
}

function isTelegramForbiddenField(field: string): boolean {
  return TELEGRAM_STUDENT_FORBIDDEN_FIELDS.includes(field as (typeof TELEGRAM_STUDENT_FORBIDDEN_FIELDS)[number]);
}

function formatTaskSummary(task: SafeStudentTask): string {
  const parts = [
    task.exam,
    task.taskNumber ? `задание ${task.taskNumber}` : undefined,
    task.topic,
    task.subtopic
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : task.taskId;
}

function formatDifficulty(difficulty: SafeStudentTask["difficultyLevel"]): string {
  const labels: Record<SafeStudentTask["difficultyLevel"], string> = {
    basic: "базовая",
    medium: "средняя",
    advanced: "сложная",
    trap: "ловушка",
    unknown: "не указана"
  };

  return labels[difficulty];
}

function formatIsoDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 16).replace("T", " ");
}

function buildAppUrl(appUrl: string | undefined, path: string): string | undefined {
  if (!appUrl?.trim()) {
    return undefined;
  }

  return `${appUrl.trim().replace(/\/+$/, "")}${path}`;
}

function clampTelegramMessage(text: string): string {
  if (text.length <= TELEGRAM_MESSAGE_LIMIT) {
    return text;
  }

  const suffix = "\n\nОткрой EduFerma, чтобы увидеть полное условие.";
  return `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - suffix.length - 3).trimEnd()}...${suffix}`;
}

function buildTelegramIdempotencyKey(parts: string[]): string {
  return parts.map((part) => part.replace(/[^a-zA-Z0-9_.:-]/g, "_")).join(":");
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
